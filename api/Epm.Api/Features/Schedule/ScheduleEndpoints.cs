using Epm.Api.Data;
using Epm.Api.Features.Workspaces;
using Epm.Api.Data.Entities;
using Epm.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Schedule;

/// <summary>
/// SCR-W5 — the project workspace Schedule module (`04 §5`).
/// PORTED from the v1.1 schedule module: ../epm@design/system-revamp
/// app/schedule-module.jsx `DGantt` :80 · `DSchedTable` :257 · `DModSchedule` :437.
///
/// ── THE WBS IS A PATH STRING, AND THE TREE IS BUILT HERE ─────────────────
/// `Activities.WbsPath` is "1.2.3" and `WbsNames` is "المبنى أ / الإنشائي /
/// الأعمدة" (01 §2.5). There is no WBS table: a self-referencing one bought
/// nothing, because the tree is only ever rendered whole, from one contract's
/// activities. So this file splits the paths, materialises every ancestor node
/// once, and emits ONE FLAT ORDERED LIST of nodes and activities.
///
/// The browser never rebuilds that tree. It renders the list in order, indents
/// by `Level`, and hides a subtree by matching `Path` — which is also why a
/// collapse cannot desynchronise from the data.
///
/// ── TWO WEIGHTS, TWO DENOMINATORS (BR-02) ────────────────────────────────
///   ABSOLUTE  ÷ every activity in the CONTRACT   — drives BR-03 and BR-11
///   RELATIVE  ÷ the activity's PARENT WBS NODE   — `02 §2`'s worked example
/// A root-level node's parent is the contract, so its two weights are equal.
/// That is not a bug; it is what "root: ÷ total" means.
///
/// ── PROGRESS ROLLS UP BY WEIGHT, NOT BY DURATION ─────────────────────────
/// `02 §4`: "Project physical % rolls up by weight." The reference rolls up by
/// ORIGINAL DURATION instead, which makes a long cheap activity outrank a short
/// expensive one. The spec owns the arithmetic (P-51).
///
/// ── NO ARITHMETIC OF ITS OWN ─────────────────────────────────────────────
/// Weights come from Domain/ScheduleWeights (BR-02), the roll-up from
/// Domain/ProgressReflection (BR-04), the slip from Domain/Penalty.DelayDays
/// (BR-10). This file splits paths, groups, sorts and projects.
/// </summary>
public static class ScheduleEndpoints
{
    /// <summary>Days of chart drawn past the last bar so it is not flush with the edge.</summary>
    private const int TailDays = 20;

    public static void MapScheduleEndpoints(this WebApplication app)
    {
        // [EP-SCD-01] GET /api/projects/{projectId}/schedule
        // web: schedule/schedule.api.ts gate() → schedule.page.ts
        // spec: 04 §5 | rules: — | tables: Projects · Contracts · Activities
        //
        // The same gate as SCR-W4, for the same reason: an activity belongs to
        // exactly one contract (01 §1), so a programme spanning two of them
        // would be a schedule for no contract at all.
        app.MapGet("/api/projects/{projectId}/schedule", async (EpmDb db, HttpContext http, string projectId) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(http, p.WorkspaceCode) is { } denied) return denied;

            var contracts = await db.Contracts.AsNoTracking()
                .Where(c => c.ProjectId == projectId).OrderBy(c => c.Id).ToListAsync();

            var ids = contracts.Select(c => c.Id).ToList();
            var counts = await db.Activities.AsNoTracking()
                .Where(a => ids.Contains(a.ContractId))
                .GroupBy(a => a.ContractId)
                .Select(g => new { g.Key, N = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.N);

            var options = contracts
                .Select(c => new ScheduleContractOption(
                    c.Id, c.NameAr, c.NameEn, c.Status,
                    counts.TryGetValue(c.Id, out var n) ? n : 0))
                .ToList();

            return Results.Ok(new ScheduleGateResponse(p.Id, p.NameAr, p.NameEn, options));
        });

        // [EP-SCD-02] GET /api/projects/{projectId}/schedule/{contractId}
        // web: schedule/schedule.api.ts get() → schedule.page.ts
        // spec: 04 §5 | rules: BR-02, BR-04, BR-10
        // tables: Projects · Contracts · Activities
        app.MapGet("/api/projects/{projectId}/schedule/{contractId}",
            async (EpmDb db, HttpContext http, string projectId, string contractId, string? basis) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(http, p.WorkspaceCode) is { } denied) return denied;

