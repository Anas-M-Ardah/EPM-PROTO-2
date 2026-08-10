using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>BR-11 · 02 §11 — earned value.</summary>
public class EarnedValueTests
{
    [Fact]
    public void Worked_example_CPI_0_945_and_SPI_0_867()
    {
        var r = EarnedValue.For(100_000_000m, 0.60m, 0.52m, 55_000_000m);

        Assert.Equal(60_000_000m, r.Pv);
        Assert.Equal(52_000_000m, r.Ev);
        Assert.Equal(0.945m, Math.Round(r.Cpi!.Value, 3));
        Assert.Equal(0.867m, Math.Round(r.Spi!.Value, 3));
    }

    [Fact]
    public void EAC_and_VAC_follow_from_CPI()
    {
        var r = EarnedValue.For(100_000_000m, 0.60m, 0.52m, 55_000_000m);

        Assert.Equal(105_769_231m, Math.Round(r.Eac!.Value, 0));
        Assert.Equal(-5_769_231m, Math.Round(r.Vac!.Value, 0));
    }

    [Fact]
    public void CPI_is_null_before_any_cost_is_incurred()
    {
        // P-09 — null renders an em dash. Zero would assert infinitely bad
        // performance on a project that has simply not spent anything yet.
        var r = EarnedValue.For(100_000_000m, 0.10m, 0m, 0m);

        Assert.Null(r.Cpi);
        Assert.Null(r.Eac);
        Assert.Null(r.Vac);
    }

    [Fact]
    public void SPI_is_null_before_any_work_is_planned()
    {
        var r = EarnedValue.For(100_000_000m, 0m, 0.05m, 1_000_000m);

        Assert.Null(r.Spi);
    }

    [Fact]
    public void On_plan_and_on_budget_gives_indices_of_one()
    {
        var r = EarnedValue.For(100_000_000m, 0.50m, 0.50m, 50_000_000m);

        Assert.Equal(1m, r.Cpi);
        Assert.Equal(1m, r.Spi);
        Assert.Equal(100_000_000m, r.Eac);
        Assert.Equal(0m, r.Vac);
    }
}
