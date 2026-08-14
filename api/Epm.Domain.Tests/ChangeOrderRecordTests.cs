using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// 03 §9 · ملحق الأشكال 30–32 — the record's four columns and their weights.
///
/// The worked figures are الشكل 31's own: BQ-002 أعمال خرسانية, original 754 at
/// 63,610, approved 1,169 at an excess rate of 66,154. Reading them off the
/// plate is the point — if this file ever disagrees with it, one of the two is
/// wrong and it must be settled before a screen prints either.
/// </summary>
public class ChangeOrderRecordTests
{
    private static readonly ChangeOrderRecord.Line Bq002 =
        new("BQ-002", "inc", 754m, 754m, 63_610m, 754m * 63_610m);

    [Fact]
    public void A_party_that_has_not_proposed_gets_an_empty_column_not_a_zero()
    {
        // «بانتظار القرار» — 02 §6: the approved column exists only once the
        // pricing committee has ruled. A zero here would read as "approved
        // nothing", which is a different fact.
        var c = ChangeOrderRecord.For(Bq002, new(null, null, null));

        Assert.Null(c.QtyAfter);
        Assert.Null(c.AmountAfter);
        Assert.Null(c.Impact);
        Assert.False(c.TripsThreshold);
    }

    [Fact]
    public void Fig31_BQ002_approved_column_splits_at_20_percent_of_the_ORIGINAL_quantity()
    {
        // الشكل 31: 754 → 1,169 is +415, and the 20% threshold on 754 is 150.8.
        // So 150.8 moves at 63,610 and 264.2 at the fixed excess rate 66,154 —
        // the plate prints exactly that pair under «الوصف / التفصيل».
        var c = ChangeOrderRecord.For(Bq002, new(415m, null, 66_154m));

        Assert.Equal(150.8m, c.Threshold);
        Assert.Equal(150.8m, c.AtRateQty);
        Assert.Equal(264.2m, c.ExcessQty);
        Assert.True(c.TripsThreshold);
        Assert.Equal(1169m, c.QtyAfter);

        // 47,961,940 + 150.8×63,610 + 264.2×66,154
        Assert.Equal(47_961_940m + 9_592_388m + 17_477_886.8m, c.AmountAfter);
        Assert.Equal(9_592_388m + 17_477_886.8m, c.Impact);

        // The rate the plate shows in the «سعر الزائد» column is the EXCESS
        // rate, never the original — the original is already on the item row.
        Assert.Equal(66_154m, c.RateShown);
    }

    [Fact]
    public void A_line_inside_the_limit_shows_no_excess_rate_at_all()
    {
        // Not "the original rate" and not 0 — there is no excess quantity, so
        // there is no excess rate to print (الشكل 31's «—»).
        var c = ChangeOrderRecord.For(Bq002, new(100m, null, 66_154m));

        Assert.False(c.TripsThreshold);
        Assert.Null(c.RateShown);
        Assert.Equal(100m * 63_610m, c.Impact);
    }

    [Fact]
    public void A_rate_change_reprices_the_whole_line_with_no_20_percent_tier()
    {
        // 02 §5 applies to inc and dec only. Tiering a rate change would value
        // 80% of the line at a rate nobody proposed.
        var line = new ChangeOrderRecord.Line("BQ-007", "rate", 100m, 100m, 1_000m, 100_000m);
        var c = ChangeOrderRecord.For(line, new(null, 1_200m, null));

        Assert.Equal(100m, c.QtyAfter);
        Assert.Equal(1_200m, c.RateShown);
        Assert.Equal(120_000m, c.AmountAfter);
        Assert.Equal(20_000m, c.Impact);
        Assert.False(c.TripsThreshold);
    }

    [Fact]
    public void Cancelling_an_item_removes_its_whole_remaining_amount()
    {
        var line = new ChangeOrderRecord.Line("BQ-009", "del", 40m, 40m, 2_000m, 80_000m);
        var c = ChangeOrderRecord.For(line, new(-40m, null, null));

        Assert.Equal(0m, c.QtyAfter);
        Assert.Equal(-80_000m, c.Impact);
    }

    [Fact]
    public void Redistribution_moves_quantity_and_changes_no_value()
    {
        // The zero is a FACT — a redistribution that changed the contract value
        // would not be a redistribution.
        var line = new ChangeOrderRecord.Line("BQ-011", "redist", 60m, 60m, 5_000m, 300_000m);
        var c = ChangeOrderRecord.For(line, new(-15m, null, null));

        Assert.Equal(45m, c.QtyAfter);
        Assert.Equal(300_000m, c.AmountAfter);
        Assert.Equal(0m, c.Impact);
    }

