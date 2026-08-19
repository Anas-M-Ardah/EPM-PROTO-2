using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// BR-10 · 02 §10 — delay penalty, on العرض الفني §11's formula:
/// «غرامة اليوم = (قيمة العقد ± تغيّر المبلغ) ÷ (مدة العقد ± تغيّر المدة) × نسبة الغرامة».
/// </summary>
public class PenaltyTests
{
    [Fact]
    public void The_plate_prints_161_449_a_day_and_so_does_this()
    {
        // الشكل 10, on CNT-0170-EM's own figures: 587,673,564 د.ع over 364 days.
        // 587,673,564 ÷ 364 = 1,614,487.81… × 10% = 161,448.78…, which the plate
        // prints rounded. This is the example that settled the formula, so it is
        // the first one here.
        var r = Penalty.For(587_673_564m, 364, new DateOnly(2026, 6, 30), new DateOnly(2026, 8, 30));

        Assert.Equal(161_449m, Math.Round(r.PerDay));
        Assert.Equal(58_767_356.40m, Math.Round(r.Cap, 2));
    }

    [Fact]
    public void Worked_example_61_days_gives_6_100_000()
    {
        // 365,000,000 over 365 days → 1,000,000 a day of contract, 10% of which
        // is 100,000 a day of delay.
        var r = Penalty.For(365_000_000m, 365, new DateOnly(2026, 6, 30), new DateOnly(2026, 8, 30));

        Assert.Equal(61, r.Days);
        Assert.Equal(100_000m, r.PerDay);
        Assert.Equal(36_500_000m, r.Cap);
        Assert.Equal(6_100_000m, r.Amount);
    }

    [Fact]
    public void Worked_example_after_the_order_1_440_000_and_4_660_000_waived()
    {
        // +45 days and +4,000,000 → value 369,000,000 over 410 days, finish
        // 2026-08-14. perDay 90,000 and only 16 days left to charge it on.
        var impact = Penalty.Compare(
            valueBefore: 365_000_000m, finishBefore: new DateOnly(2026, 6, 30), durationBefore: 365,
            valueAfter: 369_000_000m, finishAfter: new DateOnly(2026, 8, 14), durationAfter: 410,
            forecastFinish: new DateOnly(2026, 8, 30));

        Assert.Equal(6_100_000m, impact.Before.Amount);
        Assert.Equal(16, impact.After.Days);
        Assert.Equal(90_000m, impact.After.PerDay);
        Assert.Equal(1_440_000m, impact.After.Amount);
        Assert.Equal(4_660_000m, impact.Waived);
    }

    [Fact]
    public void An_applied_order_moves_BOTH_terms_of_the_fraction()
    {
        // The extension raises the value AND the duration, so the daily penalty
        // FALLS even though the contract got bigger — 100,000 → 90,000. Under
        // the superseded 0.1%/day rule it could only ever rise. The cap still
        // follows the value alone.
        var impact = Penalty.Compare(
            365_000_000m, new DateOnly(2026, 6, 30), 365,
            369_000_000m, new DateOnly(2026, 8, 14), 410,
            new DateOnly(2026, 8, 30));

        Assert.Equal(100_000m, impact.Before.PerDay);
        Assert.Equal(90_000m, impact.After.PerDay);
        Assert.Equal(36_500_000m, impact.Before.Cap);
        Assert.Equal(36_900_000m, impact.After.Cap);
    }

    [Fact]
    public void The_cap_is_reached_after_exactly_one_contract_duration()
    {
        // THE CHANGE OF SHAPE. perDay × durationDays = value × 10% = cap,
        // identically — so a contract 365 days late has exhausted its penalty
        // and a day 366 costs nothing more.
        var atDuration = Penalty.For(
            365_000_000m, 365, new DateOnly(2026, 6, 30), new DateOnly(2026, 6, 30).AddDays(365));
        var beyond = Penalty.For(
            365_000_000m, 365, new DateOnly(2026, 6, 30), new DateOnly(2026, 6, 30).AddDays(500));

        Assert.Equal(365, atDuration.Days);
        Assert.Equal(36_500_000m, atDuration.Amount);
        Assert.Equal(atDuration.Cap, atDuration.Amount);
        Assert.Equal(36_500_000m, beyond.Amount);
    }

