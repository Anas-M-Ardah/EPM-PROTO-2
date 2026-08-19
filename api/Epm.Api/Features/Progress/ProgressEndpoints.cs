using Epm.Api.Data;
using Epm.Api.Features.Workspaces;
using Epm.Api.Data.Entities;
using Epm.Api.Domain;
using Epm.Api.Features.Boq;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Progress;

/// <summary>
/// SCR-W6 — the project workspace Progress module (`04 §3`, `02 §4`).
/// PORTED from the v1.1 progress module: ../epm@design/system-revamp
/// app/project-modules.jsx `DModProgress` :1391.
///
/// ── THIS SCREEN IS NOT GATED ON A CONTRACT ───────────────────────────────
/// SCR-W4 and SCR-W5 are, because a bill of quantities and a programme each
/// belong to one contract. A project's PHYSICAL % does not: `02 §4` ends
/// "project physical % rolls up by weight", across every contract it has.
/// Gating this page would make the project's own headline figure unreachable
/// from the tab that exists to show it. The reflection tables carry their
/// contract per row instead, and the contract column is dropped when the
/// project has only one (P-55).
///
/// ── ONE DERIVATION, STILL ────────────────────────────────────────────────
/// The BOQ figures here come from `BoqEndpoints.Derive` — the same function
/// SCR-W4's register and assignment screen use. Re-deriving them would be a
/// second chance for this screen's achieved amount to disagree with the BOQ
/// tab's, which is exactly what that function was made single to prevent
/// (P-54).
///
/// ── NO ARITHMETIC OF ITS OWN ─────────────────────────────────────────────
/// Reflection is Domain/ProgressReflection (BR-04), the roll-ups its
/// `Rollup`, effective values Domain/Amendments (BR-09), the project total
/// Domain/ProjectValue (BR-00), the delay Domain/Penalty.DelayDays (BR-10),
/// the indices Domain/EarnedValue (BR-11) and the planned figure
/// Domain/PlannedProgress (P-53). This file queries, groups and projects.
/// </summary>
public static class ProgressEndpoints
{
    public static void MapProgressEndpoints(this WebApplication app)
    {
        // [EP-PRG-01] GET /api/projects/{projectId}/progress
        // web: progress/progress.api.ts get() → progress.page.ts
        // spec: 04 §3 · 02 §4 | rules: BR-00, BR-04, BR-09, BR-10, BR-11 + P-53
        // tables: Projects · Contracts · ContractAmendments · Activities
        //         BoqItems · BoqRateBands · BoqActivityLinks · Payments
        app.MapGet("/api/projects/{projectId}/progress", async (EpmDb db, HttpContext http, string projectId) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(http, p.WorkspaceCode) is { } denied) return denied;

            var model = await Build(db, projectId);
            return model is null
                ? Results.NotFound(new { message = $"project {projectId} not found" })
                : Results.Ok(model);
        });

        // [EP-PRG-02] PUT /api/projects/{projectId}/progress/activities/{activityId}
        // web: progress/progress.api.ts saveProgress() → progress.page.ts
        // spec: 02 §4 | rules: BR-04 + P-53 | tables: Activities (WRITTEN)
        //
        // THE ONLY WRITE ON THIS SCREEN, and the one `07 §M3` names: "change an
        // activity's progress, watch BOQ progress, achieved quantity and
        // achieved amount update".
        app.MapPut("/api/projects/{projectId}/progress/activities/{activityId}",
            async (EpmDb db, HttpContext http, string projectId, string activityId, UpdateProgressRequest body) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(http, p.WorkspaceCode) is { } denied) return denied;

            var contractIds = await db.Contracts.AsNoTracking()
                .Where(c => c.ProjectId == projectId).Select(c => c.Id).ToListAsync();

            // SCOPE, CHECKED HERE WHERE IT CAN BE READ (P-01). An activity of
            // another project's contract is a 404, not a silent no-op.
            var a = await db.Activities
                .FirstOrDefaultAsync(x => x.ActivityId == activityId && contractIds.Contains(x.ContractId));
            if (a is null)
                return Results.NotFound(new
                {
                    message = $"activity {activityId} not found in project {projectId}",
                });

            // REFUSED, NOT CLAMPED. Silently turning 140 into 100 would record a
            // number nobody typed against a person's name (04 §9).
            if (body.ProgressPct < 0m || body.ProgressPct > 100m)
                return Results.BadRequest(new
                {
                    message = "progress must be between 0 and 100",
                    messageAr = "نسبة الإنجاز يجب أن تكون بين صفر ومئة",
                });

            // A MILESTONE IS REACHED OR IT IS NOT. `02 §2` gives it zero basis
            // and excludes it from every denominator, so a milestone at 45%
            // would be a number that earns nothing and means nothing.
            if (a.IsMilestone && body.ProgressPct is not (0m or 100m))
                return Results.BadRequest(new
                {
                    message = "a milestone is either reached (100) or not (0)",
                    messageAr = "الحَدَث الفارق إمّا متحقق (100) أو غير متحقق (0)",
                });

            a.ProgressPct = body.ProgressPct;
            // The stored column P6 exports, kept from contradicting the
            // percentage printed beside it (P-53).
            a.RemainingDuration = PlannedProgress.RemainingDuration(
                a.OriginalDuration, body.ProgressPct, a.IsMilestone);

            await db.SaveChangesAsync();

            // THE WHOLE MODEL COMES BACK, not the row that changed — the same
            // reason SCR-W4 returns its whole register. One activity's progress
            // moves every BOQ line it is linked to, every contract roll-up above
            // those, the project's physical %, and with it EV, SPI and CPI.
            return Results.Ok(await Build(db, projectId));
        });
    }

    // ── the model ────────────────────────────────────────────────────────

    private static async Task<ProgressResponse?> Build(EpmDb db, string projectId)
    {
        var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
        if (p is null) return null;

        // D-06 — "now" is the project data date, never DateTime.Now.
        var asOf = p.DataDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var contracts = await db.Contracts.AsNoTracking()
            .Where(c => c.ProjectId == projectId).OrderBy(c => c.Id).ToListAsync();
        var ids = contracts.Select(c => c.Id).ToList();

        var amendments = await db.ContractAmendments.AsNoTracking()
            .Where(x => ids.Contains(x.ContractId)).OrderBy(x => x.No).ToListAsync();
        var payments = await db.Payments.AsNoTracking()
            .Where(x => ids.Contains(x.ContractId)).ToListAsync();
        var allActivities = await db.Activities.AsNoTracking()
            .Where(a => ids.Contains(a.ContractId))
            .OrderBy(a => a.ContractId).ThenBy(a => a.ActivityId).ToListAsync();

        var activityRows = new List<ProgressActivityDto>();
        var boqRows = new List<ProgressBoqDto>();
        var contractRows = new List<ProgressContractDto>();

        var effectiveValues = new List<decimal>();
        decimal projectExecuted = 0m;
        decimal plannedWeighted = 0m, plannedBasis = 0m;

        foreach (var c in contracts)
        {
            // BR-09 — the value IN FORCE: original plus APPLIED amendments only.
            // An approved-but-unapplied order is a projection and enters nothing
            // (02 §9), so it cannot inflate a denominator here either.
            var effective = EffectiveValue(c, amendments);
            effectiveValues.Add(effective);

            var acts = allActivities.Where(a => a.ContractId == c.Id).ToList();
            var derived = await BoqEndpoints.Derive(db, c.Id, "cost");

            // Which BOQ lines each activity feeds — read off the SAME derivation
            // the reflection table below is built from, so the two cannot name
            // different lines.
            var feeds = new Dictionary<string, List<string>>();
            foreach (var d in derived)
                foreach (var link in d.Links)
                {
                    if (!feeds.TryGetValue(link.Activity.ActivityId, out var list))
                        feeds[link.Activity.ActivityId] = list = [];
                    list.Add(d.Item.Code);
                }

            // BR-02's denominator, milestones excluded (02 §2) — the same basis
            // SCR-W5's absolute-weight column divides by.
            var assignable = acts.Where(a => !a.IsMilestone).ToList();
            var costTotal = assignable.Sum(a => a.BudgetedCost);

            foreach (var a in acts)
            {
                var actPlanned = PlannedProgress.PlannedPct(a.BaselineStart, a.BaselineFinish, asOf);
                var weight = a.IsMilestone
                    ? 0m
                    : ScheduleWeights.For(a.BudgetedCost, costTotal, costTotal).Absolute;

                // The project's planned figure is rolled up on the SAME cost
                // weights physical % uses — that is the whole reason SPI here
                // compares like with like (P-53).
                plannedWeighted += a.IsMilestone ? 0m : a.BudgetedCost * actPlanned / 100m;
                plannedBasis += a.IsMilestone ? 0m : a.BudgetedCost;

                activityRows.Add(new ProgressActivityDto(
                    a.ActivityId, a.NameAr, a.NameEn, c.Id, a.WbsPath, a.Status,
                    Q(a.ProgressPct), Q(actPlanned), Q(weight),
                    a.OriginalDuration, a.RemainingDuration,
                    a.IsMilestone, a.IsCritical,
                    a.BaselineStart?.ToString("yyyy-MM-dd"),
                    a.BaselineFinish?.ToString("yyyy-MM-dd"),
                    feeds.TryGetValue(a.ActivityId, out var codes) ? codes : []));
            }

            foreach (var d in derived)
                boqRows.Add(new ProgressBoqDto(
                    d.Item.Code, d.Item.DescriptionAr, d.Item.DescriptionEn, c.Id, d.Item.Unit,
                    Q(d.Line.Qty), M(d.Line.Amount),
                    Q(d.Progress.Progress), Q(d.Progress.AchievedQty),
                    M(d.Progress.AchievedAmount), M(d.Progress.RemainingValue),
                    d.Coverage,
                    d.Links.Select(l => new ProgressContributorDto(
                        l.Activity.ActivityId, l.Activity.NameAr, l.Activity.NameEn,
                        Q(l.SharePct), Q(l.Activity.ProgressPct))).ToList()));

            // 02 §4 — "contract executed value = Σ achievedAmount of its BOQ
            // items". Summed at FULL precision and rounded once (P-49).
            var executed = derived.Sum(d => d.Progress.AchievedAmount);
            var billed = derived.Sum(d => d.Line.Amount);
            projectExecuted += executed;

            var cPlannedBasis = assignable.Sum(a => a.BudgetedCost);
            var cPlannedWeighted = acts.Where(a => !a.IsMilestone)
                .Sum(a => a.BudgetedCost * PlannedProgress.PlannedPct(a.BaselineStart, a.BaselineFinish, asOf) / 100m);

            contractRows.Add(new ProgressContractDto(
                c.Id, c.NameAr, c.NameEn, c.Status,
                M(effective), M(executed),
                // Physical % is executed ÷ WHAT WAS BILLED, not ÷ the contract
                // value: a bill that does not add up to its contract is a real
                // state (nothing has been imported for CNT-0148), and dividing
                // by the contract value there would report 0% against a bill
                // that is fully done.
                Q(ProgressReflection.Rollup(billed, executed)),
                Q(ProgressReflection.Rollup(cPlannedBasis, cPlannedWeighted)),
                acts.Count, derived.Count));
        }

        // BR-00 over BR-09 — the project value is Σ EFFECTIVE contract values.
        var projectTotal = ProjectValue.Total(effectiveValues);

        // P-26's rule: disbursed counts PAID only, never merely certified.
        var disbursed = payments.Where(x => x.Status == "paid").Sum(x => x.NetAmount);

        var billedTotal = boqRows.Sum(b => b.Amount);
        var physical = ProgressReflection.Rollup(billedTotal, projectExecuted);
        var financial = ProgressReflection.Rollup(projectTotal, disbursed);
        var planned = ProgressReflection.Rollup(plannedBasis, plannedWeighted);

        // BR-10, through the same function SCR-E5 uses, so the two screens can
        // never report different delays for one project.
        var worst = WorstDelay(contracts, amendments);

        // BR-11 — progress is a FRACTION here, matching Domain/EarnedValue.
        var evm = EarnedValue.For(projectTotal, planned / 100m, physical / 100m, disbursed);

        // ── الشكل 26 — حسب هيكل التجزئة ──────────────────────────────────
        // The tree is materialised from `Activities.WbsPath`/`WbsNames` exactly
        // as SCR-W5 builds its own (01 §2.5): the node names travel with the
        // activities and there is no second table.
        //
        // A NODE HAS NO PROGRESS OF ITS OWN. Every figure here is rolled up
        // from the activities beneath it on cost weights, which is the plate's
        // «محسوبة صعودًا من الأنشطة المرجّحة بالكلفة» and `02 §4`'s own rule.
        var wbsRows = new List<ProgressWbsDto>();
        foreach (var c in contracts)
        {
            var acts = allActivities
                .Where(a => a.ContractId == c.Id && !a.IsMilestone
                         && !string.IsNullOrWhiteSpace(a.WbsPath))
                .ToList();
            var contractBasis = acts.Sum(a => a.BudgetedCost);

            var names = new Dictionary<string, string>();
            foreach (var a in acts)
            {
                var segs = a.WbsPath.Split(PathSep, StringSplitOptions.RemoveEmptyEntries);
                var parts = a.WbsNames.Split(NameSep, StringSplitOptions.TrimEntries);
                for (var i = 0; i < segs.Length; i++)
                {
                    var path = string.Join(PathSep, segs.Take(i + 1));
                    if (!names.ContainsKey(path))
                        names[path] = i < parts.Length ? parts[i] : path;
                }
            }

            foreach (var path in names.Keys.OrderBy(k => k, StringComparer.Ordinal))
            {
                // Everything filed at this node OR beneath it — a node's figure
                // is its whole subtree, not the activities filed directly on it.
                var under = acts
                    .Where(a => a.WbsPath == path
                             || a.WbsPath.StartsWith(path + PathSep, StringComparison.Ordinal))
                    .ToList();
                if (under.Count == 0) continue;

                var basis = under.Sum(a => a.BudgetedCost);
                var done = under.Sum(a => a.BudgetedCost * a.ProgressPct / 100m);
                var plan = under.Sum(a =>
                    a.BudgetedCost * PlannedProgress.PlannedPct(a.BaselineStart, a.BaselineFinish, asOf) / 100m);

                var nodeProgress = ProgressReflection.Rollup(basis, done);
                var nodePlanned = ProgressReflection.Rollup(basis, plan);

                wbsRows.Add(new ProgressWbsDto(
                    path, names[path], names[path],
                    path.Count(ch => ch == PathSep) + 1, c.Id,
                    Q(nodeProgress), Q(nodePlanned), Q(nodeProgress - nodePlanned),
                    Q(ScheduleWeights.For(basis, contractBasis, contractBasis).Absolute),
                    under.Count,
                    under.All(a => a.ProgressPct >= 100m)));
            }
        }

        // ── الشكل 27 — الأثر والكلفة ─────────────────────────────────────
        // 02 §9's rule, at the level the plate states it: APPLIED amendments
        // are already inside the revised cost, and approved-but-unapplied ones
        // are counted separately and carried into nothing.
        var appliedOrders = amendments.Where(a => a.AppliedAt is not null).ToList();
        var pendingOrders = amendments.Where(a => a.AppliedAt is null).ToList();

        // `Domain/ScheduleImpact` — the same estimate الشكل 23 draws, summed
        // over every slipped activity in the project rather than one contract.
        var delayCost = allActivities
            .Where(a => !a.IsMilestone && a.BaselineFinish is not null && a.ForecastFinish is not null)
            .Sum(a => ScheduleImpact.For(
                a.BudgetedCost, a.OriginalDuration,
                a.ForecastFinish!.Value.DayNumber - a.BaselineFinish!.Value.DayNumber).CostImpact);

        var costImpact = new ProgressCostImpactDto(
            M(disbursed), M(projectTotal),
            Q(ProgressReflection.Rollup(projectTotal, disbursed)),
            Money(evm.Eac), Money(evm.Vac),
            worst.Days ?? 0, M(delayCost),
            M(appliedOrders.Sum(a => a.DeltaValue)), appliedOrders.Count,
            M(pendingOrders.Sum(a => a.DeltaValue)), pendingOrders.Count);

        // ── الشكل 28 — مخاطر الجدول ──────────────────────────────────────
        // The threshold is DECLARED, and the plate prints it on the card: «الحد:
        // أكثر من 10 أيام». It turns a judgement about which slips matter into a
        // stated rule, which is the whole point of the tab.
        const int atRiskThreshold = 10;

        var slipped = allActivities
            .Where(a => !a.IsMilestone && a.BaselineFinish is not null && a.ForecastFinish is not null)
            .Select(a => new
            {
                Act = a,
                Slip = a.ForecastFinish!.Value.DayNumber - a.BaselineFinish!.Value.DayNumber,
            })
            .ToList();

        var atRisk = slipped
            .Where(x => x.Slip > atRiskThreshold)
            .OrderByDescending(x => x.Slip)
            .Select(x => new ProgressAtRiskDto(
                x.Act.ActivityId, x.Act.NameAr, x.Act.NameEn, x.Act.ContractId,
                x.Act.Status, x.Act.IsCritical, Q(x.Act.TotalFloat), x.Slip,
                x.Act.BaselineFinish?.ToString("yyyy-MM-dd"),
                x.Act.ForecastFinish?.ToString("yyyy-MM-dd")))
            .ToList();

        var scheduleRisk = new ProgressScheduleRiskDto(
            worst.Days ?? 0,
            allActivities.Count(a => a.IsCritical),
            allActivities.Count(a => !a.IsMilestone),
            allActivities.Count(a => !a.IsMilestone && a.TotalFloat < 0m),
            atRisk.Count,
            atRiskThreshold,
            atRisk);

        // ── الشكل 25 — تحديثات الإنجاز (واردة من الأقسام) ────────────────
        // RECORDED, never entered here. The same rows Domain/ProgressSeries
        // draws SCR-W1's actual line from, so the table and the curve are one
        // source read twice.
        var events = await db.ContractActivityEvents.AsNoTracking()
            .Where(e => ids.Contains(e.ContractId) && e.Action == "progress" && e.After != null)
            .OrderByDescending(e => e.At)
            .Select(e => new { e.At, e.ContractId, e.Before, e.After, e.ActorName, e.ActorParty })
            .ToListAsync();

        var updateRows = events
            .Where(e => decimal.TryParse(e.After, out _))
            .Select(e => new ProgressUpdateDto(
                e.At.ToString("yyyy-MM-dd"), e.ContractId,
                decimal.TryParse(e.Before, out var b) ? Q(b) : null,
                Q(decimal.Parse(e.After!)),
                e.ActorName, e.ActorParty))
            .ToList();

        return new ProgressResponse(
            p.Id, p.NameAr, p.NameEn, p.DataDate?.ToString("yyyy-MM-dd"),
            new ProgressHeadline(
                Q(physical), Q(financial), Q(planned),
                worst.Days, worst.Baseline, worst.Forecast),
            new ProgressEvm(
                M(projectTotal), M(evm.Pv), M(evm.Ev), M(evm.Ac),
                R(evm.Cpi), R(evm.Spi), Money(evm.Eac), Money(evm.Vac)),
            contractRows, activityRows, boqRows,
            wbsRows, costImpact, scheduleRisk, updateRows);
    }

    /// <summary>The WBS path separator, and the one `01 §2.5` fixes.</summary>
    private const char PathSep = '.';

    /// <summary>`WbsNames` is slash-separated and positionally matched to the path.</summary>
    private const char NameSep = '/';

    /// <summary>
    /// BR-09 — original + APPLIED amendment deltas. Approved-but-unapplied is a
    /// projection and is deliberately absent (02 §9).
    /// </summary>
    private static decimal EffectiveValue(Contract c, List<ContractAmendment> all)
    {
        var mine = all.Where(x => x.ContractId == c.Id)
            .Select(x => new Amendments.Delta(x.No, x.DeltaValue, x.DeltaDays, x.AppliedAt != null))
            .ToList();

        return Amendments.Effective(
            new Amendments.Version(0, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays),
            mine).Value;
    }

    /// <summary>
    /// The project's delay is its WORST contract's, against the finish in force
    /// (BR-09) — measuring against the original would report a project as late
    /// by precisely the extension it was formally granted.
    /// </summary>
    private static (int? Days, string? Baseline, string? Forecast) WorstDelay(
        List<Contract> contracts, List<ContractAmendment> amendments)
    {
        (int Days, DateOnly Baseline, DateOnly Forecast)? worst = null;

        foreach (var c in contracts)
        {
            if (c.ForecastFinish is null) continue;

            var mine = amendments.Where(x => x.ContractId == c.Id)
                .Select(x => new Amendments.Delta(x.No, x.DeltaValue, x.DeltaDays, x.AppliedAt != null))
                .ToList();
            var finish = Amendments.Effective(
                new Amendments.Version(0, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays),
                mine).Finish;

            var days = Penalty.DelayDays(finish, c.ForecastFinish.Value);
            if (worst is null || days > worst.Value.Days)
                worst = (days, finish, c.ForecastFinish.Value);
        }

        return worst is null
            ? (null, null, null)
            : (worst.Value.Days,
               worst.Value.Baseline.ToString("yyyy-MM-dd"),
               worst.Value.Forecast.ToString("yyyy-MM-dd"));
    }

    // Same transport precision as SCR-W4 and SCR-W5 (P-49): money 2dp,
    // percentages 4dp. An index is 2dp because that is how `02 §11` prints it.
    private static decimal M(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
    private static decimal Q(decimal v) => Math.Round(v, 4, MidpointRounding.AwayFromZero);
    private static decimal? R(decimal? v) => v is null ? null : Math.Round(v.Value, 2, MidpointRounding.AwayFromZero);
    private static decimal? Money(decimal? v) => v is null ? null : M(v.Value);
}