    [Fact]
    public void Net_is_null_when_no_party_column_carries_a_figure()
    {
        var empty = ChangeOrderRecord.For(Bq002, new(null, null, null));

        // An order with no approved value has no approved net. Printing 0
        // would put a settled-looking zero where «—» belongs (P-09's rule).
        Assert.Null(ChangeOrderRecord.Net([empty, empty]));
    }

    [Fact]
    public void Weights_are_recomputed_over_the_WHOLE_contract_and_still_total_100()
    {
        // الشكل 31's «مجموع الأوزان قبل 100.00 · بعد 100.00 · التحقق مطابق».
        // The two untouched lines are in the list: a weight is a share of the
        // contract (BR-01), so dropping them would make every share wrong.
        var lines = new List<ChangeOrderRecord.Amount>
        {
            new("BQ-002", 47_961_940m, 75_032_215m),
            new("BQ-004", 44_783_220m, 66_209_784m),
            new("BQ-006", 30_000_000m, 30_000_000m),
            new("BQ-008", 20_000_000m, 20_000_000m),
        };

        var w = ChangeOrderRecord.Weights(lines, new HashSet<string> { "BQ-002", "BQ-004" });

        Assert.Equal(100m, w.SumBefore);
        Assert.Equal(100m, w.SumAfter);
        Assert.True(w.Valid);

        // Only the affected lines are printed, and each carries its own delta.
        Assert.Equal(2, w.Rows.Count);
        Assert.All(w.Rows, r => Assert.True(r.After > r.Before));
        Assert.Equal(w.Rows[0].After - w.Rows[0].Before, w.Rows[0].Delta);
    }

    [Fact]
    public void An_untouched_line_still_moves_because_the_denominator_moved()
    {
        // This is the fact الشكل 31 exists to show: adding value to one line
        // DILUTES every other line's weight, which is why the sum has to be
        // re-checked rather than assumed.
        var lines = new List<ChangeOrderRecord.Amount>
        {
            new("A", 50m, 150m),
            new("B", 50m, 50m),
        };

        var w = ChangeOrderRecord.Weights(lines, new HashSet<string> { "B" });

        Assert.Equal(50m, w.Rows.Single().Before);
        Assert.Equal(25m, w.Rows.Single().After);
        Assert.Equal(-25m, w.Rows.Single().Delta);
    }

    [Fact]
    public void Fig32_time_impact_keeps_requested_analysis_and_approved_apart()
    {
        // الشكل 32: 30 requested, 21 from the analysis, 21 approved; finish
        // 2027-02-05 → forecast 2027-03-07 → approved 2027-02-26.
        var t = ChangeOrderRecord.Time(30, 21, 21, new DateOnly(2027, 2, 5));

        Assert.Equal(new DateOnly(2027, 3, 7), t.FinishForecast);
        Assert.Equal(new DateOnly(2027, 2, 26), t.FinishApproved);
        Assert.True(t.AffectsFinish);
    }

    [Fact]
    public void An_order_with_no_approved_days_has_no_approved_finish_and_moves_nothing()
    {
        var t = ChangeOrderRecord.Time(30, 21, null, new DateOnly(2027, 2, 5));

        Assert.Null(t.FinishApproved);
        Assert.False(t.AffectsFinish);
        // The forecast still exists — it is what was ASKED for, and الشكل 32
        // prints it beside the analysis so the two cannot be conflated.
        Assert.Equal(new DateOnly(2027, 3, 7), t.FinishForecast);
    }

    [Fact]
    public void The_decision_difference_is_measured_against_the_RE_department_proposal()
    {
        // 02 §6 — the RE department's figure is the one that governs display,
        // so it is the one an approval departs from. الشكل 30 prints
        // «الفرق عن مقترح دائرة المهندس المقيم −576,196 · −9 يوم».
        var d = ChangeOrderRecord.Decision(49_073_035m, 30, 48_496_839m, 21);

        Assert.Equal(-576_196m, d.ValueDelta);
        Assert.Equal(-9, d.DaysDelta);
    }

    [Fact]
    public void There_is_no_difference_to_state_before_an_approval_exists()
    {
        var d = ChangeOrderRecord.Decision(49_073_035m, 30, null, null);

        Assert.Null(d.ValueDelta);
        Assert.Null(d.DaysDelta);
    }
}
