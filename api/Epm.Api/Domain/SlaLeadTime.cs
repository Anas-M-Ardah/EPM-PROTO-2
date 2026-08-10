namespace Epm.Api.Domain;

/// <summary>
/// BR-12 · 02 §12 — transaction lead time and SLA.
///
/// rule: leadDays = dataDate − officialIncomingDate.
/// spec: measured from the official incoming letter against the project's DATA
///       DATE. Per-stage SLA 5 days (D-03); past it a stage is overdue, raises
///       needs-action, and auto-escalates to senior management.
/// example: dataDate 2026-08-02, incoming 2026-07-11, sla 5 → 22 days, overdue.
///
/// NEVER the wall clock (D-06). Every function takes the data date as an
/// ARGUMENT — there is no clock in this file, and there must not be one
/// anywhere in Domain/. A fixed "today" made every seeded order look years late.
/// </summary>
public static class SlaLeadTime
{
    public const int SlaDaysPerStage = 5;   // D-03 — CONFIRM per committee

    public record Result(int LeadDays, bool Overdue);

    public static Result For(DateOnly dataDate, DateOnly incomingDate, int sla = SlaDaysPerStage)
    {
        var lead = dataDate.DayNumber - incomingDate.DayNumber;
        return new Result(lead, lead > sla);
    }

    /// <summary>03 §10 — the register's average-approval-cycle indicator.</summary>
    public static decimal? AverageCycleDays(IReadOnlyList<int> closedCycleDays)
        => closedCycleDays.Count == 0 ? null : (decimal)closedCycleDays.Sum() / closedCycleDays.Count;
}
