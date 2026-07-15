using System.Security.Claims;

namespace PrimeExchanges.Api.Services;

public interface IJwtService
{
    string GenerateToken(string email, string clientId, string role, double expiresInHours = 8);
    ClaimsPrincipal? ValidateToken(string token);
}
