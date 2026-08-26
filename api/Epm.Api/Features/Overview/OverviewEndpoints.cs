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
    /// <summary>
    /// الشكل 4's «الحد المقبول 0.95» — the line CPI and SPI are read against.
    /// A threshold somebody set: `02` defines no acceptable band for either
    /// index, so it is a named constant here rather than an arithmetic result
    /// dressed up as one.
    /// </summary>
    private const decimal AcceptableIndex = 0.95m;

    /// <summary>
    /// Which project module an alert is about, so الشكل 4's card can open it.
    /// Null when the alert names nothing this screen can navigate to — better
    /// a card with no destination than a card that goes somewhere wrong.
    /// </summary>
    private static string? ModuleFor(string kind) => kind switch
    {
        "schedule-slip" => "schedule",
        "budget" => "financial",
        "sla-overdue" => "changeorders",
        "apply-failed" => "changeorders",
        "distribution-blocked" => "boq",
        _ => null,
    };

    public static void MapOverviewEndpoints(this WebApplication app)
    {
        // [EP-OVW-01] GET /api/projects/{projectId}/overview
        // web: overview.api.ts get() → overview.page.ts
        // spec: 04 §3 | rules: BR-00, BR-09, BR-10
        // tables: Projects · Contracts · ContractAmendments · Workspaces · Alerts
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

            // Held, not discarded: الشكل 4's first chart reads the planned
            // percentage at several DATES, and re-querying per point would be
            // one round trip per recorded progress update.
            var allActivities = contractIds.Count == 0
                ? []
                : await db.Activities.AsNoTracking()
                    .Where(a => contractIds.Contains(a.ContractId) && !a.IsMilestone)
                    .ToListAsync();

            foreach (var c in contracts)
            {
                var derived = await BoqEndpoints.Derive(db, c.Id, "cost");
                executed += derived.Sum(x => x.Progress.AchievedAmount);
                billed += derived.Sum(x => x.Line.Amount);
            }

            plannedBasis = allActivities.Sum(a => a.BudgetedCost);
            plannedWeighted = allActivities.Sum(a => a.BudgetedCost
                * PlannedProgress.PlannedPct(a.BaselineStart, a.BaselineFinish, asOf) / 100m);

            var paid = await db.Payments.AsNoTracking()
                .Where(x => contractIds.Contains(x.ContractId) && x.Status == "paid")
                .SumAsync(x => x.NetAmount);

            // الإنجاز المالي is «المصروف التراكمي نسبةً إلى الكلفة المعدلة»
            // (العرض الفني §23-1) — the RECORDED budget where there is one,
            // Σ commitments where there is not. SCR-W6 and SCR-W7 print the
            // same percentage from this same function (P-54).
            var basis = BudgetBasis.For(p.PlannedCost, p.RevisedCost, effectiveTotal);

            // NULL, never 0, for a project with no bill and no payments — the
            // tile then keeps saying "unavailable + reason" (P-09).
            decimal? physical = billed > 0m ? ProgressReflection.Rollup(billed, executed) : null;
            decimal? financial = BudgetBasis.SpendPct(basis, paid);

            // الشكل 4 prints the planned figure BESIDE the actual one — «31%
            // مقابل مخطط 39%» — so it is a value this endpoint returns and not
            // an intermediate it throws away after computing the indices.
            decimal? planned = plannedBasis > 0m
                ? ProgressReflection.Rollup(plannedBasis, plannedWeighted)
                : null;

            decimal? spi = null, cpi = null;
            if (physical is not null && planned is not null)
            {
                var evm = EarnedValue.For(basis.Revised, planned.Value / 100m, physical.Value / 100m, paid);
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
                planned is null ? null : Math.Round(planned.Value, 4, MidpointRounding.AwayFromZero),
                financial is null ? null : Math.Round(financial.Value, 4, MidpointRounding.AwayFromZero),
                spi is null ? null : Math.Round(spi.Value, 2, MidpointRounding.AwayFromZero),
                cpi is null ? null : Math.Round(cpi.Value, 2, MidpointRounding.AwayFromZero),
                // الشكل 4's «الحد المقبول 0.95». A threshold somebody set, not
                // a derivation — `02` defines no acceptable band for CPI or SPI,
                // so it is a named constant and the screen labels it as one.
                AcceptableIndex);

            // BeneficiaryCodes is a CSV of Workspaces.Code (01 §2.1, P-174). Split
            // it here and resolve; the client never parses a stored string.
            var codes = p.BeneficiaryCodes
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToList();

            var all = await db.Workspaces.AsNoTracking().ToListAsync();

            var beneficiaries = codes
                .Select(code => all.FirstOrDefault(w => w.Code == code))
                .Where(w => w is not null)
                .Select(w => new OverviewBeneficiary(
                    w!.Code, w.NameAr, w.NameEn, w.Kind, w.Active))
                .ToList();

            var open = await db.Alerts.AsNoTracking()
                .Where(a => a.ProjectId == p.Id && !a.Acknowledged)
                .OrderByDescending(a => a.RaisedAt)
                .ToListAsync();

            var alerts = new OverviewAlerts(
                open.Count,
                open.Count(a => a.Severity == "critical"),
                open.Count(a => a.Severity == "warning"),
                open.Count(a => a.Severity == "info"));

            // الشكل 4's «التنبيهات النشطة» is a panel of CARDS you act from —
            // «اتخاذ قرار الاعتماد أو مراجعة التنبيه أو تحديث الإنجاز من بطاقات
            // التنبيهات» — not a count per severity. Critical first, then by
            // recency: an inbox orders by urgency to the reader, not by a data
            // column (the same rule SCR-W13's groups follow).
            var alertCards = open
                .OrderBy(a => a.Severity switch { "critical" => 0, "warning" => 1, _ => 2 })
                .ThenByDescending(a => a.RaisedAt)
                .Take(5)
                .Select(a => new OverviewAlertCard(
                    a.Id, a.Severity, a.Kind, a.TitleAr, a.TitleEn,
                    a.RaisedAt.ToString("yyyy-MM-dd"), a.TargetRef, ModuleFor(a.Kind)))
                .ToList();

            // ── الشكل 4's identity line ───────────────────────────────────
            // المقاول, المباشرة and الإنجاز التعاقدي belong to a CONTRACT. The
            // plate's project has one; this fixture's has two, so the largest
            // by effective value speaks for the project and the count travels
            // with it so the screen can say so.
            var lead = contracts
                .OrderByDescending(c => rows.FirstOrDefault(r => r.Id == c.Id)?.EffectiveValue ?? 0m)
                .FirstOrDefault();

            var identity = new OverviewIdentity(
                beneficiaries.FirstOrDefault()?.NameAr,
                beneficiaries.FirstOrDefault()?.NameEn,
                lead?.Contractor,
                lead?.Consultant,
                p.Type, p.FundingType, p.Region,
                lead?.Start.ToString("yyyy-MM-dd"),
                lead?.OriginalFinish.ToString("yyyy-MM-dd"),
                contracts.Count);

            // ── الشكل 4's cost line and spend ratio ───────────────────────
            // «المقررة … والمعدلة … (▲ الفرق) والمتبقي» and «نسبة الصرف 34%
            // (510 م من 1,500 م)». المتبقي is المعدلة − المصروف, which is the
            // plate's own arithmetic; it is not an uncommitted balance.
            //
            // The plate's own numbers are the RECORDED pair — 1,374,210,115 and
            // 1,500,000,000 are الشكل 18's, the same two الشكل 14's strip runs
            // its equation on. Σ contract values is a different question and
            // `OverviewTotals` above is where it is answered (P-180).
            var cost = new OverviewCost(
                basis.Approved,
                basis.Revised,
                basis.Changes,
                paid,
                BudgetBasis.Balance(basis, paid),
                BudgetBasis.SpendPct(basis, paid) is { } p4
                    ? Math.Round(p4, 2, MidpointRounding.AwayFromZero)
                    : null);

            // ── الشكل 4's first chart ─────────────────────────────────────
            // Domain/ProgressSeries. The actual line is the progress updates
            // somebody RECORDED (الشكل 11's log), rolled up by contract value;
            // the planned line is PlannedProgress read at those same dates. The
            // last point is handed the screen's own physical figure so the
            // chart cannot end on a different number from the tile above it.
            var progressUpdates = await db.ContractActivityEvents.AsNoTracking()
                .Where(e => contractIds.Contains(e.ContractId) && e.Action == "progress" && e.After != null)
                .OrderBy(e => e.At)
                .Select(e => new { e.ContractId, e.At, e.Before, e.After })
                .ToListAsync();

            var seriesUpdates = progressUpdates
                .Where(e => decimal.TryParse(e.After, out _))
                .Select(e => new ProgressSeries.Update(e.ContractId, e.At, decimal.Parse(e.After!)))
                .ToList();

            var seriesContracts = contracts.Select(c =>
            {
                // Where the contract STOOD before anybody logged a move — the
                // earliest `Before` on its own log. Absent that, its current
                // percentage: never 0, which would read as "no work had been
                // done" rather than "nothing was recorded".
                var first = progressUpdates
                    .Where(e => e.ContractId == c.Id && decimal.TryParse(e.Before, out _))
                    .Select(e => (decimal?)decimal.Parse(e.Before!))
                    .FirstOrDefault();

                return new ProgressSeries.Contract(
                    c.Id,
                    rows.FirstOrDefault(r => r.Id == c.Id)?.EffectiveValue ?? 0m,
                    first ?? 0m);
            }).ToList();

            var plannedAtCache = new Dictionary<DateOnly, decimal?>();
            decimal? PlannedAt(DateOnly at)
            {
                if (plannedAtCache.TryGetValue(at, out var cached)) return cached;
                if (plannedBasis <= 0m) return plannedAtCache[at] = null;

                var w = allActivities.Sum(a => a.BudgetedCost
                    * PlannedProgress.PlannedPct(a.BaselineStart, a.BaselineFinish, at) / 100m);
                return plannedAtCache[at] = ProgressReflection.Rollup(plannedBasis, w);
            }

            var progressSeries = ProgressSeries
                .Build(seriesUpdates, seriesContracts, asOf, PlannedAt, physical)
                .Select(pt => new OverviewProgressPoint(
                    pt.At.ToString("yyyy-MM-dd"), pt.Planned, pt.Actual))
                .ToList();

            // ── الشكل 4's two S-curves ────────────────────────────────────
            // The live prototype draws both with `DSCurve`. Its own data is a
            // smoothstep over twelve invented months; these are month ends from
            // the earliest baseline to the data date, with the planned line
            // DERIVED (PlannedProgress) and the actual line RECORDED.
            var curveFrom = allActivities.Any(a => a.BaselineStart is not null)
                ? allActivities.Where(a => a.BaselineStart is not null).Min(a => a.BaselineStart!.Value)
                : contracts.Count > 0 ? contracts.Min(c => c.Start) : asOf;

            var months = ProgressSeries.Monthly(
                seriesUpdates, seriesContracts, curveFrom, asOf, PlannedAt, physical,
                _ => string.Empty);          // the CLIENT labels the periods

            // `Drawable` is the same test SCR-E1 and SCR-E8 apply: two points
            // at least, and something on them. A one-point flat curve is a dot
            // on an axis, and the client's answer to a chart with no data is to
            // hide it (P-144) — so an undrawable series comes back empty and the
            // panel does not render.
            var progressCurve = ProgressSeries.Drawable(months)
                ? months
                    .Select(r => new OverviewCurvePeriod(
                        r.At.ToString("yyyy-MM-dd"), r.PlanCum, r.ActCum, r.PlanPeriod, r.ActPeriod))
                    .ToList()
                : [];

            // The cost curve, over the SAME month ends so the two rows read
            // against each other. Planned spend is BR-11's PV as a share of the
            // revised value — which is the planned progress percentage — and
            // actual spend is the payments recorded on or before each month end.
            // Neither line is a shape: one is money budgeted, one is money that
            // moved.
            var paidRows = await db.Payments.AsNoTracking()
                .Where(x => contractIds.Contains(x.ContractId) && x.Status == "paid" && x.PaidDate != null)
                .Select(x => new { Date = x.PaidDate!.Value, x.NetAmount })
                .ToListAsync();

            var firstPayment = paidRows.Count == 0 ? (DateOnly?)null : paidRows.Min(r => r.Date);

            var costRows = new List<ProgressSeries.Period>(months.Count);
            {
                decimal prevPlan = 0m, prevAct = 0m;
                foreach (var m in months)
                {
                    var plan = m.PlanCum;

                    decimal? act = null;
                    if (firstPayment is not null && m.At >= firstPayment && effectiveTotal > 0m)
                    {
                        var upto = paidRows.Where(r => r.Date <= m.At).Sum(r => r.NetAmount);
                        act = Math.Round(upto / effectiveTotal * 100m, 2, MidpointRounding.AwayFromZero);
                    }

                    costRows.Add(new ProgressSeries.Period(
                        string.Empty, m.At, plan, act,
                        Math.Round(plan - prevPlan, 2, MidpointRounding.AwayFromZero),
                        act is null ? 0m : Math.Round(Math.Max(0m, act.Value - prevAct), 2, MidpointRounding.AwayFromZero)));

                    prevPlan = plan;
                    if (act is not null) prevAct = act.Value;
                }
            }

            var costCurve = ProgressSeries.Drawable(costRows)
                ? costRows
                    .Select(r => new OverviewCurvePeriod(
                        r.At.ToString("yyyy-MM-dd"), r.PlanCum, r.ActCum, r.PlanPeriod, r.ActPeriod))
                    .ToList()
                : [];

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

            var riskCount = await db.Risks.AsNoTracking().CountAsync(r => r.ProjectId == p.Id);
            var openRiskCount = await db.Risks.AsNoTracking()
                .CountAsync(r => r.ProjectId == p.Id && r.Status != "closed");

            var modelCount = await db.ModelElements.AsNoTracking().CountAsync(e => e.ProjectId == p.Id);

            var meetingIds = await db.Meetings.AsNoTracking()
                .Where(m => m.ProjectId == p.Id).Select(m => m.Id).ToListAsync();
            var meetingCount = meetingIds.Count;
            var openActionCount = await db.MeetingActions.AsNoTracking()
                .CountAsync(a => meetingIds.Contains(a.MeetingId) && a.Status != "closed");

            var documentCount = await db.Documents.AsNoTracking().CountAsync(d => d.ProjectId == p.Id);
            var docIds = await db.Documents.AsNoTracking()
                .Where(d => d.ProjectId == p.Id).Select(d => d.Id).ToListAsync();
            // «قيد المراجعة» — a document whose CURRENT revision is a draft.
            var draftDocCount = (await db.DocumentRevisions.AsNoTracking()
                .Where(r => docIds.Contains(r.DocumentId)).ToListAsync())
                .GroupBy(r => r.DocumentId)
                .Count(g => g.OrderByDescending(r => r.No).First().Status == "draft");

            var alertCount = await db.Alerts.AsNoTracking().CountAsync(a => a.ProjectId == p.Id);

            var auditCount = await db.ProjectActivityEvents.AsNoTracking().CountAsync(e => e.ProjectId == p.Id)
                + await db.ContractActivityEvents.AsNoTracking().CountAsync(e => contractIds.Contains(e.ContractId));

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
                // Phase 6 built these seven and this list still said they did
                // not exist, so seven of the fifteen units on «خط سير المراحل»
                // were reporting zero rows on a project that has them (P-131).
                new("risk",         true,  riskCount,     openRiskCount),
                // السجلات والوثائق
                new("model",        true,  modelCount,    0),
                new("meetings",     true,  meetingCount,  openActionCount),
                new("documents",    true,  documentCount, draftDocCount),
                // الرقابة
                new("alerts",       true,  alertCount,    alerts.Open),
                new("reports",      true,  0,             0),
                new("audit",        true,  auditCount,    0),
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
                identity, totals, cost, progressSeries, progressCurve, costCurve,
                alerts, alertCards, unavailable,
                moduleStates
                    .Select(m => new OverviewModule(m.Id, m.State, m.Rows, m.Waiting))
                    .ToList(),
                new OverviewProgress(started, available),
                next is null ? null : new OverviewNextAction(next.Id, next.State, next.Waiting)));
        });
    }
}
