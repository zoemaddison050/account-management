using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using PrimeExchanges.Api.Data;
using PrimeExchanges.Api.Models;
using PrimeExchanges.Api.Services;

namespace PrimeExchanges.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize(Roles = "Administrator,OperationsReviewer,ComplianceApprover,AccountManager")]
public class AdminController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IEmailService _emailService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AdminController> _logger;
    private static readonly HashSet<string> ValidApplicationStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "Inquiry submitted",
        "Form downloaded",
        "Application received",
        "Under review",
        "Information requested",
        "Approval pending",
        "Approved — activation pending",
        "Active client",
        "Declined",
        "Paused / closed",
    };
    private static readonly HashSet<string> ValidManagerStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "active",
        "at capacity",
        "inactive",
    };

    public AdminController(
        AppDbContext dbContext,
        IEmailService emailService,
        IConfiguration configuration,
        ILogger<AdminController> logger)
    {
        _dbContext = dbContext;
        _emailService = emailService;
        _configuration = configuration;
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

        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;

        if (string.Equals(role, "AccountManager", StringComparison.OrdinalIgnoreCase))
        {
            var manager = await _dbContext.AccountManagers
                .FirstOrDefaultAsync(m => m.Email == userEmail, cancellationToken);
            if (manager != null)
            {
                query = query.Where(a => a.AssignedManagerId == manager.ManagerId || a.AssignedReviewer == manager.Name);
            }
            else
            {
                query = query.Where(a => false);
            }
        }

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

        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;

        if (string.Equals(role, "AccountManager", StringComparison.OrdinalIgnoreCase))
        {
            var manager = await _dbContext.AccountManagers
                .FirstOrDefaultAsync(m => m.Email == userEmail, cancellationToken);
            if (manager == null || (app.AssignedManagerId != manager.ManagerId && app.AssignedReviewer != manager.Name))
            {
                return StatusCode(403, new { message = "You are not authorized to view this application." });
            }
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

        if (!ValidApplicationStatuses.Contains(request.Status))
        {
            return BadRequest(new { message = "Invalid application status." });
        }

        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

        // Role restriction checks
        if (string.Equals(role, "AccountManager", StringComparison.OrdinalIgnoreCase))
        {
            return StatusCode(403, new { message = "Account Managers are not authorized to modify application statuses." });
        }

        if (string.Equals(role, "OperationsReviewer", StringComparison.OrdinalIgnoreCase))
        {
            if (string.Equals(request.Status, "Approved — activation pending", StringComparison.OrdinalIgnoreCase))
            {
                return StatusCode(403, new { message = "Operations Reviewers are not authorized to approve applications. Compliance approval is required." });
            }
        }

        // Status sequence transition checks
        var oldStatus = app.Status;

        // If not Administrator, enforce transition constraints
        if (!string.Equals(role, "Administrator", StringComparison.OrdinalIgnoreCase))
        {
            // If already in a terminal state, don't allow changing it
            if (string.Equals(oldStatus, "Declined", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(oldStatus, "Paused / closed", StringComparison.OrdinalIgnoreCase) ||
                string.Equals(oldStatus, "Active client", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = $"Cannot modify status because the application is already in a terminal state: {oldStatus}." });
            }

            // Enforce that approval can only happen from a review state
            if (string.Equals(request.Status, "Approved — activation pending", StringComparison.OrdinalIgnoreCase))
            {
                var allowedPreApprovalStates = new[] { "Under review", "Approval pending", "Information requested", "Application received", "Inquiry submitted" };
                if (!allowedPreApprovalStates.Contains(oldStatus, StringComparer.OrdinalIgnoreCase))
                {
                    return BadRequest(new { message = $"Applications cannot be approved directly from the '{oldStatus}' state." });
                }
            }
        }

        if (string.Equals(request.Status, "Active client", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Use the invitation workflow to activate a client." });
        }

        AccountManager? selectedManager = null;
        if (!string.IsNullOrWhiteSpace(request.ManagerId))
        {
            selectedManager = await _dbContext.AccountManagers
                .FirstOrDefaultAsync(m => m.ManagerId == request.ManagerId, cancellationToken);

            if (selectedManager == null)
            {
                return BadRequest(new { message = "Selected account manager was not found." });
            }

            if (!string.Equals(selectedManager.Status, "active", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(request.Status, "Declined", StringComparison.OrdinalIgnoreCase) &&
                !string.Equals(request.Status, "Paused / closed", StringComparison.OrdinalIgnoreCase))
            {
                return BadRequest(new { message = "Selected account manager is not active." });
            }
        }

        app.Status = request.Status;
        app.LastUpdated = DateTime.UtcNow;

        if (selectedManager != null)
        {
            app.AssignedReviewer = selectedManager.Name;
            app.AssignedManagerId = selectedManager.ManagerId;
        }

        var (actorId, actorName) = GetActor();

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
            Reason = BuildStatusChangeReason(request.Reason, selectedManager),
            Timestamp = DateTime.UtcNow
        });

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

        var (actorId, actorName) = GetActor();

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
    /// Issues a single-use invitation for an approved application.
    /// </summary>
    [HttpPost("applications/{id}/invitation")]
    [Authorize(Roles = "Administrator,ComplianceApprover")]
    public async Task<ActionResult<IssueInvitationResponse>> IssueClientInvitation(
        string id,
        [FromBody] IssueInvitationRequest request,
        CancellationToken cancellationToken)
    {
        var app = await _dbContext.Applications
            .FirstOrDefaultAsync(a => a.ApplicationId == id, cancellationToken);

        if (app == null)
        {
            return NotFound(new { message = "Application not found." });
        }

        if (!string.Equals(app.Status, "Approved — activation pending", StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "Move this application to Approved — activation pending before sending an invitation." });
        }

        var manager = await ResolveManagerByNameAsync(app.AssignedReviewer, cancellationToken);
        if (manager == null)
        {
            return BadRequest(new { message = "Assign an active account manager before sending an invitation." });
        }

        var existingClient = await _dbContext.Clients
            .AsNoTracking()
            .AnyAsync(c => c.Email == app.Email && c.Status == "active", cancellationToken);
        if (existingClient)
        {
            return Conflict(new { message = "This applicant already has an active client account." });
        }

        var now = DateTime.UtcNow;
        var openInvitations = await _dbContext.Invitations
            .Where(i => i.ApplicationId == id && i.AcceptedAt == null && i.RevokedAt == null && i.ExpiresAt > now)
            .ToListAsync(cancellationToken);

        foreach (var invitation in openInvitations)
        {
            invitation.RevokedAt = now;
        }

        var plainToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var invitationId = $"INV-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..24];
        var expiresInHours = request.ExpiresInHours is >= 1 and <= 168 ? request.ExpiresInHours.Value : 72;
        var expiresAt = now.AddHours(expiresInHours);
        var (actorId, actorName) = GetActor();

        var invitationRecord = new Invitation
        {
            InvitationId = invitationId,
            TokenHash = HashToken(plainToken),
            Email = app.Email,
            ApplicationId = app.ApplicationId,
            IssuedByUserId = actorId,
            IssuedAt = now,
            ExpiresAt = expiresAt,
        };

        _dbContext.Invitations.Add(invitationRecord);
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            AuditEventId = Guid.NewGuid().ToString(),
            EntityType = "Application",
            EntityId = app.ApplicationId,
            Action = "InvitationSent",
            ActorId = actorId,
            ActorName = actorName,
            After = $"InvitationId={invitationId}|Email={app.Email}|ExpiresAt={expiresAt:O}",
            Reason = request.Reason,
            Timestamp = now,
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        var portalBaseUrl = _configuration["Portal:BaseUrl"]?.TrimEnd('/')
            ?? $"{Request.Scheme}://{Request.Host}";
        var invitationUrl = $"{portalBaseUrl}/invite/{plainToken}";

        await _emailService.SendClientInvitationAsync(
            app.Email,
            app.ApplicantName,
            app.Reference,
            invitationUrl,
            expiresAt,
            cancellationToken);

        return Ok(new IssueInvitationResponse
        {
            InvitationId = invitationId,
            ExpiresAt = expiresAt.ToString("O"),
            InvitationUrl = invitationUrl,
        });
    }

    /// <summary>
    /// Returns a list of all clients.
    /// </summary>
    [HttpGet("clients")]
    public async Task<ActionResult<IEnumerable<AdminClientResponse>>> GetClients(CancellationToken cancellationToken)
    {
        var role = User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;
        var userEmail = User.FindFirstValue(ClaimTypes.Email) ?? User.Identity?.Name;

        var query = _dbContext.Clients.AsNoTracking().AsQueryable();

        if (string.Equals(role, "AccountManager", StringComparison.OrdinalIgnoreCase))
        {
            var manager = await _dbContext.AccountManagers
                .FirstOrDefaultAsync(m => m.Email == userEmail, cancellationToken);
            if (manager != null)
            {
                query = query.Where(c => c.ManagerId == manager.ManagerId || c.ManagerName == manager.Name);
            }
            else
            {
                query = query.Where(c => false);
            }
        }

        var clients = await query
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
    public async Task<ActionResult<IEnumerable<ManagerDto>>> GetManagers(CancellationToken cancellationToken)
    {
        var managers = await _dbContext.AccountManagers
            .AsNoTracking()
            .OrderBy(m => m.Name)
            .Select(m => new ManagerDto
            {
                Id = m.ManagerId,
                Name = m.Name,
                Title = m.Title,
                Email = m.Email,
                ActiveClients = m.ActiveClients,
                Capacity = m.Capacity,
                Status = m.Status,
            })
            .ToListAsync(cancellationToken);

        return Ok(managers);
    }

    /// <summary>
    /// Creates a new account manager.
    /// </summary>
    [HttpPost("managers")]
    [Authorize(Roles = "Administrator,ComplianceApprover")]
    public async Task<ActionResult<ManagerDto>> CreateManager(
        [FromBody] UpsertAccountManagerRequest request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        if (await _dbContext.AccountManagers.AnyAsync(m => m.Email == normalizedEmail, cancellationToken))
        {
            return Conflict(new { message = "An account manager with this email already exists." });
        }

        var manager = new AccountManager
        {
            ManagerId = await GenerateManagerIdAsync(cancellationToken),
            Name = request.Name.Trim(),
            Title = request.Title.Trim(),
            Email = normalizedEmail,
            ActiveClients = Math.Max(0, request.ActiveClients),
            Capacity = Math.Max(0, request.Capacity),
            Status = NormalizeManagerStatus(request.Status, request.ActiveClients, request.Capacity),
        };

        _dbContext.AccountManagers.Add(manager);

        var (actorId, actorName) = GetActor();
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            AuditEventId = Guid.NewGuid().ToString(),
            EntityType = "AccountManager",
            EntityId = manager.ManagerId,
            Action = "Created",
            ActorId = actorId,
            ActorName = actorName,
            After = $"Name={manager.Name}|Email={manager.Email}|Status={manager.Status}",
            Timestamp = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        return CreatedAtAction(nameof(GetManagers), new { id = manager.ManagerId }, ToManagerDto(manager));
    }

    /// <summary>
    /// Updates an account manager's editable roster fields.
    /// </summary>
    [HttpPut("managers/{managerId}")]
    [Authorize(Roles = "Administrator,ComplianceApprover")]
    public async Task<ActionResult<ManagerDto>> UpdateManager(
        string managerId,
        [FromBody] UpsertAccountManagerRequest request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var manager = await _dbContext.AccountManagers
            .FirstOrDefaultAsync(m => m.ManagerId == managerId, cancellationToken);

        if (manager == null)
        {
            return NotFound(new { message = "Account manager not found." });
        }

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();
        var emailInUse = await _dbContext.AccountManagers
            .AnyAsync(m => m.ManagerId != managerId && m.Email == normalizedEmail, cancellationToken);
        if (emailInUse)
        {
            return Conflict(new { message = "Another account manager already uses this email." });
        }

        var before = $"Name={manager.Name}|Email={manager.Email}|Capacity={manager.Capacity}|Status={manager.Status}";
        manager.Name = request.Name.Trim();
        manager.Title = request.Title.Trim();
        manager.Email = normalizedEmail;
        manager.ActiveClients = Math.Max(0, request.ActiveClients);
        manager.Capacity = Math.Max(0, request.Capacity);
        manager.Status = NormalizeManagerStatus(request.Status, manager.ActiveClients, manager.Capacity);

        var (actorId, actorName) = GetActor();
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            AuditEventId = Guid.NewGuid().ToString(),
            EntityType = "AccountManager",
            EntityId = manager.ManagerId,
            Action = "Updated",
            ActorId = actorId,
            ActorName = actorName,
            Before = before,
            After = $"Name={manager.Name}|Email={manager.Email}|Capacity={manager.Capacity}|Status={manager.Status}",
            Timestamp = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(ToManagerDto(manager));
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

    private (string ActorId, string ActorName) GetActor()
    {
        var actorId = User.FindFirstValue("clientId")
            ?? User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.Identity?.Name
            ?? "system";
        var actorName = User.FindFirstValue(ClaimTypes.Name)
            ?? User.FindFirstValue(ClaimTypes.Email)
            ?? "Staff User";
        return (actorId, actorName);
    }

    private async Task<AccountManager?> ResolveManagerByNameAsync(string managerName, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(managerName) || string.Equals(managerName, "Unassigned", StringComparison.OrdinalIgnoreCase))
        {
            return null;
        }

        return await _dbContext.AccountManagers
            .FirstOrDefaultAsync(m => m.Name == managerName && m.Status == "active", cancellationToken);
    }

    private async Task<string> GenerateManagerIdAsync(CancellationToken cancellationToken)
    {
        var count = await _dbContext.AccountManagers.CountAsync(cancellationToken);
        string managerId;
        do
        {
            count += 1;
            managerId = $"MGR-{count:000}";
        }
        while (await _dbContext.AccountManagers.AnyAsync(m => m.ManagerId == managerId, cancellationToken));

        return managerId;
    }

    private static string BuildStatusChangeReason(string? reason, AccountManager? manager)
    {
        if (manager == null)
        {
            return reason ?? string.Empty;
        }

        var managerText = $"Assigned manager: {manager.Name}";
        return string.IsNullOrWhiteSpace(reason) ? managerText : $"{reason} | {managerText}";
    }

    private static string NormalizeManagerStatus(string status, int activeClients, int capacity)
    {
        var normalizedStatus = string.IsNullOrWhiteSpace(status) ? "active" : status.Trim().ToLowerInvariant();
        if (!ValidManagerStatuses.Contains(normalizedStatus))
        {
            normalizedStatus = "active";
        }

        return GetManagerStatus(activeClients, capacity, normalizedStatus);
    }

    private static string GetManagerStatus(int activeClients, int capacity, string currentStatus)
    {
        if (string.Equals(currentStatus, "inactive", StringComparison.OrdinalIgnoreCase))
        {
            return "inactive";
        }

        if (capacity > 0 && activeClients >= capacity)
        {
            return "at capacity";
        }

        return "active";
    }

    private static ManagerDto ToManagerDto(AccountManager manager)
    {
        return new ManagerDto
        {
            Id = manager.ManagerId,
            Name = manager.Name,
            Title = manager.Title,
            Email = manager.Email,
            ActiveClients = manager.ActiveClients,
            Capacity = manager.Capacity,
            Status = manager.Status,
        };
    }

    private static string HashToken(string token)
    {
        return Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(token)));
    }

    /// <summary>
    /// Deletes an account manager.
    /// </summary>
    [HttpDelete("managers/{managerId}")]
    [Authorize(Roles = "Administrator,ComplianceApprover")]
    public async Task<IActionResult> DeleteManager(string managerId, CancellationToken cancellationToken)
    {
        var manager = await _dbContext.AccountManagers.FirstOrDefaultAsync(m => m.ManagerId == managerId, cancellationToken);
        if (manager == null)
        {
            return NotFound(new { message = "Manager not found." });
        }

        // Reassign clients to Unassigned
        var assignedClients = await _dbContext.Clients.Where(c => c.ManagerId == managerId).ToListAsync(cancellationToken);
        foreach (var client in assignedClients)
        {
            client.ManagerId = null;
            client.ManagerName = null;
        }

        _dbContext.AccountManagers.Remove(manager);
        
        var (actorId, actorName) = GetActor();
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            AuditEventId = Guid.NewGuid().ToString(),
            EntityType = "AccountManager",
            EntityId = managerId,
            Action = "Deleted",
            ActorId = actorId,
            ActorName = actorName,
            Reason = "Administrative deletion",
            Timestamp = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Deletes a client.
    /// </summary>
    [HttpDelete("clients/{clientId}")]
    [Authorize(Roles = "Administrator,ComplianceApprover")]
    public async Task<IActionResult> DeleteClient(string clientId, CancellationToken cancellationToken)
    {
        var client = await _dbContext.Clients.FirstOrDefaultAsync(c => c.ClientId == clientId, cancellationToken);
        if (client == null)
        {
            return NotFound(new { message = "Client not found." });
        }

        _dbContext.Clients.Remove(client);

        var (actorId, actorName) = GetActor();
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            AuditEventId = Guid.NewGuid().ToString(),
            EntityType = "Client",
            EntityId = clientId,
            Action = "Deleted",
            ActorId = actorId,
            ActorName = actorName,
            Reason = "Administrative deletion",
            Timestamp = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Deletes an application request.
    /// </summary>
    [HttpDelete("applications/{id}")]
    [Authorize(Roles = "Administrator,ComplianceApprover,OperationsReviewer")]
    public async Task<IActionResult> DeleteApplication(string id, CancellationToken cancellationToken)
    {
        var app = await _dbContext.Applications.FirstOrDefaultAsync(a => a.ApplicationId == id, cancellationToken);
        if (app == null)
        {
            return NotFound(new { message = "Application not found." });
        }

        _dbContext.Applications.Remove(app);

        var drafts = await _dbContext.ApplicationDrafts.Where(d => d.Email == app.Email).ToListAsync(cancellationToken);
        if (drafts.Any())
        {
            _dbContext.ApplicationDrafts.RemoveRange(drafts);
        }

        var (actorId, actorName) = GetActor();
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            AuditEventId = Guid.NewGuid().ToString(),
            EntityType = "Application",
            EntityId = id,
            Action = "Deleted",
            ActorId = actorId,
            ActorName = actorName,
            Reason = "Administrative deletion",
            Timestamp = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return NoContent();
    }

    /// <summary>
    /// Generates/downloads the PDF for an application request.
    /// </summary>
    [HttpGet("applications/{id}/pdf")]
    [Authorize(Roles = "Administrator,ComplianceApprover,OperationsReviewer,AccountManager")]
    public async Task<IActionResult> GetApplicationPdf(string id, CancellationToken cancellationToken)
    {
        var app = await _dbContext.Applications.FirstOrDefaultAsync(a => a.ApplicationId == id, cancellationToken);
        if (app == null)
        {
            return NotFound(new { message = "Application not found." });
        }

        var consent = await _dbContext.ConsentRecords
            .AsNoTracking()
            .OrderByDescending(c => c.ConsentedAt)
            .FirstOrDefaultAsync(c => c.ApplicationId == id, cancellationToken);

        var pdfBytes = ApplicationsController.GenerateApplicationPdf(
            app, 
            null, 
            consent?.ConsentedAt.ToString("yyyy-MM-dd HH:mm:ss 'UTC'")
        );

        return File(pdfBytes, "application/pdf", $"PrimeXchanges-Application-{app.Reference}.pdf");
    }

    /// <summary>
    /// Returns detail of a single client.
    /// </summary>
    [HttpGet("clients/{clientId}")]
    [Authorize(Roles = "Administrator,ComplianceApprover,OperationsReviewer,AccountManager")]
    public async Task<ActionResult<AdminClientDetailResponse>> GetClient(string clientId, CancellationToken cancellationToken)
    {
        var client = await _dbContext.Clients
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.ClientId == clientId, cancellationToken);

        if (client == null)
        {
            return NotFound(new { message = "Client not found." });
        }

        return Ok(new AdminClientDetailResponse
        {
            Id = client.ClientId,
            Reference = client.ClientId.Replace("CL-", "REF-"),
            Name = client.Name,
            Email = client.Email,
            ManagerId = client.ManagerId ?? string.Empty,
            ManagerName = client.ManagerName ?? "Unassigned",
            Since = client.Since.ToString("yyyy-MM-dd"),
            Status = client.Status,
            PortfoliosJson = client.PortfoliosJson ?? "[]",
            DocumentsJson = client.DocumentsJson ?? "[]",
            ActivityJson = client.ActivityJson ?? "[]"
        });
    }

    /// <summary>
    /// Updates a client's portfolios, documents, and activities JSON fields.
    /// </summary>
    [HttpPut("clients/{clientId}/portfolio-data")]
    [Authorize(Roles = "Administrator,ComplianceApprover,OperationsReviewer")]
    public async Task<IActionResult> UpdateClientPortfolioData(
        string clientId,
        [FromBody] UpdateClientPortfolioDataRequest request,
        CancellationToken cancellationToken)
    {
        if (request == null)
        {
            return BadRequest(new { message = "Request body is required." });
        }

        var client = await _dbContext.Clients
            .FirstOrDefaultAsync(c => c.ClientId == clientId, cancellationToken);

        if (client == null)
        {
            return NotFound(new { message = "Client not found." });
        }

        client.PortfoliosJson = request.PortfoliosJson;
        client.DocumentsJson = request.DocumentsJson;
        client.ActivityJson = request.ActivityJson;

        var (actorId, actorName) = GetActor();
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            AuditEventId = Guid.NewGuid().ToString(),
            EntityType = "Client",
            EntityId = clientId,
            Action = "PortfolioDataUpdated",
            ActorId = actorId,
            ActorName = actorName,
            Timestamp = DateTime.UtcNow
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "Client portfolio data updated successfully." });
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

    [MaxLength(50)]
    public string? ManagerId { get; set; }
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

