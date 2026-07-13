using System.ComponentModel.DataAnnotations;

namespace PrimeExchanges.Api.Models;

/// <summary>
/// Short-lived, opaque, single-use server-side grant that authorises one PDF download.
/// The token is never stored; only its SHA-256 hash is persisted.
/// </summary>
public class PdfGrant
{
    [Key]
    public int Id { get; set; }

    /// <summary>SHA-256 hash of the opaque token returned to the applicant.</summary>
    [Required]
    [MaxLength(256)]
    public string TokenHash { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string ApplicationId { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string ApplicantEmail { get; set; } = string.Empty;

    public DateTime IssuedAt { get; set; } = DateTime.UtcNow;

    /// <summary>Grants expire after a short window (default: 30 minutes).</summary>
    public DateTime ExpiresAt { get; set; }

    public DateTime? UsedAt { get; set; }

    public bool IsUsed => UsedAt.HasValue;
    public bool IsExpired => DateTime.UtcNow > ExpiresAt;
}
