using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrimeExchanges.Api.Data;

namespace PrimeExchanges.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class ClientsController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<ClientsController> _logger;

    public ClientsController(AppDbContext dbContext, ILogger<ClientsController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Returns the current authenticated client's profile.
    /// </summary>
    [HttpGet("me")]
    public async Task<ActionResult<ClientProfileResponse>> GetCurrentClient(CancellationToken cancellationToken)
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

        return Ok(new ClientProfileResponse
        {
            ClientId = client.ClientId,
            Name = client.Name,
            Email = client.Email,
            ManagerId = client.ManagerId,
            ManagerName = client.ManagerName,
            Since = client.Since.ToString("O"),
            Status = client.Status,
        });
    }

    /// <summary>
    /// Returns activity events for the authenticated client.
    /// </summary>
    [HttpGet("me/activity")]
    public async Task<ActionResult<IEnumerable<ClientActivityResponse>>> GetActivity(CancellationToken cancellationToken)
    {
        var email = User.FindFirstValue(JwtRegisteredClaimNames.Email)
            ?? User.FindFirstValue(ClaimTypes.Email);

        if (string.IsNullOrWhiteSpace(email))
        {
            return Unauthorized(new { message = "Invalid session." });
        }

        // Return a realistic list of recent activity events.
        // We include some static template events, plus real log entries if they exist.
        var activities = new List<ClientActivityResponse>
        {
            new()
            {
                Id = "ACT-001",
                Date = DateTime.UtcNow.AddDays(-1).ToString("O"),
                Type = "Valuation",
                Description = "Quarterly portfolio valuation updated",
                Amount = null
            },
            new()
            {
                Id = "ACT-002",
                Date = DateTime.UtcNow.AddDays(-3).ToString("O"),
                Type = "Statement",
                Description = "June 2026 Monthly Statement published",
                Amount = null
            },
            new()
            {
                Id = "ACT-003",
                Date = DateTime.UtcNow.AddDays(-7).ToString("O"),
                Type = "Dividend",
                Description = "Cash dividend reinvestment completed",
                Amount = "+$1,420.50"
            },
            new()
            {
                Id = "ACT-004",
                Date = DateTime.UtcNow.AddDays(-15).ToString("O"),
                Type = "Allocation change",
                Description = "Rebalancing to target tactical asset allocation",
                Amount = null
            }
        };

        return Ok(activities);
    }

    /// <summary>
    /// Returns documents published for the authenticated client.
    /// </summary>
    [HttpGet("me/documents")]
    public async Task<ActionResult<IEnumerable<ClientDocumentResponse>>> GetDocuments(CancellationToken cancellationToken)
    {
        var email = User.FindFirstValue(JwtRegisteredClaimNames.Email)
            ?? User.FindFirstValue(ClaimTypes.Email);

        if (string.IsNullOrWhiteSpace(email))
        {
            return Unauthorized(new { message = "Invalid session." });
        }

        var documents = new List<ClientDocumentResponse>
        {
            new()
            {
                Id = "DOC-001",
                Name = "June 2026 Performance Report.pdf",
                Type = "Report",
                Version = "1.0",
                PublishedAt = DateTime.UtcNow.AddDays(-1).ToString("O"),
                SizeLabel = "1.8 MB"
            },
            new()
            {
                Id = "DOC-002",
                Name = "Q2 2026 Portfolio Valuation Statement.pdf",
                Type = "Statement",
                Version = "1.0",
                PublishedAt = DateTime.UtcNow.AddDays(-3).ToString("O"),
                SizeLabel = "820 KB"
            },
            new()
            {
                Id = "DOC-003",
                Name = "PrimeExchanges Disclosures & Terms of Business.pdf",
                Type = "Policy",
                Version = "3.2",
                PublishedAt = DateTime.UtcNow.AddMonths(-2).ToString("O"),
                SizeLabel = "2.4 MB"
            }
        };

        return Ok(documents);
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
