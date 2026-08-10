namespace Epm.Api.Features.Projects;

/// <summary>
/// Wire shapes for the Projects list (SCR-E2).
///
/// MEMBER NAMES MUST MATCH web/src/app/features/projects/projects.types.ts
/// exactly. That is what makes `grep -rn "physicalPct"` find the TS interface,
/// this record, and the endpoint projection in one search.
/// </summary>
public record ProjectRow(
    string Id,
    string NameAr,
    string NameEn,
    string Status,
    string Type,
    string ExecutionStage,
    string FundingType,
    string Region,
    string Branch,
    string Executor,
    /// <summary>DERIVED: Σ contract values. Never a column — see Domain/ProjectValue.cs.</summary>
    decimal Value,
    /// <summary>DERIVED: how many contracts this project has.</summary>
    int ContractCount
);

/// <summary>The list plus the counts the filter chips need, in one response.</summary>
public record ProjectsResponse(
    IReadOnlyList<ProjectRow> Rows,
    int Total,
    IReadOnlyDictionary<string, int> CountByStatus
);
