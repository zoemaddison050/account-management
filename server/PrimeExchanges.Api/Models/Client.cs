using System.ComponentModel.DataAnnotations;

namespace PrimeExchanges.Api.Models;

public class Client
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string ClientId { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? ManagerId { get; set; }

    [MaxLength(200)]
    public string? ManagerName { get; set; }

    public DateTime Since { get; set; }

    [MaxLength(50)]
    public string Status { get; set; } = "active";

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public string PortfoliosJson { get; set; } = "[]";
    public string DocumentsJson { get; set; } = "[]";
    public string ActivityJson { get; set; } = "[]";
    public DateTime? PortfolioLastUpdated { get; set; }
}
