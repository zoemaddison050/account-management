using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrimeExchanges.Api.Data;

namespace PrimeExchanges.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "client")]
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
        return Ok(System.Text.Json.Nodes.JsonNode.Parse(json));
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
