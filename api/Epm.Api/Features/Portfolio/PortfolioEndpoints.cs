using Epm.Api.Data;
using Epm.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Portfolio;

/// <summary>
/// SCR-E1 — Executive Portfolio (04 §2).
/// PORTED from DDashboard (v1.1), desktop-views.jsx:45.
///
/// ── WHAT THIS SCREEN DELIBERATELY DOES NOT SHOW ──────────────────────────
/// The reference dashboard leads with physical %, financial %, SPI and CPI, and
/// an S-curve behind them. Every one of those needs an input this system does
/// not have yet: physical progress is weight-rolled BOQ progress (BR-04, needs
/// the BOQ and Schedule pages), financial progress needs payments, and SPI/CPI
/// need both (BR-11).
///
/// Inventing them would make the one screen executives look at the least
/// trustworthy thing in the system. The v1.1 design language rules this
/// directly: "never render 0/100% for a missing input — show 'unavailable' +
/// reason". So the endpoint returns what is genuinely derivable, plus a list of
/// what is missing AND why, which the screen renders in place of each figure.
/// </summary>
public static class PortfolioEndpoints
{
    public static void MapPortfolioEndpoints(this WebApplication app)
    {
        // [EP-PRT-01] GET /api/portfolio?workspace=
        // web: portfolio.api.ts get() → portfolio.page.ts | spec: 04 §2 | rules: BR-00, BR-09
        // tables: Projects · Contracts · ContractAmendments · Workspaces
        app.MapGet("/api/portfolio", async (EpmDb db, string? workspace) =>
        {
            var workspaces = await db.Workspaces.AsNoTracking().ToListAsync();

            var projectQuery = db.Projects.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(workspace))
                projectQuery = projectQuery.Where(p => p.WorkspaceCode == workspace);

            var projects = await projectQuery
                .Select(p => new { p.Id, p.WorkspaceCode, p.Status })
                .ToListAsync();

            var projectIds = projects.Select(p => p.Id).ToHashSet();

            var contracts = (await db.Contracts.AsNoTracking()
                    .Select(c => new { c.Id, c.ProjectId, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays })
                    .ToListAsync())
                .Where(c => projectIds.Contains(c.ProjectId))
                .ToList();

            var contractIds = contracts.Select(c => c.Id).ToHashSet();
            var amendments = (await db.ContractAmendments.AsNoTracking().ToListAsync())
                .Where(a => contractIds.Contains(a.ContractId))
                .ToList();

            // One pass: each contract's effective and projected value (BR-09).
            var perContract = contracts.Select(c =>
            {
                var deltas = amendments
                    .Where(a => a.ContractId == c.Id)
                    .OrderBy(a => a.No)
                    .Select(a => new Amendments.Delta(a.No, a.DeltaValue, a.DeltaDays, a.AppliedAt != null))
                    .ToList();

                var original = new Amendments.Version(0, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays);
                var effective = Amendments.Effective(original, deltas);

                return new { c.ProjectId, Effective = effective.Value, Projected = Amendments.Projection(effective, deltas).Value };
            }).ToList();

            var effectiveValue = ProjectValue.Total(perContract.Select(x => x.Effective));
            var projectedValue = ProjectValue.Total(perContract.Select(x => x.Projected));

            // 05 §1 — the status donut is the ONE place status colours encode
            // data, so the distribution is a first-class figure here.
            var statusDistribution = projects
                .GroupBy(p => p.Status)
                .Select(g => new StatusSlice(g.Key, g.Count()))
                .OrderByDescending(s => s.Count)
                .ToList();

            var valueByEntity = workspaces
                .Where(w => string.IsNullOrWhiteSpace(workspace) || w.Code == workspace)
                .Select(w =>
                {
                    var mine = projects.Where(p => p.WorkspaceCode == w.Code).Select(p => p.Id).ToHashSet();
                    return new EntityValue(
                        w.Code, w.NameAr, w.NameEn,
                        ProjectValue.Total(perContract.Where(x => mine.Contains(x.ProjectId)).Select(x => x.Effective)),
                        mine.Count);
                })
                .Where(e => e.ProjectCount > 0)
                .OrderByDescending(e => e.Value)
                .ToList();

            // Named, with the reason. These become "unavailable" tiles rather
            // than zeroes — see the class comment.
            var unavailable = new List<Unavailable>
            {
                new("physical",
                    "يُشتق من نسبة إنجاز بنود الكميات المرجّحة (BR-04) — يتوفر بعد بناء شاشتي جدول الكميات والجدول الزمني.",
                    "Derived from weight-rolled BOQ progress (BR-04) — available once the BOQ and Schedule screens exist."),
                new("financial",
                    "يُشتق من الدفعات، ولم يُسجَّل جدول الدفعات بعد.",
                    "Derived from payments; the payments table is not registered yet."),
                new("spi",
                    "يتطلب الإنجاز المخطط والفعلي (BR-11) — كلاهما غير متوفر بعد.",
                    "Needs planned and actual progress (BR-11) — neither is available yet."),
                new("cpi",
                    "يتطلب القيمة المكتسبة والكلفة الفعلية (BR-11) — كلاهما غير متوفر بعد.",
                    "Needs earned value and actual cost (BR-11) — neither is available yet."),
            };

            return Results.Ok(new PortfolioResponse(
                projects.Count,
                projects.Count(p => p.Status is "ongoing" or "delayed"),
                projects.Count(p => p.Status == "delayed"),
                contracts.Count,
                valueByEntity.Count,
                effectiveValue,
                projectedValue - effectiveValue,
                amendments.Count(a => a.AppliedAt == null),
                amendments.Count(a => a.AppliedAt != null),
                statusDistribution,
                valueByEntity,
                unavailable));
        });
    }
}
