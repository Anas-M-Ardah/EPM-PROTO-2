namespace Epm.Api.Data.Entities;

/// <summary>
/// الشكل 58 — one transfer inside a supply change order: devices move from one
/// beneficiary to another WITHIN a single BOQ line.
///
/// ── WHY THIS IS NOT A COLUMN ON <see cref="ChangeOrderLine"/> ────────────
/// The plate's own wording is «من عدة مصادر إلى عدة جهات لنفس الفقرة» — many
/// transfers per line — so `FromBeneficiaryCode`/`ToBeneficiaryCode`/`Qty` on
/// the line would hold exactly one of them. Its existing `DrawnQty` and
/// `DistributedQty` describe the OTHER redistribution, the BOQ-line-to-BOQ-line
/// one that `TargetBoqItemId` names, and the two must not be conflated (D-16's
/// neighbour, `Domain/SupplyRedistribution`'s header, states the difference).
///
/// ── NOTHING HERE IS A VALUE ─────────────────────────────────────────────
/// A redistribution moves quantity between JHAT and changes no rate, no line
/// amount and no contract value — الشكل 59 prints «الحالي 111 · المقترح 111 ·
/// الأثر 0» for exactly that reason. So there is no `Amount` column and no
/// before/after rate pair: there is nothing for them to hold.
///
/// ── BEFORE / APPLIED ────────────────────────────────────────────────────
/// `FromQtyBefore` and `ToQtyBefore` are the two `BoqDistributions.Qty` values
/// as they stood when the order was raised, kept per rule §5.6 — the apply step
/// rewrites those rows and the order must still be able to say what it moved.
/// `AppliedQty` is written only at apply; approved ≠ applied (§5.2).
/// </summary>
public class ChangeOrderRedistribution
{
    public int Id { get; set; }

    public int ChangeOrderLineId { get; set; }

    /// <summary>The beneficiary giving devices up. `Workspaces.Code` (P-174).</summary>
    public string FromBeneficiaryCode { get; set; } = "";

    /// <summary>The beneficiary receiving them. May hold nothing yet — جامعة
    /// تلعفر in the plate is a new recipient, which is the point of the order.</summary>
    public string ToBeneficiaryCode { get; set; } = "";

    public decimal Qty { get; set; }

    // ---- BEFORE: never overwritten (§5.6) ----
    public decimal FromQtyBefore { get; set; }
    public decimal ToQtyBefore { get; set; }

    // ---- APPLIED: written when the order is applied, not when approved ----
    public decimal? AppliedQty { get; set; }
}
