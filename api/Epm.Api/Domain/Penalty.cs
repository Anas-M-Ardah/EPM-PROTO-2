namespace Epm.Api.Domain;

/// <summary>
/// BR-10 · 02 §10 — delay penalty.
///
/// rule: 0.1% of the contract value per day of delay, capped at 10% (D-02).
/// spec: days = max(0, forecastFinish − contractualFinish);
///       perDay = value × 0.001; cap = value × 0.10;
///       amount = min(perDay × days, cap).
/// example: 100,000,000, contractual 2026-06-30, forecast 2026-08-30
///          → 61 days × 100,000 = 6,100,000 (under the 10,000,000 cap).
///
/// An applied order moves BOTH terms — the value (raising the per-day amount
/// and the cap) and the contractual finish (usually cutting the days). Show
/// before vs after and the WAIVED amount: a time extension is often the entire
/// point of the order, and the waived penalty is what it bought.
///
/// The value is the EFFECTIVE one (BR-09) — never the original, never the projection.
/// </summary>
public static class Penalty
{
    public const decimal PerDayPct = 0.001m;   // D-02 — CONFIRM against the contract template
    public const decimal CapPct = 0.10m;

    public record Result(int Days, decimal PerDay, decimal Cap, decimal Amount);

    /// <summary>
    /// Days late: max(0, forecast − contractual). Finishing early is not a
    /// negative penalty, and it is not negative delay either.
    ///
    /// Public because Schedule Control (SCR-E5) shows this figure without the
    /// money. Charging a penalty and reporting a slip must never disagree about
    /// how late a contract is, so both read it from here rather than each
    /// subtracting two dates. The contractual finish is the EFFECTIVE one
    /// (BR-09) — an applied time extension moves the baseline, so a project
    /// that was granted one is not still late by the days it was granted.
    /// </summary>
    public static int DelayDays(DateOnly contractualFinish, DateOnly forecastFinish) =>
        Math.Max(0, forecastFinish.DayNumber - contractualFinish.DayNumber);

    public static Result For(decimal value, DateOnly contractualFinish, DateOnly forecastFinish)
    {
        var days = DelayDays(contractualFinish, forecastFinish);
        var perDay = value * PerDayPct;
        var cap = value * CapPct;

        return new Result(days, perDay, cap, Math.Min(perDay * days, cap));
    }

    public record Impact(Result Before, Result After, decimal Waived);

    /// <summary>Before vs after an applied order, and what it waived.</summary>
    public static Impact Compare(
        decimal valueBefore, DateOnly finishBefore,
        decimal valueAfter, DateOnly finishAfter,
        DateOnly forecastFinish)
    {
        var before = For(valueBefore, finishBefore, forecastFinish);
        var after = For(valueAfter, finishAfter, forecastFinish);

        return new Impact(before, after, Math.Max(0m, before.Amount - after.Amount));
    }
}
