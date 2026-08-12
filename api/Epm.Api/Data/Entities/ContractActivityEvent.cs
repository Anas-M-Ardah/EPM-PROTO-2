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

    /// <summary>created · updated.</summary>
    public string Action { get; set; } = "";

    public string ActorId { get; set; } = "";
    public string ActorName { get; set; } = "";
    public string ActorRole { get; set; } = "";
    public string ActorParty { get; set; } = "";
    public DateOnly At { get; set; }
}
