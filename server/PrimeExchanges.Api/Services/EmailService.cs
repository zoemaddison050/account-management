namespace PrimeExchanges.Api.Services;

public class EmailService : IEmailService
{
    private readonly ILogger<EmailService> _logger;

    public EmailService(ILogger<EmailService> logger)
    {
        _logger = logger;
    }

    public Task SendMagicLinkAsync(string email, string code, int expiresInMinutes, CancellationToken cancellationToken = default)
    {
        // In production, integrate with SendGrid, AWS SES, SMTP, etc.
        // For development, we log the code so the frontend demo can be tested.
        _logger.LogInformation(
            "[MAGIC-LINK] To: {Email} | Code: {Code} | Expires in {ExpiresInMinutes} minutes",
            email, code, expiresInMinutes);

        return Task.CompletedTask;
    }
}
