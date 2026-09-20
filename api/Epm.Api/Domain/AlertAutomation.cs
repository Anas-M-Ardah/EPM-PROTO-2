namespace Epm.Api.Domain;

/// <summary>
/// The deterministic part of alert automation.  It accepts the project data
/// date rather than reading a wall clock (D-06).  Delivery is intentionally
/// outside this class; this only decides the documented escalation chain.
/// </summary>
public static class AlertAutomation
{
    public record EscalationStep(int Level, string RecipientRole);

    public static IReadOnlyList<EscalationStep> DueSteps(
        DateTime raisedAt, int? escalateAfterHours, DateOnly dataDate)
    {
        if (escalateAfterHours is not { } hours) return [];
        var elapsedHours = (dataDate.ToDateTime(TimeOnly.MaxValue) - raisedAt).TotalHours;
        if (elapsedHours < hours) return [];

        // The first escalation is what the rule's ceiling promises.  Further
        // unattended periods advance through the reference's stated chain.
        var periods = Math.Max(1, (int)Math.Floor(elapsedHours / hours));
        var roles = new[] { "project-manager", "department-manager", "technical-deputy" };
        return roles.Take(Math.Min(periods, roles.Length))
            .Select((role, index) => new EscalationStep(index + 1, role)).ToList();
    }
}
