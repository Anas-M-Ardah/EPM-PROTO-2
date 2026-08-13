namespace Epm.Api.Domain;

/// <summary>
/// الشكل 6 · العرض الفني §11-1 — the two figures the contract REGISTER derives
/// that no other screen does.
///
/// <para><b>rule</b> «الإنجاز المادي المرجّح بقيمة كل عقد» — a project's physical
/// progress on this screen is its contracts' progress weighted by EACH
/// CONTRACT'S VALUE. Not a plain average of the percentages, and not the
/// BOQ-billed roll-up SCR-W6 reports.</para>
///
/// <para><b>spec</b> weighted = Σ(value × pct) ÷ Σ(value), over the contracts
/// whose progress is MEASURABLE. A contract with no bill of quantities enters
/// neither term — "not measurable" and "measured at zero" are different answers
/// (P-09), and putting a 0% contract in the denominator would report a project
/// as behind because nobody has imported its BOQ yet.</para>
///
/// <para><b>example</b> 1,512,077,482 at 31% and 587,673,564 at 21%
/// → 592,155,467.86 ÷ 2,099,751,046 → 28.2012% → 28% on screen (الشكل 6).</para>
///
/// ── WHY THIS IS NOT SCR-W6's FIGURE ──────────────────────────────────────
/// `ProgressEndpoints` rolls the project up over Σ BOQ line amounts, because
/// `02 §4` measures a contract against WHAT WAS BILLED. The two agree only when
/// every contract's bill sums to its contract value, which the fixture itself
/// breaks (CNT-0148 has no imported bill). الشكل 6 asks for the contract-value
/// weighting in as many words, so it gets its own rule rather than borrowing
/// one that answers a different question.
///
/// <para><b>rule</b> «كلفة العقد الكلية» — الإحالة + الاحتياط + الإشراف والمراقبة,
/// and it is the denominator of a contract card's المصروف % (الشكل 6 · الشكل 7).</para>
///
/// <para><b>spec</b> المراقبة is NOT in it. الشكل 8 prints كلفة العقد الكلي
/// 520,200,000 against 479,400,000 + 25,500,000 + 15,300,000, and `01 §2.3`
/// lists three expense items. `Contract.MonitoringAmount` exists because
/// المسار 2 step 3 asks the specialist for it (see the entity's own note): it is
/// collected, not counted here.</para>
///
/// <para><b>example</b> 479,400,000 + 25,500,000 + 15,300,000 → 520,200,000,
/// and 112,841,143 against it → 21.69% → 22% (الشكل 6's card, الشكل 7's headline).</para>
/// </summary>
public static class ContractRollup
{
    /// <param name="Value">القيمة النافذة — original + Σ applied deltas (BR-09).</param>
    /// <param name="PhysicalPct">Null when the contract has no bill to roll up.</param>
    public record Weight(decimal Value, decimal? PhysicalPct);

    /// <summary>
    /// Null when NOTHING is measurable, so the screen can say so rather than
    /// draw a 0% bar against a project nobody has measured yet (P-09).
    /// </summary>
    public static decimal? WeightedPhysical(IEnumerable<Weight> contracts)
    {
        decimal basis = 0m, weighted = 0m;

        foreach (var c in contracts)
        {
            // A valueless contract cannot carry weight either — it would add
            // nothing to the numerator and nothing to the denominator anyway,
            // and skipping it keeps the guard in one place.
            if (c.PhysicalPct is not { } pct || c.Value <= 0m) continue;

            basis += c.Value;
            weighted += c.Value * pct / 100m;
        }

        // Σ(value × pct/100) ÷ Σ(value) × 100 — the same division SCR-W4 and
        // SCR-W6 make, over a different pair of totals.
        return basis <= 0m ? null : ProgressReflection.Rollup(basis, weighted);
    }

    /// <summary>كلفة العقد الكلية — the three expense items of `01 §2.3`.</summary>
    public static decimal TotalCost(decimal award, decimal reserve, decimal supervision)
        => award + reserve + supervision;

    /// <summary>
    /// A contract card's المصروف % — spend against <see cref="TotalCost"/>.
    /// Null when the contract carries no cost items at all, which is a contract
    /// that has not been given its amounts yet, not one that is 0% spent.
    /// </summary>
    public static decimal? SpentPct(decimal totalCost, decimal disbursed)
        => totalCost <= 0m ? null : ProgressReflection.Rollup(totalCost, disbursed);
}
