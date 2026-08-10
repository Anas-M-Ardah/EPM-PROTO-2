namespace Epm.Api.Data.Entities;

/// <summary>
/// One affected schedule activity inside a change order. Spec 03 §8 step 2.
///
/// Standing note shown in the UI:
///   "تعديل مدة النشاط لا يُعد تعديلاً لمدة المشروع — الأثر النهائي يُحدَّد في مرحلة تحليل الجدول."
/// Changing an activity's duration is NOT the same as changing the project duration.
///
/// Values always render as Current · Proposed change · Revised (03 §8).
/// </summary>
public class ChangeOrderActivity
{
    public int Id { get; set; }

    public int ChangeOrderId { get; set; }

    public int ActivityId { get; set; }

    /// <summary>Lookup "activity-change-type": inc · dec · start · finish · both (06 §7).</summary>
    public string ChangeType { get; set; } = "inc";

    // ---- BEFORE. Never overwritten. ----
    public DateOnly? BeforeStart { get; set; }
    public DateOnly? BeforeFinish { get; set; }
    public int BeforeRemainingDuration { get; set; }

    // ---- REQUESTED ----
    public int? RequestedDeltaDays { get; set; }
    public DateOnly? RequestedStart { get; set; }
    public DateOnly? RequestedFinish { get; set; }

    /// <summary>From the schedule-impact analysis stage, which may differ from requested.</summary>
    public int? AnalysisDays { get; set; }

    // ---- APPROVED ----
    public int? ApprovedDeltaDays { get; set; }
    public DateOnly? ApprovedFinish { get; set; }

    // ---- APPLIED ----
    public int? AppliedDeltaDays { get; set; }

    public string ApplyStatus { get; set; } = "todo";
}
