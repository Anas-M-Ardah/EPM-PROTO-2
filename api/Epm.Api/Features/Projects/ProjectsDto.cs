namespace Epm.Api.Features.Projects;

/// <summary>
/// Wire shapes for the Projects list (SCR-E2).
///
/// THE COLUMN SET IS THE REFERENCE PROTOTYPE'S, not an invention. Ported from
/// DProjectsAll in docs/spec/reference/app/enterprise-areas.jsx:112 —
///   Project (name + id beneath) · Workspace · Branch · Status · Physical % ·
///   Cost · Updated
/// Do not add or drop a column without a spec or client reason.
///
/// MEMBER NAMES MUST MATCH web/src/app/features/projects/projects.types.ts
/// exactly. That is what lets one grep cross the language boundary.
/// </summary>
public record ProjectRow(
    string Id,
    string NameAr,
    string NameEn,
    string WorkspaceCode,
    string WorkspaceNameAr,
    string WorkspaceNameEn,
    string Branch,
    string Status,
    /// <summary>
    /// الإنجاز — physical completion. NULL until the BOQ page exists: it is the
    /// weight-rolled BOQ progress (BR-04) and must never be stored or guessed
    /// (01 §3). The register renders "—" rather than a misleading 0% bar.
    /// </summary>
    decimal? PhysicalPct,
    /// <summary>الكلفة — DERIVED: Σ contract values. See Domain/ProjectValue.cs.</summary>
    decimal Cost,
    /// <summary>آخر تحديث — ISO date, or null.</summary>
    string? UpdatedAt
);

/// <summary>The list plus the counts the filter chips need, in one response.</summary>
public record ProjectsResponse(
    IReadOnlyList<ProjectRow> Rows,
    int Total,
    IReadOnlyDictionary<string, int> CountByStatus
);
