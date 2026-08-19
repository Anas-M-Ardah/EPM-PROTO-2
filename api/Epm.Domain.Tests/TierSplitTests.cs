using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>BR-05 · 02 §5 — THE 20% RULE.</summary>
public class TierSplitTests
{
    // ── BANDED vs MULTI-RATE (02 §5) ─────────────────────────────────────
    // Two different facts that used to be one flag. Found by ROADMAP 4.5:
    // an order applied INSIDE the 20% threshold writes one band at the
    // contract rate, and the register printed «سعر مركّب» over it.

    [Fact]
    public void One_band_at_the_contract_rate_is_banded_and_NOT_multi_rate()
    {
        var line = TierSplit.Effective(18_000m, 1_250m, [new TierSplit.Band(20_000m, 1_250m)]);

        Assert.True(line.Banded);
        Assert.False(line.MultiRate);
        Assert.Equal(1_250m, line.Rate);
        Assert.Equal(25_000_000m, line.Amount);
    }

    [Fact]
    public void Two_bands_at_two_rates_are_both()
    {
        // BQ-006's own case: 1,680 at 24,000 and the 30 beyond the threshold
        // at the 26,000 لجنة تثبيت الأسعار fixed.
        var line = TierSplit.Effective(1_400m, 24_000m, [
            new TierSplit.Band(1_680m, 24_000m),
            new TierSplit.Band(30m, 26_000m),
        ]);

        Assert.True(line.Banded);
        Assert.True(line.MultiRate);
        Assert.Equal(1_710m, line.Qty);
        Assert.Equal(41_100_000m, line.Amount);
    }

    [Fact]
    public void Two_bands_at_ONE_rate_are_not_multi_rate_either()
    {
        // A redistribution splits a line's quantity without re-pricing it.
        var line = TierSplit.Effective(8_800m, 3_000m, [
            new TierSplit.Band(5_000m, 3_000m),
            new TierSplit.Band(3_300m, 3_000m),
        ]);

        Assert.True(line.Banded);
        Assert.False(line.MultiRate);
    }

    [Fact]
    public void A_line_with_no_bands_is_neither()
    {
        var line = TierSplit.Effective(100m, 500m, []);

        Assert.False(line.Banded);
        Assert.False(line.MultiRate);
        Assert.Equal(50_000m, line.Amount);
    }

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

    [Fact]
    public void An_unbanded_line_is_its_contracted_quantity_at_its_contracted_rate()
    {
        // 02 §3's line: BQ-003, 990 m³ at 27,000 = 26,730,000.
        var line = TierSplit.Effective(990m, 27_000m, []);

        Assert.Equal(990m, line.Qty);
        Assert.Equal(27_000m, line.Rate);
        Assert.Equal(26_730_000m, line.Amount);
        Assert.False(line.Banded);
    }

    [Fact]
    public void A_banded_line_is_the_sum_of_its_bands_and_its_rate_is_the_blend()
    {
        // The worked increase, applied: 120 kept at the original 1,000 and 10
        // re-priced at 1,200. The amount is what was agreed BAND BY BAND —
        // 132,000 — and the rate on screen is the blend that produces it.
        var line = TierSplit.Effective(100m, 1000m, [new(120m, 1000m), new(10m, 1200m)]);

        Assert.Equal(130m, line.Qty);
        Assert.Equal(132_000m, line.Amount);
        Assert.Equal(1015.38m, Math.Round(line.Rate, 2));
        Assert.True(line.Banded);
    }

    [Fact]
    public void Banding_reads_the_original_quantity_and_never_replaces_it()
    {
        // D-01 and non-negotiable #6: the 20% is measured against the ORIGINAL
        // quantity, so the original has to survive being banded.
        var original = 100m;
        var line = TierSplit.Effective(original, 1000m, [new(120m, 1000m), new(10m, 1200m)]);

        Assert.Equal(100m, original);
        Assert.Equal(130m, line.Qty);
    }
}
