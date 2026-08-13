using Epm.Api.Domain;
using F = Epm.Api.Domain.ModuleReadiness.ModuleFacts;

namespace Epm.Domain.Tests;

/// <summary>
/// الشكل 4's «خط سير المراحل» and «الإجراء التالي المطلوب».
///
/// The tests that matter here are the ones pinning what the strip must NOT do:
/// claim an approval the system cannot support, count unbuilt modules against
/// the project, or demand an action when nothing is waiting.
/// </summary>
public class ModuleReadinessTests
{
    // ── one module's standing ─────────────────────────────────────────────

    [Fact]
    public void An_unbuilt_module_is_not_available_whatever_else_is_true()
    {
        // Not a project fact. A phase-6 module says nothing about this project,
        // so it must never read as the project's shortfall.
        var s = ModuleReadiness.Resolve(new F("risk", Built: false, Rows: 12, Waiting: 3));

        Assert.Equal(ModuleReadiness.NotAvailable, s.State);
        Assert.Equal(0, s.Rows);
        Assert.Equal(0, s.Waiting);
    }

    [Fact]
    public void A_built_module_with_nothing_in_it_has_not_started()
    {
        var s = ModuleReadiness.Resolve(new F("boq", true, 0, 0));

        Assert.Equal(ModuleReadiness.NotStarted, s.State);
    }

    [Fact]
    public void A_module_holding_rows_is_in_progress()
    {
        var s = ModuleReadiness.Resolve(new F("contract", true, 2, 0));

        Assert.Equal(ModuleReadiness.InProgress, s.State);
        Assert.Equal(2, s.Rows);
    }

    [Fact]
    public void Anything_waiting_on_a_person_outranks_merely_holding_rows()
    {
        var s = ModuleReadiness.Resolve(new F("changeorders", true, 5, 1));

        Assert.Equal(ModuleReadiness.NeedsAttention, s.State);
        Assert.Equal(1, s.Waiting);
    }

    [Fact]
    public void A_module_can_need_attention_before_it_holds_anything()
    {
        // Rows and waiting are independent facts; waiting wins on its own.
        var s = ModuleReadiness.Resolve(new F("financial", true, 0, 2));

        Assert.Equal(ModuleReadiness.NeedsAttention, s.State);
    }

    // ── the counter ───────────────────────────────────────────────────────

    [Fact]
    public void Progress_counts_started_out_of_available_and_ignores_unbuilt()
    {
        var states = ModuleReadiness.ResolveAll(
        [
            new F("information",  true,  1, 0),   // in-progress   → started
            new F("contract",     true,  2, 0),   // in-progress   → started
            new F("boq",          true,  0, 0),   // not-started
            new F("changeorders", true,  4, 1),   // attention     → started
            new F("risk",         false, 0, 0),   // not available → excluded
            new F("documents",    false, 0, 0),   // not available → excluded
        ]);

        var (started, available) = ModuleReadiness.Progress(states);

        Assert.Equal(3, started);
        Assert.Equal(4, available);
    }

    [Fact]
    public void A_project_where_nothing_has_begun_reads_zero_of_available()
    {
        var states = ModuleReadiness.ResolveAll(
            [new F("contract", true, 0, 0), new F("boq", true, 0, 0)]);

        Assert.Equal((0, 2), ModuleReadiness.Progress(states));
    }

    // ── the next action ───────────────────────────────────────────────────

    [Fact]
    public void Attention_outranks_not_started()
    {
        var states = ModuleReadiness.ResolveAll(
        [
            new F("boq",          true, 0, 0),   // not-started, earlier in rail
            new F("changeorders", true, 3, 2),   // needs attention
        ]);

        Assert.Equal("changeorders", ModuleReadiness.NextAction(states)!.Id);
    }

    [Fact]
    public void Ties_break_on_rail_order()
    {
        // Not a weighting nobody specified — the order the documents already
        // put the modules in.
        var states = ModuleReadiness.ResolveAll(
            [new F("contract", true, 0, 0), new F("boq", true, 0, 0)]);

        Assert.Equal("contract", ModuleReadiness.NextAction(states)!.Id);
    }

    [Fact]
    public void An_in_progress_module_is_never_the_next_action()
    {
        // A module working as intended must not be nagged about, or the control
        // trains the manager to ignore it.
        var states = ModuleReadiness.ResolveAll(
            [new F("contract", true, 2, 0), new F("boq", true, 40, 0)]);

        Assert.Null(ModuleReadiness.NextAction(states));
    }

    [Fact]
    public void No_action_is_a_real_answer_and_is_not_faked()
    {
        var states = ModuleReadiness.ResolveAll([new F("risk", false, 0, 0)]);

        Assert.Null(ModuleReadiness.NextAction(states));
    }
}
