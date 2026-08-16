namespace Epm.Api.Domain;

/// <summary>
/// SCR-W13 — التنبيهات · **ملحق الشكل 47**.
///
/// Three rules live here, and all three are the plate's own words.
///
/// ── 1. A DISABLED RULE WITHDRAWS ITS ALERTS ──────────────────────────────
/// *«إيقاف قاعدة يوقف التنبيهات التي أنتجتها فورًا — التنبيه ليس سجلًا مستقلًا
/// يُحرَّر»*. <see cref="Live"/> is that sentence: the inbox is the alerts whose
/// rule is enabled, plus the ones no rule produced. Nothing is deleted and no
/// column on the alert records the suppression, so re-enabling the rule brings
/// its alerts back exactly as they were.
///
/// ── 2. «تحتاج إجراءً الآن» IS OPEN **AND** DUE ───────────────────────────
/// Not open, and not overdue — both. An acknowledged alert needs nothing, and
/// an open one due next week is not waiting on anybody today.
///
/// ── 3. THE INBOX ORDER IS THE SYSTEM'S, NOT THE READER'S ─────────────────
/// متأخرة · مستحقة اليوم · خلال هذا الأسبوع · لاحقاً, measured against the
/// project DATA DATE (D-06) and never a wall clock. The reference states the
/// reason and it is worth repeating: *the point of an inbox is that the system
/// decides priority* — so the grouping is fixed and no column is sortable.
/// </summary>
public static class AlertInbox
{
    /// <param name="RuleCode">Null when no rule produced the alert.</param>
    public record Item(int Id, string? RuleCode, DateOnly? DueOn, bool Acknowledged);

    public record Rule(string Code, bool Enabled);

    public const string Overdue = "overdue";
    public const string Today = "today";
    public const string Week = "week";
    public const string Later = "later";

    /// <summary>The buckets in their fixed order — every one of them, always.</summary>
    public static IReadOnlyList<string> Buckets { get; } = new[] { Overdue, Today, Week, Later };

    /// <summary>
    /// The alerts the inbox shows: rule enabled, or no rule at all. An alert
    /// naming a rule that does not exist is treated as suppressed — a dangling
    /// code is a broken rule, and a broken rule is not a live one.
    /// </summary>
    public static IReadOnlyList<Item> Live(
        IReadOnlyList<Item> alerts, IReadOnlyList<Rule> rules)
    {
        var enabled = rules.Where(r => r.Enabled).Select(r => r.Code).ToHashSet();
        return alerts.Where(a => a.RuleCode is null || enabled.Contains(a.RuleCode)).ToList();
    }

    /// <summary>
    /// «N تحتاج إجراءً الآن» — open, with a due date that has arrived. Counted
    /// over the LIVE list, so silencing a rule drops its alerts out of the
    /// header count in the same breath as out of the inbox.
    /// </summary>
    public static int NeedsAction(IReadOnlyList<Item> live, DateOnly dataDate)
        => live.Count(a => !a.Acknowledged && a.DueOn is { } due && due <= dataDate);

    /// <summary>
    /// Which group an alert belongs to. An alert with no due date is a notice —
    /// it sits in «لاحقاً» rather than inventing a deadline for it.
    /// </summary>
    public static string Bucket(DateOnly? dueOn, DateOnly dataDate)
    {
        if (dueOn is not { } due) return Later;
        if (due < dataDate) return Overdue;
        if (due == dataDate) return Today;
        return due <= dataDate.AddDays(7) ? Week : Later;
    }

    /// <summary>
    /// How many days late — or left. Negative is overdue, which is what the
    /// row prints as «متأخر N يوم». Null for an alert with no due date.
    /// </summary>
    public static int? DaysToDue(DateOnly? dueOn, DateOnly dataDate)
        => dueOn is { } due ? due.DayNumber - dataDate.DayNumber : null;
}
