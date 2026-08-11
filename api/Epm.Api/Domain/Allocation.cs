namespace Epm.Api.Domain;

/// <summary>
/// BR-03 · 02 §3 — BOQ ↔ Activity allocation.
///
/// rule: the user NEVER types an allocation %. Share is driven by the activity's
///       absolute weight (BR-02), manually overridable per item and persisted;
///       a reset restores the computed value.
/// spec: share = absWeight / Σ(absWeights linked to this BOQ) × 100;
///       assigned = amount × share / 100.
/// example: [5.8, 5.2] on 26,730,000 → 52.73 / 47.27 (52.7 / 47.3 displayed),
///          assigned 14,094,000 / 12,636,000, coverage full.
///
/// Coverage compares Σ SHARES to 100% — it is NOT a comparison against the BOQ
/// financial weight (BR-01). Conflating them was an early error (02 §3).
/// </summary>
public static class Allocation
{
    public record Share(decimal Pct, decimal Assigned);

    public static IReadOnlyList<Share> Shares(IReadOnlyList<decimal> absWeights, decimal amount)
    {
        var sum = absWeights.Sum();
        if (sum <= 0m) return absWeights.Select(_ => new Share(0m, 0m)).ToList();

        // Assigned is amount × w / sum, NOT amount × pct / 100. The two are the
        // same number, but going back through the ×100 in `pct` leaves a decimal
        // tail — 14094000.000000000000000000001 instead of 14,094,000 — which
        // then shows up in the API response and in any total built from it.
        return absWeights
            .Select(w => new Share(w / sum * 100m, amount * w / sum))
            .ToList();
    }

    /// <summary>
    /// 02 §3 — the absolute weight ONE link contributes to the contract: the
    /// line's own BOQ weight (BR-01) times the share this activity takes of it.
    ///
    /// Σ over a line's links equals the line's weight only when coverage is
    /// full. The gap is the part of the bill that is not linked to any work and
    /// therefore can never be earned — which is the whole reason the register
    /// carries this column beside `Weight` rather than instead of it.
    /// </summary>
    public static decimal AbsoluteWeight(decimal itemWeight, decimal sharePct)
        => itemWeight * sharePct / 100m;

    /// <summary>06 §11 coverage from Σ shares. Tolerance 0.5 per 02 §3.</summary>
    public static string CoverageStatus(IReadOnlyList<decimal> shares)
    {
        if (shares.Count == 0) return "unassigned";

        var sum = shares.Sum();
        if (Math.Abs(sum - 100m) < 0.5m) return "full";
        return sum < 100m ? "partial" : "over";
    }
}
