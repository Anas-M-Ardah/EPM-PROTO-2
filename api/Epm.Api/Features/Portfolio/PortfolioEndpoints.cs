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
                    .Select(p => new { p.Id, p.WorkspaceCode, p.Status, p.NameAr, p.NameEn, p.DataDate })
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

            // ══ THE FOUR FIGURES THIS SCREEN CALLED "UNAVAILABLE" ═══════════
            // They became derivable in Phase 4.4 and this endpoint went on
            // reporting them as absent — the same staleness the overview's
            // module list carried (P-131, now P-137). Everything below reads
            // the SAME BoqEndpoints.Derive that SCR-W4, SCR-W6, SCR-W7 and
            // SCR-W1 read, so the portfolio cannot disagree with the projects
            // it sums.
            var fullContracts = await db.Contracts.AsNoTracking()
                .Where(c => projectIds.Contains(c.ProjectId))
                .ToListAsync();

            var activities = await db.Activities.AsNoTracking()
                .Where(a => contractIds.Contains(a.ContractId) && !a.IsMilestone)
                .ToListAsync();

            var payments = await db.Payments.AsNoTracking()
                .Where(x => contractIds.Contains(x.ContractId) && x.Status == "paid")
                .Select(x => new { x.ContractId, x.PaidDate, x.NetAmount })
                .ToListAsync();

            var progressLog = await db.ContractActivityEvents.AsNoTracking()
                .Where(e => contractIds.Contains(e.ContractId) && e.Action == "progress" && e.After != null)
                .OrderBy(e => e.At)
                .Select(e => new { e.ContractId, e.At, e.Before, e.After })
                .ToListAsync();

            // D-06 — "now" is the DATA DATE. Projects can carry different ones,
            // so the portfolio reads the latest: a band that used the earliest
            // would report every project as of the least current one.
            var asOf = projects.Where(x => x.DataDate is not null).Select(x => x.DataDate!.Value)
                .DefaultIfEmpty(DateOnly.FromDateTime(DateTime.UtcNow))
                .Max();

            // Per contract: what the bill says is done, and what it is worth.
            var billed = new Dictionary<string, decimal>();
            var executed = new Dictionary<string, decimal>();
            foreach (var c in fullContracts)
            {
                var derived = await BoqEndpoints.Derive(db, c.Id, "cost");
                billed[c.Id] = derived.Sum(x => x.Line.Amount);
                executed[c.Id] = derived.Sum(x => x.Progress.AchievedAmount);
            }

            decimal PlannedAt(DateOnly at)
            {
                var basis = activities.Sum(a => a.BudgetedCost);
                if (basis <= 0m) return 0m;
                var w = activities.Sum(a => a.BudgetedCost
                    * PlannedProgress.PlannedPct(a.BaselineStart, a.BaselineFinish, at) / 100m);
                return ProgressReflection.Rollup(basis, w);
            }

            var effByContract = perContract.ToDictionary(x => x.ContractId, x => x.Effective);

            // One planned figure for the whole portfolio at the data date. The
            // baselines are shared, so deriving it per project would be the
            // same arithmetic run once per row.
            var plannedNow = PlannedAt(asOf);

            // Per PROJECT, so the watchlist and the signal have something to
            // point at, and the portfolio figures are a weighted roll-up of
            // them rather than a second derivation.
            var perProject = projects.Select(x =>
            {
                var mine = fullContracts.Where(c => c.ProjectId == x.Id).ToList();
                var value = ProjectValue.Total(mine.Select(c => effByContract.TryGetValue(c.Id, out var v) ? v : 0m));
                var bill = mine.Sum(c => billed.TryGetValue(c.Id, out var b) ? b : 0m);
                var done = mine.Sum(c => executed.TryGetValue(c.Id, out var e) ? e : 0m);
                var paid = payments.Where(pm => mine.Any(c => c.Id == pm.ContractId)).Sum(pm => pm.NetAmount);

                decimal? physical = bill > 0m ? ProgressReflection.Rollup(bill, done) : null;

                var worstDelay = mine
                    .Where(c => c.ForecastFinish is not null)
                    .Select(c => Penalty.DelayDays(c.OriginalFinish, c.ForecastFinish!.Value))
                    .DefaultIfEmpty(0)
                    .Max();
                int? delay = mine.Any(c => c.ForecastFinish is not null) ? worstDelay : null;

                var duration = mine.Count == 0 ? (int?)null : mine.Max(c => c.OriginalDurationDays);
                decimal? spi = physical is not null && plannedNow > 0m
                    ? EarnedValue.For(value, plannedNow / 100m, physical.Value / 100m, paid).Spi
                    : null;

                return new
                {
                    x.Id, x.NameAr, x.NameEn, x.Status, x.WorkspaceCode,
                    Value = value, Physical = physical, Paid = paid, Delay = delay,
                    Duration = duration, Spi = spi,
                    Signal = ExecutiveSignal.For(x.Status, delay, duration, spi),
                    Forecast = mine.Where(c => c.ForecastFinish is not null)
                        .Select(c => c.ForecastFinish!.Value).DefaultIfEmpty().Max(),
                    PlannedFinish = mine.Count == 0 ? (DateOnly?)null : mine.Max(c => c.OriginalFinish),
                };
            }).ToList();

            // ── the portfolio band, weighted by contract value ──────────────
            var billedTotal = billed.Values.Sum();
            var executedTotal = executed.Values.Sum();
            var paidTotal = payments.Sum(pm => pm.NetAmount);

            decimal? physicalPct = billedTotal > 0m ? ProgressReflection.Rollup(billedTotal, executedTotal) : null;
            decimal? plannedPct = activities.Count > 0 ? PlannedAt(asOf) : null;
            decimal? financialPct = effectiveValue > 0m ? ProgressReflection.Rollup(effectiveValue, paidTotal) : null;

            decimal? spiTotal = null, cpiTotal = null;
            decimal earnedValue = 0m;
            if (physicalPct is not null && plannedPct is > 0m)
            {
                var evm = EarnedValue.For(effectiveValue, plannedPct.Value / 100m, physicalPct.Value / 100m, paidTotal);

                // BR-11 returns each index as nullable — a zero denominator
                // gives no index rather than a zero one — so each is rounded
                // only if it exists. Rounding a missing index into 0.00 is
                // exactly the lie this screen was rebuilt to stop telling.
                spiTotal = evm.Spi is null ? null : Math.Round(evm.Spi.Value, 2, MidpointRounding.AwayFromZero);
                cpiTotal = evm.Cpi is null ? null : Math.Round(evm.Cpi.Value, 2, MidpointRounding.AwayFromZero);
                earnedValue = evm.Ev;
            }

            // ── the two curves, over the portfolio's own months ─────────────
            var curveFrom = activities.Any(a => a.BaselineStart is not null)
                ? activities.Where(a => a.BaselineStart is not null).Min(a => a.BaselineStart!.Value)
                : fullContracts.Count > 0 ? fullContracts.Min(c => c.Start) : asOf;

            var seriesUpdates = progressLog
                .Where(e => decimal.TryParse(e.After, out _))
                .Select(e => new ProgressSeries.Update(e.ContractId, e.At, decimal.Parse(e.After!)))
                .ToList();

            var seriesContracts = fullContracts.Select(c =>
            {
                var first = progressLog
                    .Where(e => e.ContractId == c.Id && decimal.TryParse(e.Before, out _))
                    .Select(e => (decimal?)decimal.Parse(e.Before!))
                    .FirstOrDefault();
                return new ProgressSeries.Contract(
                    c.Id, effByContract.TryGetValue(c.Id, out var v) ? v : 0m, first ?? 0m);
            }).ToList();

            var months = ProgressSeries.Monthly(
                seriesUpdates, seriesContracts, curveFrom, asOf,
                d => activities.Count > 0 ? PlannedAt(d) : null, physicalPct, _ => string.Empty);

            // A curve needs SOMETHING recorded to be a curve. With no activity
            // baselines and no progress updates, `Monthly` still returns one row
            // per month — all zeros — and drawing that is the exact failure P-09
            // names: a flat line along the axis reads as "nothing has happened",
            // when the truth is "nothing has been recorded". Empty, so the
            // panel's own empty state says which.
            var progressCurve = activities.Count > 0 || seriesUpdates.Count > 0
                ? months
                    .Select(m => new PortfolioCurvePeriod(
                        m.At.ToString("yyyy-MM-dd"), m.PlanCum, m.ActCum, m.PlanPeriod, m.ActPeriod))
                    .ToList()
                : [];

            var firstPayment = payments.Count == 0 || payments.All(x => x.PaidDate is null)
                ? (DateOnly?)null
                : payments.Where(x => x.PaidDate is not null).Min(x => x.PaidDate!.Value);

            // Same rule for the money: the planned side comes from the same
            // baselines, the actual side from paid payments. Neither present,
            // no curve.
            var costCurve = new List<PortfolioCurvePeriod>(months.Count);
            if (activities.Count > 0 || firstPayment is not null)
            {
                decimal prevPlan = 0m, prevAct = 0m;
                foreach (var m in months)
                {
                    decimal? act = null;
                    if (firstPayment is not null && m.At >= firstPayment && effectiveValue > 0m)
                    {
                        var upto = payments.Where(x => x.PaidDate is not null && x.PaidDate <= m.At).Sum(x => x.NetAmount);
                        act = Math.Round(upto / effectiveValue * 100m, 2, MidpointRounding.AwayFromZero);
                    }

                    costCurve.Add(new PortfolioCurvePeriod(
                        m.At.ToString("yyyy-MM-dd"), m.PlanCum, act,
                        Math.Round(m.PlanCum - prevPlan, 2, MidpointRounding.AwayFromZero),
                        act is null ? 0m : Math.Round(Math.Max(0m, act.Value - prevAct), 2, MidpointRounding.AwayFromZero)));

                    prevPlan = m.PlanCum;
                    if (act is not null) prevAct = act.Value;
                }
            }

            // ── the signal, the watchlist and the panels ────────────────────
            var signals = ExecutiveSignal.Counts(perProject.Select(x => x.Signal))
                .Select(c => new SignalBand(c.Signal, c.Count,
                    perProject.Count == 0 ? 0 : (int)Math.Round(c.Count / (decimal)perProject.Count * 100m)))
                .ToList();

            var wsName = workspaces.ToDictionary(w => w.Code, w => (w.NameAr, w.NameEn));

            var watchlist = perProject
                .Where(x => x.Signal != ExecutiveSignal.Green)
                .OrderByDescending(x => x.Value)
                .Take(6)
                .Select(x => new WatchlistRow(
                    x.Id, x.NameAr, x.NameEn,
                    x.WorkspaceCode,
                    wsName.TryGetValue(x.WorkspaceCode, out var n) ? n.NameAr : x.WorkspaceCode,
                    wsName.TryGetValue(x.WorkspaceCode, out var n2) ? n2.NameEn : x.WorkspaceCode,
                    x.Status, x.Signal,
                    x.Physical,
                    x.Physical is null || plannedPct is null ? null
                        : Math.Round(x.Physical.Value - plannedPct.Value, 1, MidpointRounding.AwayFromZero),
                    x.Value,
                    x.Forecast == default ? null : x.Forecast.ToString("yyyy-MM-dd")))
                .ToList();

            var cost = new PortfolioCost(
                ProjectValue.Total(perContract.Select(x => x.Original)),
                effectiveValue,
                paidTotal);

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
            var milestones = perProject
                .Where(x => x.PlannedFinish is not null && x.PlannedFinish >= asOf && x.Status != "completed")
                .OrderBy(x => x.PlannedFinish)
                .Take(4)
                .Select(x => new UpcomingMilestone(
                    x.Id, x.NameAr, x.NameEn,
                    wsName.TryGetValue(x.WorkspaceCode, out var n) ? n.NameAr : x.WorkspaceCode,
                    wsName.TryGetValue(x.WorkspaceCode, out var n2) ? n2.NameEn : x.WorkspaceCode,
                    x.Physical, x.PlannedFinish!.Value.ToString("yyyy-MM-dd")))
                .ToList();

            // Only what genuinely has no input left. A figure that CAN be
            // derived and is reported absent is worse than one that cannot:
            // it teaches a reader to stop looking.
            var unavailable = new List<Unavailable>();
            if (physicalPct is null)
                unavailable.Add(new("physical",
                    "لا يوجد جدول كميات على أي عقد ضمن النطاق — الإنجاز المادي مرجّح بأوزان بنوده (BR-04).",
                    "No contract in scope has a bill of quantities — physical progress is weighted by its item weights (BR-04)."));
            if (financialPct is null)
                unavailable.Add(new("financial",
                    "لا قيمة نافذة لأي عقد ضمن النطاق، فلا مقام لنسبة الصرف.",
                    "No contract in scope has an effective value, so the spend ratio has no denominator."));
            if (spiTotal is null)
                unavailable.Add(new("spi",
                    "يتطلب الإنجاز المادي والمخطط معاً (BR-11)؛ أحدهما غير متوفر.",
                    "Needs physical and planned progress together (BR-11); one of them is missing."));
            if (cpiTotal is null)
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

                asOf.ToString("yyyy-MM-dd"),
                entityKinds,

                physicalPct is null ? null : Math.Round(physicalPct.Value, 2, MidpointRounding.AwayFromZero),
                plannedPct is null ? null : Math.Round(plannedPct.Value, 2, MidpointRounding.AwayFromZero),
                financialPct is null ? null : Math.Round(financialPct.Value, 2, MidpointRounding.AwayFromZero),
                spiTotal, cpiTotal, AcceptableIndex,
                earnedValue, paidTotal,
                progressCurve, costCurve, signals, watchlist, cost, annualSpend, milestones,

                statusDistribution,
                valueByEntity,
                unavailable));
        });
    }
}
