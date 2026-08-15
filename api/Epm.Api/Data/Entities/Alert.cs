namespace Epm.Api.Data.Entities;

/// <summary>
/// Alerts Center (SCR-E6) and the project Alerts tab (SCR-W13).
///
/// In production these are raised by domain events — an SLA breach (BR-12), a
/// failed application step (03 §6), a distribution that blocks an apply (02 §8).
/// In the prototype they are rows; the escalation dispatch is not implemented
/// (07 §2 lists real email/SMS as POC work).
///
/// ── COLUMNS ARE PRUNED TO WHAT SCR-E6 SHOWS (CLAUDE.md §4) ────────────────
/// The starting point carried BodyAr/BodyEn. The v1.1 Alerts Center is a dense
/// register — title, project, source, severity, status, raised — with no detail
/// pane, so a body column would exist unread. SCR-W13 (Phase 6) adds it back
/// with the drawer that displays it.
///
/// ── NO SNOOZE ────────────────────────────────────────────────────────────
/// The reference feed carries a third status, `snoozed`. Nothing in 02 or 03
/// defines when a snooze expires or who may set one, so storing it would be an
/// invented rule. Acknowledged is a bool and the two states it yields — open
/// and acknowledged — are the two the escalation rules actually reference.
/// </summary>
public class Alert
{
    public int Id { get; set; }

    /// <summary>Null for enterprise-wide alerts.</summary>
    public string? ProjectId { get; set; }

    /// <summary>critical · warning · info — the severity cards on SCR-E6 group by this. Lookup kind `alert-severity`.</summary>
    public string Severity { get; set; } = "info";

    /// <summary>
    /// sla-overdue · apply-failed · distribution-blocked · schedule-slip ·
    /// budget · other. Rendered as the Source column. Lookup kind `alert-kind`.
    /// </summary>
    public string Kind { get; set; } = "other";

    public string TitleAr { get; set; } = "";
    public string TitleEn { get; set; } = "";

    /// <summary>What this alert points at, e.g. a change order id. Free-form for the prototype.</summary>
    public string? TargetRef { get; set; }

    /// <summary>
    /// The DATA DATE at which the alert was raised, never a wall clock (D-06).
    /// Everything in the fixture sits on or before the project data date
    /// 2026-08-02, so nothing reads as raised in the future.
    /// </summary>
    public DateTime RaisedAt { get; set; }

    /// <summary>
    /// → AlertRule.Code. **The rule is the source of the alert** (الشكل 47):
    /// disabling the rule withdraws this alert from the inbox, and that is a
    /// filter at read time, not a column written here. Null for an alert no
    /// rule produced — the plate's own inbox has some.
    /// </summary>
    public string? RuleCode { get; set; }

    /// <summary>
    /// «الاستحقاق» — when this alert must be acted on, at the DATA DATE (D-06).
    /// The inbox groups by it in a fixed order (متأخرة · مستحقة اليوم · خلال
    /// هذا الأسبوع · لاحقاً) and «تحتاج إجراءً الآن» counts the open ones that
    /// have reached it. Null means the alert is a notice with no deadline.
    /// </summary>
    public DateOnly? DueOn { get; set; }

    public bool Acknowledged { get; set; }

    /// <summary>The persona that acknowledged it (X-Epm-User), null while open.</summary>
    public string? AcknowledgedByUserId { get; set; }
}
