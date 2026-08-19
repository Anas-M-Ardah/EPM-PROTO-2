using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>04 §6 · 02 §9 — the row-level amendment mark, delta and chain.</summary>
public class AmendmentDisclosureTests
{
    private static AmendmentDisclosure.Touch T(
        string no, bool applied, decimal dQty, decimal dValue,
        decimal excessQty = 0m, decimal? excessRate = null)
        => new(no, new DateOnly(2026, 3, 12), applied, dQty, dValue, excessQty, excessRate);

    [Fact]
    public void Worked_example_one_applied_and_one_approved_reads_mixed()
    {
        // original 100 · VO-01 applied +30 · VO-02 approved +10.
        var r = AmendmentDisclosure.For(100m, 1_000_000m, [
            T("VO-01", true, 30m, 300_000m),
            T("VO-02", false, 10m, 100_000m),
        ]);

        Assert.Equal(2, r.Count);
        Assert.Equal(AmendmentDisclosure.Mixed, r.State);
        Assert.Equal(130m, r.EffectiveQty);
        Assert.Equal(140m, r.PendingQty);
        Assert.Equal(1_300_000m, r.EffectiveValue);
        Assert.Equal(1_400_000m, r.PendingValue);
    }

    [Fact]
    public void Approving_changes_nothing_above()
    {
        // The non-negotiable, at the cell. An approved-unapplied order leaves
        // the effective figure exactly where it was.
        var r = AmendmentDisclosure.For(100m, 1_000_000m, [T("VO-02", false, 10m, 100_000m)]);

        Assert.Equal(AmendmentDisclosure.Pending, r.State);
        Assert.Equal(100m, r.EffectiveQty);
        Assert.Equal(1_000_000m, r.EffectiveValue);
        Assert.Equal(110m, r.PendingQty);
    }

    [Fact]
    public void All_applied_reads_applied_and_projects_nothing()
    {
        var r = AmendmentDisclosure.For(100m, 1_000_000m, [
            T("VO-01", true, 30m, 300_000m),
            T("VO-03", true, -5m, -50_000m),
        ]);

        Assert.Equal(AmendmentDisclosure.Applied, r.State);
        Assert.Equal(125m, r.EffectiveQty);
        // NULL, not 125. "No projection" and "a projection that happens to
        // equal the effective figure" are different facts and the badge shows
        // them differently.
        Assert.Null(r.PendingQty);
        Assert.Null(r.PendingValue);
    }

    [Fact]
    public void Each_applied_order_moves_the_figure_the_next_one_starts_from()
    {
        // The chain IS the history: VO-03 starts at 130, not at the original 100.
        var r = AmendmentDisclosure.For(100m, 1_000_000m, [
            T("VO-01", true, 30m, 300_000m),
            T("VO-03", true, 20m, 200_000m),
        ]);

        Assert.Equal(100m, r.Chain[0].QtyFrom);
        Assert.Equal(130m, r.Chain[0].QtyTo);
        Assert.Equal(130m, r.Chain[1].QtyFrom);
        Assert.Equal(150m, r.Chain[1].QtyTo);
        Assert.Equal(150m, r.EffectiveQty);
    }

    [Fact]
    public void Two_pending_orders_chain_onto_each_other()
    {
        // Same rule Amendments.Projection applies at contract level: +10 and
        // +10 project to +20, not to +10 twice.
        var r = AmendmentDisclosure.For(100m, 1_000_000m, [
            T("VO-02", false, 10m, 100_000m),
            T("VO-04", false, 10m, 100_000m),
        ]);

        Assert.Equal(100m, r.EffectiveQty);
        Assert.Equal(120m, r.PendingQty);
        Assert.Equal(1_200_000m, r.PendingValue);
    }

