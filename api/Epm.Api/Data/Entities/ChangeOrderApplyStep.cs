namespace Epm.Api.Data.Entities;

/// <summary>
/// The 7-step application checklist. Spec 03 §6.
///
/// 1 تحديث قيمة العقد        — update the contract value
/// 2 تحديث كميات البنود       — update BOQ quantities
/// 3 تحديث أسعار الوحدات      — update unit rates  (ONLY if a rate changed → else "na")
/// 4 إعادة احتساب الأوزان     — recalculate weights
/// 5 تحديث الأنشطة           — update activities
/// 6 تحديث الجدول الزمني      — update the schedule
/// 7 التحقق النهائي           — final verification
///
/// A FAILED STEP keeps the order in `approved-applying`, raises a فشل التطبيق
/// flag in the register, and surfaces on the affected line (03 §6). Step 4 is
/// the one the seeded VO-04 scenario fails.
/// </summary>
public class ChangeOrderApplyStep
{
    public int Id { get; set; }

    public int ChangeOrderId { get; set; }

    /// <summary>1..7 per the list above.</summary>
    public int StepNo { get; set; }

    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";

    /// <summary>Lookup "apply-step-status": na · todo · wip · done · fail (06 §7).</summary>
    public string Status { get; set; } = "todo";

    /// <summary>Shown on failure. Details are only revealed on expand or failure (03 §6).</summary>
    public string? Message { get; set; }

    public DateTime? CompletedAt { get; set; }
}
