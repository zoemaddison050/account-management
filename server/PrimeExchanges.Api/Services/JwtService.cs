using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;

namespace PrimeExchanges.Api.Services;

public class JwtService : IJwtService
{
    private readonly IConfiguration _configuration;
    private readonly ILogger<JwtService> _logger;

    public JwtService(IConfiguration configuration, ILogger<JwtService> logger)
    {
        _configuration = configuration;
        _logger = logger;
    }

    public string GenerateToken(string email, string clientId, string role, double expiresInHours = 8)
    {
        var issuer = _configuration["Jwt:Issuer"] ?? "PrimeXchanges";
        var audience = _configuration["Jwt:Audience"] ?? "PrimeXchanges.Portal";
        var secret = _configuration["Jwt:Secret"];

        if (string.IsNullOrWhiteSpace(secret) || secret.Length < 32)
        {
            throw new InvalidOperationException("JWT Secret must be at least 32 characters. Set Jwt:Secret in appsettings or user secrets.");
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(secret));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim(JwtRegisteredClaimNames.Sub, email),
            new Claim(JwtRegisteredClaimNames.Email, email),
            new Claim("clientId", clientId),
            new Claim(ClaimTypes.Role, role),
            new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString()),
        };

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            expires: DateTime.UtcNow.AddHours(expiresInHours),
            signingCredentials: credentials);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public ClaimsPrincipal? ValidateToken(string token)
    {
        var secret = _configuration["Jwt:Secret"];
        if (string.IsNullOrWhiteSpace(secret) || secret.Length < 32)
        {
            return null;
        }

        var tokenHandler = new JwtSecurityTokenHandler();
        var key = Encoding.UTF8.GetBytes(secret);

        try
        {
            tokenHandler.ValidateToken(token, new TokenValidationParameters
            {
                ValidateIssuerSigningKey = true,
                IssuerSigningKey = new SymmetricSecurityKey(key),
                ValidateIssuer = true,
                ValidIssuer = _configuration["Jwt:Issuer"] ?? "PrimeXchanges",
                ValidateAudience = true,
                ValidAudience = _configuration["Jwt:Audience"] ?? "PrimeXchanges.Portal",
                ValidateLifetime = true,
                ClockSkew = TimeSpan.Zero
            }, out SecurityToken validatedToken);

            return new ClaimsPrincipal(new ClaimsIdentity(((JwtSecurityToken)validatedToken).Claims, "jwt"));
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "JWT validation failed");
            return null;
        }
    }
}
