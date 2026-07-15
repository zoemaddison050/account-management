using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using PrimeExchanges.Api.Data;
using PrimeExchanges.Api.Services;

namespace PrimeExchanges.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("auth")]
public class AuthController : ControllerBase
{
    private readonly IMagicLinkService _magicLinkService;
    private readonly IStaffAuthService _staffAuthService;
    private readonly IJwtService _jwtService;
    private readonly AppDbContext _dbContext;
    private readonly IConfiguration _configuration;
    private readonly ILogger<AuthController> _logger;

    public AuthController(
        IMagicLinkService magicLinkService,
        IStaffAuthService staffAuthService,
        IJwtService jwtService,
        AppDbContext dbContext,
        IConfiguration configuration,
        ILogger<AuthController> logger)
    {
        _magicLinkService = magicLinkService;
        _staffAuthService = staffAuthService;
        _jwtService = jwtService;
        _dbContext = dbContext;
        _configuration = configuration;
        _logger = logger;
    }

    /// <summary>
    /// Authenticates a staff user with email and password, returning a JWT or requiring MFA.
    /// </summary>
    [HttpPost("staff-login")]
    public async Task<ActionResult<AuthSessionResponse>> StaffLogin([FromBody] StaffLoginRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _staffAuthService.LoginAsync(request.Email, request.Password, cancellationToken);

        if (!result.Success)
        {
            return Unauthorized(new { message = result.Error ?? "Invalid email or password." });
        }

        return Ok(new AuthSessionResponse
        {
            Token = result.Token,
            ClientId = result.UserId ?? string.Empty,
            ClientName = result.Name ?? string.Empty,
            Email = result.Email ?? string.Empty,
            Role = result.Role ?? string.Empty,
            ExpiresAt = result.Token != null ? DateTime.UtcNow.AddHours(8).ToString("O") : string.Empty,
            RequiresMfa = result.RequiresMfa,
            MfaToken = result.MfaToken
        });
    }

    /// <summary>
    /// Verifies staff TOTP MFA code and returns a JWT session.
    /// </summary>
    [HttpPost("staff-mfa-verify")]
    public async Task<ActionResult<AuthSessionResponse>> StaffMfaVerify([FromBody] StaffMfaVerifyRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var principal = _jwtService.ValidateToken(request.MfaToken);
        if (principal == null)
        {
            return Unauthorized(new { message = "MFA session expired or invalid." });
        }

        var roleClaim = principal.FindFirst(ClaimTypes.Role)?.Value;
        if (roleClaim != "MfaPending")
        {
            return Unauthorized(new { message = "Invalid MFA session." });
        }

        var email = principal.FindFirst(ClaimTypes.Email)?.Value 
            ?? principal.FindFirst(ClaimTypes.Name)?.Value;
        if (string.IsNullOrEmpty(email))
        {
            return Unauthorized(new { message = "Invalid MFA session claims." });
        }

        var user = await _dbContext.StaffUsers.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
        if (user == null || user.Status != "active" || string.IsNullOrEmpty(user.TotpSecret))
        {
            return Unauthorized(new { message = "User not found, disabled, or MFA not set up." });
        }

        if (!TotpHelper.VerifyCode(user.TotpSecret, request.Code))
        {
            _logger.LogWarning("MFA verification failed for {Email}", email);
            return Unauthorized(new { message = "Invalid MFA code." });
        }

        // MFA code verified successfully! Register login event and issue the final session token.
        user.LastLoginAt = DateTime.UtcNow;
        _dbContext.AuditEvents.Add(new Models.AuditEvent
        {
            AuditEventId = Guid.NewGuid().ToString(),
            EntityType = "StaffUser",
            EntityId = user.UserId,
            Action = "LoginSuccessWithMfa",
            ActorId = user.UserId,
            ActorName = user.Name,
            After = $"Email={email}|Role={user.Role}",
            Timestamp = DateTime.UtcNow,
        });
        await _dbContext.SaveChangesAsync(cancellationToken);

        var expiresInHours = _configuration.GetValue("Jwt:StaffExpiresInHours", 8);
        var jwtToken = _jwtService.GenerateToken(user.Email, user.UserId, user.Role, expiresInHours);

        return Ok(new AuthSessionResponse
        {
            Token = jwtToken,
            ClientId = user.UserId,
            ClientName = user.Name,
            Email = user.Email,
            Role = user.Role,
            ExpiresAt = DateTime.UtcNow.AddHours(expiresInHours).ToString("O")
        });
    }

    /// <summary>
    /// Generates a new TOTP secret and provisioning URI for the authenticated staff user.
    /// </summary>
    [Authorize]
    [HttpPost("staff-mfa-setup")]
    public ActionResult<MfaSetupResponse> StaffMfaSetup()
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value 
            ?? User.FindFirst(ClaimTypes.Name)?.Value;
            
        if (string.IsNullOrEmpty(email))
        {
            return Unauthorized();
        }

        var secret = TotpHelper.GenerateSecret();
        var issuer = "PrimeXchanges";
        var provisioningUri = $"otpauth://totp/{Uri.EscapeDataString(issuer)}:{Uri.EscapeDataString(email)}?secret={secret}&issuer={Uri.EscapeDataString(issuer)}";

