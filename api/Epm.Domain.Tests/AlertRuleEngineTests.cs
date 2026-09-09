using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>P-254 — the 12 of the 14 rules this codebase can actually compute.</summary>
public class AlertRuleEngineTests
{
    private static readonly DateOnly DataDate = new(2026, 8, 2);

    [Fact]
    public void R1_fires_only_for_a_critical_activity_slipped_5_days_or_more()
    {
        var acts = new[]
        {
            new AlertRuleEngine.ActivityRow("A-01", "حفر", "Excavation", true, false,
                new DateOnly(2026, 7, 20), new DateOnly(2026, 7, 25)),   // 5-day slip, critical
            new AlertRuleEngine.ActivityRow("A-02", "خرسانة", "Concrete", true, false,
                new DateOnly(2026, 7, 20), new DateOnly(2026, 7, 23)),   // 3-day slip — under
            new AlertRuleEngine.ActivityRow("A-03", "تشطيب", "Finishing", false, false,
                new DateOnly(2026, 7, 20), new DateOnly(2026, 8, 1)),    // big slip, not critical
        };

        var firings = AlertRuleEngine.CriticalPathSlip(acts, DataDate).ToList();

        Assert.Single(firings);
        Assert.Equal("R1", firings[0].RuleCode);
        Assert.Equal("A-01", firings[0].TargetRef);
    }

    [Fact]
    public void R3_fires_for_an_unfinished_milestone_within_45_days()
    {
        var acts = new[]
        {
            new AlertRuleEngine.ActivityRow("M-01", "معلم 1", "Milestone 1", false, true,
                new DateOnly(2026, 9, 1), null),    // 30 days away
            new AlertRuleEngine.ActivityRow("M-02", "معلم 2", "Milestone 2", false, true,
                new DateOnly(2026, 11, 1), null),   // too far
            new AlertRuleEngine.ActivityRow("M-03", "معلم 3", "Milestone 3", false, true,
                new DateOnly(2026, 7, 1), null),    // already past
        };

        var firings = AlertRuleEngine.MilestoneApproaching(acts, DataDate).ToList();

        Assert.Single(firings);
        Assert.Equal("M-01", firings[0].TargetRef);
    }

    [Fact]
    public void R2_and_R9_fire_together_at_90_percent_spend_never_below()
    {
        Assert.Empty(AlertRuleEngine.SpendRatio(89.9m, DataDate));
        Assert.Empty(AlertRuleEngine.SpendRatio(null, DataDate));

        var firings = AlertRuleEngine.SpendRatio(90m, DataDate).ToList();
        Assert.Equal(["R2", "R9"], firings.Select(f => f.RuleCode));
    }

    [Fact]
    public void R4_fires_for_a_contract_silent_40_days_or_with_no_reading_at_all()
    {
        var rows = new[]
        {
            new AlertRuleEngine.ContractProgressRow("CNT-01", new DateOnly(2026, 6, 20)),  // 43 days
            new AlertRuleEngine.ContractProgressRow("CNT-02", new DateOnly(2026, 7, 15)),  // 18 days
            new AlertRuleEngine.ContractProgressRow("CNT-03", null),                        // never
        };

        var firings = AlertRuleEngine.StaleProgress(rows, DataDate).Select(f => f.TargetRef).ToList();

        Assert.Equal(["CNT-01", "CNT-03"], firings);
    }

    [Fact]
    public void R5_fires_for_any_status_but_approved_and_never_for_no_revision_at_all()
    {
        var docs = new[]
        {
            new AlertRuleEngine.DocumentRow("AR-DR-001", "t", "t", "draft"),
            new AlertRuleEngine.DocumentRow("AR-DR-002", "t", "t", "rejected"),
            new AlertRuleEngine.DocumentRow("AR-DR-003", "t", "t", "approved"),
            new AlertRuleEngine.DocumentRow("AR-DR-004", "t", "t", "none"),
        };

        var firings = AlertRuleEngine.DocumentsAwaitingApproval(docs, DataDate).Select(f => f.TargetRef).ToList();

        Assert.Equal(["AR-DR-001", "AR-DR-002"], firings);
    }

