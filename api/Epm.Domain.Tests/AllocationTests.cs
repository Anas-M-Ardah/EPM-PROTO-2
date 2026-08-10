using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>BR-03 · 02 §3 — BOQ ↔ Activity allocation.</summary>
public class AllocationTests
{
    [Fact]
    public void Worked_example_BQ_003_shares_read_52_7_and_47_3()
    {
        // A5 absolute 5.8%, A8 absolute 5.2%, Σ = 11.0%.
        var s = Allocation.Shares([5.8m, 5.2m], 26_730_000m);

        Assert.Equal(52.7m, Math.Round(s[0].Pct, 1));
        Assert.Equal(47.3m, Math.Round(s[1].Pct, 1));
    }

    [Fact]
    public void Worked_example_BQ_003_assigned_amounts_split_the_item_exactly()
    {
        var s = Allocation.Shares([5.8m, 5.2m], 26_730_000m);

        // 26,730,000 × 5.8/11 and × 5.2/11 are both EXACT — asserted without
        // rounding, because computing via `amount × pct / 100` leaves a decimal
        // tail that a Math.Round in the test would hide.
        Assert.Equal(14_094_000m, s[0].Assigned);
        Assert.Equal(12_636_000m, s[1].Assigned);

        // Shares total 100%, so the assigned amounts must total the item.
        Assert.Equal(26_730_000m, s.Sum(x => x.Assigned));
    }

    // 02 §3 states 14,092,710 / 12,637,290 for this example — 1,290 IQD from
    // the rule's own answer. 02 §4 explains why in its own worked example:
    // the prototype's figures come from UNROUNDED underlying weights, while
    // the spec quotes 5.8 / 5.2 rounded to 1dp. The RULE is binding, not the
    // illustration; recorded as P-15 in DECISIONS.md so this is not "fixed"
    // later by bending the arithmetic to the prose.
    [Fact]
    public void Spec_prose_figures_differ_from_the_rule_by_the_rounding_of_the_stated_weights()
    {
        var fromStatedWeights = Allocation.Shares([5.8m, 5.2m], 26_730_000m)[0].Assigned;

        Assert.Equal(14_094_000m, fromStatedWeights);
        Assert.NotEqual(14_092_710m, fromStatedWeights);
    }

    [Fact]
    public void Coverage_is_full_when_shares_total_100()
        => Assert.Equal("full", Allocation.CoverageStatus([52.7m, 47.3m]));

    [Fact]
    public void Coverage_is_unassigned_when_there_are_no_links()
        => Assert.Equal("unassigned", Allocation.CoverageStatus([]));

    [Fact]
    public void Coverage_is_partial_below_100_and_over_above_it()
    {
        Assert.Equal("partial", Allocation.CoverageStatus([40m, 30m]));
        Assert.Equal("over", Allocation.CoverageStatus([70m, 45m]));
    }

    [Fact]
    public void Coverage_tolerance_is_half_a_percent()
    {
        Assert.Equal("full", Allocation.CoverageStatus([99.7m]));
        Assert.Equal("full", Allocation.CoverageStatus([100.3m]));
        Assert.Equal("partial", Allocation.CoverageStatus([99.4m]));
        Assert.Equal("over", Allocation.CoverageStatus([100.6m]));
    }

    [Fact]
    public void No_weight_to_share_assigns_nothing_rather_than_dividing()
    {
        var s = Allocation.Shares([0m, 0m], 26_730_000m);
        Assert.All(s, x => Assert.Equal(0m, x.Assigned));
    }
}