    [Fact]
    public void The_applied_steps_come_before_the_pending_ones_whatever_the_input_order()
    {
        // A pending order that arrived first must not be shown as the basis an
        // applied one moved from — the applied chain is the record, the pending
        // list is the projection off the end of it.
        var r = AmendmentDisclosure.For(100m, 1_000_000m, [
            T("VO-02", false, 10m, 100_000m),
            T("VO-01", true, 30m, 300_000m),
        ]);

        Assert.True(r.Chain[0].IsApplied);
        Assert.Equal("VO-01", r.Chain[0].No);
        Assert.False(r.Chain[1].IsApplied);
        Assert.Equal(130m, r.Chain[1].QtyFrom);
        Assert.Equal(140m, r.Chain[1].QtyTo);
    }

    [Fact]
    public void A_decrease_is_a_negative_delta_not_a_kind()
    {
        var r = AmendmentDisclosure.For(100m, 1_000_000m, [T("VO-05", true, -25m, -250_000m)]);

        Assert.Equal(75m, r.EffectiveQty);
        Assert.Equal(750_000m, r.EffectiveValue);
        Assert.Equal(AmendmentDisclosure.Applied, r.State);
    }

    [Fact]
    public void An_untouched_row_carries_no_state_at_all()
    {
        var r = AmendmentDisclosure.For(100m, 1_000_000m, []);

        Assert.Equal(0, r.Count);
        Assert.Equal("", r.State);
        Assert.Equal(100m, r.EffectiveQty);
        Assert.Null(r.PendingQty);
        Assert.Empty(r.Chain);
    }

    [Fact]
    public void The_re_priced_excess_rides_on_its_own_step()
    {
        // BR-05's band belongs to the order that created it, so the drawer can
        // say which order introduced the second rate.
        var r = AmendmentDisclosure.For(100m, 1_000_000m, [
            T("VO-01", true, 30m, 340_000m, excessQty: 10m, excessRate: 12_000m),
        ]);

        Assert.Equal(10m, r.Chain[0].ExcessQty);
        Assert.Equal(12_000m, r.Chain[0].ExcessRate);
    }

    // ── the activity half ────────────────────────────────────────────────

    [Fact]
    public void An_activity_finish_moves_by_the_same_delta_as_its_remaining()
    {
        var r = AmendmentDisclosure.ForActivity(60, new DateOnly(2026, 6, 30), [
            new("VO-02", new DateOnly(2026, 4, 21), true, 45),
        ]);

        Assert.Equal(105, r.EffectiveRemaining);
        Assert.Equal(new DateOnly(2026, 8, 14), r.EffectiveFinish);
        Assert.Equal(AmendmentDisclosure.Applied, r.State);
        Assert.Null(r.PendingRemaining);
    }

    [Fact]
    public void An_approved_extension_does_not_move_the_activity_finish()
    {
        var r = AmendmentDisclosure.ForActivity(60, new DateOnly(2026, 6, 30), [
            new("VO-04", new DateOnly(2026, 5, 2), false, 12),
        ]);

        Assert.Equal(60, r.EffectiveRemaining);
        Assert.Equal(new DateOnly(2026, 6, 30), r.EffectiveFinish);
        Assert.Equal(72, r.PendingRemaining);
        Assert.Equal(new DateOnly(2026, 7, 12), r.PendingFinish);
        Assert.Equal(AmendmentDisclosure.Pending, r.State);
    }

    [Fact]
    public void An_activity_with_no_recorded_finish_keeps_none()
    {
        // Milestones and imported rows can arrive without one. Adding days to a
        // date that does not exist would invent it.
        var r = AmendmentDisclosure.ForActivity(30, null, [
            new("VO-02", null, true, 45),
        ]);

        Assert.Equal(75, r.EffectiveRemaining);
        Assert.Null(r.EffectiveFinish);
    }

    [Fact]
    public void State_is_the_same_rule_for_both_kinds()
    {
        Assert.Equal("", AmendmentDisclosure.State(0, 0));
        Assert.Equal(AmendmentDisclosure.Applied, AmendmentDisclosure.State(3, 3));
        Assert.Equal(AmendmentDisclosure.Pending, AmendmentDisclosure.State(3, 0));
        Assert.Equal(AmendmentDisclosure.Mixed, AmendmentDisclosure.State(3, 1));
        Assert.Equal(AmendmentDisclosure.Mixed, AmendmentDisclosure.State(3, 2));
    }
}
