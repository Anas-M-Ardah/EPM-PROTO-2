namespace Epm.Api.Domain;

/// <summary>
/// المسار 2 — إنشاء العقود وربطها بالمشروع, validation half.
///
/// «البداية: صدور الإحالة · النهاية: عقد نافذ جاهز لاستقبال حساب الكميات
/// والجدول الزمني والدفعات».
///
/// Step 5 states the checks in one line — «تحقق: عدم تكرار رقم العقد · النهاية
/// بعد المباشرة · المبالغ موجبة» — and the summary row adds the fourth,
/// «انتماء العقد إلى مشروع واحد». One method, one rule per documented clause.
///
/// ── THE APPROVAL HALF IS DELIBERATELY ABSENT ─────────────────────────────
/// المسار 2 step 6 is «اعتماد العقد» by إدارة المشاريع, exactly as المسار 1 had
/// «اعتماد المشروع». That step was removed from the project track at the
/// client's instruction and is omitted here for the same reason and by the same
/// decision: a contract is SAVED and is live as soon as it is saved. Recorded so
/// the divergence is not read as an oversight.
///
/// Consequence, and it is the one worth knowing: step 7 — «احتساب قيمة المشروع
/// من مجموع قيم عقوده» — now runs off contracts that nobody approved. The
/// arithmetic is unchanged (BR-00, Domain/ProjectValue), but what feeds it is.
///
/// No database access, by CLAUDE.md §4: the duplicate-code check takes the
/// existing codes as an argument rather than querying for them, so a wrong
/// fixture cannot make a test lie about whether a duplicate is refused.
/// </summary>
public static class ContractDefinition
{
    /// <inheritdoc cref="ProjectDefinition.Violation"/>
    public record Violation(string Field, string MessageAr, string MessageEn);

    /// <summary>
    /// What the caller hands over for checking. A record rather than the entity
    /// so the rule cannot read a column it has no business reading, and so a
    /// test case is one line.
    /// </summary>
    public record Candidate(
        string Id,
        string ProjectId,
        string NameAr,
        string Component,
        string Status,
        DateOnly? Start,
        DateOnly? Finish,
        decimal? AwardAmount,
        decimal? ReserveAmount,
        decimal? SupervisionAmount,
        decimal? MonitoringAmount,
        string Contractor);

    /// <summary>
    /// Every violation, not just the first.
    /// </summary>
    /// <param name="existingCodesInScope">
    /// The contract codes ALREADY IN THE SAME تشكيل. المسار 2 scopes uniqueness
    /// to the entity — «عدم تكرار رقم العقد داخل التشكيل» — not to the project
    /// and not to the ministry, so the caller resolves that set and passes it.
    /// Must EXCLUDE the contract being edited, or every save of an unchanged
    /// code would collide with itself.
    /// </param>
    public static IReadOnlyList<Violation> Validate(
        Candidate c, IReadOnlyCollection<string> existingCodesInScope)
    {
        var v = new List<Violation>();

        // ── mandatory identity (step 2 — «إدخال هوية العقد والمكوّن وحالته») ──
        if (string.IsNullOrWhiteSpace(c.Id))
            v.Add(new("id", "رمز العقد مطلوب.", "Contract code is required."));

        if (string.IsNullOrWhiteSpace(c.NameAr))
            v.Add(new("nameAr", "اسم العقد مطلوب.", "Contract name is required."));

        if (string.IsNullOrWhiteSpace(c.Component))
            v.Add(new("component", "المكوّن مطلوب.", "Component is required."));

        if (string.IsNullOrWhiteSpace(c.Status))
            v.Add(new("status", "حالة العقد مطلوبة.", "Contract status is required."));

        if (string.IsNullOrWhiteSpace(c.Contractor))
            v.Add(new("contractor", "اسم المقاول مطلوب.", "Contractor name is required."));

        // ── 1. عدم تكرار رقم العقد داخل التشكيل ───────────────────────────
        // Case-insensitive: "cnt-0279" and "CNT-0279" are the same number to
        // everyone except a string comparison.
        if (!string.IsNullOrWhiteSpace(c.Id)
            && existingCodesInScope.Any(x => string.Equals(x, c.Id, StringComparison.OrdinalIgnoreCase)))
            v.Add(new("id",
                $"رمز العقد «{c.Id}» مستخدم بالفعل ضمن هذا التشكيل.",
                $"Contract code '{c.Id}' is already used in this entity."));

        // ── 2. تسلسل التواريخ — «النهاية بعد المباشرة» ────────────────────
        if (c.Start is null)
            v.Add(new("start", "تاريخ المباشرة مطلوب.", "Start date is required."));

        if (c.Finish is null)
            v.Add(new("finish", "تاريخ الإنجاز مطلوب.", "Finish date is required."));

        // Stated as "after", so an equal date fails too — a contract that
        // finishes the day it starts has no duration to run a programme over.
        if (c.Start is { } s && c.Finish is { } f && f <= s)
            v.Add(new("finish",
                "تاريخ الإنجاز يجب أن يكون بعد تاريخ المباشرة.",
                "The finish date must be after the start date."));

        // ── 3. موجبية المبالغ ─────────────────────────────────────────────
        // The AWARD is the contract; it must be greater than zero. The other
        // three are allowed to be zero — a contract may genuinely carry no
        // reserve — but never negative, which is what "موجبية" rules out.
        if (c.AwardAmount is null)
            v.Add(new("awardAmount", "مبلغ الإحالة مطلوب.", "Award amount is required."));
        else if (c.AwardAmount <= 0)
            v.Add(new("awardAmount",
                "مبلغ الإحالة يجب أن يكون أكبر من صفر.",
                "The award amount must be greater than zero."));

        Negative("reserveAmount", c.ReserveAmount, "مبلغ الاحتياط", "The reserve amount");
        Negative("supervisionAmount", c.SupervisionAmount, "مبلغ الإشراف", "The supervision amount");
        Negative("monitoringAmount", c.MonitoringAmount, "مبلغ المراقبة", "The monitoring amount");

        void Negative(string field, decimal? amount, string ar, string en)
        {
            if (amount is < 0)
                v.Add(new(field, $"{ar} لا يمكن أن يكون سالباً.", $"{en} cannot be negative."));
        }

        // ── 4. انتماء العقد إلى مشروع واحد ────────────────────────────────
        // ONE project, and the column holds one id, so the failure it can
        // actually have is an ABSENT one. `01 §1` makes the contract the
        // working context precisely because it hangs off exactly one project.
        if (string.IsNullOrWhiteSpace(c.ProjectId))
            v.Add(new("projectId",
                "يجب أن ينتمي العقد إلى مشروع واحد.",
                "The contract must belong to exactly one project."));

        return v;
    }

    /// <summary>
    /// The contractual duration the entity stores alongside the dates. Derived
    /// once at save from the two dates rather than asked for — asking would
    /// invite a third number that contradicts the two it is computed from.
    ///
    /// `OriginalDurationDays` is then NEVER overwritten (non-negotiable #6);
    /// amendments layer their day deltas on top via Domain/Amendments.
    /// </summary>
    public static int DurationDays(DateOnly start, DateOnly finish) =>
        finish.DayNumber - start.DayNumber;
}
