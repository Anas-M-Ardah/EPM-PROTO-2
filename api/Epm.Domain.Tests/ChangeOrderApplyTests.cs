using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// BR-09 · `03 §6` — applying a change order, and the four rules that make
/// «معتمد ≠ مطبَّق» more than a label.
/// </summary>
public class ChangeOrderApplyTests
{
    private static readonly Amendments.Version Effective =
        new(1, 250_000_000m, new DateOnly(2026, 8, 14), 531);

    private static ChangeOrderApply.LineInput Line(
        string code, decimal qty, decimal rate, decimal? delta = null, decimal? excess = null,
        string type = "inc") =>
        new(code, type, qty, rate, [], delta, null, excess);

    [Fact]
    public void The_amendment_is_the_thing_that_makes_the_change_effective()
    {
        // BR-09 — a new version, one number higher, carrying the approved value
        // and days. Without this row nothing about the contract has changed.
        var plan = ChangeOrderApply.Plan(Effective, 10_000_000m, 45,
            [Line("BQ-001", 100m, 1_000m)], []);

        Assert.Equal(2, plan.Amendment.No);
        Assert.Equal(260_000_000m, plan.Amendment.Value);
        Assert.Equal(new DateOnly(2026, 9, 28), plan.Amendment.Finish);
        Assert.Equal(576, plan.Amendment.Duration);
    }

    [Fact]
    public void A_quantity_increase_becomes_TWO_BANDS_and_leaves_the_original_untouched()
    {
        // `02 §5` — 20 of the 30 move at the original 1,000; the 10 beyond the
        // threshold take the 1,200 the rate committee fixed. The line's own
        // OriginalQty stays 100, because D-01 measures the NEXT order's 20%
        // against it (non-negotiable #6).
        var plan = ChangeOrderApply.Plan(Effective, 32_000m, 0,
            [Line("BQ-001", 100m, 1_000m, delta: 30m, excess: 1_200m)], []);

        var line = plan.Lines.Single();

        Assert.Equal(100m, line.QtyBefore);
        Assert.Equal(130m, line.QtyAfter);
        Assert.Equal(100_000m, line.AmountBefore);
        Assert.Equal(132_000m, line.AmountAfter);

        Assert.Equal(2, line.Bands.Count);
        Assert.Equal(new TierSplit.Band(120m, 1_000m), line.Bands[0]);
        Assert.Equal(new TierSplit.Band(10m, 1_200m), line.Bands[1]);
    }

    [Fact]
    public void A_line_the_order_does_not_touch_is_still_in_the_plan()
    {
        // It has to be: a weight is a share of the CONTRACT (BR-01), so
        // dropping the untouched lines would make the 100% check meaningless.
        var plan = ChangeOrderApply.Plan(Effective, 20_000m, 0,
        [
            Line("BQ-001", 100m, 1_000m, delta: 20m),
            Line("BQ-002", 50m, 2_000m),
        ], []);

        Assert.Equal(2, plan.Lines.Count);
        var untouched = plan.Lines.Single(l => l.Code == "BQ-002");
        Assert.Equal(untouched.AmountBefore, untouched.AmountAfter);
        Assert.Equal(untouched.QtyBefore, untouched.QtyAfter);
    }

    [Fact]
    public void The_weight_check_is_a_recomputation_and_it_passes_on_a_real_move()
    {
        var plan = ChangeOrderApply.Plan(Effective, 20_000m, 0,
        [
            Line("BQ-001", 100m, 1_000m, delta: 20m),
            Line("BQ-002", 50m, 2_000m),
        ], []);

        Assert.Equal(100m, plan.Weights.SumBefore);
        Assert.Equal(100m, plan.Weights.SumAfter);
        Assert.True(plan.Weights.Valid);
    }

    [Fact]
    public void Cancelling_every_line_leaves_no_weights_to_verify_and_the_step_FAILS()
    {
        // A contract whose lines all total zero has no denominator, so BR-01
        // returns zeros and the sum is 0 — not 100. `03 §6` wants that to STOP
        // the application rather than pass quietly, and it does.
        var plan = ChangeOrderApply.Plan(Effective, -100_000m, 0,
            [Line("BQ-001", 100m, 1_000m, delta: 100m, type: "del")], []);

        Assert.Equal(0m, plan.Weights.SumAfter);
        Assert.False(plan.Weights.Valid);

        // …and everything after the weight step stays `todo`, because the run
        // stopped. It did not silently finish.
        var steps = ChangeOrderApply.StepOutcomes(plan);
        Assert.Equal("fail", steps[5]);
        Assert.Equal("todo", steps[6]);
        Assert.Equal("todo", steps[9]);
    }

