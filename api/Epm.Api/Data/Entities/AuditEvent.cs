namespace Epm.Api.Data.Entities;

/// <summary>
/// Project-wide audit trail (SCR-W15) — everything that is NOT a change-order
/// event. Change-order events live in ChangeOrderAuditEntry so the record page's
/// السجل tab can read one table.
///
/// Spec 01 §4: who · when · previous value · new value.
/// </summary>
public class AuditEvent
{
    public int Id { get; set; }

    public string ProjectId { get; set; } = "";

    public DateTime At { get; set; }
    public string UserId { get; set; } = "";

    /// <summary>Which tab/module raised it, e.g. "boq", "contract", "schedule".</summary>
    public string Scope { get; set; } = "";

    public string Action { get; set; } = "";

    /// <summary>The row that changed, e.g. "BQ-003".</summary>
    public string? EntityRef { get; set; }
    public string? Field { get; set; }
    public string? PreviousValue { get; set; }
    public string? NewValue { get; set; }

    public string? Note { get; set; }
}
