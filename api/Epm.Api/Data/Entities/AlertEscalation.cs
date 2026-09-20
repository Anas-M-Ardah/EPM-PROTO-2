namespace Epm.Api.Data.Entities;

/// <summary>
/// An immutable step in an alert's escalation trail.  The recipient is a
/// documented role in the prototype; wiring it to actual identities belongs
/// to the production notification integration.
/// </summary>
public class AlertEscalation
{
    public int Id { get; set; }
    public int AlertId { get; set; }
    public int Level { get; set; }
    public string RecipientRole { get; set; } = "";
    public DateTime EscalatedAt { get; set; }
    public string Reason { get; set; } = "";
}
