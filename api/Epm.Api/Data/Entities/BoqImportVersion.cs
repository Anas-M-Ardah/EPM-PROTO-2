namespace Epm.Api.Data.Entities;

/// <summary>
/// One submitted BOQ import — المسار 3 step 6, «تقديم النسخة للاعتماد — لا
/// استبدال للإصدار السابق», and the promise الشكل 13 prints inside its own
/// dialog: «يُقدَّم للاعتماد ولا يُستبدل الجدول السابق — يُحفَظ كإصدار».
///
/// ── WHY THIS IS NOT `BoqItems` WITH A VERSION COLUMN ─────────────────────
/// A submitted version is not part of the bill. `BoqItems` is what the register
/// reads, what weights are derived from and what activities link to; a version
/// awaiting approval must touch none of that, and a version column on the live
/// table would put it one forgotten `Where` away from every one of them. Here it
/// is unreachable by construction: no screen that reads the bill reads this.
///
/// Step 7 («اعتماد الإصدار الجديد») and step 8 («حفظ الإصدار وتحديث أوزان البنود
/// وقيمة العقد المرجعية») are what would move a version INTO `BoqItems`, and
/// neither has a screen in the appendix yet. Until one exists, this table only
/// ever grows — which is exactly «يحمي البيانات التاريخية: لا يُمحى إصدار سابق».
/// </summary>
public class BoqImportVersion
{
    public int Id { get; set; }

    /// <summary>→ Contract.Id. المسار 3: «انتماء البنود إلى العقد المختار حصرًا».</summary>
    public string ContractId { get; set; } = "";

    /// <summary>1-based, per contract. The version's name on screen.</summary>
    public int No { get; set; }

    /// <summary>submitted · approved · rejected. Only `submitted` is written today.</summary>
    public string State { get; set; } = "submitted";

    /// <summary>
    /// «نوع الجدول» — the الشكل 13 field: `replace` (تحديث حالي) · `initial`
    /// (إصدار أول) · `revision` (مراجعة تعاقدية). Recorded because it is what
    /// the approver needs to know the submitter INTENDED; it changes nothing
    /// here, since nothing is replaced either way.
    /// </summary>
    public string SheetType { get; set; } = "replace";

    // ── who APPROVED it (المسار 3 step 7) ────────────────────────────────
    // Separate from the submitter's Actor* columns above, and never
    // overwriting them: «من قدّم» and «من اعتمد» are two different facts about
    // one document, and this bill decides contract value. Null until approved.
    public string ApproverId { get; set; } = "";
    public string ApproverName { get; set; } = "";
    public string ApproverRole { get; set; } = "";
    public string ApproverParty { get; set; } = "";
    public DateOnly? ApprovedAt { get; set; }

    /// <summary>Metadata only — no file is stored anywhere (CLAUDE.md §4).</summary>
    public string FileName { get; set; } = "";
    public long FileSizeBytes { get; set; }

    public int ItemCount { get; set; }
    public decimal TotalAmount { get; set; }

    /// <summary>What the bill was worth when this was submitted — the comparison's before.</summary>
    public decimal PreviousAmount { get; set; }

    // §7 — every submission attributable: «باسم منفّذها وصفته وجهته وتاريخها».
    public string ActorId { get; set; } = "";
    public string ActorName { get; set; } = "";
    public string ActorRole { get; set; } = "";
    public string ActorParty { get; set; } = "";

    /// <summary>The project's data date (D-06), never the wall clock.</summary>
    public DateOnly At { get; set; }
}
