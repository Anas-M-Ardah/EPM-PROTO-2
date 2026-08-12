using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// المسار 1 — تعريف المشروع وربطه بالجامعة.
///
/// The track states its validation in one line — «تحقق: اكتمال الحقول الإلزامية
/// وصحة سنة الإدراج والكلفة» — plus «انتماء المشروع إلى تشكيل واحد» in its
/// summary row. There is a test per clause.
///
/// These rules now run at SAVE. The draft → review → approve workflow they were
/// originally the gate for was removed at the client's instruction, so there is
/// no later check and this is the only one.
///
/// No database, by CLAUDE.md §4: a wrong fixture must not be able to make a
/// test lie about whether a zero-cost project may be saved.
/// </summary>
public class ProjectDefinitionTests
{
    private const int DataDateYear = 2026;

    /// <summary>A definition that passes every clause — each test breaks exactly one.</summary>
    private static ProjectDefinition.Candidate Valid() => new(
        NameAr: "مجمع الكليات الطبية",
        Type: "new-build",
        RegistrationYear: 2026,
        ExecutionStage: "structure",
        FundingType: "federal-budget",
        WorkspaceCode: "ub",
        PlannedCost: 340_000_000m,
        BeneficiaryCodes: "BEN-UOB");

    // ── the gate as a whole ───────────────────────────────────────────────

    [Fact]
    public void A_complete_definition_has_no_violations()
    {
        Assert.Empty(ProjectDefinition.Validate(Valid(), DataDateYear));
    }

    [Fact]
    public void Every_failing_clause_is_reported_not_only_the_first()
    {
        // A form that reveals one problem per save makes the specialist
        // save five times to learn five things.
        var empty = new ProjectDefinition.Candidate("", "", null, "", "", "", null, "");

        var v = ProjectDefinition.Validate(empty, DataDateYear);

        Assert.Equal(8, v.Count);
        Assert.Contains(v, x => x.Field == "nameAr");
        Assert.Contains(v, x => x.Field == "workspaceCode");
    }

    // ── 1. اكتمال الحقول الإلزامية ────────────────────────────────────────

    [Theory]
    [InlineData("nameAr")]
    [InlineData("type")]
    [InlineData("executionStage")]
    [InlineData("fundingType")]
    [InlineData("beneficiaryCodes")]
    public void A_missing_mandatory_field_blocks_the_save(string field)
    {
        var c = field switch
        {
            "nameAr" => Valid() with { NameAr = "" },
            "type" => Valid() with { Type = "" },
            "executionStage" => Valid() with { ExecutionStage = "" },
            "fundingType" => Valid() with { FundingType = "" },
            _ => Valid() with { BeneficiaryCodes = "" },
        };

        Assert.Contains(ProjectDefinition.Validate(c, DataDateYear), x => x.Field == field);
    }

    [Fact]
    public void Whitespace_is_not_a_value()
    {
        var c = Valid() with { NameAr = "   " };

        Assert.Contains(ProjectDefinition.Validate(c, DataDateYear), x => x.Field == "nameAr");
    }

    // ── 2. صحة سنة الإدراج ────────────────────────────────────────────────

    [Fact]
    public void Registration_year_may_be_the_data_date_year()
    {
        var c = Valid() with { RegistrationYear = DataDateYear };

        Assert.DoesNotContain(ProjectDefinition.Validate(c, DataDateYear), x => x.Field == "registrationYear");
    }

    [Fact]
    public void Registration_year_may_be_one_year_ahead_for_next_years_plan()
    {
        var c = Valid() with { RegistrationYear = DataDateYear + 1 };

        Assert.DoesNotContain(ProjectDefinition.Validate(c, DataDateYear), x => x.Field == "registrationYear");
    }

    [Fact]
    public void Registration_year_two_years_ahead_is_refused()
    {
        var c = Valid() with { RegistrationYear = DataDateYear + 2 };

        Assert.Contains(ProjectDefinition.Validate(c, DataDateYear), x => x.Field == "registrationYear");
    }

    [Fact]
    public void A_mistyped_century_is_refused()
    {
        var c = Valid() with { RegistrationYear = 1026 };

        Assert.Contains(ProjectDefinition.Validate(c, DataDateYear), x => x.Field == "registrationYear");
    }

    // ── 3. الكلفة المقررة أكبر من صفر ─────────────────────────────────────

    [Fact]
    public void Planned_cost_of_zero_is_refused()
    {
        // Stated as an inequality, so zero fails — this is the clause most
        // likely to be softened into "is present".
        var c = Valid() with { PlannedCost = 0m };

        Assert.Contains(ProjectDefinition.Validate(c, DataDateYear), x => x.Field == "plannedCost");
    }

    [Fact]
    public void A_negative_planned_cost_is_refused()
    {
        var c = Valid() with { PlannedCost = -1m };

        Assert.Contains(ProjectDefinition.Validate(c, DataDateYear), x => x.Field == "plannedCost");
    }

    [Fact]
    public void A_missing_planned_cost_is_refused()
    {
        var c = Valid() with { PlannedCost = null };

        Assert.Contains(ProjectDefinition.Validate(c, DataDateYear), x => x.Field == "plannedCost");
    }

    // ── 4. انتماء المشروع إلى تشكيل واحد ──────────────────────────────────

    [Fact]
    public void A_project_belonging_to_no_entity_is_refused()
    {
        var c = Valid() with { WorkspaceCode = "" };

        Assert.Contains(ProjectDefinition.Validate(c, DataDateYear), x => x.Field == "workspaceCode");
    }

}
