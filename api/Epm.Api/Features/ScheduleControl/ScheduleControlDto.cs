namespace Epm.Api.Features.ScheduleControl;

/// <summary>
/// Member names are IDENTICAL to
/// web/src/app/features/schedule-control/schedule-control.types.ts,
/// so one grep crosses both stacks (CLAUDE.md §2).
///
/// Column set ported from DScheduleControl — the v1.1 branch,
/// ../epm@design/system-revamp app/enterprise-areas.jsx:8.
/// </summary>
/// <param name="BaselineFinish">
/// The contractual finish in force: the LATEST **effective** finish across the
/// project's contracts (BR-09 — original + APPLIED delta days). Null when the
/// project has no contract, because then it has no contractual finish at all.
///
/// This is the single most consequential choice on the screen. Measuring
/// against the ORIGINAL finish would report a project as late by exactly the
/// extension it was formally granted, which is the error the amendment rules
/// exist to prevent.
/// </param>
/// <param name="OriginalFinish">
/// The latest ORIGINAL finish, shown under the baseline as "was …" when an
/// applied amendment moved it. Never a strikethrough (04 §6).
/// </param>
/// <param name="ForecastFinish">
/// The latest RECORDED forecast across the project's contracts
/// (Contracts.ForecastFinish). Null when no contract carries one — which is a
/// different thing from "on time" and renders as an em dash, never a zero (P-09).
/// </param>
/// <param name="DelayDays">
/// The WORST per-contract delay, from Penalty.DelayDays (BR-10's own
/// definition). Not the project-level date subtraction: a contract that has
/// slipped has slipped, even when a longer sibling contract hides it behind a
/// later project finish. Null when no forecast is recorded.
/// </param>
/// <param name="DelayDrivenBy">
/// The contract that DelayDays came from, so the figure is traceable in one
/// hop. Null when nothing is late.
/// </param>
/// <param name="CriticalActivities">
/// ALWAYS NULL until Phase 4.3 registers Activities. The reference fabricates
/// this from a character of the project id; see the endpoint's remarks.
/// </param>
/// <param name="ScheduleImported">
/// Whether a P6 schedule has been imported. Always false today, and that is a
/// fact rather than a placeholder: the Activities table is not registered, so
/// no schedule can have been imported for any project.
/// </param>
public record ScheduleRow(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string WorkspaceCode,
    string WorkspaceNameAr,
    string WorkspaceNameEn,
    string Branch,
    string Status,
    int ContractCount,
    string? BaselineFinish,
    string? OriginalFinish,
    string? ForecastFinish,
    int? DelayDays,
    string? DelayDrivenBy,
    int? CriticalActivities,
    bool ScheduleImported);

/// <summary>
/// Counts over the SCOPED set, before the search and the state filter, so the
/// KPI band and the chips keep their numbers while a filter is applied.
/// </summary>
/// <param name="NoSchedule">
/// Projects with no contractual finish or no recorded forecast. They are
/// neither delayed nor on track, and folding them into either would be a
/// claim the data does not support. Delayed + OnTrack + NoSchedule = Total.
/// </param>
/// <param name="AvgDelayDays">
/// Mean delay across the DELAYED projects only — the reference's own
/// denominator. Zero when nothing is late.
/// </param>
public record ScheduleCounts(
    int Total,
    int Delayed,
    int OnTrack,
    int NoSchedule,
    int AvgDelayDays);

/// <summary>
/// A headline figure the system cannot yet derive. Same shape and same reason
/// as Portfolio's Unavailable (SCR-E1): "never render 0 for a missing input —
/// show unavailable + reason", and keep the reason on the server beside the
/// rule that owns it. Declared per-feature rather than shared, because each
/// feature owns its own DTOs (CLAUDE.md §2).
/// </summary>
public record ScheduleUnavailable(string Key, string NeedsAr, string NeedsEn);

public record ScheduleResponse(
    IReadOnlyList<ScheduleRow> Rows,
    int Total,
    ScheduleCounts Counts,
    IReadOnlyList<ScheduleUnavailable> Unavailable);