    [Fact]
    public void R6_keys_off_the_recorded_status_only_never_the_due_date()
    {
        // P-116 — MeetingAction.cs: lateness there is a human judgement, so a
        // far-past due date on a still-"inprogress" action must NOT fire.
        var actions = new[]
        {
            new AlertRuleEngine.MeetingActionRow("ACT-01", "t", "t", "overdue"),
            new AlertRuleEngine.MeetingActionRow("ACT-02", "t", "t", "inprogress"),
            new AlertRuleEngine.MeetingActionRow("ACT-03", "t", "t", "closed"),
        };

        var firings = AlertRuleEngine.OverdueMeetingActions(actions, DataDate).Select(f => f.TargetRef).ToList();

        Assert.Equal(["ACT-01"], firings);
    }

    [Fact]
    public void R7_fires_only_for_open_AND_high_never_high_alone()
    {
        var risks = new[]
        {
            new AlertRuleEngine.RiskRow("RSK-01", "t", "t", "open", 2, 3),        // 6 → high, open
            new AlertRuleEngine.RiskRow("RSK-02", "t", "t", "mitigating", 3, 3),  // 9 → high, not open
            new AlertRuleEngine.RiskRow("RSK-03", "t", "t", "open", 1, 1),        // 1 → low
        };

        var firings = AlertRuleEngine.OpenHighRisks(risks, DataDate).Select(f => f.TargetRef).ToList();

        Assert.Equal(["RSK-01"], firings);
    }

    [Fact]
    public void R8_fires_only_for_pending_never_draft_or_closed()
    {
        var orders = new[]
        {
            new AlertRuleEngine.ChangeOrderRow("VO-01", "t", "t", "pending"),
            new AlertRuleEngine.ChangeOrderRow("VO-02", "t", "t", "draft"),
            new AlertRuleEngine.ChangeOrderRow("VO-03", "t", "t", "closed"),
        };

        var firings = AlertRuleEngine.ChangeOrdersAwaitingDecision(orders, DataDate).Select(f => f.TargetRef).ToList();

        Assert.Equal(["VO-01"], firings);
    }

    [Fact]
    public void R12_fires_only_past_the_stages_own_cap_days_and_only_while_open()
    {
        var stages = new[]
        {
            // started 8 days before data date, 5-day cap → 3 over, breached
            new AlertRuleEngine.AuditStageRow("CNT-01-1", "t", "t", DataDate.AddDays(-8), null, 5),
            // started 3 days ago, 5-day cap → within
            new AlertRuleEngine.AuditStageRow("CNT-01-2", "t", "t", DataDate.AddDays(-3), null, 5),
            // over cap but already finished — not open, must not fire
            new AlertRuleEngine.AuditStageRow("CNT-01-3", "t", "t", DataDate.AddDays(-9), DataDate, 5),
            // not yet started — nothing to measure
            new AlertRuleEngine.AuditStageRow("CNT-01-4", "t", "t", null, null, 5),
        };

        var firings = AlertRuleEngine.AuditSlaBreached(stages, DataDate).Select(f => f.TargetRef).ToList();

        Assert.Equal(["CNT-01-1"], firings);
    }

    [Fact]
    public void R13_and_R14_read_coverage_off_Allocation_CoverageStatus()
    {
        var items = new[]
        {
            new AlertRuleEngine.BoqItemSharesRow("BQ-001", new List<decimal>()),           // unassigned
            new AlertRuleEngine.BoqItemSharesRow("BQ-002", new List<decimal> { 60m, 60m }), // 120% — over
            new AlertRuleEngine.BoqItemSharesRow("BQ-003", new List<decimal> { 100m }),     // full — quiet
        };

        var firings = AlertRuleEngine.AllocationCoverage(items, DataDate).ToList();

        Assert.Equal(("R13", "BQ-001"), (firings[0].RuleCode, firings[0].TargetRef));
        Assert.Equal(("R14", "BQ-002"), (firings[1].RuleCode, firings[1].TargetRef));
        Assert.Equal(2, firings.Count);
    }
}
