using System.ComponentModel.DataAnnotations;

namespace PrimeExchanges.Api.Models;

public class MagicLinkToken
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    /// <summary>
    /// SHA-256 hash of the 6-digit code. The plain code is never stored.
    /// </summary>
    [Required]
    [MaxLength(256)]
    public string TokenHash { get; set; } = string.Empty;

    public DateTime ExpiresAt { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime? UsedAt { get; set; }

    public bool IsUsed => UsedAt.HasValue;

    public bool IsExpired => DateTime.UtcNow > ExpiresAt;
}
