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
