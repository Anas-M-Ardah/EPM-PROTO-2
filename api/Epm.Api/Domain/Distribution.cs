namespace Epm.Api.Domain;

/// <summary>
/// BR-08 · 02 §8 — quantity distribution to beneficiaries.
///
/// rule: a BOQ item's quantity may be split across the beneficiaries assigned
///       to THAT PROJECT — never the whole master list.
/// spec: distributed = Σ rows; remaining = max(0, qty − distributed);
///       excess = max(0, distributed − qty). States: none · partial · full (±0.001) · over.
/// example: qty 120, rows [40, 50] → distributed 90, remaining 30, partial.
///
/// Each input is CAPPED at qty − (sum of the other rows), with an inline
/// explanation (02 §8). `over` exists only for legacy and imported data — a
/// user should not be able to type their way into it.
/// </summary>
public static class Distribution
{
    public const decimal Tolerance = 0.001m;

    public record Result(decimal Distributed, decimal Remaining, decimal Excess, string State);

    public static Result For(decimal qty, IReadOnlyList<decimal> rows)
    {
        var distributed = rows.Sum();

        return new Result(
            distributed,
            Math.Max(0m, qty - distributed),
            Math.Max(0m, distributed - qty),
            StateOf(qty, distributed));
    }

    /// <summary>06 §10 state. Order follows 02 §8's table.</summary>
    public static string StateOf(decimal qty, decimal distributed)
    {
        if (distributed > qty + Tolerance) return "over";
        if (Math.Abs(distributed - qty) <= Tolerance) return "full";
        return distributed > 0m ? "partial" : "none";
    }

    /// <summary>The cap for one input: the item's qty less the other rows.</summary>
    public static decimal CapFor(decimal qty, IReadOnlyList<decimal> otherRows)
        => Math.Max(0m, qty - otherRows.Sum());

    /// <summary>
    /// 02 §8 — a DECREASE cannot be applied while the distributed total exceeds
    /// the revised quantity; the distribution must be revised first (D-05, who
    /// revises it is still open). An INCREASE never blocks: the added quantity
    /// simply shows as remaining to distribute.
    /// </summary>
    public static bool DecreaseBlocksApply(decimal revisedQty, decimal distributed)
        => distributed > revisedQty + Tolerance;
}
