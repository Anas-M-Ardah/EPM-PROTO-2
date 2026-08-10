using Epm.Api.Data;
using Epm.Api.Domain;
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
                .Select(c => new { c.ProjectId, c.OriginalValue })
                .ToListAsync();

            var workspaces = await db.Workspaces.AsNoTracking().ToListAsync();

            var rows = projects.Select(p =>
            {
                var mine = contracts.Where(c => c.ProjectId == p.Id).ToList();
                var ws = workspaces.FirstOrDefault(w => w.Code == p.WorkspaceCode);

                // DERIVED — 01 §3. Computed here via the Domain layer, never stored.
                // Once the Contract page registers amendments this passes effective
                // values instead of original ones; the call site does not change.
                var cost = ProjectValue.Total(mine.Select(c => c.OriginalValue));

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
