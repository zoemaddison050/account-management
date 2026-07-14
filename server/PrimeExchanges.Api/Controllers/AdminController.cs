using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrimeExchanges.Api.Data;
using PrimeExchanges.Api.Models;

namespace PrimeExchanges.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Administrator,OperationsReviewer,ComplianceApprover,AccountManager")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<AdminController> _logger;

    public AdminController(AppDbContext dbContext, ILogger<AdminController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Returns stats for the admin dashboard.
    /// </summary>
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats(CancellationToken cancellationToken)
    {
        var totalApps = await _dbContext.Applications.CountAsync(cancellationToken);
        
        var pendingReview = await _dbContext.Applications.CountAsync(a => 
            a.Status == "Inquiry submitted" || 
            a.Status == "Application received" || 
            a.Status == "Under review" || 
            a.Status == "Information requested" || 
            a.Status == "Approval pending", 
            cancellationToken);

        var approved = await _dbContext.Applications.CountAsync(a => 
            a.Status == "Approved — activation pending" || 
            a.Status == "Active client", 
            cancellationToken);

        var declined = await _dbContext.Applications.CountAsync(a => 
            a.Status == "Declined", 
            cancellationToken);

        return Ok(new
        {
            total = totalApps,
            pending = pendingReview,
            approved = approved,
            declined = declined
        });
    }

    /// <summary>
    /// Returns a list of all applications, filtered by status and/or search query.
    /// </summary>
    [HttpGet("applications")]
    public async Task<ActionResult<IEnumerable<AdminApplicationResponse>>> GetApplications(
        [FromQuery] string? status,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Applications.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(status) && !string.Equals(status, "All", StringComparison.OrdinalIgnoreCase))
        {
            query = query.Where(a => a.Status == status);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim().ToLower();
            query = query.Where(a => 
                a.ApplicantName.ToLower().Contains(searchLower) || 
                a.Reference.ToLower().Contains(searchLower) || 
                a.Email.ToLower().Contains(searchLower));
        }

        var apps = await query
            .OrderByDescending(a => a.LastUpdated)
            .ToListAsync(cancellationToken);

        var response = apps.Select(a => new AdminApplicationResponse
        {
            Id = a.ApplicationId,
            Reference = a.Reference,
            ApplicantName = a.ApplicantName,
            Email = a.Email,
            Country = a.Country,
            Status = a.Status,
            AssignedReviewer = string.IsNullOrWhiteSpace(a.AssignedReviewer) ? "Unassigned" : a.AssignedReviewer,
            SubmittedAt = a.SubmittedAt.ToString("O"),
            LastUpdated = a.LastUpdated.ToString("O"),
            Route = a.Route
        });

        return Ok(response);
    }

    /// <summary>
    /// Returns detail of a single application, including its notes/timeline from the audit log.
    /// </summary>
    [HttpGet("applications/{id}")]
    public async Task<ActionResult<AdminApplicationDetailResponse>> GetApplication(string id, CancellationToken cancellationToken)
    {
        var app = await _dbContext.Applications
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.ApplicationId == id, cancellationToken);

        if (app == null)
        {
            return NotFound(new { message = "Application not found." });
        }

        // Fetch notes/timeline events from the AuditEvents table
        var auditLogs = await _dbContext.AuditEvents
            .AsNoTracking()
            .Where(e => e.EntityType == "Application" && e.EntityId == id)
            .OrderByDescending(e => e.Timestamp)
            .ToListAsync(cancellationToken);

        var notes = auditLogs
            .Where(e => e.Action == "AddNote" || e.Action == "StatusChanged")
            .Select(e => new ApplicationNoteDto
            {
                Author = e.ActorName ?? e.ActorId,
                Date = e.Timestamp.ToString("O"),
                Text = e.Action == "StatusChanged" 
                    ? $"Status changed to '{e.After}'" + (!string.IsNullOrWhiteSpace(e.Reason) ? $". Reason: {e.Reason}" : "")
                    : e.Reason ?? string.Empty
            })
            .ToList();

        return Ok(new AdminApplicationDetailResponse
        {
            Id = app.ApplicationId,
            Reference = app.Reference,
            ApplicantName = app.ApplicantName,
            Email = app.Email,
            Country = app.Country,
            Status = app.Status,
            AssignedReviewer = string.IsNullOrWhiteSpace(app.AssignedReviewer) ? "Unassigned" : app.AssignedReviewer,
            SubmittedAt = app.SubmittedAt.ToString("O"),
            LastUpdated = app.LastUpdated.ToString("O"),
            Route = app.Route,
            Notes = notes
        });
    }

    /// <summary>
    /// Updates the status of an application.
    /// </summary>
    [HttpPut("applications/{id}/status")]
    public async Task<IActionResult> UpdateApplicationStatus(
        string id, 
        [FromBody] UpdateStatusRequest request, 
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var app = await _dbContext.Applications
            .FirstOrDefaultAsync(a => a.ApplicationId == id, cancellationToken);

        if (app == null)
        {
            return NotFound(new { message = "Application not found." });
        }

        var oldStatus = app.Status;
        app.Status = request.Status;
        app.LastUpdated = DateTime.UtcNow;

        var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.Identity?.Name ?? "system";
        var actorName = User.FindFirstValue(ClaimTypes.Name) ?? "Staff User";

        // Create an audit event
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            AuditEventId = Guid.NewGuid().ToString(),
            EntityType = "Application",
            EntityId = id,
            Action = "StatusChanged",
            ActorId = actorId,
            ActorName = actorName,
            Before = oldStatus,
            After = request.Status,
            Reason = request.Reason,
            Timestamp = DateTime.UtcNow
        });

        // If the application is approved, also automatically register/activate the client!
        if (request.Status == "Active client" && oldStatus != "Active client")
        {
            var existingClient = await _dbContext.Clients.FirstOrDefaultAsync(c => c.Email == app.Email, cancellationToken);
            if (existingClient == null)
            {
                // Assign a manager if none assigned, default to Eleanor
                var managerId = "MGR-001";
                var managerName = "Eleanor Whitfield";

                var newClient = new Client
                {
                    ClientId = $"CL-{DateTime.UtcNow.Year}-{new Random().Next(1000, 9999)}",
                    Name = app.ApplicantName,
                    Email = app.Email,
                    ManagerId = managerId,
                    ManagerName = managerName,
                    Since = DateTime.UtcNow,
                    Status = "active"
                };

                _dbContext.Clients.Add(newClient);

                _dbContext.AuditEvents.Add(new AuditEvent
                {
                    AuditEventId = Guid.NewGuid().ToString(),
                    EntityType = "Client",
                    EntityId = newClient.ClientId,
                    Action = "Created",
                    ActorId = actorId,
                    ActorName = actorName,
                    Before = null,
                    After = $"Email={newClient.Email}|Manager={managerName}",
                    Timestamp = DateTime.UtcNow
                });
            }
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation("Application {AppId} status updated to {Status} by {Actor}", id, request.Status, actorName);

        return NoContent();
    }

    /// <summary>
    /// Adds an internal note to an application.
    /// </summary>
    [HttpPost("applications/{id}/notes")]
    public async Task<IActionResult> AddApplicationNote(
        string id, 
        [FromBody] AddNoteRequest request, 
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var app = await _dbContext.Applications
            .AnyAsync(a => a.ApplicationId == id, cancellationToken);

        if (!app)
        {
            return NotFound(new { message = "Application not found." });
        }

        var actorId = User.FindFirstValue(ClaimTypes.NameIdentifier) ?? User.Identity?.Name ?? "system";
        var actorName = User.FindFirstValue(ClaimTypes.Name) ?? "Staff User";

        // Create an audit event for the note (so it forms part of the history)
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            AuditEventId = Guid.NewGuid().ToString(),
            EntityType = "Application",
            EntityId = id,
            Action = "AddNote",
            ActorId = actorId,
            ActorName = actorName,
            Before = null,
            After = null,
            Reason = request.Text,
            Timestamp = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetApplication), new { id = id }, null);
    }

    /// <summary>
    /// Returns a list of all clients.
    /// </summary>
    [HttpGet("clients")]
    public async Task<ActionResult<IEnumerable<AdminClientResponse>>> GetClients(CancellationToken cancellationToken)
    {
        var clients = await _dbContext.Clients
            .AsNoTracking()
            .OrderBy(c => c.Name)
            .ToListAsync(cancellationToken);

        var response = clients.Select(c => new AdminClientResponse
        {
            Id = c.ClientId,
            Reference = c.ClientId.Replace("CL-", "REF-"),
            Name = c.Name,
            Email = c.Email,
            ManagerId = c.ManagerId ?? string.Empty,
            ManagerName = c.ManagerName ?? "Unassigned",
            Since = c.Since.ToString("yyyy-MM-dd"),
            Status = c.Status
        });

        return Ok(response);
    }

    /// <summary>
    /// Returns all account managers.
    /// </summary>
    [HttpGet("managers")]
    public async Task<ActionResult<IEnumerable<AccountManager>>> GetManagers(CancellationToken cancellationToken)
    {
        var managers = await _dbContext.AccountManagers
            .AsNoTracking()
            .OrderBy(m => m.Name)
            .ToListAsync(cancellationToken);

        return Ok(managers);
    }

    /// <summary>
    /// Returns the audit log events.
    /// </summary>
    [HttpGet("audit")]
    public async Task<ActionResult<IEnumerable<AdminAuditEventResponse>>> GetAuditEvents(
        [FromQuery] string? severity,
        [FromQuery] string? search,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.AuditEvents.AsNoTracking().AsQueryable();

        if (!string.IsNullOrWhiteSpace(severity) && !string.Equals(severity, "All", StringComparison.OrdinalIgnoreCase))
        {
            // Map ui severity to something if needed. Currently UI uses info, warning, critical.
            // Let's check matching.
            query = query.Where(e => e.Action.Contains("Failed") && severity == "critical" 
                || e.Action.Contains("Success") && severity == "info"
                || severity == "All");
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim().ToLower();
            query = query.Where(e => 
                (e.ActorName != null && e.ActorName.ToLower().Contains(searchLower)) || 
                e.Action.ToLower().Contains(searchLower) || 
                e.EntityType.ToLower().Contains(searchLower) ||
                (e.Reason != null && e.Reason.ToLower().Contains(searchLower)));
        }

        var events = await query
            .OrderByDescending(e => e.Timestamp)
            .Take(100) // limit to recent 100 for performance
            .ToListAsync(cancellationToken);

        var response = events.Select(e => new AdminAuditEventResponse
        {
            Id = e.AuditEventId,
            Actor = e.ActorName ?? e.ActorId,
            Action = e.Action,
            Target = $"{e.EntityType} ({e.EntityId})",
            Timestamp = e.Timestamp.ToString("O"),
            Reason = e.Reason,
            Severity = e.Action.Contains("Failed") ? "critical" : "info"
        });

        return Ok(response);
    }
}

