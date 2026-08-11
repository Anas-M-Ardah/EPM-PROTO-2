using Epm.Api.Data;
using Epm.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Overview;

/// <summary>
/// SCR-W1 — the project workspace Overview module (`04 §3`).
/// PORTED from DModOverview (v1.1), ../epm@design/system-revamp
/// app/project-modules.jsx:2512.
///
/// ── WHAT THIS SCREEN DELIBERATELY DOES NOT SHOW ──────────────────────────
/// The reference's overview leads with a verdict block: an S-curve of
/// cumulative progress, physical %, SPI, CPI and a readiness dot per module.
/// Every one of those comes from a generator —
///
///     const smooth = f => f * f * (3 - 2 * f);          // the S-curve
///     const plannedProg = Math.min(100, p.tech + 8);    // the plan
///     const spi = p.tech / plannedProg;                 // the index
///     const r = rng(p.id.charCodeAt(6) * 13 + 5);       // the readiness dots
///
/// — a smoothstep curve, an offset, and a character of the project ID. Fine in
/// a clickable prototype; here they would be four fabricated judgements about a
/// real project on the first screen anyone opens. Physical % is weight-rolled
/// BOQ progress (BR-04, Phase 4.2), financial % needs payments (Phase 4.1), and
/// both indices need a baseline curve, which needs the activity schedule
/// (Phase 4.3). So they come back as "unavailable + reason" (P-09).
///
/// ── WHAT IT DOES SHOW IS ALL DERIVED, NONE OF IT STORED ──────────────────
/// Project value = Σ contract EFFECTIVE values (BR-00 over BR-09). Delay comes
/// from Penalty.DelayDays (BR-10) — the same figure the penalty is charged on
/// and the same one SCR-E5 shows. The approved-but-unapplied projection is
/// carried as its own figure and never folded in (02 §9).
/// </summary>
public static class OverviewEndpoints
{
    public static void MapOverviewEndpoints(this WebApplication app)
    {
        // [EP-OVW-01] GET /api/projects/{projectId}/overview
        // web: overview.api.ts get() → overview.page.ts
        // spec: 04 §3 | rules: BR-00, BR-09, BR-10
        // tables: Projects · Contracts · ContractAmendments · Workspaces
        //       · Beneficiaries · Alerts
        app.MapGet("/api/projects/{projectId}/overview", async (EpmDb db, string projectId) =>
        {
            var p = await db.Projects.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == projectId);

            // 404 rather than an empty shell: a project id that does not exist
            // is a wrong URL, not an empty state (04 §9 is about empty DATA).
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });

            var ws = await db.Workspaces.AsNoTracking()
                .FirstOrDefaultAsync(w => w.Code == p.WorkspaceCode);

            var contracts = await db.Contracts.AsNoTracking()
                .Where(c => c.ProjectId == p.Id)
                .OrderBy(c => c.Id)
                .ToListAsync();

            var contractIds = contracts.Select(c => c.Id).ToList();
            var amendments = await db.ContractAmendments.AsNoTracking()
                .Where(a => contractIds.Contains(a.ContractId))
                .ToListAsync();

            var rows = contracts.Select(c =>
            {
                var deltas = amendments
                    .Where(a => a.ContractId == c.Id)
                    .OrderBy(a => a.No)
                    .Select(a => new Amendments.Delta(a.No, a.DeltaValue, a.DeltaDays, a.AppliedAt != null))
                    .ToList();

                var original = new Amendments.Version(0, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays);
                var effective = Amendments.Effective(original, deltas);

                return new OverviewContract(
                    c.Id, c.NameAr, c.NameEn, c.Status,
                    c.OriginalValue,
                    effective.Value,
                    c.Start.ToString("yyyy-MM-dd"),
                    c.OriginalFinish.ToString("yyyy-MM-dd"),
                    effective.Finish.ToString("yyyy-MM-dd"),
                    c.ForecastFinish?.ToString("yyyy-MM-dd"),
                    c.ForecastFinish is null
                        ? null
                        : Penalty.DelayDays(effective.Finish, c.ForecastFinish.Value),
                    deltas.Count(d => d.Applied),
                    deltas.Count(d => !d.Applied),
                    c.Contractor, c.Consultant);
            }).ToList();

