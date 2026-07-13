using System.ComponentModel.DataAnnotations;

namespace PrimeExchanges.Api.Models;

public class Application
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string ApplicationId { get; set; } = string.Empty;

    [Required]
    [MaxLength(50)]
    public string Reference { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string ApplicantName { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Country { get; set; } = string.Empty;

    [MaxLength(100)]
    public string Status { get; set; } = "Inquiry submitted";

    [MaxLength(200)]
    public string AssignedReviewer { get; set; } = string.Empty;

    public DateTime SubmittedAt { get; set; } = DateTime.UtcNow;

    public DateTime LastUpdated { get; set; } = DateTime.UtcNow;

    [MaxLength(50)]
    public string Route { get; set; } = "online";
}