public class AdminApplicationResponse
{
    public string Id { get; set; } = string.Empty;
    public string Reference { get; set; } = string.Empty;
    public string ApplicantName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Country { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string AssignedReviewer { get; set; } = string.Empty;
    public string SubmittedAt { get; set; } = string.Empty;
    public string LastUpdated { get; set; } = string.Empty;
    public string Route { get; set; } = string.Empty;
}

public class ApplicationNoteDto
{
    public string Author { get; set; } = string.Empty;
    public string Date { get; set; } = string.Empty;
    public string Text { get; set; } = string.Empty;
}

public class AdminApplicationDetailResponse : AdminApplicationResponse
{
    public List<ApplicationNoteDto> Notes { get; set; } = new();
}

public class UpdateStatusRequest
{
    [Required]
    public string Status { get; set; } = string.Empty;

    [MaxLength(1000)]
    public string? Reason { get; set; }
}

public class AddNoteRequest
{
    [Required]
    [MinLength(1)]
    [MaxLength(1000)]
    public string Text { get; set; } = string.Empty;
}

public class AdminClientResponse
{
    public string Id { get; set; } = string.Empty;
    public string Reference { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string ManagerId { get; set; } = string.Empty;
    public string ManagerName { get; set; } = string.Empty;
    public string Since { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
}

public class AdminAuditEventResponse
{
    public string Id { get; set; } = string.Empty;
    public string Actor { get; set; } = string.Empty;
    public string Action { get; set; } = string.Empty;
    public string Target { get; set; } = string.Empty;
    public string Timestamp { get; set; } = string.Empty;
    public string? Reason { get; set; }
    public string Severity { get; set; } = "info"; // info | warning | critical
}