        return Ok(new MfaSetupResponse
        {
            Secret = secret,
            ProvisioningUri = provisioningUri
        });
    }

    /// <summary>
    /// Enables MFA for the authenticated staff user after validating a test code.
    /// </summary>
    [Authorize]
    [HttpPost("staff-mfa-enable")]
    public async Task<IActionResult> StaffMfaEnable([FromBody] MfaEnableRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var email = User.FindFirst(ClaimTypes.Email)?.Value 
            ?? User.FindFirst(ClaimTypes.Name)?.Value;

        if (string.IsNullOrEmpty(email))
        {
            return Unauthorized();
        }

        var user = await _dbContext.StaffUsers.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
        if (user == null)
        {
            return NotFound("User not found.");
        }

        if (!TotpHelper.VerifyCode(request.Secret, request.Code))
        {
            return BadRequest(new { message = "Invalid code. Please verify that your authenticator app is synced." });
        }

        user.TotpSecret = request.Secret;
        user.MfaEnabled = true;

        _dbContext.AuditEvents.Add(new Models.AuditEvent
        {
            AuditEventId = Guid.NewGuid().ToString(),
            EntityType = "StaffUser",
            EntityId = user.UserId,
            Action = "MfaEnabled",
            ActorId = user.UserId,
            ActorName = user.Name,
            Timestamp = DateTime.UtcNow,
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "MFA enabled successfully." });
    }

    /// <summary>
    /// Disables MFA for the authenticated staff user.
    /// </summary>
    [Authorize]
    [HttpPost("staff-mfa-disable")]
    public async Task<IActionResult> StaffMfaDisable(CancellationToken cancellationToken)
    {
        var email = User.FindFirst(ClaimTypes.Email)?.Value 
            ?? User.FindFirst(ClaimTypes.Name)?.Value;

        if (string.IsNullOrEmpty(email))
        {
            return Unauthorized();
        }

        var user = await _dbContext.StaffUsers.FirstOrDefaultAsync(u => u.Email == email, cancellationToken);
        if (user == null)
        {
            return NotFound("User not found.");
        }

        user.MfaEnabled = false;
        user.TotpSecret = null;

        _dbContext.AuditEvents.Add(new Models.AuditEvent
        {
            AuditEventId = Guid.NewGuid().ToString(),
            EntityType = "StaffUser",
            EntityId = user.UserId,
            Action = "MfaDisabled",
            ActorId = user.UserId,
            ActorName = user.Name,
            Timestamp = DateTime.UtcNow,
        });

        await _dbContext.SaveChangesAsync(cancellationToken);
        return Ok(new { message = "MFA disabled successfully." });
    }

    /// <summary>
    /// Requests a magic-link / OTP sign-in code for the given email.
    /// </summary>
    [HttpPost("magic-link")]
    public async Task<ActionResult<MagicLinkResponse>> RequestMagicLink([FromBody] MagicLinkRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var (_, message, expiresInMinutes) = await _magicLinkService.RequestMagicLinkAsync(request.Email, cancellationToken);

        return Ok(new MagicLinkResponse
        {
            Email = request.Email,
            ExpiresInMinutes = expiresInMinutes,
            Message = message,
        });
    }

    /// <summary>
    /// Verifies a magic-link / OTP code and returns a JWT session.
    /// </summary>
    [HttpPost("verify")]
    public async Task<ActionResult<AuthSessionResponse>> VerifyMagicLink([FromBody] VerifyMagicLinkRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var result = await _magicLinkService.VerifyMagicLinkAsync(request.Email, request.Token, request.Remember, cancellationToken);

        if (!result.Success)
        {
            return Unauthorized(new { message = result.Error ?? "Invalid or expired code." });
        }

        return Ok(new AuthSessionResponse
        {
            Token = result.Token!,
            ClientId = result.ClientId!,
            ClientName = result.ClientName!,
            Email = result.Email!,
            Role = result.Role!,
            ExpiresAt = DateTime.UtcNow.AddHours(8).ToString("O"),
        });
    }

    /// <summary>
    /// Revokes the current session on the server (best-effort).
    /// </summary>
    [HttpPost("logout")]
    public IActionResult Logout()
    {
        _logger.LogInformation("Logout requested");
        return Ok(new { message = "Logged out successfully." });
    }
}

public class StaffLoginRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string Password { get; set; } = string.Empty;
}

public class MagicLinkRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;
}

public class MagicLinkResponse
{
    public string Email { get; set; } = string.Empty;
    public int ExpiresInMinutes { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class VerifyMagicLinkRequest
{
    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{6}$", ErrorMessage = "Code must be 6 digits.")]
    public string Token { get; set; } = string.Empty;

    public bool Remember { get; set; }
}

public class AuthSessionResponse
{
    public string? Token { get; set; }
    public string ClientId { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string ExpiresAt { get; set; } = string.Empty;
    public bool RequiresMfa { get; set; }
    public string? MfaToken { get; set; }
}

public class StaffMfaVerifyRequest
{
    [Required]
    public string MfaToken { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{6}$", ErrorMessage = "Code must be 6 digits.")]
    public string Code { get; set; } = string.Empty;
}

public class MfaSetupResponse
{
    public string Secret { get; set; } = string.Empty;
    public string ProvisioningUri { get; set; } = string.Empty;
}

public class MfaEnableRequest
{
    [Required]
    public string Secret { get; set; } = string.Empty;

    [Required]
    [RegularExpression(@"^\d{6}$", ErrorMessage = "Code must be 6 digits.")]
    public string Code { get; set; } = string.Empty;
}
