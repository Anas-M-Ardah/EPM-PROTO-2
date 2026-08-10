using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>BR-13 · 03 §2, §5, §6 — the six-stage workflow.</summary>
public class WorkflowMachineTests
{
    [Fact]
    public void There_are_exactly_six_stages()
        => Assert.Equal(6, WorkflowMachine.Stages.Count);

    [Fact]
    public void Skipped_stages_are_listed_with_a_reason_never_omitted()
    {
        // 03 §2 is explicit about this: a silently missing stage is a defect.
        var plan = WorkflowMachine.Plan(tripsThreshold: false, needsEndorsement: false);

        Assert.Equal(6, plan.Count);

        var rateFixing = plan.Single(p => p.Def.No == 3);
        Assert.False(rateFixing.Active);
        Assert.Equal("No line exceeded 20%", rateFixing.SkipEn);

        var endorsement = plan.Single(p => p.Def.No == 4);
        Assert.False(endorsement.Active);
        Assert.NotNull(endorsement.SkipAr);
    }

    [Fact]
    public void Rate_fixing_appears_only_when_a_line_trips_20_percent()
    {
        Assert.False(WorkflowMachine.Plan(false, false).Single(p => p.Def.No == 3).Active);
        Assert.True(WorkflowMachine.Plan(true, false).Single(p => p.Def.No == 3).Active);
    }

    [Fact]
    public void Approving_skips_over_inactive_stages()
    {
        // With 3 and 4 skipped, stage 2 advances straight to stage 5.
        var plan = WorkflowMachine.Plan(false, false);
        var t = WorkflowMachine.Decide(2, "approve", plan);

        Assert.Equal("pending", t.Lifecycle);
        Assert.Equal(5, t.StageNo);
    }

    [Fact]
    public void Approving_stops_at_rate_fixing_when_it_applies()
    {
        var plan = WorkflowMachine.Plan(tripsThreshold: true, needsEndorsement: false);
        var t = WorkflowMachine.Decide(2, "approve", plan);

        Assert.Equal(3, t.StageNo);
    }

    [Fact]
    public void Approving_the_last_stage_makes_the_order_approved_not_applied()
    {
        // D-09 — approved means the contract has NOT changed.
        var plan = WorkflowMachine.Plan(false, false);
        var t = WorkflowMachine.Decide(6, "approve", plan);

        Assert.Equal("approved", t.Lifecycle);
        Assert.Null(t.StageNo);
    }

    [Fact]
    public void Return_goes_back_one_applicable_stage()
    {
        var plan = WorkflowMachine.Plan(false, false);
        var t = WorkflowMachine.Decide(5, "return", plan);

        Assert.Equal("returned", t.Lifecycle);
        Assert.Equal(2, t.StageNo);   // 3 and 4 are skipped
    }

    [Fact]
    public void Return_at_the_first_stage_stays_there()
    {
        var t = WorkflowMachine.Decide(1, "return", WorkflowMachine.Plan(false, false));

        Assert.Equal("returned", t.Lifecycle);
        Assert.Equal(1, t.StageNo);
    }

    [Fact]
    public void Reject_and_cancel_both_terminate()
    {
        var plan = WorkflowMachine.Plan(false, false);

        Assert.Equal("rejected", WorkflowMachine.Decide(2, "reject", plan).Lifecycle);
        Assert.Equal("cancelled", WorkflowMachine.Decide(2, "cancel", plan).Lifecycle);
    }

    [Fact]
    public void Endorsement_review_is_needed_past_a_quarter_of_the_duration()
    {
        // 03 §3 — VO-03 in the fixture asks for 30% of the duration.
        Assert.True(WorkflowMachine.ExceedsQuarterDuration(120, 400));
        Assert.False(WorkflowMachine.ExceedsQuarterDuration(100, 400));   // exactly a quarter
        Assert.False(WorkflowMachine.ExceedsQuarterDuration(45, 400));
    }

    [Fact]
    public void A_stage_with_a_pending_external_party_cannot_complete()
    {
        // 03 §3 — only `in` (وردت) and `na` (غير مطلوب) clear it.
        Assert.False(WorkflowMachine.CanCompleteStage(["in", "wait"]));
        Assert.False(WorkflowMachine.CanCompleteStage(["back"]));
        Assert.True(WorkflowMachine.CanCompleteStage(["in", "na"]));
        Assert.True(WorkflowMachine.CanCompleteStage([]));
    }

    [Fact]
    public void External_progress_counts_received_over_required()
    {
        var (received, required) = WorkflowMachine.ExternalProgress(["in", "wait", "na"]);

        Assert.Equal(1, received);
        Assert.Equal(2, required);   // `na` is not required
    }

    [Fact]
    public void The_rate_step_of_the_checklist_applies_only_when_a_rate_changed()
    {
        Assert.False(WorkflowMachine.ApplyChecklist(false).Single(s => s.No == 3).Required);
        Assert.True(WorkflowMachine.ApplyChecklist(true).Single(s => s.No == 3).Required);
        Assert.Equal(7, WorkflowMachine.ApplyChecklist(false).Count);
    }

    [Fact]
    public void An_order_closes_only_when_every_step_is_done_or_not_required()
    {
        Assert.Equal("closed", WorkflowMachine.ApplyLifecycle(["done", "done", "na", "done", "done", "done", "done"]));
        Assert.Equal("applied_partial", WorkflowMachine.ApplyLifecycle(["done", "done", "na", "wip", "todo", "todo", "todo"]));
    }

    [Fact]
    public void A_failed_step_keeps_the_order_applying_and_raises_the_flag()
    {
        // VO-04 in the fixture: the weight step fails → فشل التطبيق.
        var steps = new[] { "done", "done", "na", "fail", "todo", "todo", "todo" };

        Assert.Equal("applied_partial", WorkflowMachine.ApplyLifecycle(steps));
        Assert.True(WorkflowMachine.ApplyFailed(steps));
    }
}
