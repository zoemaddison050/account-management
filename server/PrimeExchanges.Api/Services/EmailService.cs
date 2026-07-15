namespace PrimeExchanges.Api.Services;

using System.Net;
using System.Net.Mail;
using System.Text;

public class EmailService : IEmailService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public async Task SendMagicLinkAsync(string email, string code, int expiresInMinutes, CancellationToken cancellationToken = default)
    {
        var subject = "Your PrimeXchanges sign-in code";
        var plainText = $"""
            Your PrimeXchanges Account Management Portal sign-in code is:

            {code}

            This code expires in {expiresInMinutes} minutes. If you did not request this code, you can ignore this message.
            """;

        var html = $"""
            <p>Your PrimeXchanges Account Management Portal sign-in code is:</p>
            <p style="font-size:24px;font-weight:700;letter-spacing:4px;">{WebUtility.HtmlEncode(code)}</p>
            <p>This code expires in {expiresInMinutes} minutes. If you did not request this code, you can ignore this message.</p>
            """;

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
            _logger.LogInformation(
                "[APPLICATION-ALERT] Reference={Reference} Applicant={ApplicantName} Email={Email} Country={Country} PreferredManager={PreferredManager}",
                reference,
                applicantName,
                applicantEmail,
                country,
                preferredManager);
            return;
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

        var html = $"""
            <p>A new account management application has been submitted.</p>
            <table cellpadding="6" cellspacing="0" style="border-collapse:collapse;">
              <tr><td><strong>Reference</strong></td><td>{WebUtility.HtmlEncode(reference)}</td></tr>
              <tr><td><strong>Applicant</strong></td><td>{WebUtility.HtmlEncode(applicantName)}</td></tr>
              <tr><td><strong>Email</strong></td><td>{WebUtility.HtmlEncode(applicantEmail)}</td></tr>
              <tr><td><strong>Country</strong></td><td>{WebUtility.HtmlEncode(country)}</td></tr>
              <tr><td><strong>Preferred manager</strong></td><td>{WebUtility.HtmlEncode(managerText)}</td></tr>
            </table>
            """;

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

        var html = $"""
            <p>Hello {WebUtility.HtmlEncode(applicantName)},</p>
            <p>Your PrimeXchanges account management application <strong>{WebUtility.HtmlEncode(reference)}</strong> has been approved.</p>
            <p>
              <a href="{WebUtility.HtmlEncode(invitationUrl)}" style="display:inline-block;padding:12px 18px;background:#003c5f;color:#ffffff;text-decoration:none;border-radius:6px;">
                Activate client portal access
              </a>
            </p>
            <p>This single-use invitation expires at {WebUtility.HtmlEncode(expiryText)}.</p>
            <p>If you did not expect this invitation, contact support@primexchanges.com.</p>
            """;

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

        var html = $"""
            <p>Your verification code to resume your PrimeXchanges application is:</p>
            <p style="font-size:24px;font-weight:700;letter-spacing:4px;">{WebUtility.HtmlEncode(code)}</p>
            <p>This code expires in 15 minutes. If you did not request this code, you can ignore this message.</p>
            """;

        await SendAsync(email, subject, plainText, html, cancellationToken);
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
            _logger.LogInformation(
                "[EMAIL-DEV-FALLBACK] To: {Recipient} | Subject: {Subject} | Body: {Body}",
                recipient,
                subject,
                plainText.ReplaceLineEndings(" "));
            return;
        }

        var fromName = _configuration["Email:FromName"] ?? "PrimeXchanges";
        var user = _configuration["Email:SmtpUser"];
        var password = _configuration["Email:SmtpPassword"];
        var port = _configuration.GetValue("Email:SmtpPort", 587);
        var enableSsl = _configuration.GetValue("Email:EnableSsl", true);

        using var message = new MailMessage
        {
            From = new MailAddress(fromAddress, fromName, Encoding.UTF8),
            Subject = subject,
            SubjectEncoding = Encoding.UTF8,
            Body = html,
            BodyEncoding = Encoding.UTF8,
            IsBodyHtml = true,
        };
        message.To.Add(new MailAddress(recipient));
        message.AlternateViews.Add(AlternateView.CreateAlternateViewFromString(plainText, Encoding.UTF8, "text/plain"));

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