    [Fact]
    public void The_rate_step_is_na_when_no_rate_moved_and_the_penalty_step_when_no_days_did()
    {
        // `03 §6` — a step that does not apply says so. Marking it `done`
        // would claim the system did something it had no reason to do.
        var plan = ChangeOrderApply.Plan(Effective, 20_000m, 0,
            [Line("BQ-001", 100m, 1_000m, delta: 20m)], []);

        var steps = ChangeOrderApply.StepOutcomes(plan);

        Assert.Equal("na", steps[4]);   // no rate changed
        Assert.Equal("na", steps[8]);   // no days granted → BR-10's baseline stands
        Assert.False(plan.PenaltyMoves);
        Assert.Equal("done", steps[9]);
    }

    [Fact]
    public void An_order_that_grants_days_moves_the_penalty_baseline()
    {
        // BR-10 charges against the CONTRACTUAL finish, and the amendment just
        // moved it — so the recalculation is required, not optional.
        var plan = ChangeOrderApply.Plan(Effective, 0m, 45,
            [Line("BQ-001", 100m, 1_000m)], []);

        Assert.True(plan.PenaltyMoves);
        Assert.Equal("done", ChangeOrderApply.StepOutcomes(plan)[8]);
        Assert.Equal(new DateOnly(2026, 9, 28), plan.Amendment.Finish);
    }

    [Fact]
    public void A_redistribution_moves_quantity_and_not_value()
    {
        var plan = ChangeOrderApply.Plan(Effective, 0m, 0,
        [
            Line("BQ-008", 800m, 3_000m, delta: -500m, type: "redist"),
            Line("BQ-009", 1_200m, 3_000m, delta: 500m, type: "redist"),
        ], []);

        var src = plan.Lines.Single(l => l.Code == "BQ-008");
        var tgt = plan.Lines.Single(l => l.Code == "BQ-009");

        Assert.Equal(300m, src.QtyAfter);
        Assert.Equal(1_700m, tgt.QtyAfter);
        // The contract's total is unchanged, which is what makes it a
        // redistribution rather than a change in value.
        Assert.Equal(
            src.AmountBefore + tgt.AmountBefore,
            src.AmountAfter + tgt.AmountAfter);
    }

    // ── which decisions are on offer (03 §5 · §3 · §7) ───────────────────

    [Fact]
    public void Only_the_stage_owner_or_the_delegate_is_offered_anything()
    {
        Assert.Empty(WorkflowMachine.Available("pending", "none", []));
        Assert.Empty(WorkflowMachine.Available("pending", "acted", []));
        Assert.Empty(WorkflowMachine.Available("pending", "upcoming", []));
        Assert.NotEmpty(WorkflowMachine.Available("pending", "awaiting", []));
        Assert.NotEmpty(WorkflowMachine.Available("pending", "recorder", []));
    }

    [Fact]
    public void Approve_disappears_while_an_external_party_is_still_out()
    {
        // `03 §3` — the stage cannot be completed. Returning stays available:
        // a defective order should not wait on a ministry reply to be sent back.
        var waiting = WorkflowMachine.Available("pending", "awaiting", ["in", "wait"]);

        Assert.DoesNotContain(waiting, d => d.Key == "approve");
        Assert.Contains(waiting, d => d.Key == "return");

        var answered = WorkflowMachine.Available("pending", "awaiting", ["in", "na"]);
        Assert.Contains(answered, d => d.Key == "approve");
    }

    [Fact]
    public void A_return_and_a_rejection_both_require_a_written_reason()
    {
        var set = WorkflowMachine.Available("pending", "awaiting", []);

        Assert.True(set.Single(d => d.Key == "return").NeedsNote);
        Assert.True(set.Single(d => d.Key == "reject").NeedsNote);
        Assert.False(set.Single(d => d.Key == "approve").NeedsNote);
    }

    [Fact]
    public void Each_lifecycle_offers_the_one_action_that_belongs_to_it()
    {
        Assert.Equal(["resubmit"], WorkflowMachine.Available("returned", "awaiting", []).Select(d => d.Key));
        Assert.Equal(["apply"], WorkflowMachine.Available("approved", "awaiting", []).Select(d => d.Key));
        // A run that stopped offers the same action again, not a different one.
        Assert.Equal(["apply"], WorkflowMachine.Available("applied_partial", "awaiting", []).Select(d => d.Key));
        // Terminal states offer nothing at all.
        Assert.Empty(WorkflowMachine.Available("closed", "awaiting", []));
        Assert.Empty(WorkflowMachine.Available("rejected", "awaiting", []));
    }
}
