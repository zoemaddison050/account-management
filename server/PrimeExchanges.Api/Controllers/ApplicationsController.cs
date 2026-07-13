using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using PrimeExchanges.Api.Data;
using PrimeExchanges.Api.Models;

namespace PrimeExchanges.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ApplicationsController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly ILogger<ApplicationsController> _logger;

    // Approved application status values
    private static readonly string[] ValidStatuses =
    [
        "Inquiry submitted",
        "Application received",
        "Under review",
        "Information requested",
        "Approval pending",
        "Approved — activation pending",
        "Active client",
        "Declined",
        "Paused / closed",
    ];

    public ApplicationsController(AppDbContext dbContext, ILogger<ApplicationsController> logger)
    {
        _dbContext = dbContext;
        _logger = logger;
    }

    /// <summary>
    /// Public endpoint: submit an application inquiry.
    /// Rate-limited. Does NOT create a client account.
    /// </summary>
    [HttpPost]
    [EnableRateLimiting("public-form")]
    public async Task<ActionResult<SubmitApplicationResponse>> SubmitApplication(
        [FromBody] SubmitApplicationRequest request,
        CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        // Prevent duplicate submissions within the same day for the same email.
        var duplicate = await _dbContext.Applications
            .AnyAsync(a => a.Email == normalizedEmail &&
                           a.SubmittedAt >= DateTime.UtcNow.AddHours(-24),
                      cancellationToken);

        if (duplicate)
        {
            // Return 200 to avoid revealing whether the email exists.
            _logger.LogWarning("Duplicate application attempt for {Email}", normalizedEmail);
            return Ok(new SubmitApplicationResponse
            {
                Message = "Your application has been received. We'll be in touch shortly.",
            });
        }

        var applicationId = $"APP-{DateTime.UtcNow:yyyyMMdd}-{Guid.NewGuid():N}"[..24];
        var reference = $"PX-{DateTime.UtcNow:yy}{Random.Shared.Next(10000, 99999)}";

        var application = new Application
        {
            ApplicationId = applicationId,
            Reference = reference,
            ApplicantName = $"{request.FirstName.Trim()} {request.LastName.Trim()}",
            Email = normalizedEmail,
            Country = request.Country.Trim(),
            Status = "Inquiry submitted",
            Route = "online",
            SubmittedAt = DateTime.UtcNow,
            LastUpdated = DateTime.UtcNow,
        };

        _dbContext.Applications.Add(application);

        // Record consent.
        _dbContext.ConsentRecords.Add(new ConsentRecord
        {
            ApplicationId = applicationId,
            PolicyVersion = request.ConsentVersion,
            Email = normalizedEmail,
            IpAddress = HttpContext.Connection.RemoteIpAddress?.ToString(),
            ConsentedAt = DateTime.UtcNow,
        });

        // Audit the submission.
        _dbContext.AuditEvents.Add(new AuditEvent
        {
            AuditEventId = Guid.NewGuid().ToString(),
            EntityType = "Application",
            EntityId = applicationId,
            Action = "Created",
            ActorId = "public-form",
            After = $"Status=Inquiry submitted|Email={normalizedEmail}",
            Timestamp = DateTime.UtcNow,
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        // Issue a short-lived PDF grant (30 minutes).
        var plainToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
        var tokenHash = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(plainToken)));

        _dbContext.PdfGrants.Add(new PdfGrant
        {
            TokenHash = tokenHash,
            ApplicationId = applicationId,
            ApplicantEmail = normalizedEmail,
            IssuedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddMinutes(30),
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        _logger.LogInformation(
            "Application submitted. Id={ApplicationId} Ref={Reference} Email={Email}",
            applicationId, reference, normalizedEmail);

        return Ok(new SubmitApplicationResponse
        {
            Reference = reference,
            PdfToken = plainToken,
            Message = "Your application has been received. We'll be in touch shortly.",
        });
    }

    /// <summary>
    /// Downloads a personalised server-generated PDF using a short-lived single-use token.
    /// </summary>
    [HttpGet("pdf/{token}")]
    [EnableRateLimiting("pdf-download")]
    public async Task<IActionResult> DownloadPdf(string token, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest();

        var tokenHash = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)));

        var grant = await _dbContext.PdfGrants
            .FirstOrDefaultAsync(g => g.TokenHash == tokenHash, cancellationToken);

        if (grant == null || grant.IsUsed || grant.IsExpired)
        {
            _logger.LogWarning("Invalid or expired PDF grant token used.");
            return NotFound(new { message = "This download link is invalid or has expired." });
        }

        var application = await _dbContext.Applications
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.ApplicationId == grant.ApplicationId, cancellationToken);

        if (application == null)
            return NotFound();

        // Mark the grant as used (single-use).
        grant.UsedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        // TODO: Replace with a proper server-side PDF generation library (e.g. QuestPDF).
        // This is a PLACEHOLDER that returns a plain text file until PDF generation is wired up.
        var content = $"""
            =====================================
            PrimeXchanges — APPLICATION DOCUMENT
            =====================================
            [DEMONSTRATION — NOT A LEGAL DOCUMENT]

            Reference:   {application.Reference}
            Name:        {application.ApplicantName}
            Email:       {application.Email}
            Issued:      {DateTime.UtcNow:yyyy-MM-dd HH:mm} UTC

            This document is a prototype placeholder.
            Final content requires legal and compliance approval.
            =====================================
            """;

        var bytes = System.Text.Encoding.UTF8.GetBytes(content);
        return File(bytes, "application/pdf",
            $"PrimeXchanges-Application-{application.Reference}.pdf");
    }
}

// ─── Request / Response DTOs ───────────────────────────────────────────────

public class SubmitApplicationRequest
{
    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string LastName { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Country { get; set; } = string.Empty;

    [MaxLength(50)]
    public string PreferredManager { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ReferralSource { get; set; } = string.Empty;

    [MaxLength(2000)]
    public string ServiceInterest { get; set; } = string.Empty;

    /// <summary>The privacy/consent policy version shown to the user, e.g. "privacy-v1.0".</summary>
    [Required]
    [MaxLength(50)]
    public string ConsentVersion { get; set; } = "privacy-v1.0";
}

public class SubmitApplicationResponse
{
    public string? Reference { get; set; }
    public string? PdfToken { get; set; }
    public string Message { get; set; } = string.Empty;
}