    [Fact]
    public void A_short_contract_exhausts_its_penalty_faster_than_a_long_one()
    {
        // Same value, half the duration → twice the daily penalty and the cap
        // reached in half the time. This is the behaviour the client's formula
        // describes and the superseded one could not express at all.
        var slow = Penalty.For(365_000_000m, 365, new DateOnly(2026, 6, 30), new DateOnly(2026, 8, 30));
        var fast = Penalty.For(365_000_000m, 182, new DateOnly(2026, 6, 30), new DateOnly(2026, 8, 30));

        Assert.Equal(100_000m, slow.PerDay);
        Assert.True(fast.PerDay > slow.PerDay * 1.99m);
        Assert.Equal(slow.Cap, fast.Cap);
    }

    [Fact]
    public void A_contract_with_no_recorded_duration_charges_nothing_a_day()
    {
        // Not a division error, and not an invented figure either (P-09's
        // treatment of the missing forecast, applied to the missing duration).
        var r = Penalty.For(365_000_000m, 0, new DateOnly(2026, 6, 30), new DateOnly(2026, 8, 30));

        Assert.Equal(61, r.Days);
        Assert.Equal(0m, r.PerDay);
        Assert.Equal(0m, r.Amount);
    }

    [Fact]
    public void Finishing_on_time_carries_no_penalty()
    {
        var r = Penalty.For(365_000_000m, 365, new DateOnly(2026, 6, 30), new DateOnly(2026, 6, 30));

        Assert.Equal(0, r.Days);
        Assert.Equal(0m, r.Amount);
    }

    [Fact]
    public void Finishing_early_is_not_a_negative_penalty()
    {
        var r = Penalty.For(365_000_000m, 365, new DateOnly(2026, 6, 30), new DateOnly(2026, 5, 1));

        Assert.Equal(0, r.Days);
        Assert.Equal(0m, r.Amount);
    }

    [Fact]
    public void DelayDays_is_the_same_figure_the_penalty_is_charged_on()
    {
        // Schedule Control (SCR-E5) shows the days without the money. If these
        // two ever diverged, the same contract would be "61 days late" on one
        // screen and charged for a different number on another.
        var contractual = new DateOnly(2026, 6, 30);
        var forecast = new DateOnly(2026, 8, 30);

        Assert.Equal(61, Penalty.DelayDays(contractual, forecast));
        Assert.Equal(
            Penalty.For(365_000_000m, 365, contractual, forecast).Days,
            Penalty.DelayDays(contractual, forecast));
    }

    [Fact]
    public void DelayDays_floors_at_zero_when_the_forecast_is_early()
    {
        Assert.Equal(0, Penalty.DelayDays(new DateOnly(2026, 6, 30), new DateOnly(2026, 5, 1)));
        Assert.Equal(0, Penalty.DelayDays(new DateOnly(2026, 6, 30), new DateOnly(2026, 6, 30)));
    }

    [Fact]
    public void An_applied_time_extension_removes_the_delay_it_granted()
    {
        // The baseline is the EFFECTIVE finish (BR-09), so a project granted
        // 45 days is not still late by those 45 days. This is the whole reason
        // Schedule Control measures against the effective finish and not the
        // original one.
        var original = new DateOnly(2026, 6, 30);
        var effective = original.AddDays(45);
        var forecast = new DateOnly(2026, 8, 14);

        Assert.Equal(45, Penalty.DelayDays(original, forecast));
        Assert.Equal(0, Penalty.DelayDays(effective, forecast));
    }
}
