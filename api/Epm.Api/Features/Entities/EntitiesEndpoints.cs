using Epm.Api.Data;
using Epm.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Entities;

/// <summary>
/// SCR-E4 — Entities, the dense sortable master table (04 §2).
///
/// PORTED from DSpaces (v1.1), desktop-views.jsx:375 — which is the
/// **workspaces / entities** register: the universities and ministry units that
/// own projects. It is NOT the beneficiary master list; beneficiaries are the
/// targets of BOQ quantity distribution (01 §2.1) and arrive with the BOQ page
/// that needs them (Phase 4.2). See P-24.
/// </summary>
public static class EntitiesEndpoints
{
    public static void MapEntitiesEndpoints(this WebApplication app)
    {
        // [EP-ENT-01] GET /api/entities?q=&kind=
        // web: entities.api.ts list() → entities.page.ts | spec: 04 §2 | rules: BR-00
        // tables: Workspaces · Projects · Contracts · ContractAmendments
        app.MapGet("/api/entities", async (EpmDb db, string? q, string? kind) =>
        {
            var workspaces = await db.Workspaces.AsNoTracking().OrderBy(w => w.Code).ToListAsync();

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
                    w.Code, w.NameAr, w.NameEn, w.Kind, w.Active,
                    mine.Count, active, value,
                    // Needs weight-rolled BOQ progress (BR-04) — P-09.
                    null);
            }).ToList();

            // Chip counts come from the unfiltered-by-kind set so the numbers
            // hold still while a kind is selected.
            var countByKind = workspaces
                .GroupBy(w => w.Kind)
                .ToDictionary(g => g.Key, g => g.Count());

            return Results.Ok(new EntitiesResponse(rows, rows.Count, countByKind));
        });
    }
}
