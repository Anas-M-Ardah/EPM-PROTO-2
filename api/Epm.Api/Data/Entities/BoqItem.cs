namespace Epm.Api.Data.Entities;

/// <summary>
/// Spec 01 §2.4.
///
/// FLAT — no navigation properties. Its children:
///   db.BoqRateBands.Where(b => b.BoqItemId == id)
///   db.BoqDistributions.Where(d => d.BoqItemId == id)
///   db.BoqActivityLinks.Where(l => l.BoqItemId == id)
///
/// DO NOT add project, WBS or location columns. The project is derived from the
/// contract; WBS belongs to the activity; location belongs to the distribution.
/// (01 §2.4 note, 03 §9 "excluded from the main tables")
///
/// DO NOT add a beneficiary column — a quantity may be split across several
/// beneficiaries, so that lives in BoqDistribution. (01 §1)
///
/// DERIVED — never stored (01 §3):
///   EffectiveQty  = from applied amendments / rate bands
///   Amount        = qty × rate, or Σ rate-band amounts
///   WeightPct     = amount ÷ contract BOQ total, largest-remainder (BR-01)
///   BlendedRate   = Σ(bandQty × bandRate) / Σ(bandQty)  (BR-05)
///   ProgressPct   = allocation-weighted mean of linked activities (BR-04)
/// </summary>
public class BoqItem
{
    public int Id { get; set; }

    /// <summary>
    /// e.g. "BQ-001". Unique WITHIN the contract — NOT globally, and there is no
    /// database index enforcing it. Check it in the endpoint that creates items,
    /// where the rule is visible.
    /// </summary>
    public string Code { get; set; } = "";

    /// <summary>→ Contract.Id. REQUIRED. Contract scoping is an invariant (01 §1).</summary>
    public string ContractId { get; set; } = "";

    public string DescriptionAr { get; set; } = "";
    public string DescriptionEn { get; set; } = "";
    public string Unit { get; set; } = "";

    /// <summary>
    /// Optional grouping only — not a scoping key. The register groups rows
    /// into an expandable division → item hierarchy when it is present.
    /// </summary>
    public string Division { get; set; } = "";

    /// <summary>The division's own label, so rendering the group needs no lookup.</summary>
    public string DivisionName { get; set; } = "";

    /// <summary>
    /// "imported" (from a BOQ sheet) | "manual" (entered on site). The register
    /// badges a manual row — where a figure came from is part of the record.
    /// </summary>
    public string Source { get; set; } = "imported";

    /// <summary>As contracted. NEVER overwritten. (Handoff non-negotiable #6)</summary>
    public decimal OriginalQty { get; set; }

    /// <summary>The original contract rate. NEVER overwritten — re-pricing creates a rate band.</summary>
    public decimal UnitRate { get; set; }

    // PRUNED for 4.2: `ExecutedQty`, from progress reporting, feeding the
    // decrease-exceeds-remaining gate (02 §7) — Phase 5.3 restores it with the
    // wizard that needs it. The register's «نسبة التنفيذ» is NOT this column:
    // BR-04 derives it from the linked activities, and storing a second answer
    // to the same question is how the two start disagreeing.
    // Also pruned: `Category`, which no view groups by — `Division` does.
}
