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

    /// <summary>
    /// BR-04 on a SUPPLY bill (D-14 · 06 §3). A supply line has no schedule
    /// activity to link — it earns from its own receipts instead
    /// (`Domain/SupplyStatus.ReceivedPct`), against the SAME line, the SAME
    /// amount and the SAME effective quantity `For` uses. `progress` here IS
    /// the received percentage — there is no share to weight it by, because
    /// the whole line is one thing received or not, not a bill split across
    /// several activities each earning a fraction of it.
    ///
    /// The formulas below are `For`'s own — achieved = amount × progress ÷
    /// 100, achievedQty = effectiveQty × progress ÷ 100 — so `Rollup` and
    /// every screen built on a `Result` reads a supply line exactly like a
    /// works one, and the value-weighted contract/project physical % this
    /// produces is `Σ(received × price) ÷ Σ(contracted × price)` written the
    /// other way round (02 §4).
    /// </summary>
    public static Result ForSupply(decimal receivedPct, decimal amount, decimal effectiveQty)
    {
        var achieved = amount * receivedPct / 100m;
        return new Result(receivedPct, achieved, effectiveQty * receivedPct / 100m, amount - achieved);
    }

    /// <summary>
    /// 02 §4's rollup — "contract executed value = Σ achievedAmount of its BOQ
    /// items", and the percentage that goes with it.
    ///
    /// It is VALUE-weighted, not a mean of the line percentages: ten small lines
    /// at 100% and one large one at 0% is not 91% of the contract. The same
    /// function serves a division sub-total, which is the same question asked of
    /// fewer lines.
    /// </summary>
    public static decimal Rollup(decimal totalAmount, decimal totalAchieved)
        => totalAmount <= 0m ? 0m : totalAchieved / totalAmount * 100m;
}
