using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>BR-10 · 02 §10 — delay penalty.</summary>
public class PenaltyTests
{
    [Fact]
    public void Worked_example_61_days_gives_6_100_000()
    {
        var r = Penalty.For(100_000_000m, new DateOnly(2026, 6, 30), new DateOnly(2026, 8, 30));

        Assert.Equal(61, r.Days);
        Assert.Equal(100_000m, r.PerDay);
        Assert.Equal(10_000_000m, r.Cap);
        Assert.Equal(6_100_000m, r.Amount);
    }

    [Fact]
    public void Worked_example_after_the_order_1_680_000_and_4_420_000_waived()
    {
        // +45 days and +5,000,000 → finish 2026-08-14, 16 days, perDay 105,000.
        var impact = Penalty.Compare(
            valueBefore: 100_000_000m, finishBefore: new DateOnly(2026, 6, 30),
            valueAfter: 105_000_000m, finishAfter: new DateOnly(2026, 8, 14),
            forecastFinish: new DateOnly(2026, 8, 30));

        Assert.Equal(6_100_000m, impact.Before.Amount);
        Assert.Equal(16, impact.After.Days);
        Assert.Equal(105_000m, impact.After.PerDay);
        Assert.Equal(1_680_000m, impact.After.Amount);
        Assert.Equal(4_420_000m, impact.Waived);
    }

    [Fact]
    public void An_applied_order_moves_BOTH_the_value_and_the_finish()
    {
        // The cap rises with the value too — 10% of 105,000,000, not of 100,000,000.
        var impact = Penalty.Compare(
            100_000_000m, new DateOnly(2026, 6, 30),
            105_000_000m, new DateOnly(2026, 8, 14),
            new DateOnly(2026, 8, 30));

        Assert.Equal(10_000_000m, impact.Before.Cap);
        Assert.Equal(10_500_000m, impact.After.Cap);
    }

    [Fact]
    public void Finishing_on_time_carries_no_penalty()
    {
        var r = Penalty.For(100_000_000m, new DateOnly(2026, 6, 30), new DateOnly(2026, 6, 30));

        Assert.Equal(0, r.Days);
        Assert.Equal(0m, r.Amount);
    }

    [Fact]
    public void Finishing_early_is_not_a_negative_penalty()
    {
        var r = Penalty.For(100_000_000m, new DateOnly(2026, 6, 30), new DateOnly(2026, 5, 1));

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
            Penalty.For(100_000_000m, contractual, forecast).Days,
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

    [Fact]
    public void The_penalty_is_capped_at_10_percent()
    {
        // 200 days would be 20,000,000 uncapped.
        var r = Penalty.For(100_000_000m, new DateOnly(2026, 6, 30), new DateOnly(2027, 1, 16));

        Assert.Equal(200, r.Days);
        Assert.Equal(10_000_000m, r.Amount);
    }
}
