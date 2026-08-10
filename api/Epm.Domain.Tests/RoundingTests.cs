using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>D-07 · 02 §1 — largest-remainder rounding.</summary>
public class RoundingTests
{
    [Fact]
    public void Worked_example_02_1_sums_to_exactly_100()
    {
        // 56,131,000 and 43,869,000 of 100,000,000 → 56.131% / 43.869%
        var result = Rounding.LargestRemainder([56.131m, 43.869m]);

        Assert.Equal(56.13m, result[0]);
        Assert.Equal(43.87m, result[1]);
        Assert.Equal(100.00m, result.Sum());
    }

    [Fact]
    public void Naive_rounding_would_have_produced_100_01()
    {
        // The bug this helper exists to prevent: Math.Round on each value
        // independently gives 56.13 + 43.87 here, but three equal thirds give
        // 33.33 × 3 = 99.99 and 100.005-style inputs give 100.01.
        var naive = new[] { 33.333333m, 33.333333m, 33.333334m }
            .Select(v => Math.Round(v, 2)).Sum();
        Assert.NotEqual(100.00m, naive);

        var correct = Rounding.LargestRemainder([33.333333m, 33.333333m, 33.333334m]);
        Assert.Equal(100.00m, correct.Sum());
    }

    [Fact]
    public void Shortfall_goes_to_the_largest_fractional_parts_first()
    {
        // floors 33.33 / 33.33 / 33.33 = 99.99, one 0.01 to distribute.
        // The largest remainder is the third value's.
        var result = Rounding.LargestRemainder([33.333m, 33.333m, 33.334m]);

        Assert.Equal(33.33m, result[0]);
        Assert.Equal(33.33m, result[1]);
        Assert.Equal(33.34m, result[2]);
    }

    [Fact]
    public void Equal_remainders_resolve_by_position_so_the_result_is_deterministic()
    {
        var a = Rounding.LargestRemainder([16.666m, 16.666m, 16.666m, 16.666m, 16.666m, 16.670m]);
        var b = Rounding.LargestRemainder([16.666m, 16.666m, 16.666m, 16.666m, 16.666m, 16.670m]);

        Assert.Equal(a, b);
        Assert.Equal(100.00m, a.Sum());
    }

    [Fact]
    public void Empty_input_makes_no_100_percent_claim()
        => Assert.Empty(Rounding.LargestRemainder([]));

    [Fact]
    public void Single_value_is_the_whole_total()
        => Assert.Equal([100.00m], Rounding.LargestRemainder([100m]));

    [Theory]
    [InlineData(2)]
    [InlineData(3)]
    [InlineData(7)]
    [InlineData(11)]
    [InlineData(97)]
    [InlineData(1000)]
    public void Property_any_equal_split_still_sums_to_exactly_100(int n)
    {
        // Equal splits are the worst case for rounding: every remainder ties.
        var raw = Enumerable.Repeat(100m / n, n).ToList();
        Assert.Equal(100.00m, Rounding.LargestRemainder(raw).Sum());
    }
}
