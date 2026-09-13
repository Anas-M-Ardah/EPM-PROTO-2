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
///
/// THE RATE ITSELF IS NOW PER CONTRACT, NOT A GLOBAL CONSTANT (P-261-adjacent
/// follow-up, this session). الشكل 10 labels 10% «النطاق القانوني 10%–25%» —
/// a statutory band the tender conditions pick from, not a fixed figure —
/// and the client-validated reference prototype (`epm/app/contract-amendments.jsx`
/// `PENALTY_BAND`, citing "Gov. Contract Regs 2/2014, revised 2017") already
/// stores a real per-contract rate rather than a flat one, with seeded
/// contracts at 10/12/15/20%. `Contract.PenaltyRatePct` carries it, defaulting
/// to 10% and validated at `ContractDefinition` against the 10%–25% band. This
/// is still **unconfirmed against the actual ministry regulation** — the
/// reference is evidence, not a client sign-off — see D-02 and P-45/P-264.
///
/// The value is the EFFECTIVE one (BR-09) — never the original, never the projection.
/// </summary>
public static class Penalty
{
    /// <summary>
    /// نسبة الغرامة الافتراضية — what a contract gets when none is entered, and
    /// what الشكل 10's own worked example uses. Never read for a real
    /// contract's own calculation; `Contract.PenaltyRatePct` is (D-02, P-264).
    /// </summary>
    public const decimal DefaultRatePct = 0.10m;

    /// <summary>الشكل 10's «النطاق القانوني» — the band `ContractDefinition` validates a rate against.</summary>
    public const decimal LegalMinRatePct = 0.10m;
    public const decimal LegalMaxRatePct = 0.25m;

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
    /// <param name="ratePct">
    /// نسبة الغرامة — the contract's OWN rate (`Contract.PenaltyRatePct`), never
    /// a global constant. Applied to both the daily fraction and the cap: the
    /// reference's own formula uses one rate for each contract, not two.
    /// </param>
    public static Result For(
        decimal value, int durationDays, DateOnly contractualFinish, DateOnly forecastFinish, decimal ratePct)
    {
        var days = DelayDays(contractualFinish, forecastFinish);
        var perDay = durationDays <= 0 ? 0m : value / durationDays * ratePct;
        var cap = value * ratePct;

        return new Result(days, perDay, cap, Math.Min(perDay * days, cap));
    }

    public record Impact(Result Before, Result After, decimal Waived);

    /// <summary>
    /// Before vs after an applied order, and what it waived. One `ratePct` for
    /// both columns: the rate is fixed by the tender conditions at award and an
    /// amendment never moves it (non-negotiable #6), only the value and duration do.
    /// </summary>
    public static Impact Compare(
        decimal valueBefore, DateOnly finishBefore, int durationBefore,
        decimal valueAfter, DateOnly finishAfter, int durationAfter,
        DateOnly forecastFinish, decimal ratePct)
    {
        var before = For(valueBefore, durationBefore, finishBefore, forecastFinish, ratePct);
        var after = For(valueAfter, durationAfter, finishAfter, forecastFinish, ratePct);

        return new Impact(before, after, Math.Max(0m, before.Amount - after.Amount));
    }
}
