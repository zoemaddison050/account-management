namespace PrimeExchanges.Api.Services;

public interface IEmailService
{
    Task SendMagicLinkAsync(string email, string code, int expiresInMinutes, CancellationToken cancellationToken = default);
}
