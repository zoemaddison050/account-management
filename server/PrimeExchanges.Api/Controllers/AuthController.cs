using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using PrimeExchanges.Api.Services;

namespace PrimeExchanges.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
[EnableRateLimiting("auth")]
public class AuthController : ControllerBase
{
    private readonly IMagicLinkService _magicLinkService;
    private readonly IStaffAuthService _staffAuthService;
    private readonly ILogger<AuthController> _logger;

    public AuthController(IMagicLinkService magicLinkService, IStaffAuthService staffAuthService, ILogger<AuthController> logger)
    {
        _magicLinkService = magicLinkService;
        _staffAuthService = staffAuthService;
        _logger = logger;
    }

    /// <summary>
    /// Authenticates a staff user with email and password, returning a JWT.
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
            Token = result.Token!,
            ClientId = result.UserId!,
            ClientName = result.Name!,
            Email = result.Email!,
            Role = result.Role!,
            ExpiresAt = DateTime.UtcNow.AddHours(8).ToString("O"),
        });
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
        // JWT revocation would typically be handled via a token blacklist or short-lived tokens.
        // For now, the client simply discards the token.
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
    public string Token { get; set; } = string.Empty;
    public string ClientId { get; set; } = string.Empty;
    public string ClientName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
    public string ExpiresAt { get; set; } = string.Empty;
}
