using Epm.Api.Data;
using Epm.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.ScheduleControl;

/// <summary>
/// SCR-E5 — Schedule Control, portfolio-wide schedule health (04 §2).
/// PORTED from DScheduleControl (v1.1), ../epm@design/system-revamp
/// app/enterprise-areas.jsx:8.
///
/// ── WHAT THIS SCREEN DELIBERATELY DOES NOT SHOW ──────────────────────────
/// The reference has a **critical activities** KPI and column. It derives them
/// like this:
///
///     const critical = p.status === 'stalled' ? 3 + (p.id.charCodeAt(6) % 3)
///                    : p.status === 'suspended' ? 2 : (p.id.charCodeAt(6) % 2);
///
/// That is a character of the project ID. It is fine in a clickable prototype
/// and unusable here. A critical path needs Activities and their dependencies,
/// which arrive in Phase 4.3. So the figure is returned as null, the KPI tile
/// renders "unavailable + reason", and the column renders an em dash — the same
/// treatment SCR-E1 gives physical %, SPI and CPI (P-09).
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

            var rows = projects.Select(p =>
            {
                var mine = contracts.Where(c => c.ProjectId == p.Id).ToList();
                var ws = workspaces.FirstOrDefault(w => w.Code == p.WorkspaceCode);

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
                    // Needs Activities and their dependencies — Phase 4.3.
                    null,
                    // Not a placeholder: the Activities table is not registered,
                    // so no schedule has been imported for any project.
                    false);
            }).ToList();

            // Counted BEFORE the search and the state filter, so the KPI band
            // and the chips keep their numbers while a filter is applied.
            var delayed = rows.Where(r => r.DelayDays > 0).ToList();
            var onTrack = rows.Where(r => r.DelayDays == 0).ToList();
            var noSchedule = rows.Where(r => r.DelayDays is null).ToList();

            var counts = new ScheduleCounts(
                rows.Count,
                delayed.Count,
                onTrack.Count,
                noSchedule.Count,
                delayed.Count == 0 ? 0 : (int)Math.Round(delayed.Average(r => r.DelayDays!.Value)));

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

            var unavailable = new List<ScheduleUnavailable>
            {
                new("critical",
                    "يتطلب جدول الأنشطة وعلاقات التتابع لاحتساب المسار الحرج — يتوفر بعد بناء شاشة الجدول الزمني.",
                    "Needs the activity schedule and its dependencies to compute the critical path — available once the Schedule screen exists."),
            };

            return Results.Ok(new ScheduleResponse(ordered, ordered.Count, counts, unavailable));
        });
    }
}
