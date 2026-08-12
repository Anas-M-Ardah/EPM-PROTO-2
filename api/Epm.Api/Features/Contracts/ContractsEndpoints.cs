using Epm.Api.Data;
using Epm.Api.Domain;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Contracts;

/// <summary>
/// SCR-E3 — Contracts, the cross-portfolio list (04 §2).
/// Every query behind that screen is in this one file.
///
/// This is the first screen that shows an EFFECTIVE value, so it is the first
/// place BR-09 does real work: original + Σ APPLIED amendment deltas, with
/// approved-but-unapplied kept separate as a projection (02 §9).
/// </summary>
public static class ContractsEndpoints
{
    public static void MapContractsEndpoints(this WebApplication app)
    {
        // [EP-CNT-01] GET /api/contracts?q=&status=&workspace=&projectId=
        // web: contracts.api.ts list() → contracts.page.ts | spec: 04 §2 | rules: BR-09, BR-15
        // tables: Contracts · ContractAmendments · Projects · Workspaces
        app.MapGet("/api/contracts", async (
            EpmDb db,
            HttpContext ctx,
            string? q,
            string? status,
            string? workspace,
            string? projectId) =>
        {
            // BR-15 — refused before anything is read (see WorkspaceScope).
            if (WorkspaceScope.Deny(ctx, workspace) is { } denied) return denied;

            // Flat reads matched in memory — no Include(), no navigation
            // properties. The relationship IS the ProjectId comparison below.
            var contractQuery = db.Contracts.AsNoTracking();

            if (!string.IsNullOrWhiteSpace(status))
                contractQuery = contractQuery.Where(c => c.Status == status);

            if (!string.IsNullOrWhiteSpace(projectId))
                contractQuery = contractQuery.Where(c => c.ProjectId == projectId);

            if (!string.IsNullOrWhiteSpace(q))
                contractQuery = contractQuery.Where(c =>
                    c.Id.Contains(q) || c.NameAr.Contains(q) || c.NameEn.Contains(q) || c.Contractor.Contains(q));

            var contracts = await contractQuery.OrderBy(c => c.Id).ToListAsync();

            var projects = await db.Projects.AsNoTracking()
                .Select(p => new { p.Id, p.NameAr, p.NameEn, p.WorkspaceCode })
                .ToListAsync();

            // Workspace scoping reaches contracts THROUGH their project — a
            // contract has no workspace of its own (01 §1). With no explicit
            // `?workspace=` the scope is still the user's own assignments, so
            // the "cross-portfolio" list is cross-THEIR-portfolio (BR-15).
            var scope = WorkspaceScope.Effective(
                ctx, projects.Select(p => p.WorkspaceCode).Distinct(), workspace);

            var inScope = projects.Where(p => scope.Contains(p.WorkspaceCode)).Select(p => p.Id).ToHashSet();
            contracts = contracts.Where(c => inScope.Contains(c.ProjectId)).ToList();

            var ids = contracts.Select(c => c.Id).ToList();
            var amendments = await db.ContractAmendments.AsNoTracking()
                .Where(a => ids.Contains(a.ContractId))
                .ToListAsync();

            var rows = contracts.Select(c =>
            {
                var project = projects.FirstOrDefault(p => p.Id == c.ProjectId);

                // Every amendment on this contract, as the domain's shape.
                // AppliedAt != null is the ONLY test for "applied" (02 §9).
                var deltas = amendments
                    .Where(a => a.ContractId == c.Id)
                    .OrderBy(a => a.No)
                    .Select(a => new Amendments.Delta(a.No, a.DeltaValue, a.DeltaDays, a.AppliedAt != null))
                    .ToList();

                var original = new Amendments.Version(0, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays);

                // DERIVED — BR-09. Computed here, never stored.
                var effective = Amendments.Effective(original, deltas);
                var projected = Amendments.Projection(effective, deltas);

                return new ContractRow(
                    c.Id, c.ProjectId,
                    project?.NameAr ?? c.ProjectId, project?.NameEn ?? c.ProjectId,
                    c.NameAr, c.NameEn,
                    c.Contractor, c.Status,
                    c.Start.ToString("yyyy-MM-dd"),
                    c.OriginalFinish.ToString("yyyy-MM-dd"),
                    effective.Finish.ToString("yyyy-MM-dd"),
                    c.OriginalValue,
                    effective.Value,
                    projected.Value,
                    deltas.Count(d => d.Applied),
                    deltas.Count(d => !d.Applied),
                    // Financial % needs payments, which no page registers yet.
                    // null renders an em dash; a 0 would assert nothing has been
                    // paid, which is a different and unverified claim (P-09).
                    null);
            }).ToList();

            // Chip counts come from the set BEFORE the status filter, so the
            // numbers stay put while a status is selected.
            var countBase = db.Contracts.AsNoTracking().AsEnumerable()
                .Where(c => inScope.Contains(c.ProjectId));

            var countByStatus = countBase
                .GroupBy(c => c.Status)
                .ToDictionary(g => g.Key, g => g.Count());

            return Results.Ok(new ContractsResponse(rows, rows.Count, countByStatus));
        });
    }
}
