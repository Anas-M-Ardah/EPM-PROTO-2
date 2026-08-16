namespace Epm.Api.Features.ProjectAlerts;

/// <summary>
/// Member names are IDENTICAL to
/// web/src/app/features/project-alerts/project-alerts.types.ts (CLAUDE.md §2).
///
/// SCR-W13 — التنبيهات · **ملحق الشكل 47**.
/// </summary>

/// <param name="Bucket">
/// overdue · today · week · later — `Domain/AlertInbox.Bucket`, measured against
/// the project DATA DATE. The client groups by it; it never re-derives it.
/// </param>
/// <param name="DaysToDue">
/// Negative once the date has passed, which is what «متأخر N يوم» prints. Null
/// for an alert with no deadline.
/// </param>
/// <param name="Status">open · acknowledged — derived from Acknowledged, sent as
/// a code so the pill resolves through `alert-status` like every other enum.</param>
public record ProjectAlertRow(
    int Id,
    string? RuleCode,
    string Severity,
    string Kind,
    string TitleAr,
    string TitleEn,
    string? TargetRef,
    string RaisedAt,
    string? DueOn,
    int? DaysToDue,
    string Bucket,
    string Status,
    string? AcknowledgedByUserId);

/// <param name="EscalateAfterHours">
/// Null is الشكل 47's «بلا تصعيد». The unit shown — «48 ساعة» against «5 أيام» —
/// is display formatting, not a second stored value.
/// </param>
public record AlertRuleRow(
    string Code,
    string NameAr,
    string NameEn,
    string TriggerAr,
    string TriggerEn,
    string Severity,
    bool ChannelInApp,
    bool ChannelEmail,
    bool ChannelSms,
    string Recurrence,
    int? EscalateAfterHours,
    bool Enabled);

/// <param name="Code">`all`, or a severity code, or a bucket code.</param>
public record AlertChip(string Code, int Count);

/// <param name="AlertCount">
/// The LIVE inbox — alerts whose rule is enabled. Silencing a rule moves this
/// number, which is the whole point of الشكل 47's notice.
/// </param>
/// <param name="NeedsAction">
/// «N تحتاج إجراءً الآن» — open AND due, from `Domain/AlertInbox.NeedsAction`.
/// </param>
public record ProjectAlertsResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string? DataDate,
    int AlertCount,
    int NeedsAction,
    int RuleCount,
    int EnabledRuleCount,
    IReadOnlyList<AlertChip> Severities,
    IReadOnlyList<AlertChip> Buckets,
    IReadOnlyList<ProjectAlertRow> Rows,
    IReadOnlyList<AlertRuleRow> Rules);

/// <summary>Body of EP-PAL-02. A toggle, so the caller states the target state.</summary>
public record SetRuleEnabledRequest(bool Enabled);
