using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>BR-14 · 03 §7 — viewer relation and action gating.</summary>
public class ViewerRelationTests
{
    private const string Re = "دائرة المهندس المقيم";
    private const string Committee = "لجنة أوامر الغيار";
    private const string RateCommittee = "لجنة تثبيت الأسعار";

    [Fact]
    public void Owning_the_current_stage_is_awaiting()
    {
        var rel = ViewerRelation.For(Committee, false, "pending", Committee, Re, [Re], [], false);

        Assert.Equal("awaiting", rel);
        Assert.True(ViewerRelation.CanAct(rel));
        Assert.True(ViewerRelation.AwaitingMyAction(rel));
    }

    [Fact]
    public void Owning_a_later_stage_is_upcoming_and_read_only()
    {
        var rel = ViewerRelation.For(RateCommittee, false, "pending", Committee, Re, [Re], [RateCommittee], false);

        Assert.Equal("upcoming", rel);
        Assert.False(ViewerRelation.CanAct(rel));
    }

    [Fact]
    public void Having_finished_your_stage_is_acted()
    {
        var rel = ViewerRelation.For(Re, false, "pending", Committee, Re, [Re], [], false);

        Assert.Equal("acted", rel);
        Assert.False(ViewerRelation.CanAct(rel));
    }

    [Fact]
    public void The_delegate_with_a_pending_external_party_is_recorder_and_may_act()
    {
        // 03 §4 — recording a decision on behalf of a party, against an
        // official letter. A real action, not a weaker `awaiting`.
        var rel = ViewerRelation.For(Committee, true, "pending", "الوزير / المفوَّض", Re, [], [], true);

        Assert.Equal("recorder", rel);
        Assert.True(ViewerRelation.CanAct(rel));
    }

    [Fact]
    public void The_delegate_without_a_pending_external_party_is_not_recorder()
    {
        var rel = ViewerRelation.For(Committee, true, "pending", "الوزير / المفوَّض", Re, [], [], false);

        Assert.NotEqual("recorder", rel);
        Assert.False(ViewerRelation.CanAct(rel));
    }

    [Fact]
    public void Someone_outside_the_chain_gets_none()
    {
        var rel = ViewerRelation.For("مدير المشروع", false, "pending", Committee, Re, [Re], [RateCommittee], false);

        Assert.Equal("none", rel);
        Assert.False(ViewerRelation.CanAct(rel));
    }

    [Fact]
    public void Owning_the_current_stage_outranks_being_the_delegate()
    {
        var rel = ViewerRelation.For(Committee, true, "pending", Committee, Re, [], [], true);

        Assert.Equal("awaiting", rel);
    }

    [Fact]
    public void An_approved_order_awaits_the_execution_stage_owner_who_applies_it()
    {
        // 03 §6 — approved has no current stage; applying is the RE dept's job.
        var rel = ViewerRelation.For(Re, false, "approved", null, Re, [Re, Committee], [], false);

        Assert.Equal("awaiting", rel);
        Assert.True(ViewerRelation.CanAct(rel));
    }

    [Fact]
    public void Terminal_orders_are_read_only_for_everyone()
    {
        foreach (var lifecycle in new[] { "closed", "rejected", "cancelled" })
        {
            var rel = ViewerRelation.For(Committee, true, lifecycle, Committee, Re, [], [], true);

            Assert.Equal("none", rel);
            Assert.False(ViewerRelation.CanAct(rel));
        }
    }
}