            var c = await db.Contracts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == contractId);
            // CONTRACT SCOPING, CHECKED HERE WHERE IT CAN BE READ (P-01).
            if (c is null || c.ProjectId != projectId)
                return Results.NotFound(new
                {
                    message = $"contract {contractId} not found in project {projectId}",
                });

            var activities = await db.Activities.AsNoTracking()
                .Where(a => a.ContractId == contractId)
                .OrderBy(a => a.WbsPath).ThenBy(a => a.ActivityId)
                .ToListAsync();

            var wantMh = basis == "mh";

            // 02 §2 — milestones carry zero basis and are excluded from
            // allocation, so they are out of every denominator too.
            var assignable = activities.Where(a => !a.IsMilestone).ToList();
            var manHoursAvailable = assignable.Count > 0
                && assignable.All(a => a.BudgetedManHours is > 0m);
            var useMh = wantMh && manHoursAvailable;

            decimal Basis(Activity a) => a.IsMilestone
                ? 0m
                : useMh ? a.BudgetedManHours ?? 0m : a.BudgetedCost;

            var contractTotal = assignable.Sum(Basis);

            // ROADMAP 4.5 — one query for the whole schedule, then a badge per
            // activity row. The same trade SCR-W4 makes on the bill.
            var marks = await Marks(db, contractId);

            var rows = Build(activities, Basis, contractTotal, p.DataDate, marks);

            var acts = activities.Where(a => !a.IsMilestone).ToList();
            var achieved = acts.Sum(a => Basis(a) * a.ProgressPct / 100m);

            // ── ملحق الشكل 21's headline: خط الأساس → المتوقع = التأخر ──────
            // The programme's own dates, which are the LATEST finish on either
            // side rather than the contract's recorded ones: a schedule ends
            // when its last activity does. `Slip` is signed here on purpose —
            // see the DTO note; a programme running ahead prints a negative.
            var blFinish = activities.Where(a => a.BaselineFinish is not null)
                .Select(a => a.BaselineFinish!.Value).DefaultIfEmpty().Max();
            var fcFinish = activities.Where(a => a.ForecastFinish is not null)
                .Select(a => a.ForecastFinish!.Value).DefaultIfEmpty().Max();

            var floats = activities.Where(a => !a.IsMilestone).Select(a => a.TotalFloat).ToList();

            var summary = new ScheduleSummary(
                acts.Count,
                activities.Count(a => a.IsMilestone),
                activities.Count(a => a.IsCritical),
                activities.Count(a => a.Status == "delayed"),
                Q(ProgressReflection.Rollup(contractTotal, achieved)),
                useMh ? "mh" : "cost",
                manHoursAvailable,
                blFinish == default ? null : Iso(blFinish),
                fcFinish == default ? null : Iso(fcFinish),
                blFinish == default || fcFinish == default ? null : Slip(blFinish, fcFinish),
                floats.Count > 0 ? (int)Math.Round(floats.Min()) : null);

            var countByStatus = activities
                .GroupBy(a => a.Status)
                .ToDictionary(g => g.Key, g => g.Count());

            // ── الشكل 23 · المقارنة والأثر ────────────────────────────────
            // MILESTONES ARE EXCLUDED. A milestone has no duration and no cost,
            // so it has no daily rate — it can be late, and that shows on the
            // Gantt, but it cannot accrue prolongation overhead.
            var impact = activities
                .Where(a => !a.IsMilestone)
                .Select(a => new { Act = a, Slip = Slip(a.BaselineFinish, a.ForecastFinish) ?? 0 })
                .Where(x => x.Slip > 0)
                .OrderByDescending(x => x.Slip)
                .Select(x =>
                {
                    var r = ScheduleImpact.For(x.Act.BudgetedCost, x.Act.OriginalDuration, x.Slip);
                    return new ScheduleImpactRow(
                        x.Act.ActivityId, x.Act.NameAr, x.Act.NameEn, x.Act.Status, x.Act.IsCritical,
                        Iso(x.Act.BaselineStart), Iso(x.Act.BaselineFinish),
                        Iso(x.Act.ActualStart ?? x.Act.BaselineStart), Iso(x.Act.ForecastFinish),
                        x.Act.OriginalDuration, x.Act.OriginalDuration + r.SlipDays,
                        Q(ScheduleImpact.FloatBefore(x.Act.TotalFloat, r.SlipDays)), Q(x.Act.TotalFloat),
                        r.SlipDays,
                        M(x.Act.BudgetedCost), M(r.DailyRate), M(r.DailyOverhead), M(r.CostImpact));
                })
                .ToList();

            // ── «أصبحت حرجة», WHICH IS NOT «منها على المسار الحرج» ──────────
            // The label was the second and the plate asks for the first: which
            // activities the slip PUT on the critical path, not which of the
            // affected rows happen to be on it — the register prints that one
            // row by row already.
            //
            // The test is the plate's own arithmetic. ملحق الشكل 23 works A2 at
            // «الأساس … عوم 7 · الحالي … عوم 2» over a 5-day slip, which is
            // `ScheduleImpact.FloatBefore` exactly: before = after + slip. So an
            // activity critical now that carried float before is one the slip
            // moved onto the path.
            //
            // ── AND ITS LIMIT, STATED (P-194) ──────────────────────────────
            // Under that model an activity that was ALREADY critical also reads
            // as newly critical, because floor-zero float plus a slip is still
            // a positive "before". Separating the two needs the baseline's own
            // float RECORDED at «تثبيت خط الأساس» (المسار 4 step 8), and
            // `EP-SCD-06` deliberately does not write float — its comment says
            // criticality belongs to the schedule in force. So this figure means
            // «critical and slipped» until that column exists; the plate's own
            // model cannot say more, and the reference only can because its
            // comparison is fixture data rather than a derivation.
            var nowCritical = impact.Count(i => i.IsCritical && i.FloatBefore > 0m);

            var impactSummary = new ScheduleImpactSummary(
                impact.Count,
                nowCritical,
                M(impact.Sum(i => i.CostImpact)),
                ScheduleImpact.OverheadPct,
                // «مضافة» — outside the baseline, not merely late. An activity
                // with no baseline dates is one no approved baseline contains.
                activities.Count(a => a.BaselineStart is null && a.BaselineFinish is null));

            return Results.Ok(new ScheduleResponse(
                p.Id, p.NameAr, p.NameEn,
                c.Id, c.NameAr, c.NameEn,
                rows,
                Timeline(activities, p.DataDate),
                summary,
                countByStatus,
                impact,
                impactSummary,
                await Baselines(db, c)));
        });

        // [EP-SCD-03] GET /api/projects/{projectId}/schedule/{contractId}/activities/{activityId}/amendments
        // web: schedule/schedule.api.ts amendments() → schedule.page.ts
        // spec: 04 §6 · ROADMAP 4.5 | rules: BR-09, AmendmentDisclosure
        // tables: Activities · ChangeOrders · ChangeOrderActivities
        //
        // The same drawer EP-BOQ-17 fills for a BOQ line, over an activity's
        // days instead of a line's quantities. One question, one component, two
        // owners — which is what `04 §6` asks for and what ROADMAP 4.5 means by
        // «identical for BOQ items and activities».
        app.MapGet("/api/projects/{projectId}/schedule/{contractId}/activities/{activityId}/amendments",
            async (EpmDb db, HttpContext http, string projectId, string contractId, string activityId) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(http, p.WorkspaceCode) is { } denied) return denied;

            var c = await db.Contracts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == contractId);
            if (c is null || c.ProjectId != projectId)
                return Results.NotFound(new
                {
                    message = $"contract {contractId} not found in project {projectId}",
                });

            var a = await db.Activities.AsNoTracking()
                .FirstOrDefaultAsync(x => x.ContractId == contractId && x.ActivityId == activityId);
            if (a is null)
                return Results.NotFound(new
                {
                    message = $"activity {activityId} not found in contract {contractId}",
                });

            var touches = (await Touches(db, contractId)).GetValueOrDefault(a.Id) ?? [];

            // The state BEFORE any order reached it — the first order's own
            // record of it. `Activities` has already moved, so it cannot answer.
            var first = await db.ChangeOrderActivities.AsNoTracking()
                .Where(x => x.ActivityId == a.Id)
                .OrderBy(x => x.Id)
                .FirstOrDefaultAsync();

            var r = AmendmentDisclosure.ForActivity(
                first?.BeforeRemainingDuration ?? a.RemainingDuration,
                first?.BeforeFinish ?? a.ForecastFinish,
                touches);

            return Results.Ok(new ScheduleAmendmentDetail(
                a.ActivityId, a.NameAr, a.NameEn,
                r.Count, r.AppliedCount, r.PendingCount, r.State,
                r.OriginalRemaining, r.EffectiveRemaining, r.PendingRemaining,
                Iso(r.OriginalFinish), Iso(r.EffectiveFinish), Iso(r.PendingFinish),
                r.Chain.Select(s => new ScheduleAmendmentStep(
                    s.No, Iso(s.At), s.IsApplied,
                    s.RemainingFrom, s.RemainingTo, Iso(s.FinishFrom), Iso(s.FinishTo))).ToList()));
        });
    }

    // ── the flat ordered tree ────────────────────────────────────────────

    /// <summary>
    /// Materialises every WBS node named by an activity's path, then emits
    /// nodes and activities interleaved in path order.
    ///
    /// The node names come from `WbsNames` — slash-separated and positionally
    /// matched to `WbsPath` — so building the tree needs no second table and no
    /// second query (01 §2.5).
    /// </summary>
    private static List<ScheduleRowDto> Build(
        List<Activity> activities, Func<Activity, decimal> basis, decimal contractTotal, DateOnly? dataDate,
        IReadOnlyDictionary<int, ScheduleAmendmentMark> marks)
    {
        // path → display name, discovered from the activities that live under it
        var nodeNames = new Dictionary<string, string>();
        foreach (var a in activities)
        {
            if (string.IsNullOrWhiteSpace(a.WbsPath)) continue;
            var segs = a.WbsPath.Split('.', StringSplitOptions.RemoveEmptyEntries);
            var names = a.WbsNames.Split('/', StringSplitOptions.TrimEntries);
            for (var i = 0; i < segs.Length; i++)
            {
                var path = string.Join('.', segs.Take(i + 1));
                if (nodeNames.ContainsKey(path)) continue;
                nodeNames[path] = i < names.Length ? names[i] : path;
            }
        }

        // Σ basis beneath each node, and the weighted progress with it.
        var agg = nodeNames.Keys.ToDictionary(k => k, _ => (Total: 0m, Done: 0m));
        foreach (var a in activities)
        {
            if (a.IsMilestone) continue;
            var b = basis(a);
            foreach (var path in Ancestors(a.WbsPath))
            {
                if (!agg.ContainsKey(path)) continue;
                var g = agg[path];
                agg[path] = (g.Total + b, g.Done + b * a.ProgressPct / 100m);
            }
        }

        decimal ParentTotal(string path)
        {
            var parent = Parent(path);
            // 02 §2 — "root: ÷ total". A top-level node's parent IS the contract.
            return parent is null ? contractTotal
                : agg.TryGetValue(parent, out var g) ? g.Total : contractTotal;
        }

        var rows = new List<ScheduleRowDto>();

        // Nodes and activities in one ordered walk. Sorting by path puts a node
        // immediately before everything beneath it, which is exactly the order
        // the Gantt renders.
        var keys = nodeNames.Keys
            .Select(k => (Path: k, Sort: SortKey(k)))
            .OrderBy(x => x.Sort, StringComparer.Ordinal)
            .ToList();

        foreach (var (path, _) in keys)
        {
            var g = agg[path];
            var level = path.Split('.').Length;
            var mine = activities.Where(a => a.WbsPath == path).ToList();
            var under = activities.Where(a => IsUnder(a.WbsPath, path)).ToList();

            var w = ScheduleWeights.For(g.Total, contractTotal, ParentTotal(path));

            rows.Add(new ScheduleRowDto(
                "wbs", path, nodeNames[path], nodeNames[path], path, level,
                // A node has no status of its own — it is the sum of its parts.
                "", Q(ProgressReflection.Rollup(g.Total, g.Done)),
                // A node's dates are the span of everything beneath it.
                Iso(under.Min(a => a.BaselineStart)),
                Iso(under.Max(a => a.BaselineFinish)),
                Iso(under.Where(a => a.ActualStart is not null).Min(a => a.ActualStart)),
                // Only when EVERY activity beneath it has actually finished.
                under.Count > 0 && under.All(a => a.ActualFinish is not null)
                    ? Iso(under.Max(a => a.ActualFinish)) : null,
                Iso(under.Max(a => a.ForecastFinish)),
                0, 0, null,
                // A node is critical when anything beneath it is: the ring says
                // "the project's finish runs through here", and it does.
                under.Any(a => a.IsCritical),
                false,
                Q(w.Relative), Q(w.Absolute),
                M(under.Sum(x => x.BudgetedCost)), "", "",
                Slip(under.Max(a => a.BaselineFinish), under.Max(a => a.ForecastFinish))));

            // An activity's PARENT is the node it is filed under — this node —
            // so its relative weight divides by THIS node's total, not by this
            // node's parent's. `ParentTotal(path)` above is the node's own
            // divisor and would make every activity's relative weight equal its
            // absolute one, which is `02 §2`'s example collapsing to nothing.
            foreach (var a in mine.OrderBy(a => a.ActivityId, StringComparer.Ordinal))
                rows.Add(Row(a, basis, contractTotal, g.Total, level + 1, marks.GetValueOrDefault(a.Id)));
        }

        // Activities filed under no WBS node at all. They follow the tree rather
        // than vanish — an unclassified activity is still work in the contract.
        foreach (var a in activities.Where(a => string.IsNullOrWhiteSpace(a.WbsPath))
                                    .OrderBy(a => a.ActivityId, StringComparer.Ordinal))
            rows.Add(Row(a, basis, contractTotal, contractTotal, 1, marks.GetValueOrDefault(a.Id)));

        return rows;
    }

    private static ScheduleRowDto Row(
        Activity a, Func<Activity, decimal> basis, decimal contractTotal, decimal parentTotal, int level,
        ScheduleAmendmentMark? mark)
    {
        var w = ScheduleWeights.For(basis(a), contractTotal, parentTotal);

        // ملحق الشكل 21's panel — the three money figures it prints beside the
        // slider. `earned` is BR-04 on one activity; the delay cost is D-15's,
        // through the SAME function الشكل 23 calls, and only where that plate
        // would count it: a milestone has no duration and so no daily rate.
        var slip = Slip(a.BaselineFinish, a.ForecastFinish);
        var earned = M(a.BudgetedCost * a.ProgressPct / 100m);

        decimal? delayCost = a.IsMilestone || slip is null or <= 0
            ? null
            : M(ScheduleImpact.For(a.BudgetedCost, a.OriginalDuration, slip.Value).CostImpact);

        return new ScheduleRowDto(
            "act", a.ActivityId, a.NameAr, a.NameEn, a.WbsPath, level,
            a.Status, Q(a.ProgressPct),
            Iso(a.BaselineStart), Iso(a.BaselineFinish),
            Iso(a.ActualStart), Iso(a.ActualFinish), Iso(a.ForecastFinish),
            a.OriginalDuration, a.RemainingDuration,
            a.IsMilestone ? null : Q(a.TotalFloat),
            a.IsCritical, a.IsMilestone,
            Q(w.Relative), Q(w.Absolute),
            M(a.BudgetedCost), a.Calendar, a.Predecessors,
            slip,
            mark,
            earned, M(a.BudgetedCost) - earned, delayCost);
    }

    // ── ROADMAP 4.5 · 04 §6 — which orders touched which activity ────────
    //
    // The schedule half of the disclosure SCR-W4 gives the bill, over the same
    // `Domain/AmendmentDisclosure`. An activity moves DAYS, so the touch is a
    // signed day count and the finish follows it.
    //
    // APPLIED IS READ FROM THE ACTIVITY ROW, not the order: `AppliedDeltaDays`
    // is written activity by activity by the apply run (`03 §9` step 6), so a
    // partially applied order marks what it actually moved.
    //
    // The PENDING figure is the APPROVED day count, and falls back to the
    // analysis figure when the committee has not fixed one — `03 §9` tab 3
    // keeps the three counts apart deliberately, and the requested one is the
    // contractor's ask, which discloses nothing about the contract.
    private static async Task<Dictionary<int, List<AmendmentDisclosure.ActivityTouch>>> Touches(
        EpmDb db, string contractId)
    {
        var orders = await db.ChangeOrders.AsNoTracking()
            .Where(o => o.ContractId == contractId
                     && (o.Lifecycle == "approved" || o.Lifecycle == "applied_partial" || o.Lifecycle == "closed"))
            .OrderBy(o => o.No)
            .ToListAsync();
        if (orders.Count == 0) return [];

        var orderIds = orders.Select(o => o.Id).ToList();
        var coActs = await db.ChangeOrderActivities.AsNoTracking()
            .Where(a => orderIds.Contains(a.ChangeOrderId))
            .ToListAsync();

        var byActivity = new Dictionary<int, List<AmendmentDisclosure.ActivityTouch>>();

        foreach (var o in orders)
        foreach (var a in coActs.Where(a => a.ChangeOrderId == o.Id))
        {
            var applied = a.AppliedDeltaDays is not null;
            var days = applied
                ? a.AppliedDeltaDays!.Value
                : a.ApprovedDeltaDays ?? a.AnalysisDays ?? 0;

            // Nothing proposed and nothing approved is nothing to disclose.
            if (!applied && a.ApprovedDeltaDays is null && a.AnalysisDays is null) continue;

            if (!byActivity.TryGetValue(a.ActivityId, out var list))
                byActivity[a.ActivityId] = list = [];

            list.Add(new AmendmentDisclosure.ActivityTouch(
                o.No, o.DecisionDate ?? o.IncomingDate, applied, days));
        }

        return byActivity;
    }

    /// <summary>
    /// The badge's own facts, keyed by `Activity.Id`. Activities nothing has
    /// touched are absent from the map rather than present with a zero count —
    /// the row then carries no badge at all.
    /// </summary>
    private static async Task<Dictionary<int, ScheduleAmendmentMark>> Marks(EpmDb db, string contractId)
    {
        var touches = await Touches(db, contractId);
        if (touches.Count == 0) return [];

        // The ORIGINAL remaining duration is the one the FIRST order recorded
        // as `BeforeRemainingDuration` — `Activities.RemainingDuration` has
        // already moved by every applied order, so reading it here would make
        // the delta zero on exactly the rows that have one.
        var coActs = await db.ChangeOrderActivities.AsNoTracking()
            .Where(a => touches.Keys.Contains(a.ActivityId))
            .ToListAsync();

        var marks = new Dictionary<int, ScheduleAmendmentMark>();
        foreach (var (activityId, list) in touches)
        {
            var original = coActs
                .Where(a => a.ActivityId == activityId)
                .OrderBy(a => a.Id)
                .Select(a => a.BeforeRemainingDuration)
                .First();

            var r = AmendmentDisclosure.ForActivity(original, null, list);

            marks[activityId] = new ScheduleAmendmentMark(
                r.Count, r.AppliedCount, r.PendingCount, r.State,
                r.OriginalRemaining,
                r.EffectiveRemaining - r.OriginalRemaining,
                r.PendingRemaining is null ? null : r.PendingRemaining.Value - r.EffectiveRemaining,
                list.Select(t => new ScheduleAmendmentSource(t.No, t.IsApplied)).ToList());
        }

        return marks;
    }

    /// <summary>
    /// الشكل 23's «مرشح إصدار خط الأساس (جدول منقّح)».
    ///
    /// ONE ENTRY PER BASELINE THE CONTRACT HAS ACTUALLY HAD, and the list is
    /// built from `ScheduleImportVersions` rather than invented, because that
    /// table IS the record of every re-baseline: `EP-SCD-06` is the only route
    /// in the system that writes `Activities.BaselineStart/Finish`, and it
    /// stamps the version it wrote them from and supersedes the one before.
    ///
    /// `BL-0` is the baseline the contract started with — the programme that
    /// came in with the contract, before any P6 re-import. It is always first,
    /// and on a contract that has never been re-baselined it is the only entry,
    /// so the page renders a static field rather than a select.
    ///
    /// WHICH ONE IS CURRENT IS NOT A PREFERENCE. The slip, the float and the
    /// whole impact view are measured from the dates now sitting on
    /// `Activities`, so the current entry is the approved version that put them
    /// there — the newest `approved` row, or `BL-0` when there is none. A
    /// superseded entry is listed so a reader can see what the schedule USED to
    /// be measured against, never so the figures can be recomputed against it;
    /// that would report two schedules on one screen.
    ///
    /// An import still `submitted` is NOT here. It has changed nothing yet, and
    /// listing it would name a baseline no figure on the screen was measured
    /// from. It belongs to `EP-SCD-07`'s version list, which is where a pending
    /// submission is shown.
    /// </summary>
    private static async Task<List<ScheduleBaselineOption>> Baselines(EpmDb db, Contract c)
    {
        var versions = await db.ScheduleImportVersions.AsNoTracking()
            .Where(v => v.ContractId == c.Id && (v.State == "approved" || v.State == "superseded"))
            .OrderBy(v => v.No)
            .ToListAsync();

        // The newest APPROVED version owns the dates on `Activities` right now.
        // Everything else — every superseded row included — is history.
        var current = versions.LastOrDefault(v => v.State == "approved");

        var options = new List<ScheduleBaselineOption>
        {
            new("BL-0", "خط الأساس الأصلي", "Original baseline",
                c.Start.ToString("yyyy-MM-dd"), current is null),
        };

        options.AddRange(versions.Select(v => new ScheduleBaselineOption(
            $"BL-{v.No}",
            $"جدول منقّح — الإصدار {v.No}",
            $"Revised programme — version {v.No}",
            (v.ApprovedAt ?? v.At).ToString("yyyy-MM-dd"),
            current is not null && v.Id == current.Id)));

        return options;
    }

    /// <summary>
    /// Forecast − baseline, in days, SIGNED. Negative is early, and `A9` in the
    /// fixture is. `Penalty.DelayDays` floors at zero because a contract cannot
    /// be "negatively late" for penalty purposes (BR-10) — an activity can be
    /// early, and hiding that would lose the one on-track row on the screen.
    /// </summary>
    private static int? Slip(DateOnly? baseline, DateOnly? forecast) =>
        baseline is null || forecast is null ? null : forecast.Value.DayNumber - baseline.Value.DayNumber;

    private static ScheduleTimeline Timeline(List<Activity> activities, DateOnly? dataDate)
    {
        var starts = activities.Where(a => a.BaselineStart is not null).Select(a => a.BaselineStart!.Value).ToList();
        var ends = activities
            .SelectMany(a => new[] { a.BaselineFinish, a.ForecastFinish, a.ActualFinish })
            .Where(d => d is not null).Select(d => d!.Value).ToList();

        // An empty schedule still needs a chart the browser can divide by.
        var origin = starts.Count > 0 ? starts.Min() : dataDate ?? new DateOnly(2026, 1, 1);
        var last = ends.Count > 0 ? ends.Max() : origin.AddDays(30);
        var end = last.AddDays(TailDays);

        var months = new List<string>();
        for (var m = new DateOnly(origin.Year, origin.Month, 1); m <= end; m = m.AddMonths(1))
            months.Add(m.ToString("yyyy-MM-dd"));

        return new ScheduleTimeline(
            origin.ToString("yyyy-MM-dd"),
            end.ToString("yyyy-MM-dd"),
            // D-06 — "now" is the project data date, never DateTime.Now.
            (dataDate ?? origin).ToString("yyyy-MM-dd"),
            months);
    }

    // ── path helpers ─────────────────────────────────────────────────────

    private static IEnumerable<string> Ancestors(string path)
    {
        if (string.IsNullOrWhiteSpace(path)) yield break;
        var segs = path.Split('.', StringSplitOptions.RemoveEmptyEntries);
        for (var i = 0; i < segs.Length; i++) yield return string.Join('.', segs.Take(i + 1));
    }

    private static string? Parent(string path)
    {
        var i = path.LastIndexOf('.');
        return i < 0 ? null : path[..i];
    }

    private static bool IsUnder(string path, string node) =>
        path == node || path.StartsWith(node + ".", StringComparison.Ordinal);

    /// <summary>
    /// Sorts "1.10" AFTER "1.9" rather than before it. Plain string ordering on
    /// a dotted path is wrong the moment a WBS has ten children, and a Gantt
    /// with its rows out of order is a Gantt nobody trusts.
    /// </summary>
    private static string SortKey(string path) =>
        string.Join('.', path.Split('.').Select(s =>
            int.TryParse(s, out var n) ? n.ToString("D6") : s));

    private static string? Iso(DateOnly? d) => d?.ToString("yyyy-MM-dd");

    // Same transport precision as SCR-W4 (P-49): money 2dp, percentages 4dp.
    private static decimal M(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
    private static decimal Q(decimal v) => Math.Round(v, 4, MidpointRounding.AwayFromZero);
}
