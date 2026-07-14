using Microsoft.EntityFrameworkCore;
using PrimeExchanges.Api.Data;

namespace PrimeExchanges.Api.Services;

public class StaffAuthService : IStaffAuthService
{
    private readonly AppDbContext _dbContext;
    private readonly IJwtService _jwtService;
    private readonly IConfiguration _configuration;
    private readonly ILogger<StaffAuthService> _logger;

    public StaffAuthService(
        AppDbContext dbContext,
        IJwtService jwtService,
        IConfiguration configuration,
        ILogger<StaffAuthService> logger)
    {
        _dbContext = dbContext;
        _jwtService = jwtService;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<StaffLoginResult> LoginAsync(string email, string password, CancellationToken cancellationToken = default)
    {
        var normalizedEmail = email.Trim().ToLowerInvariant();

        var user = await _dbContext.StaffUsers
            .FirstOrDefaultAsync(u => u.Email == normalizedEmail, cancellationToken);

        if (user == null)
        {
            _logger.LogWarning("Staff login attempt for unknown email: {Email}", normalizedEmail);
            // Generic error to prevent email enumeration
            return new StaffLoginResult(false, Error: "Invalid email or password.");
        }

        if (!string.Equals(user.Status, "active", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("Staff login attempt for inactive user: {Email}", normalizedEmail);
            return new StaffLoginResult(false, Error: "This account is disabled. Contact an administrator.");
        }

        if (!BCrypt.Net.BCrypt.Verify(password, user.PasswordHash))
        {
            _logger.LogWarning("Staff login failed: invalid password for {Email}", normalizedEmail);

            // Log failed login attempt to audit
            _dbContext.AuditEvents.Add(new Models.AuditEvent
            {
                AuditEventId = Guid.NewGuid().ToString(),
                EntityType = "StaffUser",
                EntityId = user.UserId,
                Action = "LoginFailed",
                ActorId = user.UserId,
                ActorName = user.Name,
                After = $"Email={normalizedEmail}|Reason=Invalid password",
                Timestamp = DateTime.UtcNow,
            });
            await _dbContext.SaveChangesAsync(cancellationToken);

            return new StaffLoginResult(false, Error: "Invalid email or password.");
        }

        // Successful login — update last login timestamp
        user.LastLoginAt = DateTime.UtcNow;

        // Log successful login to audit
        _dbContext.AuditEvents.Add(new Models.AuditEvent
        {
            AuditEventId = Guid.NewGuid().ToString(),
            EntityType = "StaffUser",
            EntityId = user.UserId,
            Action = "LoginSuccess",
            ActorId = user.UserId,
            ActorName = user.Name,
            After = $"Email={normalizedEmail}|Role={user.Role}",
            Timestamp = DateTime.UtcNow,
        });

        await _dbContext.SaveChangesAsync(cancellationToken);

        var expiresInHours = _configuration.GetValue("Jwt:StaffExpiresInHours", 8);
        var jwtToken = _jwtService.GenerateToken(user.Email, user.UserId, user.Role, expiresInHours);

        _logger.LogInformation("Staff login successful for {Email}. UserId: {UserId}, Role: {Role}", normalizedEmail, user.UserId, user.Role);

        return new StaffLoginResult(true, jwtToken, user.UserId, user.Name, user.Email, user.Role);
    }
}
