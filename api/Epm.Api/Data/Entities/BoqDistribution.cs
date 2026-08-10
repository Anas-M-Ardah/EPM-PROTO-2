namespace Epm.Api.Data.Entities;

/// <summary>
/// Spec 01 §2.6, 02 §8. BOQ × Beneficiary — its own table, never a column
/// on the BOQ row, because a quantity may be split across several beneficiaries.
///
/// Unique on (BoqItemId, BeneficiaryCode) — no duplicate pairs (01 §2.6, gate 4).
///
/// STATE IS DERIVED, never stored: none · partial · full · over (02 §8).
/// Compute via Domain/Distribution.cs (BR-08).
///
/// Inputs are capped at item.qty − (sum of the other rows). The `over` state
/// exists only for legacy/imported data (02 §8 "Prevention").
/// </summary>
public class BoqDistribution
{
    public int Id { get; set; }

    public int BoqItemId { get; set; }

    /// <summary>Must be assigned to the project AND active (02 §8 import gate 2).</summary>
    public string BeneficiaryCode { get; set; } = "";

    /// <summary>Optional. The only place a location legitimately appears.</summary>
    public string? SiteCode { get; set; }

    /// <summary>Σ per BOQ item must be ≤ the item's quantity.</summary>
    public decimal Qty { get; set; }
}
