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
    /// <summary>
    /// الشكل 4 prints «31% **مقابل مخطط 39%**» — an actual figure is not a
    /// judgement without the planned one beside it, so they travel together.
    /// </summary>
    decimal? Planned,
    decimal? Financial,
    decimal? Spi,
    decimal? Cpi,
    /// <summary>
    /// الشكل 4's «الحد المقبول 0.95» — the line CPI and SPI are read against.
    /// A constant, and named as one: nothing in `02` derives it, so it is a
    /// threshold somebody set and the screen says so rather than implying the
    /// system worked it out.
    /// </summary>
    decimal AcceptableIndex);

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

/// <summary>
/// **ملحق الشكل 4**'s identity line: «الجهة المستفيدة جامعة بغداد؛ المقاول شركة
/// الفرات للمقاولات؛ المكتب الاستشاري الهندسي؛ نوع المشروع تنفيذ أمانة؛ التمويل
/// البرنامج الحكومي؛ المنطقة ديالى؛ المباشرة 2026-03-12؛ الإنجاز التعاقدي
/// 2027-08-21».
///
/// Three of those are the CONTRACT's and not the project's — المقاول, المباشرة
/// and الإنجاز التعاقدي — and a project with two contracts has two of each.
/// They come from the contract carrying the largest effective value, which is
/// the one the plate's own single-contract project means, and
/// <see cref="ContractCount"/> travels with them so the screen can say when
/// there is more than one instead of presenting one contract's dates as the
/// project's.
/// </summary>
public record OverviewIdentity(
    string? BeneficiaryAr,
    string? BeneficiaryEn,
    string? Contractor,
    string? Consultant,
    string Type,
    string FundingType,
    string Region,
    string? Start,
    string? ContractualFinish,
    int ContractCount);

/// <summary>
/// الشكل 4's cost line — «المقررة 1,374 م والمعدلة 1,500 م (▲126 م) والمتبقي
/// 990 م» — and the spend ratio «34% (510 م من 1,500 م)» that reads against it.
///
/// <see cref="Remaining"/> is المعدلة − المصروف, which is the plate's own
/// arithmetic (1,500 − 510 = 990). It is NOT an uncommitted balance: this
/// system records payments, not commitments.
/// </summary>
public record OverviewCost(
    decimal Approved,
    decimal Revised,
    decimal Delta,
    decimal Spent,
    decimal Remaining,
    decimal? SpendPct);

/// <summary>One point of الشكل 4's first chart. See `Domain/ProgressSeries`.</summary>
public record OverviewProgressPoint(string At, decimal? Planned, decimal Actual);

/// <summary>
/// One card of الشكل 4's «التنبيهات النشطة» panel. The plate's own actions are
/// «اتخاذ قرار الاعتماد أو مراجعة التنبيه أو تحديث الإنجاز **من بطاقات
/// التنبيهات**», so each card carries where it points.
/// </summary>
/// <param name="ModuleId">
/// The project module this alert is about, so the card can open it. Null when
/// the alert names nothing this screen can navigate to — the card then still
/// reads, it just does not offer a destination it cannot reach.
/// </param>
public record OverviewAlertCard(
    int Id,
    string Severity,
    string Kind,
    string TitleAr,
    string TitleEn,
    string RaisedAt,
    string? TargetRef,
    string? ModuleId);

/// <summary>
/// الشكل 4 names exactly two panels — «خط سير المراحل» and «التنبيهات النشطة».
/// The contracts register and the beneficiaries list that used to sit on this
/// screen are gone: contracts are الشكل 6's own screen and beneficiaries appear
/// on الشكل 5 and in the BOQ distribution, so neither is lost and neither is
/// drawn twice (P-130).
/// </summary>
public record OverviewResponse(
    OverviewProject Project,
    OverviewIdentity Identity,
    OverviewTotals Totals,
    OverviewCost Cost,
    IReadOnlyList<OverviewProgressPoint> ProgressSeries,
    OverviewAlerts Alerts,
    IReadOnlyList<OverviewAlertCard> AlertCards,
    IReadOnlyList<OverviewUnavailable> Unavailable,
    IReadOnlyList<OverviewModule> Modules,
    OverviewProgress Progress,
    OverviewNextAction? NextAction);
