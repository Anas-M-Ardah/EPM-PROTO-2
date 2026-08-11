namespace Epm.Api.Domain;

/// <summary>
/// BR-05 · 02 §5 — THE 20% RULE.
///
/// rule: for a quantity increase OR decrease, the portion up to 20% of the
///       ORIGINAL quantity is valued at the original rate. Only the excess may
///       carry a new rate.
/// spec: threshold = originalQty × 0.20; atRate = min(delta, threshold);
///       excess = max(0, delta − threshold);
///       inc: newAmount = before + atCost + exCost
///       dec: newAmount = before − atCost − exCost
/// example: inc, originalQty 100, delta 30, rate 1,000, newRate 1,200,
///          before 100,000 → threshold 20, atRate 20, excess 10, newAmount 132,000.
///
/// Four ways to get this wrong:
///   1. PER LINE, not per order.
///   2. Against the ORIGINAL quantity (D-01), never the current effective one.
///   3. Decreases are NOT exempt.
///   4. Only `inc` and `dec` — not rate, cancellation or redistribution.
///
/// The new rate here is a PROPOSAL. The binding rate is fixed by
/// لجنة تثبيت الأسعار, never in the wizard; a line that trips the threshold
/// inserts that stage into the chain (BR-13).
/// </summary>
public static class TierSplit
{
    public const decimal Tier = 0.20m;

    /// <summary>06 §7 change types this rule applies to.</summary>
    public static bool AppliesTo(string changeType) => changeType is "inc" or "dec";

    public record Input(
        string Kind,              // "inc" | "dec"
        decimal OriginalQty,      // D-01 — the ORIGINAL contract quantity
        decimal DeltaQty,
        decimal OriginalRate,
        decimal NewRate,
        decimal Before);          // the line's amount before this change

    public record Result(
        decimal Threshold,
        decimal AtRate,
        decimal ExcessQty,
        decimal AtCost,
        decimal ExCost,
        decimal NewAmount,
        bool TripsThreshold);

    public static Result Split(Input i)
    {
        var threshold = i.OriginalQty * Tier;
        var atRate = Math.Min(i.DeltaQty, threshold);
        var excessQty = Math.Max(0m, i.DeltaQty - threshold);

        var atCost = atRate * i.OriginalRate;
        var exCost = excessQty * i.NewRate;

        var newAmount = i.Kind == "dec"
            ? i.Before - atCost - exCost
            : i.Before + atCost + exCost;

        return new Result(threshold, atRate, excessQty, atCost, exCost, newAmount, excessQty > 0m);
    }

    /// <summary>
    /// 02 §5 — after application a line legitimately carries more than one rate,
    /// so it stores bands and the register shows this blended rate.
    /// </summary>
    public record Band(decimal Qty, decimal Rate);

    public static decimal BlendedRate(IReadOnlyList<Band> bands)
    {
        var qty = bands.Sum(b => b.Qty);
        return qty <= 0m ? 0m : bands.Sum(b => b.Qty * b.Rate) / qty;
    }

    /// <summary>
    /// 01 §3 + 02 §5 — what a BOQ line IS, once its bands are taken into account.
    ///
    /// A line with no bands is its contracted quantity at its contracted rate.
    /// A line WITH bands is the sum of them: the quantity is Σ band quantities,
    /// the rate is the blend, and the amount is what was actually agreed band by
    /// band — not qty × blendedRate, which is the same number only because the
    /// blend is defined to make it so, and stops being the same number the
    /// moment a band is added with a different quantity.
    ///
    /// The ORIGINAL quantity and rate are untouched by this (non-negotiable #6);
    /// they persist on the line and are what D-01 measures the 20% against.
    /// </summary>
    public record Line(decimal Qty, decimal Rate, decimal Amount, bool Banded);

    public static Line Effective(decimal originalQty, decimal originalRate, IReadOnlyList<Band> bands)
    {
        if (bands.Count == 0)
            return new Line(originalQty, originalRate, originalQty * originalRate, false);

        return new Line(
            bands.Sum(b => b.Qty),
            BlendedRate(bands),
            bands.Sum(b => b.Qty * b.Rate),
            true);
    }
}
