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

    /// <summary>Optional grouping only — not a scoping key.</summary>
    public string Division { get; set; } = "";
    public string Category { get; set; } = "";

    /// <summary>As contracted. NEVER overwritten. (Handoff non-negotiable #6)</summary>
    public decimal OriginalQty { get; set; }

    /// <summary>The original contract rate. NEVER overwritten — re-pricing creates a rate band.</summary>
    public decimal UnitRate { get; set; }

    /// <summary>From progress reporting. Used by the decrease-exceeds-remaining gate (02 §7).</summary>
    public decimal ExecutedQty { get; set; }
}
