namespace Epm.Api.Features.ProjectReports;

/// <summary>
/// Member names are IDENTICAL to
/// web/src/app/features/project-reports/project-reports.types.ts (CLAUDE.md §2).
///
/// SCR-W14 — التقارير والتحليلات (project tab) · `04 §3`.
/// </summary>

/// <param name="Rows">
/// How many rows this project actually has in that source. `0` is why a report
/// is unavailable HERE while the same report is available on SCR-E7 — the
/// table exists ministry-wide and this project has nothing in it.
/// </param>
public record ReportSource(string Table, string NameAr, string NameEn, int Rows);

/// <param name="Available">
/// Producible **for this project**: every source it reads has at least one row
/// here. A different question from SCR-E7's, which asks whether the table
/// exists at all.
/// </param>
/// <param name="MissingAr">
/// What is empty, named. Null when the report is available.
/// </param>
public record ProjectReportRow(
    string Id,
    string Category,
    string Frequency,
    string TitleAr,
    string TitleEn,
    string DescriptionAr,
    string DescriptionEn,
    IReadOnlyList<string> Formats,
    IReadOnlyList<ReportSource> Sources,
    bool Available,
    string? MissingAr,
    string? MissingEn);

/// <param name="Code">`all`, or a category code.</param>
public record ReportChip(string Code, int Count);

/// <param name="NameAr">Category labels, sent as the catalogue owns them.</param>
public record ReportCategory(string Code, string NameAr, string NameEn);

public record ProjectReportsResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string? DataDate,
    int Total,
    int AvailableCount,
    IReadOnlyList<ReportCategory> Categories,
    IReadOnlyList<ReportChip> Chips,
    IReadOnlyList<ProjectReportRow> Rows);
