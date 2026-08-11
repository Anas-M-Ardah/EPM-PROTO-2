namespace Epm.Api.Features.Reports;

/// <summary>
/// Member names are IDENTICAL to web/src/app/features/reports/reports.types.ts,
/// so one grep crosses both stacks (CLAUDE.md §2).
///
/// Column set ported from DReports — the v1.1 branch,
/// ../epm@design/system-revamp app/desktop-reports.jsx:58. The pre-v1.1
/// component of the same name is a chart board and was NOT the port target;
/// see P-37.
/// </summary>
/// <param name="Category">
/// fin · sched · prog · cont · comp. A code, labelled from the response's
/// `Categories` — never a label sent down twice.
/// </param>
/// <param name="Scope">
/// project · portfolio. A `project` report needs a project chosen before it
/// means anything, which is why picking one in the toolbar narrows the catalog
/// to exactly these.
/// </param>
/// <param name="Frequency">
/// weekly · monthly · on-demand. Never null: "on demand" is an answer, and a
/// null would make it indistinguishable from an unknown.
/// </param>
/// <param name="Formats">PDF / XLSX — what the report can be produced as.</param>
/// <param name="LastRunAt">
/// ALWAYS NULL. No report has ever been run, because nothing in this system
/// runs one yet and there is no ReportRuns table to record it in. The reference
/// carries a hard-coded date per row; that is fine in a clickable prototype and
/// would be a fabricated audit fact here. Renders as an em dash (P-09).
/// </param>
/// <param name="Available">
/// Whether every table this report reads is registered in EpmDb — i.e. whether
/// the system could produce it at all today. False for nine of the twelve.
/// </param>
/// <param name="NeedsAr">
/// Why not, naming the missing source and the phase that builds it. Null when
/// Available. Same "unavailable + reason" contract SCR-E1 and SCR-E5 use for
/// their KPI tiles, applied per row (P-38).
/// </param>
public record ReportRow(
    string Id,
    string Category,
    string Scope,
    string Frequency,
    string TitleAr,
    string TitleEn,
    string DescriptionAr,
    string DescriptionEn,
    IReadOnlyList<string> Formats,
    string? LastRunAt,
    bool Available,
    string? NeedsAr,
    string? NeedsEn);

/// <summary>
/// A category chip: its label and how many reports carry it.
///
/// Counted over the SCOPED catalog — after `projectId` narrowing, before the
/// search and the category filter. Choosing a project genuinely removes
/// portfolio-level reports from the catalog, so the chips must move with it;
/// choosing a chip or typing must not, or the numbers dance under the cursor.
/// </summary>
public record ReportCategory(string Code, string NameAr, string NameEn, int Count);

/// <summary>
/// A code and its two labels — the same shape `EP-LKP-01` sends, so the page
/// resolves every enum on the screen through one mechanism. These come from
/// `ReportCatalog` rather than the Lookups table because no table stores them
/// (see the catalog's remarks).
/// </summary>
public record ReportLabel(string Code, string NameAr, string NameEn);

/// <summary>
/// A project the toolbar can scope to. Only what the option needs: this is a
/// dropdown, not a register.
/// </summary>
public record ReportProject(string Id, string NameAr, string NameEn);

/// <param name="Total">Reports in the scoped catalog, before search and chips.</param>
/// <param name="Scheduled">
/// Those with a frequency other than `on-demand` — the reference's own
/// "5 scheduled automatically" figure.
/// </param>
/// <param name="Available">
/// How many the system can actually produce today. The reference has no such
/// figure because every row in a clickable prototype is runnable.
/// </param>
public record ReportCounts(int Total, int Scheduled, int Available);

public record ReportsResponse(
    IReadOnlyList<ReportRow> Rows,
    int Total,
    ReportCounts Counts,
    IReadOnlyList<ReportCategory> Categories,
    IReadOnlyList<ReportLabel> Scopes,
    IReadOnlyList<ReportLabel> Frequencies,
    IReadOnlyList<ReportProject> Projects);
