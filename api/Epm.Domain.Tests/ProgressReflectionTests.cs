using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>BR-04 · 02 §4 — progress reflection, schedule → BOQ.</summary>
public class ProgressReflectionTests
{
    [Fact]
    public void Worked_example_BQ_003_reads_52_6_percent_and_14_059_980()
    {
        // The client's own case: A5 (share 52.6%) reaches 100%, A8 still 0%.
        var r = ProgressReflection.For([new(52.6m, 100m), new(47.4m, 0m)], 26_730_000m, 100m);

        Assert.Equal(52.6m, r.Progress);
        Assert.Equal(14_059_980m, r.AchievedAmount);
    }

    [Fact]
    public void Achieved_quantity_uses_the_effective_quantity()
    {
        // An applied order moved this line from 100 to 130 (BR-09); achieved
        // quantity must follow the effective figure, not the original.
        var r = ProgressReflection.For([new(50m, 100m)], 26_730_000m, 130m);

        Assert.Equal(50m, r.Progress);
        Assert.Equal(65m, r.AchievedQty);
    }

    [Fact]
    public void Remaining_value_is_the_amount_less_what_was_achieved()
    {
        var r = ProgressReflection.For([new(52.6m, 100m), new(47.4m, 0m)], 26_730_000m, 100m);

        Assert.Equal(26_730_000m - 14_059_980m, r.RemainingValue);
    }

    [Fact]
    public void All_activities_complete_gives_100_percent_and_the_whole_amount()
    {
        var r = ProgressReflection.For([new(52.6m, 100m), new(47.4m, 100m)], 26_730_000m, 100m);

        Assert.Equal(100m, r.Progress);
        Assert.Equal(26_730_000m, r.AchievedAmount);
        Assert.Equal(0m, r.RemainingValue);
    }

    [Fact]
    public void No_links_means_no_progress()
    {
        var r = ProgressReflection.For([], 26_730_000m, 100m);

        Assert.Equal(0m, r.Progress);
        Assert.Equal(26_730_000m, r.RemainingValue);
    }

    [Fact]
    public void The_contract_rollup_is_value_weighted_not_a_mean_of_percentages()
    {
        // Two lines: 90,000,000 at 0% and 10,000,000 at 100%. The mean of the
        // two percentages is 50%. The contract is 10% done.
        Assert.Equal(10m, ProgressReflection.Rollup(100_000_000m, 10_000_000m));
    }

    [Fact]
    public void A_contract_with_no_value_rolls_up_to_zero_rather_than_dividing()
        => Assert.Equal(0m, ProgressReflection.Rollup(0m, 0m));
}
