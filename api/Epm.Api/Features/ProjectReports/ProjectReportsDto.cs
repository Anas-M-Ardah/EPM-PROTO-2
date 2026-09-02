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

/* ── [EP-PRP-02] THE REPORT BODY ──────────────────────────────────────────
   `DModReports` project-modules.jsx:2805 renders each report inline, and every
   one of its six bodies is the same three things in the same order: a row of
   figures, an optional labelled comparison, and a table. So the body is TYPED
   that way rather than as six special cases — a new report describes itself
   and the template needs no new branch (04 §3).

   Nothing here computes. Every figure is projected from `Domain/` or read from
   a table, the way the rest of this feature is (CLAUDE.md §3.1). */

/// <param name="Tone">
/// `null` neutral · `bad` · `good`. A magnitude is NEVER toned by threshold
/// (CLAUDE.md §6) — this carries only what the plate itself colours, which is
/// a delay that has actually happened.
/// </param>
public record ReportFigure(string LabelAr, string LabelEn, string Value, string? Tone);

/// <param name="Value">
/// The bar's magnitude, on whatever scale the report's own set shares. The
/// component scales to the largest; `Display` is what is printed.
/// </param>
public record ReportBar(string LabelAr, string LabelEn, decimal Value, string Display);

public record ReportColumn(string NameAr, string NameEn, bool Numeric);

/// <param name="Cells">Row-major, already formatted — the API owns the figure.</param>
public record ReportTable(
    IReadOnlyList<ReportColumn> Columns,
    IReadOnlyList<IReadOnlyList<string>> Cells);

/// <param name="Available">
/// False when a source this report reads has no row for this project. The view
/// then states what is missing instead of drawing an empty table — SCR-W14's
/// own answer, kept inside the reference's structure (P-123 · P-213).
/// </param>
/// <param name="Rendered">
/// False when the report is producible but has no INLINE body here. Two
/// different absences and the view must not conflate them: `Available: false`
/// means the project has nothing to report on, `Rendered: false` means this
/// build does not draw it yet. Both say so in words rather than showing an
/// empty pane (`04 §9`) — the same contract as SCR-E1's EVM tiles.
/// </param>
public record ProjectReportBody(
    string Id,
    string TitleAr,
    string TitleEn,
    string DescriptionAr,
    string DescriptionEn,
    IReadOnlyList<string> Formats,
    bool Available,
    string? MissingAr,
    string? MissingEn,
    bool Rendered,
    IReadOnlyList<ReportFigure> Figures,
    string? ChartTitleAr,
    string? ChartTitleEn,
    IReadOnlyList<ReportBar> Bars,
    ReportTable? Table);
