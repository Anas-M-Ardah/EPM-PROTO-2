using Epm.Api.Data;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Reports;

/// <summary>
/// SCR-E7 — Reports &amp; Analytics, the gate every defined report is run from
/// (`04 §2`). PORTED from DReports (v1.1), ../epm@design/system-revamp
/// app/desktop-reports.jsx:58.
///
/// ── THIS IS A REGISTER, NOT A CHART BOARD ────────────────────────────────
/// `docs/spec/reference/`'s DReports is a dashboard of four charts — trend,
/// by-status, by-workspace, by-branch — and `04 §2`'s one-line description
/// still names those four. v1.1 replaced it wholesale with a **catalog of the
/// twelve reports a user can actually run**. The same thing happened to the
/// Alerts Center at Phase 2.4 (card feed → register), and the roadmap's own
/// warning applies: the pre-v1.1 copy is stale, the v1.1 component is the
/// screen. The charts are not lost — SCR-E1 is the chart board, and its tiles
/// already carry trend, status split and workspace ranking. See P-37.
///
/// ── NINE OF THE TWELVE CANNOT BE PRODUCED YET, AND THE SCREEN SAYS SO ────
/// A report is a promise about data. `RPT-03 Payment certificates` needs a
/// Payments table; there is not one, and there will not be until Phase 4.1. In
/// the reference every row is runnable because every row toasts. Here, a Run
/// button on all twelve would assert twelve capabilities the system does not
/// have — on the one screen whose entire subject is what the system can tell
/// you about itself.
///
/// So each catalog row declares the tables it reads, and this endpoint compares
/// that against **the tables actually registered in EpmDb**, read from the EF
/// model rather than from a list maintained here. Three rows come back
/// available; the other nine name the source they are waiting for and the phase
/// that builds it. Each new DbSet a later phase registers flips its rows to
/// available with no edit to this file. Same "unavailable + reason" contract as
/// SCR-E1's EVM tiles and SCR-E5's critical-path tile (P-09, P-38).
///
/// ── NO ARITHMETIC ────────────────────────────────────────────────────────
/// Nothing here computes a business figure. It filters a static catalog, counts
/// it, and lists projects for the scope dropdown. Report RENDERING — the PDF,
/// the XLSX — is not in any phase of this build; the Run button says "— demo"
/// in the reference's own wording rather than doing nothing quietly.
/// </summary>
public static class ReportsEndpoints
{
    /// <summary>
    /// What each missing source is, and when it arrives. Keyed by the table
    /// name a catalog row declares in `Reads`.
    ///
    /// Phases are ROADMAP.md's. A key that is missing from this map still
    /// blocks its report — it just cannot say anything more specific than the
    /// table name, which is a worse message but never a wrong one.
    /// </summary>
    private static readonly Dictionary<string, (string Ar, string En)> SourceNeeds = new()
    {
        ["Payments"] = (
            "سجل المستخلصات والدفعات (المرحلة 4.1)",
            "the payments register (Phase 4.1)"),
        ["BoqItems"] = (
            "جدول الكميات (المرحلة 4.2)",
            "the BOQ (Phase 4.2)"),
        ["Activities"] = (
            "جدول الأنشطة وعلاقات التتابع (المرحلة 4.3)",
            "the activity schedule and its dependencies (Phase 4.3)"),
        ["ChangeOrders"] = (
            "سجل الأوامر التغييرية (المرحلة 5.1)",
            "the change-order register (Phase 5.1)"),
        ["AuditEvents"] = (
            "سجل التدقيق (المرحلة 6)",
            "the audit trail (Phase 6)"),
        // The only source with no documented starting point in Data/Entities/
        // at all. Saying "not modelled yet" is the honest answer; naming a
        // phase it does not appear in would not be.
        ["SupplyItems"] = (
            "سجل التجهيز والاستلامات — غير مُنمذَج بعد",
            "the supply and receipts register — not modelled yet"),
    };

