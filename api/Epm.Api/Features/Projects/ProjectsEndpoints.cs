using Epm.Api.Data;
using Epm.Api.Domain;
using Amendments = Epm.Api.Domain.Amendments;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Projects;

/// <summary>
/// SCR-E2 — Projects, the cross-portfolio list (04 §2).
/// Every query behind that screen is in this one file.
/// </summary>
public static class ProjectsEndpoints
{
    public static void MapProjectsEndpoints(this WebApplication app)
    {
        // [EP-PRJ-01] GET /api/projects?q=&status=&workspace=
        // web: projects.api.ts list() → projects.page.ts | spec: 04 §2 | rules: BR-00 (01 §3 derived value)
        // tables: Projects, Contracts
        app.MapGet("/api/projects", async (
            EpmDb db,
            string? q,
            string? status,
            string? workspace) =>
        {
            // Two flat queries and an in-memory join. No Include(), no navigation
            // properties — the relationship is the ProjectId comparison below.
            var projectQuery = db.Projects.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(workspace))
                projectQuery = projectQuery.Where(p => p.WorkspaceCode == workspace);

            if (!string.IsNullOrWhiteSpace(status))
                projectQuery = projectQuery.Where(p => p.Status == status);

            if (!string.IsNullOrWhiteSpace(q))
                projectQuery = projectQuery.Where(p =>
                    p.Id.Contains(q) || p.NameAr.Contains(q) || p.NameEn.Contains(q));

            var projects = await projectQuery.OrderBy(p => p.Id).ToListAsync();

            var ids = projects.Select(p => p.Id).ToList();
            var contracts = await db.Contracts.AsNoTracking()
                .Where(c => ids.Contains(c.ProjectId))
                .Select(c => new { c.Id, c.ProjectId, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays })
                .ToListAsync();

            // PAGE-02 closed the BR-00 gap: project value is Σ contract
            // EFFECTIVE values (01 §3), not Σ original ones. Amendments are
            // registered now, so the real figure is derivable.
            var contractIds = contracts.Select(c => c.Id).ToList();
            var amendments = await db.ContractAmendments.AsNoTracking()
                .Where(a => contractIds.Contains(a.ContractId))
                .ToListAsync();

            var workspaces = await db.Workspaces.AsNoTracking().ToListAsync();

            var rows = projects.Select(p =>
            {
                var mine = contracts.Where(c => c.ProjectId == p.Id).ToList();
                var ws = workspaces.FirstOrDefault(w => w.Code == p.WorkspaceCode);

                // DERIVED — 01 §3. Computed here via the Domain layer, never stored.
                // Each contract's EFFECTIVE value (BR-09) = original + Σ APPLIED
                // amendment deltas. Approved-but-unapplied orders stay out: they
                // are a projection and folding them in would overstate what the
                // ministry is committed to (02 §9, non-negotiable #2).
                var cost = ProjectValue.Total(mine.Select(c =>
                {
                    var deltas = amendments
                        .Where(a => a.ContractId == c.Id)
                        .OrderBy(a => a.No)
                        .Select(a => new Amendments.Delta(a.No, a.DeltaValue, a.DeltaDays, a.AppliedAt != null))
                        .ToList();

                    var original = new Amendments.Version(0, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays);
                    return Amendments.Effective(original, deltas).Value;
                }));

                return new ProjectRow(
                    p.Id, p.NameAr, p.NameEn,
                    p.WorkspaceCode, ws?.NameAr ?? p.WorkspaceCode, ws?.NameEn ?? p.WorkspaceCode,
                    p.Branch, p.Status,
                    // PhysicalPct stays null until the BOQ page can derive it (BR-04).
                    // Storing or guessing it would violate 01 §3.
                    null,
                    cost,
                    p.UpdatedAt?.ToString("yyyy-MM-dd"));
            }).ToList();

            // Status counts come from the unfiltered-by-status set so the chips
            // keep their numbers when a status filter is active.
            var countBase = db.Projects.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(workspace))
                countBase = countBase.Where(p => p.WorkspaceCode == workspace);

            var countByStatus = await countBase
                .GroupBy(p => p.Status)
                .Select(g => new { Status = g.Key, N = g.Count() })
                .ToDictionaryAsync(x => x.Status, x => x.N);

            return Results.Ok(new ProjectsResponse(rows, rows.Count, countByStatus));
        });
    }
}
