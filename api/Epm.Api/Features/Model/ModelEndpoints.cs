using Epm.Api.Data;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Model;

/// <summary>
/// SCR-W10 — النموذج ثلاثي الأبعاد · **ملحق الشكل 44**.
///
/// ── THE TAB IS KEPT AND THE VIEWER IS STUBBED ────────────────────────────
/// `07 §8` puts real BIM/IFC rendering out of Phase 1 in those words. So this
/// endpoint serves everything on الشكل 44 that is DATA — the tree, the element
/// panel, the version selector, the colour key's counts — and nothing serves
/// the scene, because there is no geometry to serve.
///
/// ── NO ARITHMETIC, SO NO `Domain/` FILE ──────────────────────────────────
/// Every figure here was observed and recorded: an element's status, its
/// criticality, its own quantity, its percent complete. The counts are counts.
/// Adding a rule would be inventing one — the same call SCR-W11 made.
///
/// ── THE LINKS ARE REAL JOINS ─────────────────────────────────────────────
/// «BQ-007 — الأعمدة والجسور الخرسانية» and «A4 — الأعمدة والجسور الخرسانية»
/// are resolved from `BoqItems` and `Activities` **within the element's own
/// contract**, because a BOQ code is only unique inside one (CLAUDE.md §5.1).
/// An element pointing at a line that does not exist comes back with a null
/// description rather than a fabricated one, and the panel says «غير مرتبط».
/// </summary>
public static class ModelEndpoints
{
    public static void MapModelEndpoints(this WebApplication app)
    {
        // [EP-MDL-01] GET /api/projects/{projectId}/model
        // web: model/model.api.ts get() → model.page.ts
        // spec: ملحق الشكل 44 · 07 §8 | rules: —
        // tables: Projects · ModelElements · ModelVersions · BoqItems · Activities
        app.MapGet("/api/projects/{projectId}/model",
            async (EpmDb db, HttpContext ctx, string projectId) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            // The tree's filters and the order of the elements on each floor
            // both follow the `doc-discipline` lookup, so the model and the
            // drawings register name the disciplines in one sequence.
            //
            // The two plates disagree about that sequence — الشكل 44 lists
            // إنشائي · ميكانيكي · كهربائي and الشكل 46's folders run كهربائي ·
            // ميكانيكي — and only one of them can be the lookup's `Sort`. The
            // shared vocabulary wins (P-121): the alternative is two orders for
            // one list of disciplines, which drifts the first time one is
            // edited.
            var order = await db.Lookups.AsNoTracking()
                .Where(l => l.Kind == "doc-discipline")
                .OrderBy(l => l.Sort)
                .Select(l => l.Code)
                .ToListAsync();

            var elements = (await db.ModelElements.AsNoTracking()
                .Where(e => e.ProjectId == projectId)
                .ToListAsync())
                .OrderBy(e => e.BuildingAr)
                .ThenBy(e => e.Level)
                .ThenBy(e => order.IndexOf(e.Discipline) is var i && i >= 0 ? i : int.MaxValue)
                .ThenBy(e => e.Code)
                .ToList();

            var contracts = elements.Select(e => e.ContractId).Distinct().ToList();

            var boq = await db.BoqItems.AsNoTracking()
                .Where(i => contracts.Contains(i.ContractId))
                .Select(i => new { i.ContractId, i.Code, i.DescriptionAr, i.DescriptionEn })
                .ToListAsync();

            var activities = await db.Activities.AsNoTracking()
                .Where(a => contracts.Contains(a.ContractId))
                .Select(a => new { a.ContractId, a.ActivityId, a.NameAr, a.NameEn })
                .ToListAsync();

            var rows = elements.Select(e =>
            {
                var line = boq.FirstOrDefault(i => i.ContractId == e.ContractId && i.Code == e.BoqCode);
                var act = activities.FirstOrDefault(a => a.ContractId == e.ContractId && a.ActivityId == e.ActivityCode);

                return new ModelElementRow(
                    e.Code, e.NameAr, e.NameEn, e.Discipline, e.Status, e.IsCritical,
                    e.BuildingAr, e.BuildingEn, e.Level, e.Zone, e.Qty, e.Unit, e.ProgressPct, e.Revision,
                    e.ContractId,
                    e.BoqCode, line?.DescriptionAr, line?.DescriptionEn,
                    e.ActivityCode, act?.NameAr, act?.NameEn);
            }).ToList();

            // مبنى A → L00 · L01 · L02 → the elements standing on each. The tree
            // is built here for the same reason SCR-W5's WBS is: a client that
            // assembled it would be a second place the shape is decided.
            var tree = rows
                .GroupBy(r => new { r.BuildingAr, r.BuildingEn })
                .Select(b => new ModelBuilding(
                    b.Key.BuildingAr,
                    b.Key.BuildingEn,
                    b.Count(),
                    b.GroupBy(r => r.Level)
                        .OrderBy(l => l.Key)
                        .Select(l => new ModelLevel(l.Key, l.ToList()))
                        .ToList()))
                .ToList();

            var disciplines = new List<ModelChip> { new("all", rows.Count) };
            disciplines.AddRange(rows
                .GroupBy(r => r.Discipline)
                .OrderBy(g => order.IndexOf(g.Key) is var i && i >= 0 ? i : int.MaxValue)
                .Select(g => new ModelChip(g.Key, g.Count())));

            // الشكل 44's colour key. Three statuses, always present — a key that
            // loses an entry when nothing is late reads as a changed legend.
            var statuses = new[] { "completed", "inprogress", "delayed" }
                .Select(s => new ModelChip(s, rows.Count(r => r.Status == s)))
                .ToList();

            var versions = await db.ModelVersions.AsNoTracking()
                .Where(v => v.ProjectId == projectId)
                .OrderByDescending(v => v.IssuedOn)
                .Select(v => new ModelVersionRow(
                    v.Code, v.LabelAr, v.LabelEn,
                    v.IssuedOn == null ? null : v.IssuedOn.Value.ToString("yyyy-MM-dd"),
                    v.By, v.IsCurrent))
                .ToListAsync();

            return Results.Ok(new ModelResponse(
                p.Id, p.NameAr, p.NameEn, p.DataDate?.ToString("yyyy-MM-dd"),
                rows.Count,
                rows.Count(r => r.IsCritical),
                versions, disciplines, statuses, tree, rows));
        });
    }
}
