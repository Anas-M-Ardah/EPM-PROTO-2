namespace Epm.Api.Features.Overview;

/// <summary>
/// Member names are IDENTICAL to
/// web/src/app/features/overview/overview.types.ts (CLAUDE.md §2).
///
/// SCR-W1, ported from DModOverview — the v1.1 branch,
/// ../epm@design/system-revamp app/project-modules.jsx:2512.
/// </summary>
/// <param name="Status">Lookup `project-status` (06 §1).</param>
/// <param name="DataDate">
/// The project's own data date — "now" for everything on this screen (D-06).
/// Never the wall clock.
/// </param>
public record OverviewProject(
    string Id,
    string NameAr,
    string NameEn,
    string Status,
    string Type,
    string ExecutionStage,
    string FundingType,
    string Region,
    string Priority,
    string Branch,
    string Executor,
    string WorkspaceCode,
    string WorkspaceNameAr,
    string WorkspaceNameEn,
    string? DataDate,
    string? UpdatedAt);

/// <param name="OriginalValue">The awarded value. NEVER overwritten.</param>
/// <param name="EffectiveValue">
/// Original + Σ **applied** amendment deltas (BR-09). This is the value in
/// force, and the one that rolls up into the project value.
/// </param>
/// <param name="EffectiveFinish">
/// Original finish + Σ applied delta days (BR-09). Shown beside the original
/// when they differ — never a strikethrough (04 §6).
/// </param>
/// <param name="DelayDays">
/// From Penalty.DelayDays (BR-10) — the same figure the penalty is charged on.
/// Null when no forecast is recorded, which is not the same as on time (P-09).
/// </param>
/// <param name="AppliedAmendments">Amendments in force.</param>
/// <param name="PendingAmendments">
/// Approved but NOT applied. Counted separately and never folded into the
/// effective figures — approving changes nothing (02 §9, non-negotiable #2).
/// </param>
public record OverviewContract(
    string Id,
    string NameAr,
    string NameEn,
    string Status,
    decimal OriginalValue,
    decimal EffectiveValue,
    string Start,
    string OriginalFinish,
    string EffectiveFinish,
    string? ForecastFinish,
    int? DelayDays,
    int AppliedAmendments,
    int PendingAmendments,
    string Contractor,
    string Consultant);

/// <param name="ParentNameAr">
/// The beneficiary's parent in the 01 §2.1 tree — a faculty's university. Null
/// at the root. Resolved here so the screen can say "كلية الهندسة — جامعة بغداد"
/// without the university being stored on the faculty.
/// </param>
/// <param name="Active">
/// 01 §2.1 — an inactive beneficiary may not receive new quantity. Shown,
/// because a project assigned to one is a finding, not a detail.
/// </param>
public record OverviewBeneficiary(
    string Code,
    string NameAr,
    string NameEn,
    string Type,
    string? ParentNameAr,
    string? ParentNameEn,
    bool Active);

/// <param name="EffectiveValue">
/// The project value: Σ contract EFFECTIVE values, via Domain/ProjectValue
/// (BR-00). Never stored — there is no Value column and adding one would be a
/// defect (01 §3).
/// </param>
/// <param name="ProjectionValue">
/// What the value WOULD be if every approved-but-unapplied amendment were
/// applied (Amendments.Projection). Carried as its own figure so the screen can
/// show it beside the effective value and never inside it.
/// </param>
/// <param name="DelayDrivenBy">
/// The contract DelayDays came from, so the figure is one hop from its source.
/// </param>
/// <param name="Physical">
/// REAL since Phase 4.4 — BR-04's weight-rolled BOQ progress. Null until a
/// contract has a bill of quantities to roll up, because 0% and "nothing has
/// been imported" are different claims (P-09).
/// </param>
/// <param name="Financial">Disbursed ÷ effective value. PAID only (P-26).</param>
/// <param name="Spi">BR-11, against the planned figure P-53 derives.</param>
/// <param name="Cpi">BR-11. Null before any money has actually been paid.</param>
public record OverviewTotals(
    decimal OriginalValue,
    decimal EffectiveValue,
    decimal ProjectionValue,
    int ContractCount,
    int AppliedAmendments,
    int PendingAmendments,
    int? DelayDays,
    string? DelayDrivenBy,
    decimal? Physical,
    decimal? Financial,
    decimal? Spi,
    decimal? Cpi);

/// <summary>
/// Open alerts for this project, by severity. Real rows from the Alerts table —
/// the one part of the reference's overview that this build can answer today.
/// </summary>
public record OverviewAlerts(int Open, int Critical, int Warning, int Info);

/// <summary>
/// A headline figure the system cannot yet derive. Same shape and same contract
/// as SCR-E1's and SCR-E5's: never render 0 for a missing input — render
/// "unavailable + reason", and keep the reason on the server beside the rule
/// that owns it.
/// </summary>
public record OverviewUnavailable(string Key, string NeedsAr, string NeedsEn);

/// <summary>
/// One module of الشكل 4's «خط سير المراحل». `Id` matches the rail's module id
/// in web/src/app/features/workspace/project-modules.ts — that is what lets the
/// strip and the sidebar agree, and what lets the next action link to a route.
///
/// `State` is one of Domain/ModuleReadiness's four. It is deliberately NOT
/// الشكل 4's approval vocabulary: nothing in this system can say «معتمد»
/// truthfully. See the header of ModuleReadiness.cs.
/// </summary>
public record OverviewModule(string Id, string State, int Rows, int Waiting);

/// <summary>
/// الشكل 4's «4/8» counter, honestly renamed: modules STARTED out of modules
/// AVAILABLE. The document counts approved ones; we cannot.
/// </summary>
public record OverviewProgress(int Started, int Available);

/// <summary>«الإجراء التالي المطلوب», or null when nothing is waiting.</summary>
public record OverviewNextAction(string ModuleId, string Reason, int Waiting);

public record OverviewResponse(
    OverviewProject Project,
    OverviewTotals Totals,
    IReadOnlyList<OverviewContract> Contracts,
    IReadOnlyList<OverviewBeneficiary> Beneficiaries,
    OverviewAlerts Alerts,
    IReadOnlyList<OverviewUnavailable> Unavailable,
    IReadOnlyList<OverviewModule> Modules,
    OverviewProgress Progress,
    OverviewNextAction? NextAction);