public class UpsertAccountManagerRequest
{
    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Range(0, 10000)]
    public int ActiveClients { get; set; }

    [Range(0, 10000)]
    public int Capacity { get; set; } = 20;

    [MaxLength(50)]
    public string Status { get; set; } = "active";
}

public class IssueInvitationRequest
{
    [Range(1, 168)]
    public int? ExpiresInHours { get; set; } = 72;

    [MaxLength(1000)]
    public string? Reason { get; set; }
}

public class IssueInvitationResponse
{
    public string InvitationId { get; set; } = string.Empty;
    public string ExpiresAt { get; set; } = string.Empty;
    public string InvitationUrl { get; set; } = string.Empty;
}

public class AdminClientDetailResponse
{
    public string Id { get; set; } = string.Empty;
    public string Reference { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string ManagerId { get; set; } = string.Empty;
    public string ManagerName { get; set; } = string.Empty;
    public string Since { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string PortfoliosJson { get; set; } = "[]";
    public string DocumentsJson { get; set; } = "[]";
    public string ActivityJson { get; set; } = "[]";
}

public class UpdateClientPortfolioDataRequest
{
    public string PortfoliosJson { get; set; } = "[]";
    public string DocumentsJson { get; set; } = "[]";
    public string ActivityJson { get; set; } = "[]";
}
