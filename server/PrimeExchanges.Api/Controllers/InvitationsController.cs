using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using PrimeExchanges.Api.Data;
using PrimeExchanges.Api.Models;
using PrimeExchanges.Api.Services;

namespace PrimeExchanges.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("auth")]
public class InvitationsController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IJwtService _jwtService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<InvitationsController> _logger;

    public InvitationsController(
        AppDbContext dbContext,
        IJwtService jwtService,
        IConfiguration configuration,
        ILogger<InvitationsController> logger)
    {
        _dbContext = dbContext;
        _jwtService = jwtService;
        _configuration = configuration;
        _logger = logger;
    }

    [HttpGet("{token}")]
    public async Task<ActionResult<InvitationPreviewResponse>> PreviewInvitation(string token, CancellationToken cancellationToken)
    {
        var resolved = await ResolveInvitationAsync(token, cancellationToken);
        if (resolved.Error != null)
        {
            return BadRequest(new { message = resolved.Error });
        }

        return Ok(new InvitationPreviewResponse
        {
            Reference = resolved.Application!.Reference,
            ApplicantName = resolved.Application.ApplicantName,
            Email = resolved.Application.Email,
            AssignedManager = resolved.Application.AssignedReviewer,
            ExpiresAt = resolved.Invitation!.ExpiresAt.ToString("O"),
        });
    }

    [HttpPost("{token}/accept")]
    public async Task<ActionResult<AcceptInvitationResponse>> AcceptInvitation(string token, CancellationToken cancellationToken)
    {
        var resolved = await ResolveInvitationAsync(token, cancellationToken);
        if (resolved.Error != null)
        {
            return BadRequest(new { message = resolved.Error });
        }

        var invitation = resolved.Invitation!;
        var app = resolved.Application!;
        var manager = resolved.Manager!;

        var client = await _dbContext.Clients
            .FirstOrDefaultAsync(c => c.Email == app.Email, cancellationToken);

        if (client == null)
        {
            client = new Client
            {
                ClientId = await GenerateClientIdAsync(cancellationToken),
                Name = app.ApplicantName,
                Email = app.Email,
                ManagerId = manager.ManagerId,
                ManagerName = manager.Name,
                Since = DateTime.UtcNow,
                Status = "active",
            };
            _dbContext.Clients.Add(client);
            manager.ActiveClients += 1;
            manager.Status = GetManagerStatus(manager.ActiveClients, manager.Capacity, manager.Status);
        }
        else
        {
            client.Name = app.ApplicantName;
            client.ManagerId = manager.ManagerId;
            client.ManagerName = manager.Name;
            client.Status = "active";
        }

        invitation.AcceptedAt = DateTime.UtcNow;
        app.Status = "Active client";
        app.LastUpdated = DateTime.UtcNow;

        _dbContext.AuditEvents.Add(new AuditEvent
        {
            AuditEventId = Guid.NewGuid().ToString(),
            EntityType = "Application",
            EntityId = app.ApplicationId,
            Action = "InvitationAccepted",
            ActorId = client.ClientId,
            ActorName = client.Name,
            After = $"ClientId={client.ClientId}|Manager={manager.Name}",
            Timestamp = DateTime.UtcNow,
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        var expiresInHours = _configuration.GetValue("Jwt:ExpiresInHours", 8);
        var jwtToken = _jwtService.GenerateToken(client.Email, client.ClientId, "client", expiresInHours);

        _logger.LogInformation("Invitation accepted. InvitationId={InvitationId} ClientId={ClientId}", invitation.InvitationId, client.ClientId);

        return Ok(new AcceptInvitationResponse
        {
            Token = jwtToken,
            ClientId = client.ClientId,
            ClientName = client.Name,
            Email = client.Email,
            Role = "client",
            ExpiresAt = DateTime.UtcNow.AddHours(expiresInHours).ToString("O"),
        });
    }

    private async Task<(Invitation? Invitation, Application? Application, AccountManager? Manager, string? Error)> ResolveInvitationAsync(
        string token,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return (null, null, null, "Invitation token is required.");
        }

        var tokenHash = HashToken(token);
        var invitation = await _dbContext.Invitations
            .FirstOrDefaultAsync(i => i.TokenHash == tokenHash, cancellationToken);

        if (invitation == null || invitation.IsExpired || invitation.IsRevoked || invitation.IsUsed)
        {
            return (invitation, null, null, "This invitation is invalid, expired, or has already been used.");
        }

        var app = await _dbContext.Applications
            .FirstOrDefaultAsync(a => a.ApplicationId == invitation.ApplicationId, cancellationToken);

        if (app == null)
        {
            return (invitation, null, null, "Application not found.");
        }

        if (!string.Equals(app.Status, "Approved — activation pending", StringComparison.OrdinalIgnoreCase))
        {
            return (invitation, app, null, "This invitation is no longer available for activation.");
        }

        AccountManager? manager = null;
        if (!string.IsNullOrEmpty(app.AssignedManagerId))
        {
            manager = await _dbContext.AccountManagers
                .FirstOrDefaultAsync(m => m.ManagerId == app.AssignedManagerId && m.Status == "active", cancellationToken);
        }

        if (manager == null)
        {
            manager = await _dbContext.AccountManagers
                .FirstOrDefaultAsync(m => m.Name == app.AssignedReviewer && m.Status == "active", cancellationToken);
        }

        if (manager == null)
        {
            return (invitation, app, null, "No active account manager is assigned to this application.");
        }

        return (invitation, app, manager, null);
    }

    private async Task<string> GenerateClientIdAsync(CancellationToken cancellationToken)
    {
        string clientId;
        do
        {
            clientId = $"CL-{DateTime.UtcNow.Year}-{Random.Shared.Next(1000, 9999)}";
        }
        while (await _dbContext.Clients.AnyAsync(c => c.ClientId == clientId, cancellationToken));

        return clientId;
    }

    private static string GetManagerStatus(int activeClients, int capacity, string currentStatus)
    {
        if (string.Equals(currentStatus, "inactive", StringComparison.OrdinalIgnoreCase))
        {
            return "inactive";
        }

        return capacity > 0 && activeClients >= capacity ? "at capacity" : "active";
    }

    private static string HashToken(string token)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    }
}

public class InvitationPreviewResponse
{
    public string Reference { get; set; } = string.Empty;
    public string ApplicantName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string AssignedManager { get; set; } = string.Empty;
    public string ExpiresAt { get; set; } = string.Empty;
}

public class AcceptInvitationResponse
{
    public string Token { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = "client";
    public string ExpiresAt { get; set; } = string.Empty;
}
