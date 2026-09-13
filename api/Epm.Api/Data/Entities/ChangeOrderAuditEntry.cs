namespace Epm.Api.Data.Entities;

/// <summary>
/// Spec 01 §4, 03 §9 tab 6.
///
/// EVERY event, with WHO · WHEN · PREVIOUS VALUE · NEW VALUE · SOURCE ORDER ·
/// STAGE · VERSION. This system is a legal and financial record — an audit row
/// is written for every transition, every edit and every delegated recording.
///
/// The BOQ item and the activity must each be able to answer "which change
/// orders amended me, in what order, and what did each one do" (01 §4).
/// </summary>
public class ChangeOrderAuditEntry
{
    public int Id { get; set; }

    public int ChangeOrderId { get; set; }

    public DateTime At { get; set; }

    public string UserId { get; set; } = "";

    /// <summary>Capacity used for the action; system identifies automated apply work.</summary>
    public string ActorRole { get; set; } = "actor";

    /// <summary>e.g. "create" · "edit" · "submit" · "approve" · "return" · "reject" · "cancel" · "apply" · "record-external".</summary>
    public string Action { get; set; } = "";

    /// <summary>Traceability anchor for the endpoint/domain rule that emitted this event.</summary>
    public string TraceabilityAnchor { get; set; } = "EP-CO-09";

    /// <summary>Which of the six stages this happened in. Null for pre-submission edits.</summary>
    public int? StageNo { get; set; }

    /// <summary>What changed, e.g. "BQ-003.qty" or "lifecycle".</summary>
    public string? Field { get; set; }

    public string? PreviousValue { get; set; }
    public string? NewValue { get; set; }

    /// <summary>Structured snapshots retained alongside the display values.</summary>
    public string? BeforeSnapshot { get; set; }
    public string? AfterSnapshot { get; set; }

    public string? Note { get; set; }

    public int Version { get; set; } = 1;
}
