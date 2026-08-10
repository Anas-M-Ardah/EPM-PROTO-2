namespace Epm.Api.Data.Entities;

/// <summary>
/// Alerts Center (SCR-E6) and the project Alerts tab (SCR-W13).
///
/// In production these are raised by domain events — an SLA breach (BR-12), a
/// failed application step (03 §6), a distribution that blocks an apply (02 §8).
/// In the prototype they are rows; the escalation dispatch is not implemented
/// (07 §2 lists real email/SMS as POC work).
/// </summary>
public class Alert
{
    public int Id { get; set; }

    /// <summary>Null for enterprise-wide alerts.</summary>
    public string? ProjectId { get; set; }

    /// <summary>info · warning · critical — severity KPIs on SCR-E6 group by this.</summary>
    public string Severity { get; set; } = "info";

    /// <summary>sla-overdue · apply-failed · distribution-blocked · schedule-slip · budget · other</summary>
    public string Kind { get; set; } = "other";

    public string TitleAr { get; set; } = "";
    public string TitleEn { get; set; } = "";
    public string BodyAr { get; set; } = "";
    public string BodyEn { get; set; } = "";

    /// <summary>What this alert points at, e.g. a change order id. Free-form for the prototype.</summary>
    public string? TargetRef { get; set; }

    public DateTime RaisedAt { get; set; }
    public bool Acknowledged { get; set; }
    public string? AcknowledgedByUserId { get; set; }
}
