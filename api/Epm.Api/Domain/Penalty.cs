namespace Epm.Api.Domain;

/// <summary>
/// BR-10 · 02 §10 — delay penalty.
///
/// rule: the daily penalty is the contract value spread over the contract
///       duration, times the penalty rate, capped at 10% of the value.
/// spec: العرض الفني §11 — «غرامة اليوم = (قيمة العقد ± تغيّر المبلغ) ÷ (مدة
///       العقد ± تغيّر المدة) × نسبة الغرامة».
///       days   = max(0, forecastFinish − contractualFinish);
///       perDay = value ÷ durationDays × 0.10;
///       cap    = value × 0.10;
///       amount = min(perDay × days, cap).
/// example: 587,673,564 over 364 days → 161,449 د.ع/day, which is the figure
///          الشكل 10 prints against those exact inputs.
///          365,000,000 over 365 days, contractual 2026-06-30, forecast
///          2026-08-30 → 61 days × 100,000 = 6,100,000 (under the 36,500,000 cap).
///
/// THE CAP IS NOW REACHED AFTER EXACTLY ONE CONTRACT DURATION OF DELAY, not
/// after a fixed 100 days. That is a change of SHAPE, not only of magnitude:
/// perDay × durationDays = value × 0.10 = cap, identically. A short contract
/// therefore exhausts its penalty faster than a long one of the same value,
/// which is the behaviour the client's own formula describes.
///
/// THE DURATION IS THE ONE IN FORCE, like the value. An applied order moves
/// BOTH terms of the fraction — the value (numerator) and the duration
/// (denominator) — as well as the contractual finish. A time extension can
/// therefore LOWER the daily penalty while also cutting the days it is charged
/// on, and both effects belong in the before/after table.
///
/// D-02 — superseded. `02 §10` carried 0.1%/day capped at 10% since the port,
/// flagged CONFIRM. الشكل 10 and العرض الفني §11 both state this formula
/// instead, and they differ by 3.6× on CNT-0170-EM. The client's documents win.
/// What is still open is whether the 10% rate is fixed or whether الشكل 10's
/// «النطاق القانوني 10%–25%» is a range — see TODO.md §1.
///
/// The value is the EFFECTIVE one (BR-09) — never the original, never the projection.
/// </summary>
public static class Penalty
{
    /// <summary>نسبة الغرامة. Applied to the value spread over the duration, not to the value.</summary>
    public const decimal RatePct = 0.10m;

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

    /// <param name="durationDays">
    /// مدة العقد النافذة, in days. Zero or negative yields a daily penalty of
    /// zero rather than a division error: a contract with no recorded duration
    /// says nothing about what a day of delay costs, and inventing a figure on
    /// a legal record is worse than showing none.
    /// </param>
    public static Result For(decimal value, int durationDays, DateOnly contractualFinish, DateOnly forecastFinish)
    {
        var days = DelayDays(contractualFinish, forecastFinish);
        var perDay = durationDays <= 0 ? 0m : value / durationDays * RatePct;
        var cap = value * CapPct;

        return new Result(days, perDay, cap, Math.Min(perDay * days, cap));
    }

    public record Impact(Result Before, Result After, decimal Waived);

    /// <summary>Before vs after an applied order, and what it waived.</summary>
    public static Impact Compare(
        decimal valueBefore, DateOnly finishBefore, int durationBefore,
        decimal valueAfter, DateOnly finishAfter, int durationAfter,
        DateOnly forecastFinish)
    {
        var before = For(valueBefore, durationBefore, finishBefore, forecastFinish);
        var after = For(valueAfter, durationAfter, finishAfter, forecastFinish);

        return new Impact(before, after, Math.Max(0m, before.Amount - after.Amount));
    }
}