            // BR-00 over BR-09. The domain owns the sum even though it is a sum:
            // one place says what a project is worth, and it takes EFFECTIVE
            // values so an unapplied amendment can never leak into it.
            var effectiveTotal = ProjectValue.Total(rows.Select(r => r.EffectiveValue));
            var originalTotal = ProjectValue.Total(rows.Select(r => r.OriginalValue));

            // The projection: effective plus every approved-but-unapplied delta.
            // A separate figure, never part of the one above.
            var projectionTotal = effectiveTotal + amendments
                .Where(a => a.AppliedAt == null)
                .Sum(a => a.DeltaValue);

            // The WORST contract's delay, not the project-level date subtraction
            // — a contract that has slipped has slipped even when a longer
            // sibling hides it behind a later project finish. Same rule SCR-E5
            // applies, and it must give the same answer there and here.
            var worst = rows.Where(r => r.DelayDays is not null)
                .OrderByDescending(r => r.DelayDays!.Value)
                .FirstOrDefault();

            var totals = new OverviewTotals(
                originalTotal,
                effectiveTotal,
                projectionTotal,
                rows.Count,
                rows.Sum(r => r.AppliedAmendments),
                rows.Sum(r => r.PendingAmendments),
                worst?.DelayDays,
                worst?.DelayDays > 0 ? worst.Id : null);

            // BeneficiaryCodes is a CSV of codes (01 §2.1). Split it here and
            // resolve; the client never parses a stored string.
            var codes = p.BeneficiaryCodes
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToList();

            var all = await db.Beneficiaries.AsNoTracking().ToListAsync();

            var beneficiaries = codes
                .Select(code => all.FirstOrDefault(b => b.Code == code))
                .Where(b => b is not null)
                .Select(b =>
                {
                    var parent = b!.ParentCode is null
                        ? null
                        : all.FirstOrDefault(x => x.Code == b.ParentCode);

                    return new OverviewBeneficiary(
                        b.Code, b.NameAr, b.NameEn, b.Type,
                        parent?.NameAr, parent?.NameEn, b.Active);
                })
                .ToList();

            var open = await db.Alerts.AsNoTracking()
                .Where(a => a.ProjectId == p.Id && !a.Acknowledged)
                .ToListAsync();

            var alerts = new OverviewAlerts(
                open.Count,
                open.Count(a => a.Severity == "critical"),
                open.Count(a => a.Severity == "warning"),
                open.Count(a => a.Severity == "info"));

            var unavailable = new List<OverviewUnavailable>
            {
                new("physical",
                    "يتطلب إنجاز جدول الكميات مرجّحاً بأوزان البنود — يتوفر بعد بناء شاشة جدول الكميات.",
                    "Needs BOQ progress rolled up by item weight (BR-04) — available once the BOQ screen exists."),
                new("financial",
                    "يتطلب سجل المستخلصات والدفعات — يتوفر بعد بناء الموقف المالي.",
                    "Needs the payments register — available once the Financials screen exists."),
                new("spi",
                    "يتطلب منحنى الخط الأساس من جدول الأنشطة — يتوفر بعد بناء الجدول الزمني.",
                    "Needs the baseline curve from the activity schedule — available once the Schedule screen exists."),
                new("cpi",
                    "يتطلب القيمة المكتسبة والمصروف الفعلي معاً.",
                    "Needs earned value and actual spend together."),
            };

            return Results.Ok(new OverviewResponse(
                new OverviewProject(
                    p.Id, p.NameAr, p.NameEn, p.Status, p.Type, p.ExecutionStage,
                    p.FundingType, p.Region, p.Priority, p.Branch, p.Executor,
                    p.WorkspaceCode, ws?.NameAr ?? p.WorkspaceCode, ws?.NameEn ?? p.WorkspaceCode,
                    p.DataDate?.ToString("yyyy-MM-dd"),
                    p.UpdatedAt?.ToString("yyyy-MM-dd")),
                totals, rows, beneficiaries, alerts, unavailable));
        });
    }
}
