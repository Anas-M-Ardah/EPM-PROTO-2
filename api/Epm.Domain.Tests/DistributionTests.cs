using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>BR-08 · 02 §8 — quantity distribution to beneficiaries.</summary>
public class DistributionTests
{
    [Fact]
    public void Worked_example_qty_120_rows_40_and_50_is_partial()
    {
        var r = Distribution.For(120m, [40m, 50m]);

        Assert.Equal(90m, r.Distributed);
        Assert.Equal(30m, r.Remaining);
        Assert.Equal(0m, r.Excess);
        Assert.Equal("partial", r.State);
    }

    [Fact]
    public void Nothing_distributed_is_none()
    {
        var r = Distribution.For(120m, []);

        Assert.Equal("none", r.State);
        Assert.Equal(120m, r.Remaining);
    }

    [Fact]
    public void Exactly_the_quantity_is_full()
    {
        var r = Distribution.For(120m, [70m, 50m]);

        Assert.Equal("full", r.State);
        Assert.Equal(0m, r.Remaining);
    }

    [Fact]
    public void Full_tolerates_a_thousandth()
        => Assert.Equal("full", Distribution.StateOf(120m, 119.9995m));

    [Fact]
    public void Over_the_quantity_is_an_error_state()
    {
        var r = Distribution.For(120m, [70m, 60m]);

        Assert.Equal("over", r.State);
        Assert.Equal(10m, r.Excess);
        Assert.Equal(0m, r.Remaining);   // never negative
    }

    [Fact]
    public void The_cap_is_the_quantity_less_the_other_rows()
    {
        // 02 §8's prevention rule: this is the number the input is capped at
        // and the number the inline explanation quotes.
        Assert.Equal(70m, Distribution.CapFor(120m, [50m]));
        Assert.Equal(30m, Distribution.CapFor(120m, [40m, 50m]));
        Assert.Equal(0m, Distribution.CapFor(120m, [120m]));
        Assert.Equal(0m, Distribution.CapFor(120m, [130m]));   // never negative
    }

    [Fact]
    public void A_decrease_below_the_distributed_total_blocks_application()
    {
        // 02 §8 / D-05 — the distribution must be revised first.
        Assert.True(Distribution.DecreaseBlocksApply(revisedQty: 80m, distributed: 90m));
        Assert.False(Distribution.DecreaseBlocksApply(revisedQty: 90m, distributed: 90m));
        Assert.False(Distribution.DecreaseBlocksApply(revisedQty: 100m, distributed: 90m));
    }
}
