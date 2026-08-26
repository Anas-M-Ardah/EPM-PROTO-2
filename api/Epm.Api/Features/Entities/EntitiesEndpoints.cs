using Epm.Api.Data;
using Epm.Api.Domain;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Entities;

/// <summary>
/// SCR-E4 — the WORKSPACE REGISTER (`04 §2`, ملحق الشاشات الشكل 1).
///
/// PORTED from DSpaces (v1.1), desktop-views.jsx:375 — the **workspaces**
/// register: the universities and ministry units that own projects.
///
/// It is ALSO the beneficiary master list (P-174, closing P-24). «جهة مستفيدة»
/// is a ROLE a workspace plays on one project — it receives distributed BOQ
/// quantity (01 §2.1) — not a second register. What this screen shows and what
/// the BOQ drawer ticks are rows of one table, `Workspaces`.
///
/// The two screens differ in SCOPE, not in subject: this one is filtered to the
/// persona's assignments (BR-15), because it is «مساحات العمل المتاحة لك». The
/// beneficiary drawer is not, because a project may serve a university nobody
/// on it administers.
///
/// ── THIS IS THE ONE LIST OF "MY WORKSPACES" (BR-15) ───────────────────────
/// The register and the sidebar switcher are the same request. الشكل 1 gives
/// the switcher the caption «مساحات العمل المتاحة لك» and the register the
/// benefit «لا يرى المستخدم إلا المساحات المسندة إليه» — one concept, so one
/// endpoint. Filtering here rather than per-component is what makes it
/// impossible for the two to disagree.
/// </summary>
public static class EntitiesEndpoints
{
    public static void MapEntitiesEndpoints(this WebApplication app)
    {
        // [EP-ENT-01] GET /api/entities?q=&kind=
        // web: entities.api.ts list() → entities.page.ts + core/workspaces.ts
        // spec: 04 §2 · ملحق الشكل 1 | rules: BR-00, BR-15
        // tables: Workspaces · Projects · Contracts · ContractAmendments
        app.MapGet("/api/entities", async (EpmDb db, HttpContext ctx, string? q, string? kind) =>
        {
            var everything = await db.Workspaces.AsNoTracking().OrderBy(w => w.Code).ToListAsync();

            // BR-15 — the union of this persona's assignments, before any UI
            // filter. A workspace the user is not assigned to does not exist as
            // far as the rest of this endpoint is concerned.
            var mineCodes = WorkspaceScope.Visible(ctx, everything.Select(w => w.Code)).ToHashSet();
            var workspaces = everything.Where(w => mineCodes.Contains(w.Code)).ToList();

            var projects = await db.Projects.AsNoTracking()
                .Select(p => new { p.Id, p.WorkspaceCode, p.Status })
                .ToListAsync();

            var contracts = await db.Contracts.AsNoTracking()
                .Select(c => new { c.Id, c.ProjectId, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays })
                .ToListAsync();

            var amendments = await db.ContractAmendments.AsNoTracking().ToListAsync();

            var filtered = workspaces.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(kind))
                filtered = filtered.Where(w => w.Kind == kind);

            if (!string.IsNullOrWhiteSpace(q))
                filtered = filtered.Where(w =>
                    w.Code.Contains(q, StringComparison.OrdinalIgnoreCase) ||
                    w.NameAr.Contains(q) ||
                    w.NameEn.Contains(q, StringComparison.OrdinalIgnoreCase));

            var rows = filtered.Select(w =>
            {
                var mine = projects.Where(p => p.WorkspaceCode == w.Code).ToList();
                var myProjectIds = mine.Select(p => p.Id).ToHashSet();

                // 06 §1 — a project is still running while it is ongoing or
                // delayed. Completed, suspended and cancelled are not.
                var active = mine.Count(p => p.Status is "ongoing" or "delayed");

                // DERIVED (BR-00 → BR-09): Σ of the EFFECTIVE values of every
                // contract under this entity's projects. Never the originals.
                var value = ProjectValue.Total(
                    contracts.Where(c => myProjectIds.Contains(c.ProjectId)).Select(c =>
                    {
                        var deltas = amendments
                            .Where(a => a.ContractId == c.Id)
                            .OrderBy(a => a.No)
                            .Select(a => new Amendments.Delta(a.No, a.DeltaValue, a.DeltaDays, a.AppliedAt != null))
                            .ToList();

                        var original = new Amendments.Version(0, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays);
                        return Amendments.Effective(original, deltas).Value;
                    }));

                return new EntityRow(
                    w.Code, w.DisplayCode, w.Color, w.NameAr, w.NameEn, w.Kind, w.Active,
                    mine.Count, active, value,
                    // Needs weight-rolled BOQ progress (BR-04) — P-09.
                    null);
            }).ToList();

            // Chip counts come from the unfiltered-by-kind set so the numbers
            // hold still while a kind is selected.
            var countByKind = workspaces
                .GroupBy(w => w.Kind)
                .ToDictionary(g => g.Key, g => g.Count());

            return Results.Ok(new EntitiesResponse(rows, rows.Count, countByKind, everything.Count));
        });
    }
}
