namespace Epm.Api.Features.Schedule;

/// <summary>
/// Member names are IDENTICAL to web/src/app/features/schedule/schedule.types.ts
/// (CLAUDE.md §2).
///
/// SCR-W5, ported from the v1.1 schedule module — ../epm@design/system-revamp
/// app/schedule-module.jsx: `DGantt` :80 · `DSchedTable` :257 · `DModSchedule` :437.
///
/// ── THE BASELINE AND THE FORECAST ARE DIFFERENT THINGS ───────────────────
/// The baseline is the CONTRACTUAL reference. BR-10 charges the delay penalty
/// against it, and an applied change order does NOT move it — the extension
/// moves the contractual finish in the contract amendment instead. Every row
/// below carries both, and the Gantt draws both.
/// </summary>

// ── EP-SCD-01 · the contract gate ────────────────────────────────────────

/// <param name="ActivityCount">
/// How many activities this contract has. Zero means no P6 schedule has been
/// imported for it — a real state with its own message, not a loading gap.
/// </param>
public record ScheduleContractOption(
    string Id,
    string NameAr,
    string NameEn,
    string Status,
    int ActivityCount);

public record ScheduleGateResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    IReadOnlyList<ScheduleContractOption> Contracts);

// ── EP-SCD-02 · the schedule ─────────────────────────────────────────────

/// <summary>
/// One row of the Gantt and of the table. A WBS node and an activity are the
/// same shape deliberately: the Gantt renders one flat ordered list and uses
/// <paramref name="Kind"/> to decide what to draw, which is what lets a
/// collapse hide a whole subtree by filtering on <paramref name="Path"/>.
/// </summary>
/// <param name="Kind">`wbs` — a container, never assignable · `act` — a leaf.</param>
/// <param name="Path">
/// The dotted WBS path. A node's path is its own; an activity's is its parent's.
/// A row is inside node N exactly when its path is N's or starts with N + '.'.
/// </param>
/// <param name="Level">1-based depth, for the indent.</param>
/// <param name="RelativeWeight">BR-02 — share of the PARENT WBS node.</param>
/// <param name="AbsoluteWeight">BR-02 — share of the CONTRACT. See P-50.</param>
/// <param name="Progress">
/// Reported on an activity; on a WBS node it is the weight-rolled-up progress
/// of everything beneath it (02 §4's "rolls up by weight" — NOT by duration,
/// which is what the reference does; see P-51).
/// </param>
/// <param name="SlipDays">
/// Forecast finish − baseline finish, in days. Signed: negative is early, and
/// A9 in the fixture is. Null when either date is missing.
/// </param>
/// <param name="IsCritical">
/// A PATH property. Rendered as a 2px `--on-surface` RING, never as a colour
/// (04 §5) — the colour channel belongs to status.
/// </param>
public record ScheduleRowDto(
    string Kind,
    string Id,
    string NameAr,
    string NameEn,
    string Path,
    int Level,
    string Status,
    decimal Progress,
    string? BaselineStart,
    string? BaselineFinish,
    string? ActualStart,
    string? ActualFinish,
    string? ForecastFinish,
    int OriginalDuration,
    int RemainingDuration,
    decimal? TotalFloat,
    bool IsCritical,
    bool IsMilestone,
    decimal RelativeWeight,
    decimal AbsoluteWeight,
    decimal BudgetedCost,
    string Calendar,
    string Predecessors,
    int? SlipDays,
    /// <summary>
    /// `04 §6` — the amendment badge, or null when no approved order has
    /// touched this activity. Always null on a WBS node: an order extends an
    /// ACTIVITY, and a node is the span of what is beneath it.
    /// </summary>
    ScheduleAmendmentMark? Amendment = null);

public record ScheduleAmendmentSource(string No, bool IsApplied);

/// <summary>
/// ROADMAP 4.5 · `04 §6`, the schedule half. Same three states as the BOQ's
/// mark and the same `Domain/AmendmentDisclosure` behind them — an activity
/// moves DAYS where a BOQ line moves quantities, and that is the whole
/// difference.
/// </summary>
/// <param name="DeltaDays">
/// Effective − original remaining duration. SETTLED: already inside the row's
/// own `RemainingDuration` and `ForecastFinish`.
/// </param>
/// <param name="PendingDeltaDays">
/// What the approved-but-unapplied orders WOULD add. Null when none is
/// awaiting application.
/// </param>
public record ScheduleAmendmentMark(
    int Count,
    int AppliedCount,
    int PendingCount,
    string State,
    int OriginalRemaining,
    int DeltaDays,
    int? PendingDeltaDays,
    IReadOnlyList<ScheduleAmendmentSource> Sources);

/// <summary>EP-SCD-03 — one step of the drawer's chain, for one activity.</summary>
public record ScheduleAmendmentStep(
    string No,
    string? At,
    bool IsApplied,
    int RemainingFrom,
    int RemainingTo,
    string? FinishFrom,
    string? FinishTo);

