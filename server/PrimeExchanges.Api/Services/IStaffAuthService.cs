namespace PrimeExchanges.Api.Services;

public interface IStaffAuthService
{
    Task<StaffLoginResult> LoginAsync(string email, string password, CancellationToken cancellationToken = default);
}

public record StaffLoginResult(
    bool Success,
    string? Token = null,
    string? UserId = null,
    string? Name = null,
    string? Email = null,
    string? Role = null,
    string? Error = null);
