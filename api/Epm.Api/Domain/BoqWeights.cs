namespace Epm.Api.Domain;

/// <summary>
/// BR-01 · 02 §1 — BOQ weight.
///
/// rule: an item's weight is its share of its CONTRACT's total BOQ value;
///       weights sum to exactly 100.00% (largest remainder, D-07).
/// spec: weight = amount / Σ(amounts in the SAME contract) × 100.
/// example: [56,131,000 · 43,869,000] → 56.13 / 43.87, sum 100.00.
///
/// The denominator is the CONTRACT's rows. Totalling the project and then
/// filtering is the classic bug (02 §1) — the caller passes one contract's
/// amounts, so the query that builds the list is where scoping is enforced.
/// </summary>
public static class BoqWeights
{
    /// <summary>Weights for one contract's BOQ amounts, in the same order.</summary>
    public static IReadOnlyList<decimal> ForContract(IReadOnlyList<decimal> amounts)
    {
        if (amounts.Count == 0) return [];                       // no rows, no 100% claim

        var total = amounts.Sum();
        if (total <= 0m) return amounts.Select(_ => 0m).ToList(); // nothing to divide

        return Rounding.LargestRemainder(amounts.Select(a => a / total * 100m).ToList());
    }
}
