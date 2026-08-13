using Epm.Api.Data;
using Epm.Api.Features.Workspaces;
using Epm.Api.Domain;
using Epm.Api.Features.Boq;
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
        app.MapGet("/api/projects/{projectId}/overview", async (EpmDb db, HttpContext http, string projectId) =>
        {
            var p = await db.Projects.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == projectId);

            // 404 rather than an empty shell: a project id that does not exist
            // is a wrong URL, not an empty state (04 §9 is about empty DATA).
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(http, p.WorkspaceCode) is { } denied) return denied;

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

            // D-06 — "now" is the project data date, never DateTime.Now.
            var asOf = p.DataDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

            // ── PHASE 4.4: the four tiles that were "unavailable + reason" ──
            // BOQ progress (BR-04), payments (P-26) and the planned figure
            // (P-53) all exist now, so the four figures below are queries. They
            // come from the SAME BoqEndpoints.Derive that SCR-W4, SCR-W6 and
            // SCR-W7 read (P-54), which is what stops the overview's physical %
            // from disagreeing with the Progress tab's.
            decimal executed = 0m, billed = 0m;
            decimal plannedWeighted = 0m, plannedBasis = 0m;

            foreach (var c in contracts)
            {
                var derived = await BoqEndpoints.Derive(db, c.Id, "cost");
                executed += derived.Sum(x => x.Progress.AchievedAmount);
                billed += derived.Sum(x => x.Line.Amount);

                var acts = await db.Activities.AsNoTracking()
                    .Where(a => a.ContractId == c.Id && !a.IsMilestone).ToListAsync();
                plannedBasis += acts.Sum(a => a.BudgetedCost);
                plannedWeighted += acts.Sum(a => a.BudgetedCost
                    * PlannedProgress.PlannedPct(a.BaselineStart, a.BaselineFinish, asOf) / 100m);
            }

            var paid = await db.Payments.AsNoTracking()
                .Where(x => contractIds.Contains(x.ContractId) && x.Status == "paid")
                .SumAsync(x => x.NetAmount);

            // NULL, never 0, for a project with no bill and no payments — the
            // tile then keeps saying "unavailable + reason" (P-09).
            decimal? physical = billed > 0m ? ProgressReflection.Rollup(billed, executed) : null;
            decimal? financial = effectiveTotal > 0m ? ProgressReflection.Rollup(effectiveTotal, paid) : null;

            decimal? spi = null, cpi = null;
            if (physical is not null && plannedBasis > 0m)
            {
                var planned = ProgressReflection.Rollup(plannedBasis, plannedWeighted);
                var evm = EarnedValue.For(effectiveTotal, planned / 100m, physical.Value / 100m, paid);
                spi = evm.Spi;
                cpi = evm.Cpi;
            }

            var totals = new OverviewTotals(
                originalTotal,
                effectiveTotal,
                projectionTotal,
                rows.Count,
                rows.Sum(r => r.AppliedAmendments),
                rows.Sum(r => r.PendingAmendments),
                worst?.DelayDays,
                worst?.DelayDays > 0 ? worst.Id : null,
                physical is null ? null : Math.Round(physical.Value, 4, MidpointRounding.AwayFromZero),
                financial is null ? null : Math.Round(financial.Value, 4, MidpointRounding.AwayFromZero),
                spi is null ? null : Math.Round(spi.Value, 2, MidpointRounding.AwayFromZero),
                cpi is null ? null : Math.Round(cpi.Value, 2, MidpointRounding.AwayFromZero));

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

            // ── الشكل 4 — «خط سير المراحل» ───────────────────────────────
            // §79: «خط سير المراحل يقرأ حالة كل وحدة من الوحدة نفسها». So each
            // module is counted from ITS OWN table, and the verdict is
            // Domain/ModuleReadiness's — this file only supplies the counts.
            //
            // WAITING is the signal that separates "working" from "needs me":
            //   contracts      — amendments approved but not yet applied (02 §9)
            //   changeorders   — orders still moving through the stage chain
            // A module with rows and nothing waiting is working as intended.
            var boqCount = contractIds.Count == 0 ? 0 : await db.BoqItems.AsNoTracking()
                .CountAsync(b => contractIds.Contains(b.ContractId));

            var activityCount = contractIds.Count == 0 ? 0 : await db.Activities.AsNoTracking()
                .CountAsync(a => contractIds.Contains(a.ContractId));

            var paymentCount = contractIds.Count == 0 ? 0 : await db.Payments.AsNoTracking()
                .CountAsync(x => contractIds.Contains(x.ContractId));

            var orders = contractIds.Count == 0
                ? []
                : await db.ChangeOrders.AsNoTracking()
                    .Where(o => contractIds.Contains(o.ContractId))
                    .Select(o => o.Lifecycle)
                    .ToListAsync();

            // The rail's order IS the documents' order — keep them identical or
            // the next action stops matching the sidebar it points at.
            var moduleStates = ModuleReadiness.ResolveAll(
            [
                // التعريف
                new("information",  true,  1, 0),
                new("contract",     true,  contracts.Count, totals.PendingAmendments),
                new("boq",          true,  boqCount, 0),
                new("financial",    true,  paymentCount, 0),
                // التنفيذ والمتابعة
                new("schedule",     true,  activityCount, 0),
                new("progress",     true,  activityCount, 0),
                new("changeorders", true,  orders.Count,
                    orders.Count(l => l is not ("closed" or "rejected" or "cancelled"))),
                new("risk",         false, 0, 0),
                // السجلات والوثائق
                new("model",        false, 0, 0),
                new("meetings",     false, 0, 0),
                new("documents",    false, 0, 0),
                // الرقابة
                new("alerts",       false, 0, 0),
                new("reports",      false, 0, 0),
                new("audit",        false, 0, 0),
            ]);

            var (started, available) = ModuleReadiness.Progress(moduleStates);
            var next = ModuleReadiness.NextAction(moduleStates);

            return Results.Ok(new OverviewResponse(
                new OverviewProject(
                    p.Id, p.NameAr, p.NameEn, p.Status, p.Type, p.ExecutionStage,
                    p.FundingType, p.Region, p.Priority, p.Branch, p.Executor,
                    p.WorkspaceCode, ws?.NameAr ?? p.WorkspaceCode, ws?.NameEn ?? p.WorkspaceCode,
                    p.DataDate?.ToString("yyyy-MM-dd"),
                    p.UpdatedAt?.ToString("yyyy-MM-dd")),
                totals, rows, beneficiaries, alerts, unavailable,
                moduleStates
                    .Select(m => new OverviewModule(m.Id, m.State, m.Rows, m.Waiting))
                    .ToList(),
                new OverviewProgress(started, available),
                next is null ? null : new OverviewNextAction(next.Id, next.State, next.Waiting)));
        });
    }
}
