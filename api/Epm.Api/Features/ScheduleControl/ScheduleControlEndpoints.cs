using Epm.Api.Data;
using Epm.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.ScheduleControl;

/// <summary>
/// SCR-E5 — Schedule Control, portfolio-wide schedule health (04 §2).
/// PORTED from DScheduleControl (v1.1), ../epm@design/system-revamp
/// app/enterprise-areas.jsx:8.
///
/// ── THE CRITICAL-ACTIVITIES FIGURE, AND WHERE IT CAME FROM ───────────────
/// The reference has a **critical activities** KPI and column. It derives them
/// like this:
///
///     const critical = p.status === 'stalled' ? 3 + (p.id.charCodeAt(6) % 3)
///                    : p.status === 'suspended' ? 2 : (p.id.charCodeAt(6) % 2);
///
/// That is a character of the project ID. It was fine in a clickable prototype
/// and unusable here, so until Phase 4.3 the figure was returned as NULL and
/// the tile said "unavailable + reason" — the treatment SCR-E1 gives physical
/// %, SPI and CPI (P-09).
///
/// **Phase 4.3 registered Activities and it is now a query**: `IsCritical` over
/// the project's contracts. It stays null — never 0 — for a project with no
/// schedule, and the KPI tile falls back to "unavailable" only when NO project
/// has one, which is the state an empty database is in.
///
/// `ScheduleRow` was already shaped for this and did not change (P-31 said it
/// would not). `ScheduleCounts` DID gain a member: the KPI band is counted on
/// the server, before the filters, so the portfolio total had nowhere else to
/// come from.
///
/// ── THE BASELINE IS THE EFFECTIVE FINISH ─────────────────────────────────
/// Delay is measured against the contractual finish IN FORCE — original plus
/// APPLIED amendment days (BR-09). Measuring against the original would report
/// a project as late by precisely the extension it was formally granted. That
/// is the error the whole amendment apparatus exists to prevent, and it would
/// show up here first.
///
/// Approved-but-unapplied extensions are NOT counted. A project whose extension
/// is approved but not applied is still late today (02 §9, non-negotiable #2).
///
/// ── NO ARITHMETIC OF ITS OWN ─────────────────────────────────────────────
/// Delay days come from Penalty.DelayDays (BR-10), which is the same figure the
/// penalty is charged on. Effective finishes come from Amendments.Effective
/// (BR-09). This file filters, joins, sorts and projects.
/// </summary>
public static class ScheduleControlEndpoints
{
    public static void MapScheduleControlEndpoints(this WebApplication app)
    {
        // [EP-SCT-01] GET /api/schedule-control?q=&state=&workspace=
        // web: schedule-control.api.ts list() → schedule-control.page.ts
        // spec: 04 §2 | rules: BR-09, BR-10
        // tables: Projects · Contracts · ContractAmendments · Workspaces
        app.MapGet("/api/schedule-control", async (
            EpmDb db,
            string? q,
            string? state,
            string? workspace) =>
        {
            var projectQuery = db.Projects.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(workspace))
                projectQuery = projectQuery.Where(p => p.WorkspaceCode == workspace);

            var projects = await projectQuery.OrderBy(p => p.Id).ToListAsync();
            var ids = projects.Select(p => p.Id).ToList();

            var contracts = await db.Contracts.AsNoTracking()
                .Where(c => ids.Contains(c.ProjectId))
                .Select(c => new
                {
                    c.Id, c.ProjectId, c.OriginalValue,
                    c.OriginalFinish, c.OriginalDurationDays, c.ForecastFinish,
                })
                .ToListAsync();

            var contractIds = contracts.Select(c => c.Id).ToList();
            var amendments = await db.ContractAmendments.AsNoTracking()
                .Where(a => contractIds.Contains(a.ContractId))
                .ToListAsync();

            var workspaces = await db.Workspaces.AsNoTracking().ToListAsync();

            // PHASE 4.3 — the two columns P-31 promised would become real.
            // Activities is registered now, so "has a P6 schedule been
            // imported" and "how many of its activities are critical" are
            // queries rather than constants. Neither the DTO nor the screen
            // changed, which is what P-31 said would happen.
            var activities = await db.Activities.AsNoTracking()
                .Where(a => contractIds.Contains(a.ContractId))
                .Select(a => new { a.ContractId, a.IsCritical })
                .ToListAsync();

            var rows = projects.Select(p =>
            {
                var mine = contracts.Where(c => c.ProjectId == p.Id).ToList();
                var ws = workspaces.FirstOrDefault(w => w.Code == p.WorkspaceCode);
                var mineIds = mine.Select(c => c.Id).ToList();
                var mineActivities = activities.Where(a => mineIds.Contains(a.ContractId)).ToList();

                // Per contract: the finish in force (BR-09) and, when a forecast
                // has been recorded, how late that contract is (BR-10).
                var perContract = mine.Select(c =>
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
                        c.Id,
                        OriginalFinish = c.OriginalFinish,
                        EffectiveFinish = effective.Finish,
                        c.ForecastFinish,
                        Delay = c.ForecastFinish is null
                            ? (int?)null
                            : Penalty.DelayDays(effective.Finish, c.ForecastFinish.Value),
                    };
                }).ToList();

                // The project finishes when its LAST contract finishes.
                DateOnly? baseline = perContract.Count == 0
                    ? null
                    : perContract.Max(c => c.EffectiveFinish);

                DateOnly? originalFinish = perContract.Count == 0
                    ? null
                    : perContract.Max(c => c.OriginalFinish);

                var forecasts = perContract.Where(c => c.ForecastFinish is not null).ToList();
                DateOnly? forecast = forecasts.Count == 0
                    ? null
                    : forecasts.Max(c => c.ForecastFinish!.Value);

                // The WORST contract, not the project-level date subtraction. A
                // contract that has slipped has slipped even when a longer
                // sibling contract hides it behind a later project finish.
                var worst = perContract
                    .Where(c => c.Delay is not null)
                    .OrderByDescending(c => c.Delay!.Value)
                    .FirstOrDefault();

                var delay = worst?.Delay;

                return new ScheduleRow(
                    p.Id, p.NameAr, p.NameEn,
                    p.WorkspaceCode, ws?.NameAr ?? p.WorkspaceCode, ws?.NameEn ?? p.WorkspaceCode,
                    p.Branch, p.Status,
                    mine.Count,
                    baseline?.ToString("yyyy-MM-dd"),
                    originalFinish?.ToString("yyyy-MM-dd"),
                    forecast?.ToString("yyyy-MM-dd"),
                    delay,
                    delay > 0 ? worst!.Id : null,
                    // Real since Phase 4.3. Null — not 0 — when the project has
                    // no schedule at all: "no critical activities" and "no
                    // schedule to have any" are different answers (P-09).
                    mineActivities.Count == 0 ? null : mineActivities.Count(a => a.IsCritical),
                    mineActivities.Count > 0);
            }).ToList();

