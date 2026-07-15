using System.ComponentModel.DataAnnotations;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using PrimeExchanges.Api.Data;
using PrimeExchanges.Api.Models;
using PrimeExchanges.Api.Services;
using PdfSharpCore.Drawing;
using PdfSharpCore.Pdf;
using System.IO;

namespace PrimeExchanges.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ApplicationsController : ControllerBase
{
    private readonly AppDbContext _dbContext;
    private readonly IEmailService _emailService;
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

    public ApplicationsController(AppDbContext dbContext, IEmailService emailService, ILogger<ApplicationsController> logger)
    {
        _dbContext = dbContext;
        _emailService = emailService;
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
            AssignedReviewer = request.PreferredManager.Trim(),
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
        var plainToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(32));
        var tokenHash = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(plainToken)));

        _dbContext.PdfGrants.Add(new PdfGrant
        {
            TokenHash = tokenHash,
            ApplicationId = applicationId,
            ApplicantEmail = normalizedEmail,
            IssuedAt = DateTime.UtcNow,
            ExpiresAt = DateTime.UtcNow.AddMinutes(30),
        });

        // Remove application draft if one exists
        var existingDraft = await _dbContext.ApplicationDrafts
            .FirstOrDefaultAsync(d => d.Email == normalizedEmail, cancellationToken);
        if (existingDraft != null)
        {
            _dbContext.ApplicationDrafts.Remove(existingDraft);
        }

        await _dbContext.SaveChangesAsync(cancellationToken);

        try
        {
            await _emailService.SendApplicationSubmittedAlertAsync(
                reference,
                application.ApplicantName,
                normalizedEmail,
                application.Country,
                application.AssignedReviewer,
                cancellationToken);
        }
        catch (Exception ex)
        {
            _logger.LogError(
                ex,
                "Application notification email failed. Id={ApplicationId} Ref={Reference}",
                applicationId,
                reference);
        }

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
    /// Downloads an unsigned personalised server-generated PDF using a short-lived token.
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

        // Generate PDF without applicant signature
        var bytes = GenerateApplicationPdf(application, null, null);
        return File(bytes, "application/pdf", $"PrimeXchanges-Application-{application.Reference}.pdf");
    }

    /// <summary>
    /// Downloads a signed personalised server-generated PDF, marking the token as used.
    /// </summary>
    [HttpPost("pdf/{token}")]
    [EnableRateLimiting("pdf-download")]
    public async Task<IActionResult> DownloadSignedPdf(
        string token,
        [FromBody] SignApplicationPdfRequest request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token))
            return BadRequest();

        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var tokenHash = Convert.ToHexString(SHA256.HashData(System.Text.Encoding.UTF8.GetBytes(token)));

        var grant = await _dbContext.PdfGrants
            .FirstOrDefaultAsync(g => g.TokenHash == tokenHash, cancellationToken);

        if (grant == null || grant.IsUsed || grant.IsExpired)
        {
            _logger.LogWarning("Invalid or expired PDF grant token used for signing.");
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

        // Generate PDF with applicant signature
        var bytes = GenerateApplicationPdf(application, request.Signature, request.Date);
        return File(bytes, "application/pdf", $"PrimeXchanges-Application-{application.Reference}.pdf");
    }

    private byte[] GenerateApplicationPdf(Application application, string? signatureBase64, string? signatureDate)
    {
        // Create document
        var document = new PdfDocument();
        document.Info.Title = $"PrimeXchanges Application - {application.Reference}";
        
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
        var titleFont = new XFont("Arial", 20, XFontStyle.Bold);
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
        gfx.DrawString("PORTAL SERVICE", new XFont("Arial", 8, XFontStyle.Regular), logoBrush, 175, 46);
        
        // Draw orange accent line under header
        var orangeBrush = new XSolidBrush(orangeColor);
        gfx.DrawRectangle(orangeBrush, 0, 80, page.Width, 4);
        
        // Main title
        gfx.DrawString("Account Management Application Worksheet", titleFont, headerBrush, 40, 120);
        gfx.DrawString("Official Document · Prepared for routing and eligibility checks · v1.0", subtitleFont, new XSolidBrush(textMuted), 40, 138);
        
        // Details box header
        gfx.DrawString("APPLICATION DETAILS", sectionHeaderFont, orangeBrush, 40, 170);
        
        // Draw grey background box for details
        var boxBrush = new XSolidBrush(grayColor);
        gfx.DrawRectangle(boxBrush, 40, 180, page.Width - 80, 110);
        
        // Populate details
        double labelX = 60;
        double valueX = 200;
        double startY = 200;
        double lineSpacing = 20;
        var labelBrush = new XSolidBrush(textDark);
        
        gfx.DrawString("Reference Number:", bodyBoldFont, labelBrush, labelX, startY);
        gfx.DrawString(application.Reference, monoFont, new XSolidBrush(orangeColor), valueX, startY);
        
        gfx.DrawString("Applicant Full Name:", bodyBoldFont, labelBrush, labelX, startY + lineSpacing);
        gfx.DrawString(application.ApplicantName, bodyFont, labelBrush, valueX, startY + lineSpacing);
        
        gfx.DrawString("Email Address:", bodyBoldFont, labelBrush, labelX, startY + 2 * lineSpacing);
        gfx.DrawString(application.Email, bodyFont, labelBrush, valueX, startY + 2 * lineSpacing);
        
        gfx.DrawString("Jurisdiction of Residence:", bodyBoldFont, labelBrush, labelX, startY + 3 * lineSpacing);
        gfx.DrawString(application.Country, bodyFont, labelBrush, valueX, startY + 3 * lineSpacing);
        
        gfx.DrawString("Submission Date (UTC):", bodyBoldFont, labelBrush, labelX, startY + 4 * lineSpacing);
        gfx.DrawString(application.SubmittedAt.ToString("yyyy-MM-dd HH:mm:ss") + " UTC", bodyFont, labelBrush, valueX, startY + 4 * lineSpacing);

        // Account Manager Section
        gfx.DrawString("ASSIGNED ACCOUNT MANAGER", sectionHeaderFont, orangeBrush, 40, 315);
        gfx.DrawRectangle(boxBrush, 40, 325, page.Width - 80, 50);
        
        string managerName = string.IsNullOrEmpty(application.AssignedReviewer) ? "Prime Exchanges Account Team" : application.AssignedReviewer;
        string managerRole = string.IsNullOrEmpty(application.AssignedReviewer) ? "No Preference" : "Preferred Account Manager";
        
        gfx.DrawString("Assigned Manager:", bodyBoldFont, labelBrush, labelX, 345);
        gfx.DrawString(managerName, bodyFont, labelBrush, valueX, 345);
        gfx.DrawString("Routing Route:", bodyBoldFont, labelBrush, labelX, 360);
        gfx.DrawString("online submission", bodyFont, labelBrush, valueX, 360);

        // Legal & Compliance Box
        gfx.DrawString("LEGAL CONSENT & PRIVACY DISCLOSURE", sectionHeaderFont, orangeBrush, 40, 400);
        
        var termsText = new[]
        {
            "By signing below, the applicant acknowledges that they have received and reviewed the current Privacy Policy,",
            "Terms of Service, and all jurisdictional disclosures of Prime Exchanges. The applicant consents to the collection,",
            "processing, and secure storage of their contact details for verification, routing, and compliance screening purposes.",
            "Prime Exchanges will never request credentials, passwords, bank detail updates, or API keys via this application form.",
            "For support or to revoke consent, contact compliance@primexchanges.com citing the reference above."
        };
        
        double termsY = 415;
        foreach (var line in termsText)
        {
            gfx.DrawString(line, subtitleFont, labelBrush, 40, termsY);
            termsY += 14;
        }
        
        // Signatures section
        gfx.DrawString("SIGNATURE BLOCKS", sectionHeaderFont, orangeBrush, 40, 505);
        
        // 3 columns: Company, Manager, Applicant
        double colWidth = (page.Width - 100) / 3;
        double sigY = 520;
        double sigHeight = 70;
        
        // Column 1: Company Representative
        gfx.DrawRectangle(boxBrush, 40, sigY, colWidth, sigHeight);
        // Draw a stylized signature line or script font for company
        gfx.DrawString("Prime Exchanges Ltd.", new XFont("Times New Roman", 14, XFontStyle.Italic), new XSolidBrush(navyColor), 50, sigY + 35);
        gfx.DrawLine(XPens.SlateGray, 50, sigY + sigHeight - 15, 40 + colWidth - 10, sigY + sigHeight - 15);
        gfx.DrawString("Authorized Officer", subtitleFont, new XSolidBrush(textDark), 50, sigY + sigHeight - 5);
        
        // Column 2: Account Manager
        gfx.DrawRectangle(boxBrush, 40 + colWidth + 10, sigY, colWidth, sigHeight);
        // Draw manager signature or generic management team signature
        gfx.DrawString(managerName, new XFont("Times New Roman", 14, XFontStyle.Italic), new XSolidBrush(navyColor), 40 + colWidth + 20, sigY + 35);
        gfx.DrawLine(XPens.SlateGray, 40 + colWidth + 20, sigY + sigHeight - 15, 40 + 2 * colWidth, sigY + sigHeight - 15);
        gfx.DrawString(managerRole, subtitleFont, new XSolidBrush(textDark), 40 + colWidth + 20, sigY + sigHeight - 5);
        
        // Column 3: Applicant (Digital Signature)
        double appX = 40 + 2 * colWidth + 20;
        gfx.DrawRectangle(boxBrush, appX, sigY, colWidth, sigHeight);
        
        if (!string.IsNullOrEmpty(signatureBase64))
        {
            try
            {
                var cleanBase64 = signatureBase64;
                if (cleanBase64.Contains(","))
                {
                    cleanBase64 = cleanBase64.Substring(cleanBase64.IndexOf(",") + 1);
                }
                var sigBytes = Convert.FromBase64String(cleanBase64);
                using var ximg = XImage.FromStream(() => new MemoryStream(sigBytes));
                // Draw inside the applicant signature box, scaled down
                gfx.DrawImage(ximg, appX + 5, sigY + 5, colWidth - 10, sigHeight - 25);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to decode or draw applicant signature image.");
                gfx.DrawString("[Signature Decode Error]", subtitleFont, new XSolidBrush(XColors.Red), appX + 10, sigY + 35);
            }
        }
        else
        {
            // Draw a dashed warning that signature is pending
            gfx.DrawString("PENDING SIGNATURE", new XFont("Arial", 8, XFontStyle.Bold), new XSolidBrush(textMuted), appX + 15, sigY + 35);
        }
        
        gfx.DrawLine(XPens.SlateGray, appX + 10, sigY + sigHeight - 15, page.Width - 50, sigY + sigHeight - 15);
        
        string signDateStr = string.IsNullOrEmpty(signatureDate) ? "Date: ___________" : $"Signed: {signatureDate}";
        gfx.DrawString(signDateStr, subtitleFont, new XSolidBrush(textDark), appX + 10, sigY + sigHeight - 5);
        
        // Draw Footer
        var footerBrush = new XSolidBrush(textMuted);
        gfx.DrawLine(XPens.LightGray, 40, page.Height - 40, page.Width - 40, page.Height - 40);
        gfx.DrawString("PrimeXchanges Account Management Portal · Confidential", subtitleFont, footerBrush, 40, page.Height - 25);
        gfx.DrawString("Page 1 of 1", subtitleFont, footerBrush, page.Width - 85, page.Height - 25);
        
        // Save to stream
        using var outputMs = new MemoryStream();
        document.Save(outputMs);
        return outputMs.ToArray();
    }

    /// <summary>
    /// Saves an application draft for the given email.
    /// </summary>
    [HttpPost("draft")]
    public async Task<IActionResult> SaveDraft([FromBody] SaveDraftRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var draft = await _dbContext.ApplicationDrafts.FirstOrDefaultAsync(d => d.Email == normalizedEmail, cancellationToken);
        if (draft == null)
        {
            draft = new ApplicationDraft
            {
                Email = normalizedEmail,
                DraftDataJson = request.DraftDataJson,
                LastSavedAt = DateTime.UtcNow
            };
            _dbContext.ApplicationDrafts.Add(draft);
        }
        else
        {
            draft.DraftDataJson = request.DraftDataJson;
            draft.LastSavedAt = DateTime.UtcNow;
        }

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "Draft saved successfully." });
    }

    /// <summary>
    /// Sends a 6-digit verification code to the email if a draft exists.
    /// </summary>
    [HttpPost("draft/request-resume")]
    public async Task<IActionResult> RequestResume([FromBody] RequestResumeRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var draft = await _dbContext.ApplicationDrafts.FirstOrDefaultAsync(d => d.Email == normalizedEmail, cancellationToken);
        if (draft == null)
        {
            _logger.LogInformation("Resume draft requested for email with no draft: {Email}", normalizedEmail);
            return Ok(new { message = "If a draft exists for this email, a verification code has been sent." });
        }

        var code = Random.Shared.Next(100000, 999999).ToString();
        draft.VerificationCode = code;
        draft.VerificationCodeExpiresAt = DateTime.UtcNow.AddMinutes(15);
        await _dbContext.SaveChangesAsync(cancellationToken);

        await _emailService.SendDraftResumeCodeAsync(
            normalizedEmail,
            code,
            cancellationToken
        );

        return Ok(new { message = "If a draft exists for this email, a verification code has been sent." });
    }

    /// <summary>
    /// Verifies the code and returns the saved application draft JSON.
    /// </summary>
    [HttpPost("draft/resume")]
    public async Task<ActionResult<ResumeDraftResponse>> ResumeDraft([FromBody] ResumeDraftRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
            return BadRequest(ModelState);

        var normalizedEmail = request.Email.Trim().ToLowerInvariant();

        var draft = await _dbContext.ApplicationDrafts.FirstOrDefaultAsync(d => d.Email == normalizedEmail, cancellationToken);
        if (draft == null || draft.VerificationCode != request.Code || draft.VerificationCodeExpiresAt < DateTime.UtcNow)
        {
            return BadRequest(new { message = "Invalid or expired verification code." });
        }

        draft.VerificationCode = null;
        draft.VerificationCodeExpiresAt = null;
        await _dbContext.SaveChangesAsync(cancellationToken);

        return Ok(new ResumeDraftResponse
        {
            Email = draft.Email,
            DraftDataJson = draft.DraftDataJson
        });
    }
}

// ─── Request / Response DTOs ───────────────────────────────────────────────

public class SignApplicationPdfRequest
{
    [Required]
    public string Signature { get; set; } = string.Empty;

    [Required]
    public string Date { get; set; } = string.Empty;
}

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

public class SaveDraftRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string DraftDataJson { get; set; } = string.Empty;
}

public class RequestResumeRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;
}

public class ResumeDraftRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{6}$", ErrorMessage = "Code must be 6 digits.")]
    public string Code { get; set; } = string.Empty;
}

public class ResumeDraftResponse
{
    public string Email { get; set; } = string.Empty;
    public string DraftDataJson { get; set; } = string.Empty;
}
