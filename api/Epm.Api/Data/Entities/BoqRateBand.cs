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
/// PRUNED for 4.2 (the register shows neither): `SourceChangeOrderId` — the
/// applied order that produced the band — and `IsExcessBand` — true for the
/// re-priced portion beyond the 20% threshold. Phase 5.4 restores both when
/// applying an order is what writes here.
/// </summary>
public class BoqRateBand
{
    public int Id { get; set; }

    public int BoqItemId { get; set; }

    /// <summary>Order of application — band 0 is the original contract band.</summary>
    public int Seq { get; set; }

    public decimal Qty { get; set; }
    public decimal Rate { get; set; }
}
