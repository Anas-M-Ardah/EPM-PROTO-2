namespace Epm.Api.Data.Entities;

/// <summary>
/// إجراء من سجل الإجراءات — SCR-W11's second half · **ملحق الشكل 45**.
///
/// The plate's register is six columns: الرقم · الإجراء · المسؤول · الاستحقاق ·
/// الأولوية · الحالة. An action belongs to the MEETING that raised it, which is
/// what lets the timeline above and the register below be read as one screen.
/// </summary>
public class MeetingAction
{
    public int Id { get; set; }

    /// <summary>→ Meeting.Id. The decision this action came out of.</summary>
    public int MeetingId { get; set; }

    /// <summary>ACT-01 … — unique within the project.</summary>
    public string Code { get; set; } = "";

    public string TitleAr { get; set; } = "";
    public string TitleEn { get; set; } = "";

    public string Owner { get; set; } = "";
    public DateOnly? DueDate { get; set; }

    /// <summary>Lookup `action-priority`: high عالية · medium متوسطة · low منخفضة.</summary>
    public string Priority { get; set; } = "medium";

    /// <summary>
    /// Lookup `action-status`: open مفتوح · inprogress قيد التنفيذ ·
    /// overdue متأخر · closed مغلق.
    ///
    /// **«متأخر» IS ONE OF THE VALUES, NOT A DERIVATION.** The first cut derived
    /// it from the due date against the data date, which is what an SLA is — and
    /// الشكل 45 refutes it: ACT-02 is due 2026-05-10 against a data date of
    /// 2026-08-11 and still reads «قيد التنفيذ», while ACT-01 reads «متأخر».
    /// This register is maintained by whoever keeps the minutes, and lateness on
    /// it is their judgement, not the calendar's (P-116).
    /// </summary>
    public string Status { get; set; } = "open";
}