    public static void MapReportsEndpoints(this WebApplication app)
    {
        // [EP-RPT-01] GET /api/reports?q=&category=&projectId=&workspace=
        // web: reports.api.ts list() → reports.page.ts
        // spec: 04 §2 · ملحق الشكل 49 | rules: BR-15 | tables: Projects · Workspaces (+ the EpmDb model itself)
        app.MapGet("/api/reports", async (
            EpmDb db,
            HttpContext ctx,
            string? q,
            string? category,
            string? projectId,
            string? workspace) =>
        {
            // BR-15 — refused before anything is read (see WorkspaceScope).
            if (WorkspaceScope.Deny(ctx, workspace) is { } denied) return denied;

            // The tables the system HAS, straight from the EF model. Reading
            // the model rather than keeping a second list here means a later
            // phase registering a DbSet is the whole change — nothing in this
            // feature has to remember to be updated (CLAUDE.md §4).
            var registered = db.Model.GetEntityTypes()
                .Select(t => t.GetTableName())
                .Where(n => n is not null)
                .Select(n => n!)
                .ToHashSet(StringComparer.Ordinal);

            // The scope dropdown. `?ws=` narrows which projects are offered —
            // it does NOT narrow the catalog, because a report DEFINITION is
            // ministry-wide however the viewer is scoped. الشكل 49 shows the same
            // twelve reports at university level, which is this behaviour.
            //
            // What the dropdown IS bounded by is BR-15: with no explicit
            // workspace it offers the user's own workspaces, never every project
            // in the ministry.
            var workspaces = await db.Workspaces.AsNoTracking().Select(w => w.Code).ToListAsync();
            var scope = WorkspaceScope.Effective(ctx, workspaces, workspace).ToList();

            var projectQuery = db.Projects.AsNoTracking()
                .Where(p => scope.Contains(p.WorkspaceCode));

            var projects = await projectQuery
                .OrderBy(p => p.Id)
                .Select(p => new ReportProject(p.Id, p.NameAr, p.NameEn))
                .ToListAsync();

            // A projectId that is not in scope selects nothing rather than
            // silently scoping to a project the viewer cannot see.
            var scopedToProject = !string.IsNullOrWhiteSpace(projectId)
                                  && projects.Any(p => p.Id == projectId);

            var rows = ReportCatalog.All.Select(d =>
            {
                var missing = d.Reads.Where(r => !registered.Contains(r)).ToList();

                string? needsAr = null, needsEn = null;
                if (missing.Count > 0)
                {
                    var ar = missing.Select(m => SourceNeeds.TryGetValue(m, out var n) ? n.Ar : m);
                    var en = missing.Select(m => SourceNeeds.TryGetValue(m, out var n) ? n.En : m);
                    needsAr = "يتطلب " + string.Join(" و", ar);
                    needsEn = "Needs " + string.Join(" and ", en);
                }

                return new ReportRow(
                    d.Id, d.Category, d.Scope, d.Frequency,
                    d.TitleAr, d.TitleEn,
                    d.DescriptionAr, d.DescriptionEn,
                    d.Formats,
                    // Nothing has ever been run — there is nowhere to record it.
                    null,
                    missing.Count == 0,
                    needsAr, needsEn);
            }).ToList();

            // ── SCOPE, then COUNT, then FILTER ────────────────────────────
            // Choosing a project narrows the catalog to the reports that run at
            // project level: a portfolio report scoped to one project is not a
            // narrower report, it is a different question.
            var scoped = scopedToProject
                ? rows.Where(r => r.Scope == "project").ToList()
                : rows;

            var counts = new ReportCounts(
                scoped.Count,
                scoped.Count(r => r.Frequency != "on-demand"),
                scoped.Count(r => r.Available));

            var categories = ReportCatalog.Categories
                .Select(c => new ReportCategory(
                    c.Code, c.NameAr, c.NameEn,
                    scoped.Count(r => r.Category == c.Code)))
                .ToList();

            var filtered = scoped.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(category))
                filtered = filtered.Where(r => r.Category == category);

            if (!string.IsNullOrWhiteSpace(q))
            {
                var needle = q.Trim();
                filtered = filtered.Where(r =>
                    r.Id.Contains(needle, StringComparison.OrdinalIgnoreCase)
                    || r.TitleAr.Contains(needle, StringComparison.OrdinalIgnoreCase)
                    || r.TitleEn.Contains(needle, StringComparison.OrdinalIgnoreCase)
                    || r.DescriptionAr.Contains(needle, StringComparison.OrdinalIgnoreCase)
                    || r.DescriptionEn.Contains(needle, StringComparison.OrdinalIgnoreCase));
            }

            // Catalog order, which is ID order — the reference's own. NOT
            // available-first: the catalog is a reference document, and a list
            // that reorders itself as later phases land would stop being one.
            var ordered = filtered.ToList();

            var scopes = ReportCatalog.Scopes
                .Select(s => new ReportLabel(s.Code, s.NameAr, s.NameEn)).ToList();

            var frequencies = ReportCatalog.Frequencies
                .Select(f => new ReportLabel(f.Code, f.NameAr, f.NameEn)).ToList();

            return Results.Ok(new ReportsResponse(
                ordered, ordered.Count, counts, categories, scopes, frequencies, projects));
        });
    }
}
