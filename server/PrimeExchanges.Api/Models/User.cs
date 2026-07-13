using System.ComponentModel.DataAnnotations;

namespace PrimeExchanges.Api.Models;

/// <summary>
/// A staff user (Admin, OperationsReviewer, ComplianceApprover, AccountManager).
/// Clients authenticate via MagicLinkToken only; they are not stored here.
/// </summary>
public class StaffUser
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string UserId { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// Argon2id / BCrypt hash of the password. NEVER store plain text.
    /// </summary>
    [Required]
    [MaxLength(512)]
    public string PasswordHash { get; set; } = string.Empty;

    /// <summary>
    /// Administrator | OperationsReviewer | ComplianceApprover | AccountManager
    /// </summary>
    [Required]
    [MaxLength(50)]
    public string Role { get; set; } = string.Empty;

    public bool MfaEnabled { get; set; } = false;

    [MaxLength(512)]
    public string? TotpSecret { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "active";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; set; }
}
