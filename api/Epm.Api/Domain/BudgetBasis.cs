namespace Epm.Api.Domain;

/// <summary>
/// ملحق الشكل 14 · العرض الفني §15-1 — WHICH figure «الكلفة المقررة» and
/// «الكلفة المعدلة» name, and therefore what الإنجاز المالي is a percentage of.
///
/// ── TWO BASES, AND THE PLATE USES BOTH ───────────────────────────────────
/// الشكل 14's header equation reads
/// «المقررة 1,374,210,115 + تغييرات معتمدة 125,789,885 = المعدلة 1,500,000,000
///  − المصروف التراكمي 510,305,195 (34%) = المتبقي 989,694,805»
/// while the SAME screen's table footer totals 2,156,653,454. They are not the
/// same question: the first is the APPROVED BUDGET — what may be spent — and
/// the second is CONTRACTUAL COMMITMENTS — what has been promised. «أساسا
/// القياس» exists on that plate to say so, and to demand a cost revision or a
/// مناقلة when the second outruns the first.
///
/// The budget pair is RECORDED, not derived: الشكل 19 shows المعدلة edited
/// 1,477,500,000 → 1,500,000,000, and 125,789,885 is not the contracts'
/// applied-delta total. الشكل 18 is where both are written, and calls itself
/// «مدخل التحرير الوحيد للبيانات المالية للمشروع».
///
/// ── THE DENOMINATOR QUESTION IS ANSWERED HERE (P-44) ─────────────────────
/// `02 §4` says financial % «comes from payments» and never fixes what it is a
/// percentage OF, which is why SCR-W3 renders no financial % at all. العرض
/// الفني §23-1 fixes it in the client's own words: الإنجاز المالي is «المصروف
/// التراكمي نسبةً إلى الكلفة المعدلة». That is <see cref="Result.Revised"/>,
/// and every screen that prints the figure divides by it.
///
/// ── ONE DERIVATION, THREE CALLERS (P-54) ─────────────────────────────────
/// SCR-W1, SCR-W6 and SCR-W7 all print الإنجاز المالي and the EVM board. They
/// call this, not each other's arithmetic. Splitting it would be the first step
/// towards three screens disagreeing about one number.
///
/// ── A PROJECT WITHOUT A RECORDED BUDGET STILL WORKS ──────────────────────
/// The fallback is commitments, and <see cref="Result.Source"/> says which
/// basis is in force so the screen can state it rather than imply it. Printing
/// zero, or an em dash where the headline goes, would be worse than printing
/// the figure the system does have and naming it (P-09).
/// </summary>
public static class BudgetBasis
{
    /// <summary>The recorded pair from الشكل 18 was used.</summary>
    public const string Recorded = "recorded";

    /// <summary>No budget is recorded; Σ contract effective values stood in.</summary>
    public const string Commitments = "commitments";

    /// <param name="Approved">«الكلفة المقررة» — the equation's first term.</param>
    /// <param name="Changes">«تغييرات معتمدة» — signed, and simply Revised − Approved.</param>
    /// <param name="Revised">«الكلفة المعدلة» — the denominator of الإنجاز المالي.</param>
    /// <param name="Source">recorded · commitments.</param>
    public record Result(decimal Approved, decimal Changes, decimal Revised, string Source);

    /// <summary>
    /// A project is on the RECORDED basis when it carries a revised cost, which
    /// is the figure everything downstream divides by. A recorded approved cost
    /// with no revised one is an incomplete record, not a basis — الشكل 18
    /// marks المقررة as the mandatory field and المعدلة is what الشكل 14's
    /// equation ends on.
    ///
    /// With a revised cost but no approved one, the equation opens on the
    /// revised figure and its change term is zero. Nothing is invented.
    /// </summary>
    public static Result For(decimal? plannedCost, decimal? revisedCost, decimal commitments)
    {
        if (revisedCost is not { } revised)
            return new Result(commitments, 0m, commitments, Commitments);

        var approved = plannedCost ?? revised;
        return new Result(approved, revised - approved, revised, Recorded);
    }

    /// <summary>
    /// المتبقي — «الكلفة المعدلة − المصروف التراكمي». Signed: a project that has
    /// paid past its budget shows the overrun rather than a floor of zero.
    /// </summary>
    public static decimal Balance(Result basis, decimal disbursed) => basis.Revised - disbursed;

    /// <summary>
    /// الإنجاز المالي · نسبة الصرف — «المصروف التراكمي نسبةً إلى الكلفة
    /// المعدلة» (§23-1). Null on a zero basis, never a zero that asserts the
    /// project has spent nothing when the truth is nobody has recorded a budget.
    /// </summary>
    public static decimal? SpendPct(Result basis, decimal disbursed)
        => basis.Revised > 0m ? disbursed / basis.Revised * 100m : null;

    /// <summary>
    /// «أساسا القياس» — the signed gap between the budget and the commitments.
    /// Negative means the contracts have outrun the budget, which is the case
    /// the note box on الشكل 14 exists to raise. Null when the two are the same
    /// figure, because there is no comparison to draw.
    /// </summary>
    public static decimal? Gap(Result basis, decimal commitments)
        => basis.Source == Recorded ? basis.Revised - commitments : null;
}
