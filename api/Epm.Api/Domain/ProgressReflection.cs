namespace Epm.Api.Domain;

/// <summary>
/// BR-04 · 02 §4 — progress reflection, schedule → BOQ.
///
/// rule: BOQ progress is the allocation-weighted mean of its linked activities'
///       progress; it updates automatically and is never entered directly.
/// spec: progress = Σ(share/100 × activityProgress);
///       achievedAmount = amount × progress/100;
///       achievedQty = effectiveQty × progress/100;
///       remainingValue = amount − achievedAmount.
/// example: links [(52.6, 100), (47.4, 0)] on 26,730,000
///          → progress 52.6% → achieved 14,059,980.
///
/// achievedQty uses the EFFECTIVE quantity, which an applied order moves
/// (BR-09). The original still persists (non-negotiable #6); it is simply not
/// what progress measures against.
/// </summary>
public static class ProgressReflection
{
    public record Link(decimal SharePct, decimal ProgressPct);

    public record Result(decimal Progress, decimal AchievedAmount, decimal AchievedQty, decimal RemainingValue);

    public static Result For(IReadOnlyList<Link> links, decimal amount, decimal effectiveQty)
    {
        var progress = links.Sum(l => l.SharePct / 100m * l.ProgressPct);
        var achieved = amount * progress / 100m;

        return new Result(progress, achieved, effectiveQty * progress / 100m, amount - achieved);
    }
}
