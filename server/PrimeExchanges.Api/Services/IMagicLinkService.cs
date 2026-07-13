namespace PrimeExchanges.Api.Services;

public interface IMagicLinkService
{
    Task<(bool Success, string Message, int ExpiresInMinutes)> RequestMagicLinkAsync(string email, CancellationToken cancellationToken = default);
    Task<(bool Success, string? Token, string? ClientId, string? ClientName, string? Email, string? Role, string? Error)> VerifyMagicLinkAsync(string email, string token, bool remember = false, CancellationToken cancellationToken = default);
}
