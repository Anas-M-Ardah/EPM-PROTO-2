using Epm.Api.Data;
using Epm.Api.Features.Reports;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.ProjectReports;

/// <summary>
/// SCR-W14 — التقارير والتحليلات, the project tab · `04 §3`.
///
/// ── ONE CATALOGUE, TWO QUESTIONS ─────────────────────────────────────────
/// This screen and SCR-E7 read the SAME `ReportCatalog`. A report definition is
/// a capability of the system and there is exactly one list of them; a second
/// list for the project tab would be two answers to «ما التقارير التي ينتجها
/// النظام». What differs is the question each screen asks of a row:
///
///   SCR-E7  — can this report be produced AT ALL? (is the table registered)
///   SCR-W14 — can it be produced FOR THIS PROJECT? (does the project have rows)
///
/// The second is the sharper question, and it has a different answer: RPT-09
/// «الأوامر التغييرية» is available ministry-wide the moment the table exists,
/// but on a project with no change order there is nothing to print.
///
/// ── ONLY `project` SCOPE APPEARS HERE ────────────────────────────────────
/// A `portfolio` report is ministry-wide by definition. Listing it inside one
/// project's tab would invite it to be read as being about that project.
///
/// ── COUNTS, NOT CAPABILITIES ─────────────────────────────────────────────
/// Every source is counted with a real query against this project. Nothing is
/// assumed from a table's existence, which is exactly the assumption that made
/// SCR-E7's own answer too coarse for this screen.
///
/// ── NO ARITHMETIC ────────────────────────────────────────────────────────
/// Filters a static catalogue and counts rows. Report RENDERING — the PDF, the
/// XLSX — is in no phase of this build; the button says «تجريبي» in the
/// reference's own wording rather than doing nothing quietly.
/// </summary>
public static class ProjectReportsEndpoints
{
    /// <summary>
    /// Arabic and English names for the sources a project-scoped report can
    /// declare. A table with no entry still counts — it just prints its own
    /// name, which is a worse message but never a wrong one.
    /// </summary>
    private static readonly Dictionary<string, (string Ar, string En)> SourceNames = new()
    {
        ["Projects"] = ("المشروع", "the project"),
        ["Contracts"] = ("العقود", "contracts"),
        ["ContractAmendments"] = ("ملاحق العقود", "contract amendments"),
        ["Payments"] = ("الدفعات والمستخلصات", "payments and certificates"),
        ["BoqItems"] = ("جدول الكميات", "the BOQ"),
        ["Activities"] = ("الأنشطة", "activities"),
        ["ChangeOrders"] = ("الأوامر التغييرية", "change orders"),
        ["Alerts"] = ("التنبيهات", "alerts"),
        ["ProjectActivityEvents"] = ("سجل نشاط المشروع", "the project activity log"),
        ["ContractActivityEvents"] = ("سجل نشاط العقود", "the contract activity log"),
        ["ChangeOrderAuditEntries"] = ("سجل الأوامر التغييرية", "the change-order log"),
        ["SupplyItems"] = ("الفقرات التجهيزية — غير مُنمذَجة بعد", "supply items — not modelled yet"),
    };

    public static void MapProjectReportsEndpoints(this WebApplication app)
    {
        // [EP-PRP-01] GET /api/projects/{projectId}/reports
        // web: project-reports/project-reports.api.ts list() → project-reports.page.ts
        // spec: 04 §3 | rules: —
        // tables: Projects · Contracts · ContractAmendments · Payments · BoqItems
        //       · Activities · ChangeOrders · Alerts · the three activity logs
        app.MapGet("/api/projects/{projectId}/reports",
            async (EpmDb db, HttpContext ctx, string projectId) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            // The contract is the working context and everything below it is
            // reached THROUGH it (CLAUDE.md §5.1) — a BOQ item belongs to a
            // contract, and the contract belongs to the project.
            var contractIds = await db.Contracts.AsNoTracking()
                .Where(c => c.ProjectId == projectId)
                .Select(c => c.Id)
                .ToListAsync();

            // Through the contracts again — a change order belongs to one
            // contract and never spans two (CLAUDE.md §5.1).
            var orderIds = await db.ChangeOrders.AsNoTracking()
                .Where(o => contractIds.Contains(o.ContractId))
                .Select(o => o.Id)
                .ToListAsync();

            var counts = new Dictionary<string, int>(StringComparer.Ordinal)
            {
                ["Projects"] = 1,
                ["Contracts"] = contractIds.Count,
                ["ContractAmendments"] = await db.ContractAmendments.AsNoTracking()
                    .CountAsync(a => contractIds.Contains(a.ContractId)),
                ["Payments"] = await db.Payments.AsNoTracking()
                    .CountAsync(x => contractIds.Contains(x.ContractId)),
                ["BoqItems"] = await db.BoqItems.AsNoTracking()
                    .CountAsync(i => contractIds.Contains(i.ContractId)),
                ["Activities"] = await db.Activities.AsNoTracking()
                    .CountAsync(a => contractIds.Contains(a.ContractId)),
                ["ChangeOrders"] = orderIds.Count,
                ["Alerts"] = await db.Alerts.AsNoTracking()
                    .CountAsync(a => a.ProjectId == projectId),
                ["ProjectActivityEvents"] = await db.ProjectActivityEvents.AsNoTracking()
                    .CountAsync(e => e.ProjectId == projectId),
                ["ContractActivityEvents"] = await db.ContractActivityEvents.AsNoTracking()
                    .CountAsync(e => contractIds.Contains(e.ContractId)),
                ["ChangeOrderAuditEntries"] = await db.ChangeOrderAuditEntries.AsNoTracking()
                    .CountAsync(a => orderIds.Contains(a.ChangeOrderId)),
                // No table, so no count. It reads 0 and blocks its report,
                // which is the truthful answer (`07 §9`).
                ["SupplyItems"] = 0,
            };

            var rows = ReportCatalog.All
                .Where(d => d.Scope == "project")
                .Select(d =>
                {
                    var sources = d.Reads.Select(t =>
                    {
                        var named = SourceNames.TryGetValue(t, out var n) ? n : (t, t);
                        return new ReportSource(t, named.Item1, named.Item2,
                            counts.TryGetValue(t, out var c) ? c : 0);
                    }).ToList();

                    var empty = sources.Where(s => s.Rows == 0).ToList();

                    return new ProjectReportRow(
                        d.Id, d.Category, d.Frequency,
                        d.TitleAr, d.TitleEn, d.DescriptionAr, d.DescriptionEn,
                        d.Formats, sources,
                        empty.Count == 0,
                        empty.Count == 0 ? null : string.Join(" · ", empty.Select(s => s.NameAr)),
                        empty.Count == 0 ? null : string.Join(" · ", empty.Select(s => s.NameEn)));
                })
                .ToList();

            // The chips: الكل first, then the categories in the catalogue's own
            // order — a category with no project report on it is not offered,
            // because there is nothing behind the chip to show.
            var chips = new List<ReportChip> { new("all", rows.Count) };
            chips.AddRange(ReportCatalog.Categories
                .Select(c => new ReportChip(c.Code, rows.Count(r => r.Category == c.Code)))
                .Where(c => c.Count > 0));

            return Results.Ok(new ProjectReportsResponse(
                p.Id, p.NameAr, p.NameEn, p.DataDate?.ToString("yyyy-MM-dd"),
                rows.Count,
                rows.Count(r => r.Available),
                ReportCatalog.Categories
                    .Select(c => new ReportCategory(c.Code, c.NameAr, c.NameEn)).ToList(),
                chips, rows));
        });
    }
}
