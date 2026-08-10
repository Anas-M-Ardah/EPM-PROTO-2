namespace Epm.Api.Data.Entities;

/// <summary>
/// Spec 02 §5. A band is one (quantity, rate) slice of a BOQ item.
///
/// Created when an applied change order re-prices quantity beyond the 20% tier:
/// the portion up to 20% of the ORIGINAL quantity keeps the original rate, and
/// only the excess carries the new rate fixed by لجنة تثبيت الأسعار.
///
/// blendedRate = Σ(bandQty × bandRate) / Σ(bandQty)
/// </summary>
public class BoqRateBand
{
    public int Id { get; set; }

    public int BoqItemId { get; set; }

    /// <summary>Order of application — band 0 is the original contract band.</summary>
    public int Seq { get; set; }

    public decimal Qty { get; set; }
    public decimal Rate { get; set; }

    /// <summary>The applied change order that produced this band. Null for the original band.</summary>
    public int? SourceChangeOrderId { get; set; }

    /// <summary>True when this band is the re-priced excess beyond the 20% threshold.</summary>
    public bool IsExcessBand { get; set; }
}
