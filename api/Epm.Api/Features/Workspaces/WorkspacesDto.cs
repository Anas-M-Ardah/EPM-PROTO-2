namespace Epm.Api.Features.Workspaces;

/// <summary>
/// Member names are IDENTICAL to
/// web/src/app/features/workspaces/workspaces.types.ts.
///
/// The workspace overview — «مساحة العمل › نظرة عامة» (ملحق الشاشات، الشكل 2).
/// The entity's own position, read before descending into one project.
/// </summary>
/// <summary>One period of SCR-E8's two S-curves — the same shape SCR-E1 draws.</summary>
public record WorkspaceCurvePeriod(
    string At, decimal PlanCum, decimal? ActCum, decimal PlanPeriod, decimal ActPeriod);

/// <summary>
/// One project on «قائمة المتابعة — مشاريع خارج المسار». الشكل 2 gives this
/// table eight columns and the code and the branch are two of them: inside one
/// university, "which project" is answered by its branch far more often than by
/// its workspace, which is the same for every row.
/// </summary>
public record WorkspaceWatchRow(
    string Id, string NameAr, string NameEn,
    string Branch, string Status,
    /// <summary>red · amber · green — `Domain/ExecutiveSignal`.</summary>
    string Signal,
    decimal? Physical,
    /// <summary>Physical minus planned, in points. Null when either is missing.</summary>
    decimal? Variance,
    decimal Value,
    string? ForecastFinish);

public record WorkspaceSignalBand(string Signal, int Count, int Share);

/// <summary>SCR-E8's «مقارنة الكلف» — المقررة · المعدّلة · المصروف.</summary>
public record WorkspaceCost(decimal Approved, decimal Revised, decimal Spent);

/// <summary>«معالم قادمة» — the nearest planned finishes still ahead of the data date.</summary>
public record WorkspaceMilestone(
    string Id, string NameAr, string NameEn, string Branch, string Status,
    decimal? Physical, string PlannedFinish);

/// <summary>
/// A figure this workspace cannot derive, with the reason. Rendered in place of
/// the figure — never as a 0 (P-09).
/// </summary>
public record WorkspaceUnavailable(string Key, string NeedsAr, string NeedsEn);

/// <param name="CompletionPct">
/// Weight-rolled BOQ progress across this workspace's contracts (BR-04), or
/// null when none of them carries a bill. A 0% bar would assert nothing has
/// been built (P-09).
/// </param>
public record WorkspaceOverviewResponse(
    string Code,
    /// <summary>The emblem text — "UOB", not "ub". See Workspace.DisplayCode.</summary>
    string DisplayCode,
    /// <summary>The emblem background. An identity colour, never a status one.</summary>
    string Color,
    string NameAr,
    string NameEn,
    string Kind,
    bool Active,
    int ProjectCount,
    int ActiveCount,
    int DelayedCount,
    int ContractCount,
    decimal EffectiveValue,
    /// <summary>02 §9 — approved but NOT applied. A projection, never folded in.</summary>
    decimal PendingValue,
    int PendingAmendmentCount,
    int OpenAlertCount,
    int CriticalAlertCount,
    decimal? CompletionPct,

    // ---- the executive band, from Domain/PortfolioBand (P-141) ----
    /// <summary>D-06 — the data date every figure below is stated as of.</summary>
    string AsOf,
    /// <summary>The branches present in this workspace, for the toolbar's select.</summary>
    IReadOnlyList<string> Branches,
    /// <summary>Count per status BEFORE the filters, so a chip never hides itself.</summary>
    IReadOnlyList<WorkspaceStatusSlice> StatusCounts,

    /// <summary>What the baselines say should be complete by the data date (P-53).</summary>
    decimal? Planned,
    /// <summary>Paid ÷ effective. PAID, never merely certified (P-26).</summary>
    decimal? Financial,
    decimal? Spi,
    decimal? Cpi,
    /// <summary>الحد المقبول — the line the two indices are read against.</summary>
    decimal AcceptableIndex,
    decimal EarnedValue,
    decimal ActualCost,

    IReadOnlyList<WorkspaceCurvePeriod> ProgressCurve,
    IReadOnlyList<WorkspaceCurvePeriod> CostCurve,
    IReadOnlyList<WorkspaceSignalBand> Signals,
    IReadOnlyList<WorkspaceWatchRow> Watchlist,
    WorkspaceCost Cost,
    IReadOnlyList<WorkspaceMilestone> Milestones,

    IReadOnlyList<WorkspaceStatusSlice> StatusDistribution,
    IReadOnlyList<WorkspaceProjectRow> Recent,
    IReadOnlyList<WorkspaceUnavailable> Unavailable);

public record WorkspaceStatusSlice(string Status, int Count);

/// <summary>
/// EP-WSP-02 — «إضافة مساحة عمل» (ملحق الشكل 1 lists it among the screen's
/// available actions). Everything a workspace IS, which is not much: an
/// identity and a kind. Its projects, contracts and figures are all derived
/// from records that point at it, so there is nothing else to ask for.
/// </summary>
public record CreateWorkspaceRequest(
    string Code,
    string DisplayCode,
    string NameAr,
    string NameEn,
    string Kind,
    string Color);

/// <param name="Reason">
/// Why this row is on the watchlist — a status code, resolved to a label by the
/// screen. Null on the "recently updated" list.
/// </param>
public record WorkspaceProjectRow(
    string Id,
    string NameAr,
    string NameEn,
    string Branch,
    string Status,
    decimal Value,
    string? UpdatedAt,
    string? Reason);
