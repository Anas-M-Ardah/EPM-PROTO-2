using Epm.Api.Data;
using Epm.Api.Features.Boq;
using Epm.Api.Domain;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Portfolio;

/// <summary>
/// SCR-E1 — Executive Portfolio (04 §2).
/// PORTED from DDashboard, desktop-views.jsx:45.
///
/// ── THE FOUR LEAD FIGURES ARE REAL NOW (P-137) ───────────────────────────
/// This endpoint spent Phases 2–6 returning physical %, financial %, SPI and
/// CPI as "unavailable", because when it was written none of their inputs
/// existed. Phase 4.4 gave the system all four — weight-rolled BOQ progress
/// (BR-04), recorded payments, baseline planned progress (P-53) and BR-11's
/// two indices — and this screen went on reporting them as absent. A figure
/// that CAN be derived and is shown as missing is worse than one that cannot:
/// it teaches an executive to stop looking.
///
/// So every figure below is derived from the SAME domain rules the project
/// screens read — `BoqEndpoints.Derive`, `PlannedProgress`, `EarnedValue`,
/// `Penalty.DelayDays` — and the portfolio cannot disagree with the projects
/// it sums. `Unavailable` survives for the cases that genuinely have no input
/// left (P-09: never render 0 for a missing figure; render the reason).
///
/// ── WHAT IS STILL THE PROTOTYPE'S PICTURE, NOT ITS DATA ───────────────────
/// The two S-curves and «المؤشر التنفيذي» are drawn exactly as the prototype
/// draws them. Its curves are a smoothstep over twelve invented months; ours
/// come from `ProgressSeries.Monthly` over recorded progress and real payment
/// dates. Its signal thresholds — 20% / 5% / 0.90 — ARE ported, verbatim, and
/// named as chosen constants in `Domain/ExecutiveSignal`.
/// </summary>
public static class PortfolioEndpoints
{
    /// <summary>
    /// «الحد المقبول 0.95» — the same threshold SCR-W1 reads its indices
    /// against, and for the same reason: `02` defines no acceptable band, so
    /// it is a constant somebody chose and both screens name it as one.
    /// </summary>
    private const decimal AcceptableIndex = 0.95m;

