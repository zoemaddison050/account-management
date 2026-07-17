using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrimeExchanges.Api.Data;
using PrimeExchanges.Api.Models;
using PrimeExchanges.Api.Services;
using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.Extensions.Caching.Memory;
using PdfSharpCore.Pdf;
using PdfSharpCore.Drawing;
using System.Text.Json;
using System.Text.Json.Nodes;

namespace PrimeExchanges.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "client")]
public class ClientsController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IEmailService _emailService;
    private readonly ILogger<ClientsController> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;

    public ClientsController(AppDbContext dbContext, IEmailService emailService, ILogger<ClientsController> logger, IHttpClientFactory httpClientFactory, IMemoryCache cache)
    {
        _dbContext = dbContext;
        _emailService = emailService;
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _cache = cache;
    }

    /// <summary>
    /// Returns the current authenticated client's profile.
    /// </summary>
    [HttpGet("me")]
    public async Task<ActionResult> GetCurrentClient(CancellationToken cancellationToken)
    {
        // The JWT is issued with JwtRegisteredClaimNames.Email ("email"). Read that
        // claim directly, falling back to the standard ClaimTypes.Email mapping.
        var email = User.FindFirstValue(JwtRegisteredClaimNames.Email)
            ?? User.FindFirstValue(ClaimTypes.Email);

        if (string.IsNullOrWhiteSpace(email))
        {
            _logger.LogWarning("Authenticated request missing email claim");
            return Unauthorized(new { message = "Invalid session. Please sign in again." });
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();

        var client = await _dbContext.Clients
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Email == normalizedEmail, cancellationToken);

        if (client == null)
        {
            _logger.LogWarning("Authenticated client not found for email: {Email}", normalizedEmail);
            return NotFound(new { message = "Client profile not found." });
        }

        if (!string.Equals(client.Status, "active", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = "Your account is not active. Contact support for assistance." });
        }

        var portfolios = string.IsNullOrWhiteSpace(client.PortfoliosJson)
            ? System.Text.Json.Nodes.JsonNode.Parse("[]")
            : System.Text.Json.Nodes.JsonNode.Parse(client.PortfoliosJson);

        return Ok(new
        {
            ClientId = client.ClientId,
            Name = client.Name,
            Email = client.Email,
            ManagerId = client.ManagerId,
            ManagerName = client.ManagerName,
            Since = client.Since.ToString("O"),
            Status = client.Status,
            Portfolios = portfolios
        });
    }

    /// <summary>
    /// Returns activity events for the authenticated client.
    /// </summary>
    [HttpGet("me/activity")]
    public async Task<ActionResult> GetActivity(CancellationToken cancellationToken)
    {
        var email = User.FindFirstValue(JwtRegisteredClaimNames.Email)
            ?? User.FindFirstValue(ClaimTypes.Email);

        if (string.IsNullOrWhiteSpace(email))
        {
            return Unauthorized(new { message = "Invalid session." });
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var client = await _dbContext.Clients
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Email == normalizedEmail, cancellationToken);

        if (client == null)
        {
            return NotFound(new { message = "Client not found." });
        }

        var json = string.IsNullOrWhiteSpace(client.ActivityJson) ? "[]" : client.ActivityJson;
        return Ok(System.Text.Json.Nodes.JsonNode.Parse(json));
    }

    /// <summary>
    /// Returns documents published for the authenticated client.
    /// </summary>
    [HttpGet("me/documents")]
    public async Task<ActionResult> GetDocuments(CancellationToken cancellationToken)
    {
        var email = User.FindFirstValue(JwtRegisteredClaimNames.Email)
            ?? User.FindFirstValue(ClaimTypes.Email);

        if (string.IsNullOrWhiteSpace(email))
        {
            return Unauthorized(new { message = "Invalid session." });
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var client = await _dbContext.Clients
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Email == normalizedEmail, cancellationToken);

        if (client == null)
        {
            return NotFound(new { message = "Client not found." });
        }

        var json = string.IsNullOrWhiteSpace(client.DocumentsJson) ? "[]" : client.DocumentsJson;
        var docArray = System.Text.Json.Nodes.JsonNode.Parse(json)?.AsArray() ?? new System.Text.Json.Nodes.JsonArray();

        // Auto-generate statement if portfolio was updated by admin
        if (client.PortfolioLastUpdated.HasValue)
        {
            var updateDate = client.PortfolioLastUpdated.Value;
            var statementDate = updateDate.AddDays(7);
            
            // For testing/preview convenience in the UI, we date it 7 days out but make it visible immediately.
            var docId = $"statement-auto-{updateDate.Ticks}";
            
            // Check if already in the documents array to prevent duplicate listings
            bool alreadyExists = false;
            foreach (var node in docArray)
            {
                if (node != null && node["id"]?.ToString() == docId)
                {
                    alreadyExists = true;
                    break;
                }
            }

            if (!alreadyExists)
            {
                var stmtObject = new JsonObject
                {
                    ["id"] = docId,
                    ["name"] = $"{updateDate.ToString("MMMM yyyy")} Valuation Statement",
                    ["type"] = "Statement",
                    ["version"] = "v1.0",
                    ["publishedAt"] = statementDate.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                    ["sizeLabel"] = "135 KB"
                };
                docArray.Insert(0, stmtObject);
            }
        }

        return Ok(docArray);
    }

    /// <summary>
    /// Downloads/views a dynamic client document (statement).
    /// </summary>
    [HttpGet("me/documents/{docId}/pdf")]
    public async Task<IActionResult> GetDocumentPdf(string docId, [FromQuery] string? currency, CancellationToken cancellationToken)
    {
        var email = User.FindFirstValue(JwtRegisteredClaimNames.Email)
            ?? User.FindFirstValue(ClaimTypes.Email);

        if (string.IsNullOrWhiteSpace(email))
        {
            return Unauthorized(new { message = "Invalid session." });
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var client = await _dbContext.Clients
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Email == normalizedEmail, cancellationToken);

        if (client == null)
        {
            return NotFound(new { message = "Client not found." });
        }

        if (docId.StartsWith("statement-auto-"))
        {
            // Parse ticks to reconstruct statement date
            var ticksStr = docId.Replace("statement-auto-", "");
            if (long.TryParse(ticksStr, out long ticks))
            {
                var updateDate = new DateTime(ticks);
                var statementDate = updateDate.AddDays(7);
                
                var targetCurrency = string.IsNullOrWhiteSpace(currency) ? "USD" : currency.Trim().ToUpperInvariant();
                var rate = await GetExchangeRateAsync(targetCurrency, cancellationToken);
                
                var pdfBytes = GenerateValuationStatementPdf(client, statementDate, targetCurrency, rate);
                return File(pdfBytes, "application/pdf", $"Valuation-Statement-{statementDate:yyyy-MM-dd}.pdf");
            }
        }

        return BadRequest(new { message = "Document PDF not found or not dynamic." });
    }

    private async Task<decimal> GetExchangeRateAsync(string targetCurrency, CancellationToken cancellationToken)
    {
        if (targetCurrency == "USD") return 1.0m;

        var cacheKey = $"fx-rate:{targetCurrency}";
        if (_cache.TryGetValue(cacheKey, out decimal cachedRate))
        {
            return cachedRate;
        }

        var rate = await FetchExchangeRateAsync(targetCurrency, cancellationToken);

        // Cache successful and fallback rates for 5 minutes to reduce API load
        // and keep PDF generation responsive.
        var cacheOptions = new MemoryCacheEntryOptions()
            .SetAbsoluteExpiration(TimeSpan.FromMinutes(5))
            .SetPriority(CacheItemPriority.Normal);
        _cache.Set(cacheKey, rate, cacheOptions);

        return rate;
    }

    private async Task<decimal> FetchExchangeRateAsync(string targetCurrency, CancellationToken cancellationToken)
    {
        try
        {
            var httpClient = _httpClientFactory.CreateClient("fx");
            var url = "https://open.er-api.com/v6/latest/USD";
            var response = await httpClient.GetAsync(url, cancellationToken);
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync(cancellationToken);
                using (var doc = JsonDocument.Parse(json))
                {
                    if (doc.RootElement.TryGetProperty("rates", out var ratesElement) &&
                        ratesElement.TryGetProperty(targetCurrency, out var rateElement))
                    {
                        return rateElement.GetDecimal();
                    }
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Forex] Failed to fetch rate for {TargetCurrency}; using static fallback.", targetCurrency);
        }

        // Static fallbacks
        return targetCurrency switch
        {
            "EUR" => 0.92m,
            "GBP" => 0.78m,
            "AUD" => 1.51m,
            "CAD" => 1.37m,
            _ => 1.0m
        };
    }

    private byte[] GenerateValuationStatementPdf(Client client, DateTime statementDate, string currencyCode, decimal rate)
    {
        var document = new PdfDocument();
        document.Info.Title = $"PrimeXchanges Valuation Statement - {client.ClientId}";
        
        var page = document.AddPage();
        page.Size = PdfSharpCore.PageSize.A4;
        var gfx = XGraphics.FromPdfPage(page);
        
        // Define colors
        var navyColor = XColor.FromArgb(15, 23, 42); // #0f172a
        var orangeColor = XColor.FromArgb(249, 115, 22); // #f97316
        var grayColor = XColor.FromArgb(241, 245, 249); // #f1f5f9
        var textDark = XColor.FromArgb(51, 65, 85); // #334155
        var textMuted = XColor.FromArgb(148, 163, 184); // #94a3b8
        
        // Define fonts
        var titleFont = new XFont("Arial", 18, XFontStyle.Bold);
        var subtitleFont = new XFont("Arial", 10, XFontStyle.Italic);
        var sectionHeaderFont = new XFont("Arial", 12, XFontStyle.Bold);
        var bodyBoldFont = new XFont("Arial", 10, XFontStyle.Bold);
        var bodyFont = new XFont("Arial", 10, XFontStyle.Regular);
        var monoFont = new XFont("Courier New", 10, XFontStyle.Bold);
        
        // Draw top header bar
        var headerBrush = new XSolidBrush(navyColor);
        gfx.DrawRectangle(headerBrush, 0, 0, page.Width, 80);
        
        // Draw logo text
        var logoBrush = new XSolidBrush(XColors.White);
        gfx.DrawString("PrimeXchanges", new XFont("Arial", 18, XFontStyle.Bold), logoBrush, 40, 48);
        gfx.DrawString("VALUATION STATEMENT", new XFont("Arial", 8, XFontStyle.Regular), logoBrush, 175, 46);
        
        // Draw orange accent line under header
        var orangeBrush = new XSolidBrush(orangeColor);
        gfx.DrawRectangle(orangeBrush, 0, 80, page.Width, 4);
        
        // Main title
        gfx.DrawString("Portfolio Valuation Statement", titleFont, headerBrush, 40, 120);
        gfx.DrawString($"Official Statement · Generated Date: {statementDate:yyyy-MM-dd} ({currencyCode})", subtitleFont, new XSolidBrush(textMuted), 40, 138);
        
        // Client details box
        gfx.DrawString("CLIENT INFO", sectionHeaderFont, orangeBrush, 40, 170);
        var boxBrush = new XSolidBrush(grayColor);
        gfx.DrawRectangle(boxBrush, 40, 180, page.Width - 80, 70);
        
        double labelX = 60;
        double valueX = 180;
        double startY = 200;
        double lineSpacing = 16;
        var labelBrush = new XSolidBrush(textDark);
        
        gfx.DrawString("Client Reference:", bodyBoldFont, labelBrush, labelX, startY);
        gfx.DrawString(client.ClientId, monoFont, new XSolidBrush(orangeColor), valueX, startY);
        
        gfx.DrawString("Client Name:", bodyBoldFont, labelBrush, labelX, startY + lineSpacing);
        gfx.DrawString(client.Name, bodyFont, labelBrush, valueX, startY + lineSpacing);
        
        gfx.DrawString("Account Manager:", bodyBoldFont, labelBrush, labelX, startY + 2 * lineSpacing);
        gfx.DrawString(client.ManagerName ?? "PrimeXchanges Support", bodyFont, labelBrush, valueX, startY + 2 * lineSpacing);

        // Parse portfolios and draw holdings
        double tableY = 280;
        gfx.DrawString("PORTFOLIO ASSETS & VALUATIONS", sectionHeaderFont, orangeBrush, 40, tableY);
        tableY += 15;

        // Draw Table Header
        gfx.DrawRectangle(new XSolidBrush(navyColor), 40, tableY, page.Width - 80, 20);
        var headerTextBrush = new XSolidBrush(XColors.White);
        var gridFont = new XFont("Arial", 9, XFontStyle.Bold);
        gfx.DrawString("Asset / Instrument", gridFont, headerTextBrush, 50, tableY + 14);
        gfx.DrawString("Type", gridFont, headerTextBrush, 240, tableY + 14);
        gfx.DrawString("Allocation %", gridFont, headerTextBrush, 360, tableY + 14);
        gfx.DrawString($"Value ({currencyCode})", gridFont, headerTextBrush, 460, tableY + 14);
        tableY += 20;

        decimal totalValue = 0;
        var itemFont = new XFont("Arial", 9, XFontStyle.Regular);
        var itemBoldFont = new XFont("Arial", 9, XFontStyle.Bold);
        
        string currencySymbol = currencyCode switch
        {
            "EUR" => "€",
            "GBP" => "£",
            "AUD" => "A$",
            "CAD" => "C$",
            "USD" => "$",
            _ => "$"
        };
        
        try
        {
            var portfoliosNode = string.IsNullOrWhiteSpace(client.PortfoliosJson)
                ? null
                : System.Text.Json.Nodes.JsonNode.Parse(client.PortfoliosJson);
                
            if (portfoliosNode != null && portfoliosNode is System.Text.Json.Nodes.JsonArray portfoliosArray)
            {
                foreach (var port in portfoliosArray)
                {
                    if (port == null) continue;
                    var holdings = port["holdings"] as System.Text.Json.Nodes.JsonArray;
                    if (holdings == null) continue;
                    
                    foreach (var hold in holdings)
                    {
                        if (hold == null) continue;
                        string instrument = hold["instrument"]?.ToString() ?? "Unknown";
                        string type = hold["type"]?.ToString() ?? "Other";
                        decimal pct = 0;
                        decimal.TryParse(hold["allocationPct"]?.ToString(), out pct);
                        decimal val = 0;
                        decimal.TryParse(hold["value"]?.ToString(), out val);
                        
                        totalValue += val;
                        decimal convertedVal = val * rate;
                        
                        // Draw row background for alternating rows
                        gfx.DrawRectangle(new XSolidBrush(XColor.FromArgb(248, 250, 252)), 40, tableY, page.Width - 80, 18);
                        
                        gfx.DrawString(instrument, itemFont, labelBrush, 50, tableY + 13);
                        gfx.DrawString(type, itemFont, labelBrush, 240, tableY + 13);
                        gfx.DrawString($"{pct:F1}%", itemFont, labelBrush, 360, tableY + 13);
                        gfx.DrawString($"{currencySymbol}{convertedVal:N2}", itemFont, labelBrush, 460, tableY + 13);
                        
                        tableY += 18;
                        
                        // Check page overflow (simplistic)
                        if (tableY > page.Height - 80)
                        {
                            page = document.AddPage();
                            page.Size = PdfSharpCore.PageSize.A4;
                            gfx = XGraphics.FromPdfPage(page);
                            tableY = 40;
                        }
                    }
                }
            }
        }
        catch (Exception)
        {
            gfx.DrawString("Error reading portfolio data", itemFont, new XSolidBrush(XColors.Red), 50, tableY + 13);
            tableY += 18;
        }

        // Draw Total Row
        decimal totalConverted = totalValue * rate;
        gfx.DrawRectangle(new XSolidBrush(grayColor), 40, tableY, page.Width - 80, 22);
        gfx.DrawString("Total Portfolio Valuation", itemBoldFont, labelBrush, 50, tableY + 15);
        gfx.DrawString($"{currencySymbol}{totalConverted:N2}", itemBoldFont, new XSolidBrush(orangeColor), 460, tableY + 15);
        tableY += 40;

        // Footer disclaimer
        gfx.DrawString("Disclaimer: This statement is prepared as a read-only document based on assets verified under custody", subtitleFont, new XSolidBrush(textMuted), 40, page.Height - 50);
        gfx.DrawString($"with PrimeXchanges. Values are shown in {currencyCode} using current valuation rates. Past performance is no guarantee of results.", subtitleFont, new XSolidBrush(textMuted), 40, page.Height - 38);

        using (var ms = new System.IO.MemoryStream())
        {
            document.Save(ms);
            return ms.ToArray();
        }
    }

    [HttpGet("me/messages")]
    public async Task<ActionResult<IEnumerable<SupportMessage>>> GetSupportMessages(CancellationToken cancellationToken)
    {
        var email = User.FindFirstValue(JwtRegisteredClaimNames.Email)
            ?? User.FindFirstValue(ClaimTypes.Email);

        if (string.IsNullOrWhiteSpace(email))
        {
            return Unauthorized(new { message = "Invalid session." });
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var client = await _dbContext.Clients
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Email == normalizedEmail, cancellationToken);

        if (client == null)
        {
            return NotFound(new { message = "Client not found." });
        }

        var messages = await _dbContext.SupportMessages
            .Where(m => m.ClientId == client.ClientId)
            .OrderByDescending(m => m.SentAt)
            .ToListAsync(cancellationToken);

        return Ok(messages);
    }

    public class CreateSupportMessageRequest
    {
        [Required]
        [MaxLength(200)]
        public string Subject { get; set; } = string.Empty;

        [Required]
        [MaxLength(4000)]
        public string MessageBody { get; set; } = string.Empty;
    }

    [HttpPost("me/messages")]
    [EnableRateLimiting("support-message")]
    public async Task<ActionResult> CreateSupportMessage([FromBody] CreateSupportMessageRequest request, CancellationToken cancellationToken)
    {
        var email = User.FindFirstValue(JwtRegisteredClaimNames.Email)
            ?? User.FindFirstValue(ClaimTypes.Email);

        if (string.IsNullOrWhiteSpace(email))
        {
            return Unauthorized(new { message = "Invalid session." });
        }

        var normalizedEmail = email.Trim().ToLowerInvariant();
        var client = await _dbContext.Clients
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Email == normalizedEmail, cancellationToken);

        if (client == null)
        {
            return NotFound(new { message = "Client not found." });
        }

        var message = new SupportMessage
        {
            ClientId = client.ClientId,
            ClientName = client.Name,
            ManagerName = client.ManagerName ?? "PrimeXchanges Support",
            Subject = request.Subject,
            MessageBody = request.MessageBody,
            SentAt = DateTime.UtcNow,
            IsFromClient = true
        };

        _dbContext.SupportMessages.Add(message);
        await _dbContext.SaveChangesAsync(cancellationToken);

        // Send notification to support@primexchanges.com
        try
        {
            await _emailService.SendSupportMessageAlertAsync(
                client.Name,
                client.ClientId,
                request.Subject,
                request.MessageBody,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send support email alert for client {ClientId}", client.ClientId);
        }

        return Ok(new { message = "Message sent successfully to your account manager." });
    }
}

public class ClientProfileResponse
{
    public string ClientId { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? ManagerId { get; set; }
    public string? ManagerName { get; set; }
    public string Since { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class ClientActivityResponse
{
    public string Id { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // Valuation | Statement | Allocation change | Dividend | Fee | Sync
    public string Description { get; set; } = string.Empty;
    public string? Amount { get; set; }
}

public class ClientDocumentResponse
{
    public string Id { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty; // Statement | Policy | Agreement | Report | Tax
    public string Version { get; set; } = string.Empty;
    public string PublishedAt { get; set; } = string.Empty;
    public string SizeLabel { get; set; } = string.Empty;
}
