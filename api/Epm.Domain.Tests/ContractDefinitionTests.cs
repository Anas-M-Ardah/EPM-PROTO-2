using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// المسار 2 — إنشاء العقود وربطها بالمشروع.
///
/// Step 5 names three checks — «عدم تكرار رقم العقد · النهاية بعد المباشرة ·
/// المبالغ موجبة» — and the summary row adds «انتماء العقد إلى مشروع واحد».
/// There is a test per clause, plus the two that are easiest to soften by
/// mistake: uniqueness is scoped to the تشكيل, and "after" excludes equal.
///
/// No database, by CLAUDE.md §4.
/// </summary>
public class ContractDefinitionTests
{
    private static readonly DateOnly Start = new(2026, 3, 12);
    private static readonly DateOnly Finish = new(2027, 8, 21);

    /// <summary>A contract that passes every clause — each test breaks exactly one.</summary>
    private static ContractDefinition.Candidate Valid() => new(
        Id: "CNT-0279",
        ProjectId: "PRJ-0279",
        NameAr: "عقد الأعمال المدنية",
        Component: "المكوّن المدني",
        Status: "ongoing",
        Start: Start,
        Finish: Finish,
        AwardAmount: 240_000_000m,
        ReserveAmount: 12_000_000m,
        SupervisionAmount: 5_000_000m,
        MonitoringAmount: 2_000_000m,
        Contractor: "شركة الفاو الهندسية");

    private static readonly string[] NoneYet = [];

    // ── the gate as a whole ───────────────────────────────────────────────

    [Fact]
    public void A_complete_contract_has_no_violations()
    {
        Assert.Empty(ContractDefinition.Validate(Valid(), NoneYet));
    }

    [Fact]
    public void Every_failing_clause_is_reported_not_only_the_first()
    {
        var empty = new ContractDefinition.Candidate(
            "", "", "", "", "", null, null, null, null, null, null, "");

        var v = ContractDefinition.Validate(empty, NoneYet);

        Assert.Contains(v, x => x.Field == "id");
        Assert.Contains(v, x => x.Field == "nameAr");
        Assert.Contains(v, x => x.Field == "component");
        Assert.Contains(v, x => x.Field == "contractor");
        Assert.Contains(v, x => x.Field == "start");
        Assert.Contains(v, x => x.Field == "finish");
        Assert.Contains(v, x => x.Field == "awardAmount");
        Assert.Contains(v, x => x.Field == "projectId");
    }

    // ── 1. عدم تكرار رقم العقد داخل التشكيل ───────────────────────────────

    [Fact]
    public void A_duplicate_contract_code_is_refused()
    {
        var v = ContractDefinition.Validate(Valid(), ["CNT-0279"]);

        Assert.Contains(v, x => x.Field == "id");
    }

    [Fact]
    public void Duplicate_detection_ignores_case()
    {
        // "cnt-0279" and "CNT-0279" are the same number to everyone except a
        // string comparison.
        var v = ContractDefinition.Validate(Valid(), ["cnt-0279"]);

        Assert.Contains(v, x => x.Field == "id");
    }

    [Fact]
    public void A_code_used_by_another_entity_is_not_a_duplicate()
    {
        // Uniqueness is «داخل التشكيل», so the caller passes only that entity's
        // codes. This pins the CONTRACT of that argument: anything not in the
        // set is free, however many other workspaces use it.
        var v = ContractDefinition.Validate(Valid(), ["CNT-0148", "CNT-0207"]);

        Assert.DoesNotContain(v, x => x.Field == "id");
    }

    // ── 2. تسلسل التواريخ — النهاية بعد المباشرة ──────────────────────────

    [Fact]
    public void A_finish_before_the_start_is_refused()
    {
        var c = Valid() with { Finish = Start.AddDays(-1) };

        Assert.Contains(ContractDefinition.Validate(c, NoneYet), x => x.Field == "finish");
    }

    [Fact]
    public void A_finish_equal_to_the_start_is_refused()
    {
        // «بعد» is stated as strictly after. A contract that finishes the day it
        // starts has no duration to run a programme over — and this is the
        // clause most likely to be softened into ">=".
        var c = Valid() with { Finish = Start };

        Assert.Contains(ContractDefinition.Validate(c, NoneYet), x => x.Field == "finish");
    }

    [Fact]
    public void A_finish_one_day_after_the_start_is_accepted()
    {
        var c = Valid() with { Finish = Start.AddDays(1) };

        Assert.DoesNotContain(ContractDefinition.Validate(c, NoneYet), x => x.Field == "finish");
    }

    // ── 3. موجبية المبالغ ─────────────────────────────────────────────────

    [Fact]
    public void An_award_of_zero_is_refused()
    {
        var c = Valid() with { AwardAmount = 0m };

        Assert.Contains(ContractDefinition.Validate(c, NoneYet), x => x.Field == "awardAmount");
    }

    [Fact]
    public void A_negative_award_is_refused()
    {
        var c = Valid() with { AwardAmount = -1m };

        Assert.Contains(ContractDefinition.Validate(c, NoneYet), x => x.Field == "awardAmount");
    }

    [Fact]
    public void The_other_three_amounts_may_be_zero_but_never_negative()
    {
        // A contract may genuinely carry no reserve. It may not carry a
        // negative one.
        var zero = Valid() with { ReserveAmount = 0m, SupervisionAmount = 0m, MonitoringAmount = 0m };
        Assert.Empty(ContractDefinition.Validate(zero, NoneYet));

        var negative = Valid() with { ReserveAmount = -1m };
        Assert.Contains(ContractDefinition.Validate(negative, NoneYet), x => x.Field == "reserveAmount");
    }

    [Fact]
    public void A_negative_monitoring_amount_is_refused()
    {
        // المراقبة is the fourth amount المسار 2 asks for and `01 §2.3` does not
        // list. It is validated like the other three.
        var c = Valid() with { MonitoringAmount = -5m };

        Assert.Contains(ContractDefinition.Validate(c, NoneYet), x => x.Field == "monitoringAmount");
    }

    // ── 4. انتماء العقد إلى مشروع واحد ────────────────────────────────────

    [Fact]
    public void A_contract_belonging_to_no_project_is_refused()
    {
        var c = Valid() with { ProjectId = "" };

        Assert.Contains(ContractDefinition.Validate(c, NoneYet), x => x.Field == "projectId");
    }

    // ── the stored duration ───────────────────────────────────────────────

    [Fact]
    public void Duration_is_derived_from_the_two_dates()
    {
        // Derived, never asked for — a third number would be a third chance to
        // contradict the two it comes from.
        Assert.Equal(527, ContractDefinition.DurationDays(Start, Finish));
    }

    [Fact]
    public void Duration_of_a_one_day_contract_is_one()
    {
        Assert.Equal(1, ContractDefinition.DurationDays(Start, Start.AddDays(1)));
    }
}
