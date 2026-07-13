using System.ComponentModel.DataAnnotations;

namespace PrimeExchanges.Api.Models;

public class AuditEvent
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string AuditEventId { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Actor { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Action { get; set; } = string.Empty;

    [Required]
    [MaxLength(500)]
    public string Target { get; set; } = string.Empty;

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;

    [MaxLength(500)]
    public string? Reason { get; set; }

    [MaxLength(50)]
    public string Severity { get; set; } = "info";
}
