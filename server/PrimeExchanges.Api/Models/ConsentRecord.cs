using System.ComponentModel.DataAnnotations;

namespace PrimeExchanges.Api.Models;

/// <summary>
/// Immutable record of consent given by an applicant at submission time.
/// </summary>
public class ConsentRecord
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string ApplicationId { get; set; } = string.Empty;

    /// <summary>Consent policy version shown to the applicant, e.g. "privacy-v1.0".</summary>
    [Required]
    [MaxLength(50)]
    public string PolicyVersion { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    /// <summary>IP address of the request, stored for audit only.</summary>
    [MaxLength(45)]
    public string? IpAddress { get; set; }

    public DateTime ConsentedAt { get; set; } = DateTime.UtcNow;
}
