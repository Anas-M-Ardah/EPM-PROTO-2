using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>D-06 applies to escalation as well as SLA: never use a wall clock.</summary>
public class AlertAutomationTests
{
    [Fact]
    public void No_escalation_before_the_rule_ceiling()
    {
        var steps = AlertAutomation.DueSteps(
            new DateTime(2026, 8, 1, 0, 0, 0), 48, new DateOnly(2026, 8, 2));

        Assert.Empty(steps);
    }

    [Fact]
    public void Ceiling_escalates_to_project_manager_at_the_data_date()
    {
        var steps = AlertAutomation.DueSteps(
            new DateTime(2026, 7, 31, 0, 0, 0), 48, new DateOnly(2026, 8, 2));

        var step = Assert.Single(steps);
        Assert.Equal(1, step.Level);
        Assert.Equal("project-manager", step.RecipientRole);
    }

    [Fact]
    public void Continued_non_action_advances_the_documented_chain_only_once_per_level()
    {
        var steps = AlertAutomation.DueSteps(
            new DateTime(2026, 7, 26, 0, 0, 0), 48, new DateOnly(2026, 8, 2));

        Assert.Equal(["project-manager", "department-manager", "technical-deputy"],
            steps.Select(s => s.RecipientRole));
    }

    [Fact]
    public void Rule_without_escalation_never_enters_the_chain()
        => Assert.Empty(AlertAutomation.DueSteps(
            new DateTime(2026, 7, 1), null, new DateOnly(2026, 8, 2)));
}
