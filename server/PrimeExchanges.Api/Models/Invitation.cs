using System.ComponentModel.DataAnnotations;

namespace PrimeExchanges.Api.Models;

/// <summary>
/// Single-use client invitation issued only after an authorised approval workflow.
/// </summary>
public class Invitation
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string InvitationId { get; set; } = string.Empty;

    /// <summary>
    /// SHA-256 hash of the opaque token sent in the email link. Never store the plain token.
    /// </summary>
    [Required]
    [MaxLength(256)]
    public string TokenHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string ApplicationId { get; set; } = string.Empty;

    [MaxLength(50)]
    public string IssuedByUserId { get; set; } = string.Empty;

    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;
    public DateTime ExpiresAt { get; set; }

    public DateTime? AcceptedAt { get; set; }
    public DateTime? RevokedAt { get; set; }

    public bool IsUsed => AcceptedAt.HasValue;
    public bool IsExpired => DateTime.UtcNow > ExpiresAt;
    public bool IsRevoked => RevokedAt.HasValue;
}
