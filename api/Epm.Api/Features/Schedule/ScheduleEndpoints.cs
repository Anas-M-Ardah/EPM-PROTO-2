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

            var rows = Build(activities, Basis, contractTotal, p.DataDate);

            var acts = activities.Where(a => !a.IsMilestone).ToList();
            var achieved = acts.Sum(a => Basis(a) * a.ProgressPct / 100m);

            var summary = new ScheduleSummary(
                acts.Count,
                activities.Count(a => a.IsMilestone),
                activities.Count(a => a.IsCritical),
                activities.Count(a => a.Status == "delayed"),
                Q(ProgressReflection.Rollup(contractTotal, achieved)),
                useMh ? "mh" : "cost",
                manHoursAvailable);

            var countByStatus = activities
                .GroupBy(a => a.Status)
                .ToDictionary(g => g.Key, g => g.Count());

            return Results.Ok(new ScheduleResponse(
                p.Id, p.NameAr, p.NameEn,
                c.Id, c.NameAr, c.NameEn,
                rows,
                Timeline(activities, p.DataDate),
                summary,
                countByStatus));
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
        List<Activity> activities, Func<Activity, decimal> basis, decimal contractTotal, DateOnly? dataDate)
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
                rows.Add(Row(a, basis, contractTotal, g.Total, level + 1));
        }

        // Activities filed under no WBS node at all. They follow the tree rather
        // than vanish — an unclassified activity is still work in the contract.
        foreach (var a in activities.Where(a => string.IsNullOrWhiteSpace(a.WbsPath))
                                    .OrderBy(a => a.ActivityId, StringComparer.Ordinal))
            rows.Add(Row(a, basis, contractTotal, contractTotal, 1));

        return rows;
    }

    private static ScheduleRowDto Row(
        Activity a, Func<Activity, decimal> basis, decimal contractTotal, decimal parentTotal, int level)
    {
        var w = ScheduleWeights.For(basis(a), contractTotal, parentTotal);

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
            Slip(a.BaselineFinish, a.ForecastFinish));
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
