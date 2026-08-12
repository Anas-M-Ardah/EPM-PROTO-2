using Epm.Api.Data;
using Epm.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Workspaces;

/// <summary>
/// SCR-E8 — the WORKSPACE OVERVIEW, «مساحة العمل › نظرة عامة»
/// (ملحق الشاشات، الشكل 2).
///
/// PORTED from DWorkspaceOverview (v1.1) —
/// ../epm/app/desktop-workspace.jsx:284. The reference lays it out as four stat
/// tiles over a two-column row: a status distribution beside a short list of the
/// entity's projects, with «عرض الكل» leading to the register.
///
/// ── IT IS NOT THE PORTFOLIO DASHBOARD WITH A FILTER ──────────────────────
/// الشكل 1 → الشكل 2 is a documented transition: selecting a workspace LANDS
/// somewhere, and that somewhere reads the entity, not the ministry. The
/// portfolio (SCR-E1) answers "how is the ministry doing"; this answers "how is
/// this university doing, and which of its projects needs me". They share
/// arithmetic (BR-00, BR-09) and nothing else.
///
/// ── THE WATCHLIST IS THE POINT ────────────────────────────────────────────
/// الشكل 2 names it «قائمة المتابعة — مشاريع خارج المسار» and gives it the
/// screen's centre. Off-track is `delayed` or `suspended` — from the stored
/// status (06 §1), never inferred: SPI needs a baseline this system does not
/// have for every project yet (BR-11), and guessing which projects are late
/// would be the exact "indicator entered rather than derived" the documents
/// rule out (§9 «الاشتقاق لا الإدخال»).
///
/// ── NO ARITHMETIC OF ITS OWN ──────────────────────────────────────────────
/// Effective value comes from Domain/Amendments (BR-09) and the roll-up from
/// Domain/ProjectValue (BR-00). This file filters, joins, sorts and projects.
/// </summary>
public static class WorkspacesEndpoints
{
    public static void MapWorkspacesEndpoints(this WebApplication app)
    {
        // [EP-WSP-01] GET /api/workspaces/{code}/overview
        // web: workspaces/workspaces.api.ts overview() → workspaces.page.ts
        // spec: ملحق الشكل 2 | rules: BR-00, BR-09, BR-15
        // tables: Workspaces · Projects · Contracts · ContractAmendments · Alerts
        app.MapGet("/api/workspaces/{code}/overview", async (EpmDb db, HttpContext http, string code) =>
        {
            // BR-15 FIRST. A workspace this persona is not assigned to is
            // refused before it is even looked up — the 403 must not depend on
            // whether the code happens to exist.
            if (WorkspaceScope.Deny(http, code) is { } denied) return denied;

            var ws = await db.Workspaces.AsNoTracking().FirstOrDefaultAsync(w => w.Code == code);
            if (ws is null) return Results.NotFound(new { message = $"workspace {code} not found" });

            var projects = await db.Projects.AsNoTracking()
                .Where(p => p.WorkspaceCode == code)
                .OrderBy(p => p.Id)
                .ToListAsync();

            var ids = projects.Select(p => p.Id).ToList();

            var contracts = await db.Contracts.AsNoTracking()
                .Where(c => ids.Contains(c.ProjectId))
                .Select(c => new { c.Id, c.ProjectId, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays })
                .ToListAsync();

            var contractIds = contracts.Select(c => c.Id).ToList();
            var amendments = await db.ContractAmendments.AsNoTracking()
                .Where(a => contractIds.Contains(a.ContractId))
                .ToListAsync();

            var alerts = await db.Alerts.AsNoTracking()
                .Where(a => a.ProjectId != null && ids.Contains(a.ProjectId))
                .Select(a => new { a.Severity, a.Acknowledged })
                .ToListAsync();

            // BR-09 per contract, once. Effective is what the contract IS;
            // projected is what it WOULD be once approved orders are applied.
            var perContract = contracts.Select(c =>
            {
                var deltas = amendments
                    .Where(a => a.ContractId == c.Id)
                    .OrderBy(a => a.No)
                    .Select(a => new Amendments.Delta(a.No, a.DeltaValue, a.DeltaDays, a.AppliedAt != null))
                    .ToList();

                var original = new Amendments.Version(0, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays);
                var effective = Amendments.Effective(original, deltas);

                return new
                {
                    c.ProjectId,
                    Effective = effective.Value,
                    Projected = Amendments.Projection(effective, deltas).Value,
                };
            }).ToList();

            decimal ValueOf(string projectId) =>
                ProjectValue.Total(perContract.Where(x => x.ProjectId == projectId).Select(x => x.Effective));

            var effectiveValue = ProjectValue.Total(perContract.Select(x => x.Effective));
            var projectedValue = ProjectValue.Total(perContract.Select(x => x.Projected));

            WorkspaceProjectRow Row(Data.Entities.Project p, string? reason) => new(
                p.Id, p.NameAr, p.NameEn, p.Branch, p.Status,
                ValueOf(p.Id),
                p.UpdatedAt?.ToString("yyyy-MM-dd"),
                reason);

            // 06 §1 — off track is delayed or suspended. Stored status only.
            var watchlist = projects
                .Where(p => p.Status is "delayed" or "suspended")
                .OrderBy(p => p.Status == "delayed" ? 0 : 1)
                .ThenBy(p => p.Id)
                .Select(p => Row(p, p.Status))
                .ToList();

            // الشكل 2 shows six. Most recently touched first, so a stale record
            // is visible by its absence from the top of the list.
            var recent = projects
                .OrderByDescending(p => p.UpdatedAt ?? DateOnly.MinValue)
                .ThenBy(p => p.Id)
                .Take(6)
                .Select(p => Row(p, null))
                .ToList();

            var statusDistribution = projects
                .GroupBy(p => p.Status)
                .Select(g => new WorkspaceStatusSlice(g.Key, g.Count()))
                .OrderByDescending(s => s.Count)
                .ToList();

            return Results.Ok(new WorkspaceOverviewResponse(
                ws.Code, ws.NameAr, ws.NameEn, ws.Kind, ws.Active,
                projects.Count,
                projects.Count(p => p.Status is "ongoing" or "delayed"),
                projects.Count(p => p.Status == "delayed"),
                contracts.Count,
                effectiveValue,
                projectedValue - effectiveValue,
                amendments.Count(a => a.AppliedAt == null),
                alerts.Count(a => !a.Acknowledged),
                alerts.Count(a => !a.Acknowledged && a.Severity == "critical"),
                // Needs weight-rolled BOQ progress across every project (BR-04) — P-09.
                null,
                statusDistribution,
                watchlist,
                recent));
        });
    }
}