    public static void MapPortfolioEndpoints(this WebApplication app)
    {
        // [EP-PRT-01] GET /api/portfolio?workspace=&status=&kind=
        // web: portfolio.api.ts get() → portfolio.page.ts | spec: 04 §2 | rules: BR-00, BR-09, BR-11, BR-15
        // tables: Projects · Contracts · ContractAmendments · Workspaces · BoqItems · Activities · Payments
        app.MapGet("/api/portfolio", async (
            EpmDb db, HttpContext ctx, string? workspace, string? status, string? kind) =>
        {
            // BR-15 — refused before anything is read (see WorkspaceScope).
            if (WorkspaceScope.Deny(ctx, workspace) is { } denied) return denied;

            var all = await db.Workspaces.AsNoTracking().ToListAsync();

            var scope = WorkspaceScope.Effective(ctx, all.Select(w => w.Code), workspace);
            var scopeCodes = scope.ToList();

            // The ministry band is the ministry's — or, for an assigned user,
            // the sum of their own workspaces (§7). Never the whole portfolio
            // for someone who cannot open it.
            var workspaces = all.Where(w => scope.Contains(w.Code)).ToList();

            // The entity-type list the toolbar's «كل الجهات» select offers —
            // taken BEFORE the filter, so choosing one does not remove the
            // others from the control that chose it.
            var entityKinds = workspaces.Select(w => w.Kind)
                .Where(k => !string.IsNullOrEmpty(k))
                .Distinct()
                .OrderBy(k => k)
                .ToList();

            // ── the two toolbar filters ────────────────────────────────────
            // They narrow the SCOPE, not the presentation: every figure below
            // is re-derived over whatever survives them. That is why they are
            // query parameters and not a client-side array filter — a screen
            // that filters its own table but keeps the unfiltered headline is
            // reporting two different portfolios at once.
            var kindCodes = string.IsNullOrEmpty(kind)
                ? scopeCodes
                : workspaces.Where(w => w.Kind == kind).Select(w => w.Code).ToList();

            var projects = (await db.Projects.AsNoTracking()
                    .Where(p => kindCodes.Contains(p.WorkspaceCode))
                    .Select(p => new { p.Id, p.WorkspaceCode, p.Status, p.NameAr, p.NameEn, p.Branch, p.DataDate })
                    .ToListAsync())
                .Where(p => string.IsNullOrEmpty(status) || p.Status == status)
                .ToList();

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

                return new
                {
                    ContractId = c.Id,
                    c.ProjectId,
                    Original = c.OriginalValue,
                    Effective = effective.Value,
                    Projected = Amendments.Projection(effective, deltas).Value,
                };
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

            // ══ THE BAND ═══════════════════════════════════════════════════
            // Loaded here, derived in `Domain/PortfolioBand` — the SAME rule
            // SCR-E8 calls, so the ministry total cannot stop being the sum of
            // the workspaces underneath it (P-141).
            var fullContracts = await db.Contracts.AsNoTracking()
                .Where(c => projectIds.Contains(c.ProjectId))
                .ToListAsync();

            var activities = await db.Activities.AsNoTracking()
                .Where(a => contractIds.Contains(a.ContractId) && !a.IsMilestone)
                .Select(a => new PortfolioBand.Act(a.BudgetedCost, a.BaselineStart, a.BaselineFinish))
                .ToListAsync();

            var payments = await db.Payments.AsNoTracking()
                .Where(x => contractIds.Contains(x.ContractId) && x.Status == "paid")
                .Select(x => new PortfolioBand.Pay(x.ContractId, x.PaidDate, x.NetAmount))
                .ToListAsync();

            var progressLog = await db.ContractActivityEvents.AsNoTracking()
                .Where(e => contractIds.Contains(e.ContractId) && e.Action == "progress" && e.After != null)
                .OrderBy(e => e.At)
                .Select(e => new { e.ContractId, e.At, e.Before, e.After })
                .ToListAsync();

            var updates = progressLog
                .Where(e => decimal.TryParse(e.After, out _))
                .Select(e => new PortfolioBand.Update(e.ContractId, e.At, decimal.Parse(e.After!)))
                .ToList();

            var effByContract = perContract.ToDictionary(x => x.ContractId, x => x.Effective);

            // What the bill says each contract is worth and how much of it is
            // done — the SAME `BoqEndpoints.Derive` SCR-W4, SCR-W6 and SCR-W1
            // read, so the portfolio cannot disagree with the pages it sums.
            var bandContracts = new List<PortfolioBand.Contr>(fullContracts.Count);
            foreach (var c in fullContracts)
            {
                var derived = await BoqEndpoints.Derive(db, c.Id, "cost");
                var startingPct = progressLog
                    .Where(e => e.ContractId == c.Id && decimal.TryParse(e.Before, out _))
                    .Select(e => (decimal?)decimal.Parse(e.Before!))
                    .FirstOrDefault();

                bandContracts.Add(new PortfolioBand.Contr(
                    c.Id, c.ProjectId,
                    c.OriginalValue,
                    effByContract.TryGetValue(c.Id, out var eff) ? eff : 0m,
                    derived.Sum(x => x.Line.Amount),
                    derived.Sum(x => x.Progress.AchievedAmount),
                    c.Start, c.OriginalFinish, c.ForecastFinish,
                    c.OriginalDurationDays, startingPct ?? 0m));
            }

            var band = PortfolioBand.Derive(
                projects.Select(x => new PortfolioBand.Proj(
                    x.Id, x.NameAr, x.NameEn, x.Status, x.WorkspaceCode, x.Branch, x.DataDate)).ToList(),
                bandContracts, payments, updates, activities);

            var progressCurve = band.ProgressCurve
                .Select(m => new PortfolioCurvePeriod(
                    m.At.ToString("yyyy-MM-dd"), m.PlanCum, m.ActCum, m.PlanPeriod, m.ActPeriod))
                .ToList();

            var costCurve = band.CostCurve
                .Select(m => new PortfolioCurvePeriod(
                    m.At.ToString("yyyy-MM-dd"), m.PlanCum, m.ActCum, m.PlanPeriod, m.ActPeriod))
                .ToList();

            var signals = band.Signals
                .Select(b => new SignalBand(b.Code, b.Count, b.Share))
                .ToList();

            var wsName = workspaces.ToDictionary(w => w.Code, w => (w.NameAr, w.NameEn));

            // Off the plan, worst value first. Filtering and sorting is what an
            // endpoint is for; the SIGNAL that decides membership is the rule's.
            var watchlist = band.Projects
                .Where(x => x.Signal != ExecutiveSignal.Green)
                .OrderByDescending(x => x.Value)
                .Take(6)
                .Select(x => new WatchlistRow(
                    x.Id, x.NameAr, x.NameEn, x.WorkspaceCode,
                    wsName.TryGetValue(x.WorkspaceCode, out var n) ? n.NameAr : x.WorkspaceCode,
                    wsName.TryGetValue(x.WorkspaceCode, out var n2) ? n2.NameEn : x.WorkspaceCode,
                    x.Status, x.Signal,
                    x.Physical,
                    PortfolioBand.Variance(x.Physical, band.Planned),
                    x.Value,
                    x.ForecastFinish?.ToString("yyyy-MM-dd")))
                .ToList();

            var cost = new PortfolioCost(band.ApprovedCost, band.RevisedCost, band.ActualCost);

            // Real years from real payment dates — never a weight table.
            var annualSpend = payments
                .Where(x => x.PaidDate is not null)
                .GroupBy(x => x.PaidDate!.Value.Year)
                .OrderBy(g => g.Key)
                .Select(g => new SpendYear(g.Key, g.Sum(x => x.NetAmount)))
                .ToList();

            // «معالم قادمة» — the nearest planned finishes STILL AHEAD of the
            // data date. A finish already behind us is not upcoming; it is a
            // delay, and the watchlist above is where that belongs.
            var milestones = band.Projects
                .Where(x => x.PlannedFinish is not null && x.PlannedFinish >= band.AsOf && x.Status != "completed")
                .OrderBy(x => x.PlannedFinish)
                .Take(4)
                .Select(x => new UpcomingMilestone(
                    x.Id, x.NameAr, x.NameEn,
                    wsName.TryGetValue(x.WorkspaceCode, out var n) ? n.NameAr : x.WorkspaceCode,
                    wsName.TryGetValue(x.WorkspaceCode, out var n2) ? n2.NameEn : x.WorkspaceCode,
                    x.Physical, x.PlannedFinish!.Value.ToString("yyyy-MM-dd")))
                .ToList();

            // «الجدول الزمني للمشاريع — أعلى 5 مشاريع كلفةً». The reference
            // sorts the portfolio by cost and takes five (desktop-views.jsx:66),
            // and that is all this is: an ordering and a projection over rows
            // the band already derived. `Start` is the band's too — a project
            // starts when its earliest contract does, the mirror of the latest
            // finish beside it.
            //
            // Projects with no contract are excluded rather than drawn with two
            // empty dates: the panel is a TIMELINE, and a row with no span on it
            // says nothing while still taking one of the five places.
            var timeline = band.Projects
                .Where(x => x.Start is not null && x.PlannedFinish is not null)
                .OrderByDescending(x => x.Value)
                .Take(5)
                .Select(x => new TimelineRow(
                    x.Id, x.NameAr, x.NameEn, x.WorkspaceCode, x.Status,
                    x.Physical, x.Value,
                    x.Start?.ToString("yyyy-MM-dd"),
                    x.PlannedFinish?.ToString("yyyy-MM-dd"),
                    x.ForecastFinish?.ToString("yyyy-MM-dd")))
                .ToList();

            // Only what genuinely has no input left. A figure that CAN be
            // derived and is reported absent is worse than one that cannot:
            // it teaches a reader to stop looking.
            var unavailable = new List<Unavailable>();
            if (band.Physical is null)
                unavailable.Add(new("physical",
                    "لا يوجد جدول كميات على أي عقد ضمن النطاق — الإنجاز المادي مرجّح بأوزان بنوده (BR-04).",
                    "No contract in scope has a bill of quantities — physical progress is weighted by its item weights (BR-04)."));
            if (band.Financial is null)
                unavailable.Add(new("financial",
                    "لا قيمة نافذة لأي عقد ضمن النطاق، فلا مقام لنسبة الصرف.",
                    "No contract in scope has an effective value, so the spend ratio has no denominator."));
            if (band.Spi is null)
                unavailable.Add(new("spi",
                    "يتطلب الإنجاز المادي والمخطط معاً (BR-11)؛ أحدهما غير متوفر.",
                    "Needs physical and planned progress together (BR-11); one of them is missing."));
            if (band.Cpi is null)
                unavailable.Add(new("cpi",
                    "يتطلب القيمة المكتسبة والكلفة الفعلية معاً (BR-11).",
                    "Needs earned value and actual cost together (BR-11)."));

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

                band.AsOf.ToString("yyyy-MM-dd"),
                entityKinds,

                band.Physical, band.Planned, band.Financial,
                band.Spi, band.Cpi, AcceptableIndex,
                band.EarnedValue, band.ActualCost,
                progressCurve, costCurve, signals, watchlist, cost, annualSpend, milestones, timeline,

                statusDistribution,
                valueByEntity,
                unavailable));
        });
    }
}
