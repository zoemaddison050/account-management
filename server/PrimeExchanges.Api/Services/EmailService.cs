namespace PrimeExchanges.Api.Services;

using System.Net;
using System.Net.Mail;
using System.Text;
using Microsoft.AspNetCore.Hosting;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;
    private readonly IWebHostEnvironment _env;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger, IWebHostEnvironment env)
    {
        _configuration = configuration;
        _logger = logger;
        _env = env;
    }

    public async Task SendMagicLinkAsync(string email, string code, int expiresInMinutes, CancellationToken cancellationToken = default)
    {
        var subject = "Your PrimeXchanges sign-in code";
        var plainText = $"""
            Your PrimeXchanges Account Management Portal sign-in code is:

            {code}

            This code expires in {expiresInMinutes} minutes. If you did not request this code, you can ignore this message.
            """;

        var htmlContent = $"""
            <p>Your PrimeXchanges Account Management Portal sign-in code is:</p>
            <div style="font-size:24px;font-weight:700;letter-spacing:4px;color:#003c5f;background-color:#f1f5f9;padding:12px 20px;border-radius:6px;display:inline-block;margin:8px 0 20px 0;border:1px solid #e2e8f0;">{WebUtility.HtmlEncode(code)}</div>
            <p>This code expires in {expiresInMinutes} minutes. If you did not request this code, you can ignore this message.</p>
            """;
        var html = BuildHtmlBody("Your Sign-In Code", htmlContent);

        await SendAsync(email, subject, plainText, html, cancellationToken);
    }

    public async Task SendApplicationSubmittedAlertAsync(
        string reference,
        string applicantName,
        string applicantEmail,
        string country,
        string preferredManager,
        CancellationToken cancellationToken = default)
    {
        var supportAddress = _configuration["Email:SupportAddress"];
        if (string.IsNullOrWhiteSpace(supportAddress))
        {
            supportAddress = "support@primexchanges.com";
        }

        var managerText = string.IsNullOrWhiteSpace(preferredManager)
            ? "No preference selected"
            : preferredManager;

        var subject = $"New PrimeXchanges application: {reference}";
        var plainText = $"""
            A new account management application has been submitted.

            Reference: {reference}
            Applicant: {applicantName}
            Email: {applicantEmail}
            Country: {country}
            Preferred manager: {managerText}
            """;

        var htmlContent = $"""
            <p>A new account management application has been submitted and is ready for review.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0 20px 0;">
              <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:600;color:#475569;width:35%;">Reference</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;"><strong>{WebUtility.HtmlEncode(reference)}</strong></td></tr>
              <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:600;color:#475569;width:35%;">Applicant</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">{WebUtility.HtmlEncode(applicantName)}</td></tr>
              <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:600;color:#475569;width:35%;">Email</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;"><a href="mailto:{WebUtility.HtmlEncode(applicantEmail)}">{WebUtility.HtmlEncode(applicantEmail)}</a></td></tr>
              <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:600;color:#475569;width:35%;">Country</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">{WebUtility.HtmlEncode(country)}</td></tr>
              <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:600;color:#475569;width:35%;">Preferred Manager</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">{WebUtility.HtmlEncode(managerText)}</td></tr>
            </table>
            <p>Please log in to the Admin Workspace to review this application.</p>
            """;
        var html = BuildHtmlBody("New Application Submitted", htmlContent);

        await SendAsync(supportAddress, subject, plainText, html, cancellationToken);
    }

    public async Task SendClientInvitationAsync(
        string email,
        string applicantName,
        string reference,
        string invitationUrl,
        DateTime expiresAt,
        CancellationToken cancellationToken = default)
    {
        var subject = "Your PrimeXchanges client portal invitation";
        var expiryText = expiresAt.ToString("yyyy-MM-dd HH:mm 'UTC'");
        var plainText = $"""
            Hello {applicantName},

            Your PrimeXchanges account management application ({reference}) has been approved.

            Use this single-use link to activate your client portal access:
            {invitationUrl}

            This invitation expires at {expiryText}. If you did not expect this invitation, contact support@primexchanges.com.
            """;

        var htmlContent = $"""
            <p>Hello {WebUtility.HtmlEncode(applicantName)},</p>
            <p>Your PrimeXchanges account management application (<strong>{WebUtility.HtmlEncode(reference)}</strong>) has been approved.</p>
            <p>Use the button below to activate your secure client portal access:</p>
            <p>
              <a href="{WebUtility.HtmlEncode(invitationUrl)}" style="display:inline-block;padding:11px 20px;background-color:#003c5f;color:#ffffff;font-weight:600;border-radius:6px;text-decoration:none;margin:8px 0 20px 0;">
                Activate Client Portal Access
              </a>
            </p>
            <p>This single-use invitation expires at <strong>{WebUtility.HtmlEncode(expiryText)}</strong>.</p>
            <p>If you did not expect this invitation, contact <a href="mailto:support@primexchanges.com">support@primexchanges.com</a>.</p>
            """;
        var html = BuildHtmlBody("Client Portal Invitation", htmlContent);

        await SendAsync(email, subject, plainText, html, cancellationToken);
    }

    public async Task SendDraftResumeCodeAsync(string email, string code, CancellationToken cancellationToken = default)
    {
        var subject = "Resume Your PrimeXchanges Application";
        var plainText = $"""
            Your verification code to resume your PrimeXchanges application is:

            {code}

            This code expires in 15 minutes. If you did not request this code, you can ignore this message.
            """;

        var htmlContent = $"""
            <p>Your verification code to resume your PrimeXchanges application is:</p>
            <div style="font-size:24px;font-weight:700;letter-spacing:4px;color:#003c5f;background-color:#f1f5f9;padding:12px 20px;border-radius:6px;display:inline-block;margin:8px 0 20px 0;border:1px solid #e2e8f0;">{WebUtility.HtmlEncode(code)}</div>
            <p>This code expires in 15 minutes. If you did not request this code, you can ignore this message.</p>
            """;
        var html = BuildHtmlBody("Resume Your Application", htmlContent);

        await SendAsync(email, subject, plainText, html, cancellationToken);
    }

    public async Task SendValuationStatementReadyAsync(string email, string clientName, string dateString, CancellationToken cancellationToken = default)
    {
        var subject = $"New Valuation Statement Ready - {dateString}";
        var plainText = $"""
            Hello {clientName},

            Your latest portfolio valuation statement for {dateString} is now ready and available for secure download in your PrimeXchanges Client Portal.

            Please log in to your account at your earliest convenience to review:
            https://portal.primexchanges.com/client

            If you have any questions, contact your assigned account manager or support team.
            """;

        var htmlContent = $"""
            <p>Hello {WebUtility.HtmlEncode(clientName)},</p>
            <p>Your latest portfolio valuation statement for <strong>{WebUtility.HtmlEncode(dateString)}</strong> is now ready and available for secure download in your PrimeXchanges Client Portal.</p>
            <p>Please log in to your account at your earliest convenience to review it:</p>
            <p>
              <a href="https://portal.primexchanges.com/client" style="display:inline-block;padding:11px 20px;background-color:#f97316;color:#ffffff;font-weight:600;border-radius:6px;text-decoration:none;margin:8px 0 20px 0;">
                Log In to Client Portal
              </a>
            </p>
            <p>If you have any questions, contact your assigned account manager or support team.</p>
            """;
        var html = BuildHtmlBody("Valuation Statement Ready", htmlContent);

        await SendAsync(email, subject, plainText, html, cancellationToken);
    }

    public async Task SendSupportMessageAlertAsync(string clientName, string clientId, string subject, string messageBody, CancellationToken cancellationToken = default)
    {
        var supportAddress = _configuration["Email:SupportAddress"] ?? "support@primexchanges.com";
        var emailSubject = $"[Support Ticket] {clientName} ({clientId}): {subject}";
        
        var plainText = $"""
            A new support message has been sent by client {clientName} ({clientId}) to their account manager.

            Client: {clientName} ({clientId})
            Subject: {subject}
            Message Content:
            --------------------------------------------------
            {messageBody}
            --------------------------------------------------

            This message is stored in the database. Please review it in the Admin Workspace.
            """;

        var htmlContent = $"""
            <p>A new secure support message has been sent by client <strong>{WebUtility.HtmlEncode(clientName)}</strong> ({WebUtility.HtmlEncode(clientId)}).</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0 20px 0;">
              <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:600;color:#475569;width:35%;">Client</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">{WebUtility.HtmlEncode(clientName)} ({WebUtility.HtmlEncode(clientId)})</td></tr>
              <tr><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;font-weight:600;color:#475569;width:35%;">Subject</td><td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:14px;color:#0f172a;">{WebUtility.HtmlEncode(subject)}</td></tr>
            </table>
            <p><strong>Message Content:</strong></p>
            <div style="padding:16px;background-color:#f1f5f9;border-left:4px solid #f97316;border-radius:4px;white-space:pre-wrap;font-family:inherit;font-size:14px;color:#334155;">{WebUtility.HtmlEncode(messageBody)}</div>
            <p style="margin-top:20px;">Please log in to the Admin Workspace to view details or reply.</p>
            """;
        var html = BuildHtmlBody("New Secure Message from Client", htmlContent);

        await SendAsync(supportAddress, emailSubject, plainText, html, cancellationToken);
    }

    private string BuildHtmlBody(string title, string contentHtml)
    {
        return $$"""
            <!DOCTYPE html>
            <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>{{WebUtility.HtmlEncode(title)}}</title>
            </head>
            <body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background-color:#f8fafc;color:#1e293b;margin:0;padding:0;-webkit-font-smoothing:antialiased;">
              <div style="width:100%;background-color:#f8fafc;padding:32px 0;">
                <div style="max-width:580px;margin:0 auto;background-color:#ffffff;border-radius:8px;border:1px solid #e2e8f0;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.05);">
                  <div style="background-color:#003c5f;padding:24px 32px;text-align:center;">
                    <h1 style="color:#ffffff;font-size:20px;font-weight:600;margin:0;letter-spacing:0.5px;">{{WebUtility.HtmlEncode(title)}}</h1>
                  </div>
                  <div style="padding:32px;line-height:1.6;font-size:15px;color:#334155;">
                    {{contentHtml}}
                  </div>
                  <div style="background-color:#f1f5f9;padding:20px 32px;text-align:center;font-size:12px;color:#64748b;border-top:1px solid #e2e8f0;">
                    &copy; {{DateTime.UtcNow.Year}} PrimeXchanges. All rights reserved.<br>
                    This is an automated notification from the PrimeXchanges portal.
                  </div>
                </div>
              </div>
            </body>
            </html>
            """;
    }


    private async Task SendAsync(
        string recipient,
        string subject,
        string plainText,
        string html,
        CancellationToken cancellationToken)
    {
        var host = _configuration["Email:SmtpHost"];
        var fromAddress = _configuration["Email:FromAddress"];

        if (string.IsNullOrWhiteSpace(host) || string.IsNullOrWhiteSpace(fromAddress))
        {
            if (_env.IsDevelopment())
            {
                _logger.LogInformation(
                    "[EMAIL-DEV-FALLBACK] To: {Recipient} | Subject: {Subject} | Body: {Body}",
                    recipient,
                    subject,
                    plainText.ReplaceLineEndings(" "));
                return;
            }

            throw new InvalidOperationException("SMTP host or From address is not configured. Email cannot be sent in production.");
        }

        var fromName = _configuration["Email:FromName"] ?? "PrimeXchanges";
        var user = _configuration["Email:SmtpUser"];
        var password = _configuration["Email:SmtpPassword"];
        var port = _configuration.GetValue("Email:SmtpPort", 587);
        var enableSsl = _configuration.GetValue("Email:EnableSsl", true);

        using var message = new MailMessage();
        message.From = new MailAddress(fromAddress, fromName, Encoding.UTF8);
        message.To.Add(new MailAddress(recipient));
        message.Subject = subject;
        message.SubjectEncoding = Encoding.UTF8;

        // Fallback body for older clients that ignore AlternateViews
        message.Body = plainText;
        message.BodyEncoding = Encoding.UTF8;
        message.IsBodyHtml = false;

        // Add both plain text and HTML alternate views to support all modern email clients
        var plainTextView = AlternateView.CreateAlternateViewFromString(plainText, Encoding.UTF8, "text/plain");
        message.AlternateViews.Add(plainTextView);

        var htmlTextView = AlternateView.CreateAlternateViewFromString(html, Encoding.UTF8, "text/html");
        message.AlternateViews.Add(htmlTextView);

        using var client = new SmtpClient(host, port)
        {
            EnableSsl = enableSsl,
        };

        if (!string.IsNullOrWhiteSpace(user))
        {
            client.Credentials = new NetworkCredential(user, password);
        }

        await client.SendMailAsync(message, cancellationToken);
    }
}
