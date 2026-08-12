namespace Epm.Api.Features.Workspaces;

/// <summary>
/// Member names are IDENTICAL to
/// web/src/app/features/workspaces/workspaces.types.ts.
///
/// The workspace overview — «مساحة العمل › نظرة عامة» (ملحق الشاشات، الشكل 2).
/// The entity's own position, read before descending into one project.
/// </summary>
/// <param name="CompletionPct">
/// null until weight-rolled BOQ progress exists for these projects (BR-04).
/// A 0% bar would assert nothing has been built (P-09).
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
    IReadOnlyList<WorkspaceStatusSlice> StatusDistribution,
    IReadOnlyList<WorkspaceProjectRow> Watchlist,
    IReadOnlyList<WorkspaceProjectRow> Recent);

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
