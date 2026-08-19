using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>الشكل 23 — the estimated cost of a schedule slip.</summary>
public class ScheduleImpactTests
{
    [Fact]
    public void Worked_example_A4_slips_26_days()
    {
        // 45,600,000 over 150 days → 304,000 a day; 15% of that is 45,600;
        // 26 days late → 1,185,600.
        var r = ScheduleImpact.For(45_600_000m, 150, 26);

        Assert.Equal(26, r.SlipDays);
        Assert.Equal(304_000m, r.DailyRate);
        Assert.Equal(45_600m, r.DailyOverhead);
        Assert.Equal(1_185_600m, r.CostImpact);
    }

    [Fact]
    public void An_activity_that_is_early_costs_nothing()
    {
        // Finishing early does not earn overhead back — the same floor
        // `Penalty.DelayDays` applies for the same reason.
        var r = ScheduleImpact.For(45_600_000m, 150, -9);

        Assert.Equal(0, r.SlipDays);
        Assert.Equal(0m, r.CostImpact);
        // The daily rate still exists: the activity has a cost and a duration
        // whether or not it slipped.
        Assert.Equal(304_000m, r.DailyRate);
    }

    [Fact]
    public void On_time_is_zero_too()
    {
        Assert.Equal(0m, ScheduleImpact.For(45_600_000m, 150, 0).CostImpact);
    }

    [Fact]
    public void An_activity_with_no_duration_has_no_daily_rate()
    {
        // A milestone. Not a division by zero, and not an invented figure.
        var r = ScheduleImpact.For(0m, 0, 12);

        Assert.Equal(12, r.SlipDays);
        Assert.Equal(0m, r.DailyRate);
        Assert.Equal(0m, r.CostImpact);
    }

    [Fact]
    public void The_overhead_is_fifteen_percent_of_the_daily_rate()
    {
        // D-15, stated once so a change to the constant fails here first.
        var r = ScheduleImpact.For(1_000_000m, 100, 1);

        Assert.Equal(10_000m, r.DailyRate);
        Assert.Equal(0.15m, ScheduleImpact.OverheadPct);
        Assert.Equal(1_500m, r.DailyOverhead);
        Assert.Equal(1_500m, r.CostImpact);
    }

    [Fact]
    public void Float_before_the_slip_is_what_is_left_plus_what_was_consumed()
    {
        // A6 in the fixture: 12 days of float now, having slipped 0 → it stood
        // at 12. An activity that slipped 26 with 0 left stood at 26.
        Assert.Equal(12m, ScheduleImpact.FloatBefore(12m, 0));
        Assert.Equal(26m, ScheduleImpact.FloatBefore(0m, 26));
    }

    [Fact]
    public void An_early_activity_did_not_gain_float_it_never_had()
    {
        // A negative slip must not be added back as extra float — the activity
        // is early, which shows in its dates, not in a float it was never given.
        Assert.Equal(18m, ScheduleImpact.FloatBefore(18m, -9));
    }
}
