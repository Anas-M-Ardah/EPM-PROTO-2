namespace Epm.Api.Domain;

/// <summary>
/// الشكل 23 · «المقارنة والأثر» — what the slip between the baseline and the
/// current schedule is estimated to COST.
///
/// rule: dailyRate     = activityCost ÷ originalDuration
///       dailyOverhead = dailyRate × 15%
///       costImpact    = dailyOverhead × slipDays
/// spec: الشكل 23 «بطاقة تفسيرية لطريقة الاحتساب», which prints this equation
///       on screen beside the figure it produces.
/// example: cost 45,600,000 over 150 days → 304,000 a day; overhead 45,600;
///          26 days late → 1,185,600.
///
/// ── IT IS AN ESTIMATE AND THE SCREEN SAYS SO ─────────────────────────────
/// الشكل 23 labels the total «أثر الكلفة (تقديري)». Prolongation cost on a real
/// contract is a claim, negotiated and priced by the parties — this is a
/// planning figure that tells a project manager which slips are expensive, not
/// a sum anybody is owed. Nothing downstream reads it: it is not a payment, not
/// an amendment, and not part of the contract value.
///
/// THE 15% IS AN ASSUMPTION, carried from the reference (`schedule-module.jsx`
/// `OVERHEAD = 0.15`) and recorded as `D-15`. A ministry contract may state a
/// different site-overhead percentage, and if it does this is the one constant
/// that changes.
///
/// ── ONLY A POSITIVE SLIP COSTS ANYTHING ──────────────────────────────────
/// An activity finishing EARLY does not earn overhead back; `Penalty.DelayDays`
/// floors at zero for the same reason. An activity with no recorded original
/// duration has no daily rate at all and contributes nothing rather than
/// dividing.
/// </summary>
public static class ScheduleImpact
{
    /// <summary>D-15 — site overhead as a fraction of the activity's daily rate.</summary>
    public const decimal OverheadPct = 0.15m;

    /// <param name="SlipDays">Forecast − baseline, floored at zero.</param>
    public record Result(int SlipDays, decimal DailyRate, decimal DailyOverhead, decimal CostImpact);

    public static Result For(decimal activityCost, int originalDuration, int slipDays)
    {
        var slip = Math.Max(0, slipDays);
        var dailyRate = originalDuration <= 0 ? 0m : activityCost / originalDuration;
        var dailyOverhead = dailyRate * OverheadPct;

        return new Result(slip, dailyRate, dailyOverhead, dailyOverhead * slip);
    }

    /// <summary>
    /// The float an activity stood at BEFORE it slipped. Its current float is
    /// what is left; the slip consumed the difference, so before = after + slip.
    ///
    /// الشكل 23's before/after table prints both, and the pair is the whole
    /// point of the row: an activity that slipped 26 days out of 26 days of
    /// float has moved nothing on the project, and one that slipped 26 out of
    /// zero has moved the finish by 26.
    /// </summary>
    public static decimal FloatBefore(decimal floatAfter, int slipDays) =>
        floatAfter + Math.Max(0, slipDays);
}
