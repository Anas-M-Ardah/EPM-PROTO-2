using Epm.Api.Data;
using Epm.Api.Domain;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Risks;

/// <summary>
/// SCR-W9 — سجل المخاطر (**ملحق الشكل 43**).
///
/// ── THE SCREEN IS THE SPECIFICATION ──────────────────────────────────────
/// No written section defines a risk model, so الشكل 43 is it: its nine
/// columns, its three levels, its seven categories and its severity rule. What
/// this endpoint adds is that the rule is COMPUTED — «الخطورة = الاحتمالية ×
/// التأثير» is printed on the screen, so it may not be a stored column that can
/// disagree with the two numbers beside it (`01 §3`).
///
/// ── ONE READ, NO WRITES ──────────────────────────────────────────────────
/// Raising and mitigating a risk are not on the plate and are not built. The
/// register lists what the fixture holds, and says so where a reader would
/// otherwise wonder.
/// </summary>
public static class RisksEndpoints
{
    public static void MapRisksEndpoints(this WebApplication app)
    {
        // [EP-RSK-01] GET /api/projects/{projectId}/risks
        // web: risks/risks.api.ts list() → risks.page.ts
        // spec: ملحق الشكل 43 | rules: RiskSeverity
        // tables: Projects · Risks
        app.MapGet("/api/projects/{projectId}/risks",
            async (EpmDb db, HttpContext ctx, string projectId) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            // BR-15 — the register is workspace-scoped like every other module.
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            var risks = await db.Risks.AsNoTracking()
                .Where(r => r.ProjectId == projectId)
                .OrderBy(r => r.Code)
                .ToListAsync();

            var rows = risks.Select(r => new RiskRow(
                r.Code, r.TitleAr, r.TitleEn, r.Category,
                r.Probability, r.Impact,
                RiskSeverity.For(r.Probability, r.Impact),
                r.Owner, r.Indicator, r.Status,
                r.RaisedDate?.ToString("yyyy-MM-dd"))).ToList();

            var bands = RiskSeverity.Bands(risks.Select(r => (r.Probability, r.Impact)).ToList())
                .Select(b => new RiskBand(b.Band, b.Count)).ToList();

            return Results.Ok(new RisksResponse(
                p.Id, p.NameAr, p.NameEn, p.DataDate?.ToString("yyyy-MM-dd"),
                bands, rows));
        });
    }
}