public record ScheduleAmendmentDetail(
    string ActivityId,
    string NameAr,
    string NameEn,
    int Count,
    int AppliedCount,
    int PendingCount,
    string State,
    int OriginalRemaining,
    int EffectiveRemaining,
    int? PendingRemaining,
    string? OriginalFinish,
    string? EffectiveFinish,
    string? PendingFinish,
    IReadOnlyList<ScheduleAmendmentStep> Chain);

/// <summary>
/// The bounds the chart is drawn in. Sent rather than derived in the browser
/// so the bar geometry and the data-date line cannot drift apart.
/// </summary>
/// <param name="Origin">The earliest date on the chart.</param>
/// <param name="End">The latest, with a margin so the last bar is not flush.</param>
/// <param name="DataDate">
/// The project data date — where the `--viz-base` line goes. D-06: never the
/// wall clock.
/// </param>
/// <param name="Months">One entry per month column, in order.</param>
public record ScheduleTimeline(
    string Origin,
    string End,
    string DataDate,
    IReadOnlyList<string> Months);

/// <param name="Basis">`cost` or `mh` — which basis the weights above were computed on.</param>
/// <param name="ManHoursAvailable">
/// False when any assignable activity lacks budgeted man-hours, which is what
/// makes the toggle fall back to cost rather than divide by a partial total.
/// </param>
/// <param name="AverageProgress">
/// The contract's progress, weight-rolled-up — the same figure the root WBS
/// node carries, not the arithmetic mean of the activity percentages.
/// </param>
public record ScheduleSummary(
    int Activities,
    int Milestones,
    int Critical,
    int Delayed,
    decimal AverageProgress,
    string Basis,
    bool ManHoursAvailable);

/// <summary>
/// الشكل 23 — one affected activity, baseline beside current.
///
/// `04 §5`'s comparison is a BEFORE/AFTER of the same activity, not two rows:
/// the pair is what makes a 26-day slip inside 26 days of float read
/// differently from the same slip inside none.
/// </summary>
/// <param name="CostImpact">
/// `Domain/ScheduleImpact` — an ESTIMATE, labelled «تقديري» on the plate and on
/// screen. Nothing downstream reads it: it is not a payment, not an amendment,
/// and not part of the contract value.
/// </param>
public record ScheduleImpactRow(
    string ActivityId,
    string NameAr,
    string NameEn,
    string Status,
    bool IsCritical,
    string? BaselineStart,
    string? BaselineFinish,
    string? CurrentStart,
    string? CurrentFinish,
    int DurationBefore,
    int DurationAfter,
    decimal FloatBefore,
    decimal FloatAfter,
    int SlipDays,
    decimal Cost,
    decimal DailyRate,
    decimal DailyOverhead,
    decimal CostImpact);

/// <param name="NowCritical">
/// Activities that are critical AND have slipped — the ones a slip moved onto
/// the path that decides the finish, which is what الشكل 23's own tile counts.
/// </param>
/// <param name="OverheadPct">
/// D-15, sent rather than hard-coded in the template so the explainer card can
/// state the rule the figures were actually produced by.
/// </param>
public record ScheduleImpactSummary(
    int AffectedCount,
    int NowCriticalCount,
    decimal TotalCostImpact,
    decimal OverheadPct);

public record ScheduleResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string ContractId,
    string ContractNameAr,
    string ContractNameEn,
    IReadOnlyList<ScheduleRowDto> Rows,
    ScheduleTimeline Timeline,
    ScheduleSummary Summary,
    IReadOnlyDictionary<string, int> CountByStatus,
    /// <summary>الشكل 23's third view. Empty when nothing has slipped.</summary>
    IReadOnlyList<ScheduleImpactRow> Impact,
    ScheduleImpactSummary ImpactSummary,
    /// <summary>
    /// الشكل 23's «مرشح إصدار خط الأساس». One entry per baseline the contract
    /// has had; the current one is last and is the one every figure above was
    /// computed against.
    /// </summary>
    IReadOnlyList<ScheduleBaselineOption> Baselines);

/// <param name="Id">`BL-0` for the programme the contract started with, then
/// `BL-{n}` per approved schedule import — see `EP-SCD-06`, the only route that
/// re-baselines.</param>
/// <param name="IsCurrent">
/// The baseline IN FORCE. Exactly one entry carries it, and it is the one the
/// slip, the float and the impact are all measured from — a picker that let a
/// reader compare against a superseded baseline while the figures stayed on the
/// current one would be reporting two different schedules in one screen. A
/// superseded entry is offered as history, not as a recomputation basis.
/// </param>
public record ScheduleBaselineOption(
    string Id,
    string LabelAr,
    string LabelEn,
    string TakenAt,
    bool IsCurrent);
