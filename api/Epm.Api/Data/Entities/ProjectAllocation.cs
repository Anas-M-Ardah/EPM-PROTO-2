namespace Epm.Api.Data.Entities;

/// <summary>
/// التخصيص المالي السنوي — one fiscal year's allocation for one project
/// (الشكل 15).
///
/// This is the table `FinancialsEndpoints` used to say it did not have: the
/// `allocation` entry in its `unavailable` list read «يتطلب جدول التخصيصات
/// السنوية للوزارة — لا يسجّله هذا النموذج بعد» (P-56). It does now.
///
/// ── ALLOCATION IS NOT BUDGET AND NOT COMMITMENT ──────────────────────────
/// Three different figures live on this screen and none of them is the others:
///
///   الكلفة المعدلة    the project's approved cost — `Projects.PlannedCost`.
///   إجمالي العقود     what has been committed contractually — BR-00 over BR-09.
///   التخصيص السنوي    what the ministry released FOR THIS YEAR, and the only
///                     one of the three that can stop a payment in October.
///
/// الشكل 14's note box compares the first two; this table is the third, and it
/// is what «تكشف مبكرًا اقتراب استهلاك التخصيص السنوي» is measured against.
///
/// ── THE SPEND IS NOT STORED HERE ─────────────────────────────────────────
/// Only the allocation is recorded. المصروف for a year is Σ of the payments
/// whose money moved in it (`Payment.PaidDate`), derived at projection time
/// like every other spend figure in this system (CLAUDE.md §3.5) — so this
/// screen cannot disagree with الشكل 14 or the payments register about what a
/// year cost.
/// </summary>
public class ProjectAllocation
{
    public int Id { get; set; }

    /// <summary>→ Project.Id</summary>
    public string ProjectId { get; set; } = "";

    /// <summary>The fiscal year. One row per project per year.</summary>
    public int Year { get; set; }

    /// <summary>ما خُصِّص لهذه السنة. Money is decimal, never float (D-11).</summary>
    public decimal Amount { get; set; }

    // §7 — every recorded figure attributable. الشكل 15 says the current year is
    // edited in «البيانات المسجّلة» (الشكل 18) and that closed years move only by
    // an approved transfer, so who put a number here matters.
    public string ActorName { get; set; } = "";
    public string ActorRole { get; set; } = "";
    public string ActorParty { get; set; } = "";

    /// <summary>The project's data date when it was recorded (D-06).</summary>
    public DateOnly At { get; set; }

    /// <summary>
    /// «السنوات السابقة سجلّ مقفل» — a closed year is not editable in place; it
    /// moves only through an approved transfer (مناقلة). Set by the screen that
    /// closes a year, which does not exist yet: nothing writes `true` today.
    /// </summary>
    public bool Closed { get; set; }
}
