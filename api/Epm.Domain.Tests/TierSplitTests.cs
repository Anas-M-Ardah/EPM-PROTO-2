using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>BR-05 · 02 §5 — THE 20% RULE.</summary>
public class TierSplitTests
{
    [Fact]
    public void Worked_example_increase_original_100_add_30()
    {
        // 02 §5: threshold 20; first 20 at the original rate; remaining 10 at
        // the new proposed rate.
        var r = TierSplit.Split(new("inc", 100m, 30m, 1000m, 1200m, 100_000m));

        Assert.Equal(20m, r.Threshold);
        Assert.Equal(20m, r.AtRate);
        Assert.Equal(10m, r.ExcessQty);
        Assert.Equal(20_000m, r.AtCost);
        Assert.Equal(12_000m, r.ExCost);
        Assert.Equal(132_000m, r.NewAmount);
        Assert.True(r.TripsThreshold);
    }

    [Fact]
    public void Worked_example_decrease_original_100_reduce_30()
    {
        // 02 §5: 20 deducted at the original rate, 10 at the new one.
        var r = TierSplit.Split(new("dec", 100m, 30m, 1000m, 1200m, 100_000m));

        Assert.Equal(20m, r.AtRate);
        Assert.Equal(10m, r.ExcessQty);
        Assert.Equal(68_000m, r.NewAmount);   // 100,000 − 20,000 − 12,000
        Assert.True(r.TripsThreshold);
    }

    [Fact]
    public void A_change_inside_20_percent_does_not_trip_and_uses_only_the_original_rate()
    {
        var r = TierSplit.Split(new("inc", 100m, 15m, 1000m, 1200m, 100_000m));

        Assert.Equal(15m, r.AtRate);
        Assert.Equal(0m, r.ExcessQty);
        Assert.Equal(0m, r.ExCost);
        Assert.Equal(115_000m, r.NewAmount);
        Assert.False(r.TripsThreshold);       // no rate-fixing stage (BR-13)
    }

    [Fact]
    public void Exactly_20_percent_does_not_trip_the_threshold()
    {
        // The boundary matters: it decides whether لجنة تثبيت الأسعار is
        // inserted into the approval chain at all.
        var r = TierSplit.Split(new("inc", 100m, 20m, 1000m, 1200m, 100_000m));

        Assert.Equal(0m, r.ExcessQty);
        Assert.False(r.TripsThreshold);
    }

    [Fact]
    public void Threshold_is_20_percent_of_the_ORIGINAL_quantity_not_the_current_one()
    {
        // D-01. A first order took this line from 100 to 130. The second
        // order's threshold is still 20 (20% of 100), not 26 (20% of 130).
        var r = TierSplit.Split(new("inc", 100m, 25m, 1000m, 1200m, 130_000m));

        Assert.Equal(20m, r.Threshold);
        Assert.Equal(5m, r.ExcessQty);
        Assert.True(r.TripsThreshold);
    }

    [Fact]
    public void The_rule_applies_only_to_increase_and_decrease()
    {
        Assert.True(TierSplit.AppliesTo("inc"));
        Assert.True(TierSplit.AppliesTo("dec"));
        Assert.False(TierSplit.AppliesTo("rate"));
        Assert.False(TierSplit.AppliesTo("del"));
        Assert.False(TierSplit.AppliesTo("redist"));
    }

    [Fact]
    public void Blended_rate_across_bands_weights_by_quantity()
    {
        // After the worked increase the line carries two bands: 120 @ 1,000
        // and 10 @ 1,200 → (120,000 + 12,000) / 130.
        var blended = TierSplit.BlendedRate([new(120m, 1000m), new(10m, 1200m)]);

        Assert.Equal(1015.38m, Math.Round(blended, 2));
    }

    [Fact]
    public void Blended_rate_of_no_bands_is_zero_rather_than_a_divide_by_zero()
        => Assert.Equal(0m, TierSplit.BlendedRate([]));
}
