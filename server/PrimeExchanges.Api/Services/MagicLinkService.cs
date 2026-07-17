using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using PrimeExchanges.Api.Data;
using PrimeExchanges.Api.Models;

namespace PrimeExchanges.Api.Services;

public class MagicLinkService : IMagicLinkService
{
    private readonly AppDbContext _dbContext;
    private readonly IEmailService _emailService;
    private readonly IJwtService _jwtService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<MagicLinkService> _logger;

    public MagicLinkService(
        AppDbContext dbContext,
        IEmailService emailService,
        IJwtService jwtService,
        IConfiguration configuration,
        ILogger<MagicLinkService> logger)
    {
        _dbContext = dbContext;
        _emailService = emailService;
        _jwtService = jwtService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<(bool Success, string Message, int ExpiresInMinutes)> RequestMagicLinkAsync(string email, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        // Only allow emails associated with an active client.
        var client = await _dbContext.Clients
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Email == normalizedEmail, cancellationToken);

        if (client == null || !string.Equals(client.Status, "active", StringComparison.OrdinalIgnoreCase))
        {
            // Return a generic success to prevent email enumeration.
            _logger.LogInformation("Magic link requested for non-active or unknown client: {Email}", normalizedEmail);
            return (true, "If this email is registered, a sign-in code has been sent.", 15);
        }

        // Generate a 6-digit code.
        var code = GenerateSixDigitCode();
        var tokenHash = HashToken(code);
        var expiresInMinutes = 15;

        // Invalidate any existing tokens for this email.
        var existingTokens = await _dbContext.MagicLinkTokens
            .Where(t => t.Email == normalizedEmail && !t.UsedAt.HasValue)
            .ToListAsync(cancellationToken);

        foreach (var token in existingTokens)
        {
            token.UsedAt = DateTime.UtcNow;
        }

        _dbContext.MagicLinkTokens.Add(new MagicLinkToken
        {
            Email = normalizedEmail,
            TokenHash = tokenHash,
            ExpiresAt = DateTime.UtcNow.AddMinutes(expiresInMinutes),
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        await _emailService.SendMagicLinkAsync(normalizedEmail, code, expiresInMinutes, cancellationToken);

        _logger.LogInformation("Magic link code sent to {Email}", normalizedEmail);
        return (true, "A sign-in code has been sent to your email.", expiresInMinutes);
    }

    public async Task<(bool Success, string? Token, string? ClientId, string? ClientName, string? Email, string? Role, string? Error)> VerifyMagicLinkAsync(string email, string token, bool remember = false, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();
        var tokenHash = HashToken(token);

        var magicLinkToken = await _dbContext.MagicLinkTokens
            .Where(t => t.Email == normalizedEmail && t.TokenHash == tokenHash && !t.UsedAt.HasValue)
            .OrderByDescending(t => t.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (magicLinkToken == null || magicLinkToken.IsExpired)
        {
            _logger.LogWarning("Invalid or expired magic link token verification attempt for {Email}. DB Match: {DbMatch}, IsExpired: {IsExpired}", 
                normalizedEmail, magicLinkToken != null, magicLinkToken?.IsExpired);
            return (false, null, null, null, null, null, "Invalid or expired code.");
        }

        var client = await _dbContext.Clients
            .AsNoTracking()
            .FirstOrDefaultAsync(c => c.Email == normalizedEmail, cancellationToken);

        if (client == null)
        {
            return (false, null, null, null, null, null, "No client account found for this email.");
        }

        if (!string.Equals(client.Status, "active", StringComparison.OrdinalIgnoreCase))
        {
            return (false, null, null, null, null, null, "Your account is not active. Contact support for assistance.");
        }

        // Mark token as used.
        magicLinkToken.UsedAt = DateTime.UtcNow;
        await _dbContext.SaveChangesAsync(cancellationToken);

        var rememberMeHours = _configuration.GetValue("Jwt:RememberMeExpiresInHours", 720);
        var expiresInHours = remember ? rememberMeHours : _configuration.GetValue("Jwt:ExpiresInHours", 8);
        var jwtToken = _jwtService.GenerateToken(client.Email, client.ClientId, "client", expiresInHours);

        _logger.LogInformation("Magic link verified for {Email}. ClientId: {ClientId}", normalizedEmail, client.ClientId);

        return (true, jwtToken, client.ClientId, client.Name, client.Email, "client", null);
    }

    private static string GenerateSixDigitCode()
    {
        // Cryptographically secure 6-digit code.
        var bytes = new byte[4];
        using var rng = RandomNumberGenerator.Create();
        rng.GetBytes(bytes);
        var value = BitConverter.ToUInt32(bytes, 0) % 1_000_000;
        return value.ToString("D6");
    }

    private static string HashToken(string token)
    {
        using var sha256 = SHA256.Create();
        var hash = sha256.ComputeHash(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(hash);
    }
}
