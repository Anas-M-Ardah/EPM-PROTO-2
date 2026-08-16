using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// SCR-E1's «المؤشر التنفيذي», ported from the live prototype's `execSignal`.
/// The thresholds are its: 20% of duration red, 5% amber, SPI below 0.90 amber.
/// </summary>
public class ExecutiveSignalTests
{
    [Fact]
    public void A_completed_project_is_green_however_late_it_ran()
    {
        // The work is done. A red dot here is a statement about the past.
        Assert.Equal(ExecutiveSignal.Green,
            ExecutiveSignal.For("completed", 400, 365, 0.4m));
    }

    [Fact]
    public void A_stalled_project_is_red_without_any_arithmetic()
        => Assert.Equal(ExecutiveSignal.Red, ExecutiveSignal.For("stalled", 0, 365, 1.2m));

    [Fact]
    public void Delay_is_measured_as_a_SHARE_of_the_projects_own_duration()
    {
        // 30 days on a 90-day contract is 33% — red.
        Assert.Equal(ExecutiveSignal.Red, ExecutiveSignal.For("ongoing", 30, 90, 1m));

        // The SAME 30 days on a five-year contract is 1.6% — green. A day count
        // alone would have called both the same thing.
        Assert.Equal(ExecutiveSignal.Green, ExecutiveSignal.For("ongoing", 30, 1825, 1m));
    }

    // Both boundaries are EXCLUSIVE — «> 20» and «> 5», as the prototype
    // writes them — so a project sitting exactly on a line is in the calmer
    // band. 73/365 is 20.0% and stays amber; 18/365 is 4.93% and stays green.
    [Theory]
    [InlineData(74, ExecutiveSignal.Red)]     // 20.3% — over the red line
    [InlineData(73, ExecutiveSignal.Amber)]   // 20.0% — exactly on it, so not over
    [InlineData(30, ExecutiveSignal.Amber)]   // 8.2%  — over amber, under red
    [InlineData(19, ExecutiveSignal.Amber)]   // 5.2%  — just over amber
    [InlineData(18, ExecutiveSignal.Green)]   // 4.9%  — just under it
    [InlineData(10, ExecutiveSignal.Green)]   // 2.7%  — under both
    public void The_bands_are_20_percent_and_5_percent_of_duration(int delay, string expected)
        => Assert.Equal(expected, ExecutiveSignal.For("ongoing", delay, 365, 1m));

    [Fact]
    public void A_low_schedule_index_makes_it_amber_even_with_no_delay_recorded()
    {
        Assert.Equal(ExecutiveSignal.Amber, ExecutiveSignal.For("ongoing", null, 365, 0.85m));
        Assert.Equal(ExecutiveSignal.Green, ExecutiveSignal.For("ongoing", null, 365, 0.95m));
    }

    [Fact]
    public void A_MISSING_index_is_not_a_bad_one()
    {
        // No schedule means no SPI. That cannot colour the project amber —
        // "unknown" and "behind" are different claims (P-09).
        Assert.Equal(ExecutiveSignal.Green, ExecutiveSignal.For("ongoing", null, 365, null));
    }

    [Fact]
    public void A_missing_forecast_cannot_fire_the_delay_term()
    {
        // Null delay is not zero delay dressed up — it is "no forecast is
        // recorded", and the rule simply has nothing to measure.
        Assert.Equal(ExecutiveSignal.Green, ExecutiveSignal.For("ongoing", null, 365, 1m));
    }

    [Fact]
    public void A_zero_duration_falls_back_to_a_year_rather_than_dividing_by_it()
    {
        // 30/365 = 8.2% → amber. Without the fallback this divides by zero.
        Assert.Equal(ExecutiveSignal.Amber, ExecutiveSignal.For("ongoing", 30, 0, 1m));
        Assert.Equal(ExecutiveSignal.Amber, ExecutiveSignal.For("ongoing", 30, null, 1m));
    }

    [Fact]
    public void All_three_bands_come_back_even_when_one_is_empty()
    {
        var counts = ExecutiveSignal.Counts(["green", "green", "red"]);

        Assert.Equal(3, counts.Count);
        Assert.Equal(1, counts.Single(c => c.Signal == "red").Count);
        Assert.Equal(0, counts.Single(c => c.Signal == "amber").Count);
        Assert.Equal(2, counts.Single(c => c.Signal == "green").Count);
    }

    [Fact]
    public void The_counts_are_in_the_panels_own_order()
        => Assert.Equal(["red", "amber", "green"],
            ExecutiveSignal.Counts([]).Select(c => c.Signal));
}
