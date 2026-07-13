using System.ComponentModel.DataAnnotations;

namespace PrimeExchanges.Api.Models;

public class AccountManager
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string ManagerId { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [MaxLength(200)]
    public string Title { get; set; } = string.Empty;

    [Required]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    public int ActiveClients { get; set; }

    public int Capacity { get; set; }

    [Required]
    [MaxLength(50)]
    public string Status { get; set; } = "active";
}
