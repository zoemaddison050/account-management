using System.ComponentModel.DataAnnotations;

namespace PrimeExchanges.Api.Models;

/// <summary>
/// Immutable audit log entry. Every sensitive state change must produce a record here.
/// Records actor, timestamp, entity, before/after state, and a reason where required.
/// </summary>
public class AuditEvent
{
    [Key]
    public int Id { get; set; }

    [Required]
    [MaxLength(50)]
    public string AuditEventId { get; set; } = string.Empty;

    /// <summary>The type of entity affected, e.g. "Application", "Client", "StaffUser".</summary>
    [Required]
    [MaxLength(100)]
    public string EntityType { get; set; } = string.Empty;

    /// <summary>The ID of the affected entity.</summary>
    [Required]
    [MaxLength(100)]
    public string EntityId { get; set; } = string.Empty;

    /// <summary>The action taken, e.g. "Created", "StatusChanged", "Approved", "Deleted".</summary>
    [Required]
    [MaxLength(100)]
    public string Action { get; set; } = string.Empty;

    /// <summary>UserId or system identifier of who performed the action.</summary>
    [Required]
    [MaxLength(100)]
    public string ActorId { get; set; } = string.Empty;

    /// <summary>Human-readable name of the actor (for display; not used for auth).</summary>
    [MaxLength(200)]
    public string? ActorName { get; set; }

    /// <summary>Serialised before-state (key=value pairs or JSON snippet).</summary>
    [MaxLength(2000)]
    public string? Before { get; set; }

    /// <summary>Serialised after-state (key=value pairs or JSON snippet).</summary>
    [MaxLength(2000)]
    public string? After { get; set; }

    /// <summary>Optional reason / justification, required for sensitive actions.</summary>
    [MaxLength(1000)]
    public string? Reason { get; set; }

    public DateTime Timestamp { get; set; } = DateTime.UtcNow;
}
