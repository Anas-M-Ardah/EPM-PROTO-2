namespace Epm.Api.Data.Entities;

/// <summary>
/// Spec 02 §5. A band is one (quantity, rate) slice of a BOQ item.
///
/// Created when an applied change order re-prices quantity beyond the 20% tier:
/// the portion up to 20% of the ORIGINAL quantity keeps the original rate, and
/// only the excess carries the new rate fixed by لجنة تثبيت الأسعار.
///
/// blendedRate = Σ(bandQty × bandRate) / Σ(bandQty)  —  Domain/TierSplit.BlendedRate
///
/// PHASE 4.2 reads this table to derive a banded line's effective quantity, rate
/// and amount — because `01 §3` says those are derived, not stored, and a line
/// with bands has no single stored rate to show. It is EMPTY until Phase 5
/// applies an order that re-prices, which is the only thing that creates a band.
///
/// RESTORED IN 5.4, exactly as 4.2 said they would be: `SourceChangeOrderId` —
/// the applied order that produced the band — and `IsExcessBand`, true for the
/// portion beyond the 20% threshold that was re-priced. Applying an order
/// (EP-WFL-03) is the only thing that writes here.
/// </summary>
public class BoqRateBand
{
    public int Id { get; set; }

    public int BoqItemId { get; set; }

    /// <summary>Order of application — band 0 is the original contract band.</summary>
    public int Seq { get; set; }

    public decimal Qty { get; set; }
    public decimal Rate { get; set; }

    /// <summary>
    /// → ChangeOrder.Id — WHICH applied order created this band. `01 §4`: a BOQ
    /// line must be able to answer "which change orders amended me, in what
    /// order, and what did each one do", and without this column the bands are
    /// an unattributed list of rates.
    /// </summary>
    public int? SourceChangeOrderId { get; set; }

    /// <summary>
    /// True for the band beyond the 20% threshold — the one لجنة تثبيت الأسعار
    /// priced (`02 §5`). The distinction is not cosmetic: it is what lets a
    /// reader see that a line carries two rates BY RULE rather than by error.
    /// </summary>
    public bool IsExcessBand { get; set; }
}
