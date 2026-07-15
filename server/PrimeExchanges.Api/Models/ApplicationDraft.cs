using System;
using System.ComponentModel.DataAnnotations;

namespace PrimeExchanges.Api.Models;

public class ApplicationDraft
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string DraftDataJson { get; set; } = string.Empty;

    [MaxLength(6)]
    public string? VerificationCode { get; set; }

    public DateTime? VerificationCodeExpiresAt { get; set; }

    public DateTime LastSavedAt { get; set; } = DateTime.UtcNow;
}
