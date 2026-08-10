namespace Epm.Api.Domain;

/// <summary>
/// D-07 · Spec 02 §1 — the exact-total rounding helper.
///
/// <para><b>rule</b> A set of percentages that must sum to an exact total is
/// rounded by LARGEST REMAINDER, never by rounding each value independently.
/// Floor every value at the chosen precision, then hand the shortfall back one
/// increment at a time, largest fractional part first.</para>
///
/// <para><b>spec</b> 02 §1. <c>toFixed(2)</c> on each value produces sums like
/// 100.01% and is a bug — it is the single most common way a weight column
/// stops adding up.</para>
///
/// <para><b>example</b> [56.131, 43.869] to 100.00 at 2dp → [56.13, 43.87],
/// sum exactly 100.00.</para>
///
/// Used by BoqWeights (BR-01) and by any display that shows a percentage
/// column with a stated total.
/// </summary>
public static class Rounding
{
    /// <summary>
    /// Rounds <paramref name="rawValues"/> so they sum to exactly
    /// <paramref name="target"/> at <paramref name="dp"/> decimal places.
    /// Order is preserved: out[i] corresponds to rawValues[i].
    /// </summary>
    /// <param name="rawValues">Unrounded values that already sum to the target.</param>
    /// <param name="target">The sum the result must hit exactly, e.g. 100.00.</param>
    /// <param name="dp">Decimal places, e.g. 2 for hundredths.</param>
    public static IReadOnlyList<decimal> LargestRemainder(
        IReadOnlyList<decimal> rawValues,
        decimal target = 100m,
        int dp = 2)
    {
        if (rawValues.Count == 0) return [];

        // 10^-dp as a decimal. Computed by division rather than Math.Pow so the
        // increment stays exact — a double here would reintroduce the very
        // error this helper exists to remove.
        var step = 1m;
        for (var i = 0; i < dp; i++) step /= 10m;

        var floors = new decimal[rawValues.Count];
        for (var i = 0; i < rawValues.Count; i++)
            floors[i] = Math.Floor(rawValues[i] / step) * step;

        var shortfall = target - floors.Sum();
        var increments = (int)Math.Round(shortfall / step, MidpointRounding.AwayFromZero);

        // Flooring can only ever leave the sum SHORT, and by less than one
        // increment per value — so 0 <= increments < Count whenever the raw
        // values genuinely sum to the target. A negative value means the caller
        // passed values that do not; distributing nothing is the honest answer.
        if (increments <= 0) return floors;

        var order = Enumerable.Range(0, rawValues.Count)
            .OrderByDescending(i => rawValues[i] - floors[i])
            .ThenBy(i => i)                     // stable: equal remainders resolve by position
            .ToArray();

        for (var k = 0; k < increments; k++)
            floors[order[k % order.Length]] += step;

        return floors;
    }
}