            // Counted BEFORE the search and the state filter, so the KPI band
            // and the chips keep their numbers while a filter is applied.
            var delayed = rows.Where(r => r.DelayDays > 0).ToList();
            var onTrack = rows.Where(r => r.DelayDays == 0).ToList();
            var noSchedule = rows.Where(r => r.DelayDays is null).ToList();

            // Null, not 0, when nothing has been imported anywhere — the tile
            // then keeps saying "unavailable + reason" (P-09).
            var anySchedule = rows.Any(r => r.ScheduleImported);

            var counts = new ScheduleCounts(
                rows.Count,
                delayed.Count,
                onTrack.Count,
                noSchedule.Count,
                delayed.Count == 0 ? 0 : (int)Math.Round(delayed.Average(r => r.DelayDays!.Value)),
                anySchedule ? rows.Sum(r => r.CriticalActivities ?? 0) : null);

            var filtered = state switch
            {
                "delayed" => delayed.AsEnumerable(),
                "on-track" => onTrack.AsEnumerable(),
                "no-schedule" => noSchedule.AsEnumerable(),
                _ => rows.AsEnumerable(),
            };

            if (!string.IsNullOrWhiteSpace(q))
            {
                var needle = q.Trim();
                filtered = filtered.Where(r =>
                    r.ProjectId.Contains(needle, StringComparison.OrdinalIgnoreCase)
                    || r.ProjectNameAr.Contains(needle, StringComparison.OrdinalIgnoreCase)
                    || r.ProjectNameEn.Contains(needle, StringComparison.OrdinalIgnoreCase));
            }

            // Worst first — this screen exists to surface slippage. Projects with
            // no schedule position sort last: they are not a zero-day delay.
            var ordered = filtered
                .OrderByDescending(r => r.DelayDays ?? -1)
                .ThenBy(r => r.ProjectId)
                .ToList();

            // PHASE 4.3 EMPTIED THIS LIST when a schedule exists. It is kept —
            // rather than deleted — because "no P6 file has been imported for
            // any project" is still a real state of this system, and it is the
            // state an empty database is in. The reason simply changed from
            // "the screen does not exist yet" to "nothing has been imported".
            var unavailable = anySchedule
                ? new List<ScheduleUnavailable>()
                : new List<ScheduleUnavailable>
                {
                    new("critical",
                        "لم يُستورد أي جدول زمني من Primavera P6 بعد، فلا مسار حرج يمكن احتسابه.",
                        "No Primavera P6 schedule has been imported yet, so there is no critical path to compute."),
                };

            return Results.Ok(new ScheduleResponse(ordered, ordered.Count, counts, unavailable));
        });
    }
}
