using System.ComponentModel.DataAnnotations;

namespace PrimeExchanges.Api.Models;

public class SupportMessage
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string ClientId { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string ClientName { get; set; } = string.Empty;

    [MaxLength(100)]
    public string ManagerName { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Subject { get; set; } = string.Empty;

    [Required]
    [MaxLength(4000)]
    public string MessageBody { get; set; } = string.Empty;

    public DateTime SentAt { get; set; } = DateTime.UtcNow;

    public bool IsFromClient { get; set; } = true;
}
