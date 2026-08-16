namespace Epm.Api.Data.Entities;

/// <summary>
/// سجل النشاط for one contract — الشكل 7 lists it as the contract card's fifth
/// tab («نظرة عامة · التفاصيل · الدفعات · الملاحق والتعديلات · سجل النشاط»),
/// and المسار 2 repeats the list in «ما يظهر للمستخدم».
///
/// ── WHY A SECOND TABLE AND NOT A SHARED ONE ───────────────────────────────
/// This is ProjectActivityEvent's twin, with ContractId in place of ProjectId,
/// and the duplication is deliberate. A single `ActivityEvents` table with a
/// scope discriminator would be less code and one hop worse to read: CLAUDE.md
/// asks that a number on screen reach its SQL table in four hops all named the
/// same thing, and `db.ContractActivityEvents.Where(e => e.ContractId == id)`
/// is that. A shared table would answer "which rows are this contract's?" with
/// a filter on a string column that means something different per row.
///
/// If a third and fourth of these appear (BOQ, payments), the trade flips and
/// it is worth revisiting — noted here so that decision is made once, on
/// evidence, rather than drifted into.
///
/// §7 again: every edit attributable — «باسم منفّذها وصفته وجهته وتاريخها».
/// </summary>
public class ContractActivityEvent
{
    public int Id { get; set; }

    /// <summary>→ Contract.Id</summary>
    public string ContractId { get; set; } = "";

    /// <summary>created · updated · change-order · progress (الشكل 11).</summary>
    public string Action { get; set; } = "";

    /// <summary>
    /// «تمييز أحداث النظام الآلية عن أحداث المستخدمين» — الشكل 11 draws the two
    /// differently and attributes the automatic ones to «النظام · حدث آلي».
    /// user · system.
    /// </summary>
    public string Source { get; set; } = "user";

    // ── «عرض التغيير بصيغة القيمة السابقة مشطوبة ← القيمة الجديدة» ────────
    // الشكل 11 asks for the per-field diff in as many words, so it is recorded
    // rather than inferred. ONE ROW PER CHANGED FIELD: an edit that moves two
    // fields is two lines on the log, which is how the plate reads.
    //
    // Values are stored as the STRINGS the field held, not as typed columns —
    // a log row is a statement about what a screen said, and one nullable
    // decimal per field type would be five columns that are null four times
    // out of five. Formatting for display happens where every other figure is
    // formatted.

    /// <summary>The definition member that moved, e.g. `awardAmount`. Null on a non-edit.</summary>
    public string? Field { get; set; }
    public string? Before { get; set; }
    public string? After { get; set; }

    /// <summary>«أمر تغييري VO-03» — the order an automatic event came from.</summary>
    public string? RefId { get; set; }

    /// <summary>«تعديل تصميم الواجهة» — what the referenced order was for.</summary>
    public string? Note { get; set; }

    public string ActorId { get; set; } = "";
    public string ActorName { get; set; } = "";
    public string ActorRole { get; set; } = "";
    public string ActorParty { get; set; } = "";
    public DateOnly At { get; set; }
}
