using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>BR-01 · 02 §1 — BOQ weight.</summary>
public class BoqWeightsTests
{
    [Fact]
    public void Worked_example_CNT_0279_EM_reads_56_13_and_43_87()
    {
        var w = BoqWeights.ForContract([56_131_000m, 43_869_000m]);

        Assert.Equal(56.13m, w[0]);
        Assert.Equal(43.87m, w[1]);
        Assert.Equal(100.00m, w.Sum());
    }

    [Fact]
    public void Empty_contract_makes_no_100_percent_claim()
        => Assert.Empty(BoqWeights.ForContract([]));

    [Fact]
    public void Single_item_is_100_percent()
        => Assert.Equal([100.00m], BoqWeights.ForContract([42_000_000m]));

    [Fact]
    public void Contract_totalling_zero_returns_zeroes_rather_than_dividing()
        => Assert.Equal([0m, 0m], BoqWeights.ForContract([0m, 0m]));

    [Fact]
    public void Denominator_is_the_contracts_rows_not_the_projects()
    {
        // 02 §1's named bug: totalling the whole project, then filtering.
        var contractOnly = BoqWeights.ForContract([56_131_000m, 43_869_000m]);
        var projectWide = BoqWeights.ForContract([56_131_000m, 43_869_000m, 240_000_000m]);

        Assert.Equal(56.13m, contractOnly[0]);
        Assert.NotEqual(56.13m, projectWide[0]);
    }

    [Fact]
    public void Property_weights_sum_to_exactly_100_for_any_item_set()
    {
        var rng = new Random(20260802);   // deterministic: a failure reproduces

        for (var trial = 0; trial < 500; trial++)
        {
            var n = rng.Next(1, 60);
            var amounts = Enumerable.Range(0, n).Select(_ => (decimal)rng.Next(1, 90_000_000)).ToList();
            var sum = BoqWeights.ForContract(amounts).Sum();

            Assert.True(sum == 100.00m, $"trial {trial}: {n} items summed to {sum}, not 100.00");
        }
    }
}
