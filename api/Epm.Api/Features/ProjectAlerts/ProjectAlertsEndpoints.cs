using Epm.Api.Data;
using Epm.Api.Domain;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.ProjectAlerts;

/// <summary>
/// SCR-W13 — التنبيهات · **ملحق الشكل 47**.
///
/// ── THE RULE IS THE SOURCE, SO ONE READ CARRIES BOTH ─────────────────────
/// The two views — التنبيهات and القواعد — are not two screens. Toggling a rule
/// changes what the inbox contains, so fetching them separately would let the
/// header count and the switch that moved it arrive from two different reads.
///
/// ── WHAT THE SUPPRESSION IS ──────────────────────────────────────────────
/// `Domain/AlertInbox.Live` filters; nothing is written to the alert. That is
/// what makes re-enabling a rule restore its alerts unchanged — including the
/// acknowledgements already recorded on them.
///
/// ── ACKNOWLEDGING IS `EP-ALR-02`'s JOB ───────────────────────────────────
/// The inbox reuses the Alerts Center's write. One acknowledgement path, one
/// place the persona is recorded (P-05); a second one here would be a second
/// answer to who signed.
/// </summary>
public static class ProjectAlertsEndpoints
{
    public static void MapProjectAlertsEndpoints(this WebApplication app)
    {
        // [EP-PAL-01] GET /api/projects/{projectId}/alerts
        // web: project-alerts/project-alerts.api.ts list() → project-alerts.page.ts
        // spec: ملحق الشكل 47 | rules: AlertInbox
        // tables: Projects · Alerts · AlertRules
        app.MapGet("/api/projects/{projectId}/alerts",
            async (EpmDb db, HttpContext ctx, string projectId) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            var rules = await db.AlertRules.AsNoTracking()
                .Where(r => r.ProjectId == projectId)
                .OrderBy(r => r.Id)
                .ToListAsync();

            var alerts = await db.Alerts.AsNoTracking()
                .Where(a => a.ProjectId == projectId)
                .OrderByDescending(a => a.RaisedAt)
                .ToListAsync();

            var live = AlertInbox.Live(
                alerts.Select(a => new AlertInbox.Item(a.Id, a.RuleCode, a.DueOn, a.Acknowledged)).ToList(),
                rules.Select(r => new AlertInbox.Rule(r.Code, r.Enabled)).ToList());

            var liveIds = live.Select(x => x.Id).ToHashSet();

            // The DATA DATE, never a wall clock (D-06). A project with no data
            // date has no "now" to measure against, so every alert reads as a
            // notice rather than silently becoming overdue.
            var dataDate = p.DataDate ?? DateOnly.MaxValue;

            var rows = alerts
                .Where(a => liveIds.Contains(a.Id))
                .Select(a => new ProjectAlertRow(
                    a.Id, a.RuleCode, a.Severity, a.Kind, a.TitleAr, a.TitleEn, a.TargetRef,
                    a.RaisedAt.ToString("yyyy-MM-dd"),
                    a.DueOn?.ToString("yyyy-MM-dd"),
                    AlertInbox.DaysToDue(a.DueOn, dataDate),
                    AlertInbox.Bucket(a.DueOn, dataDate),
                    a.Acknowledged ? "acknowledged" : "open",
                    a.AcknowledgedByUserId))
                .ToList();

            // الشكل 47's inbox tabs: الكل · حرجة · متوسطة · منخفضة. Every
            // severity is present even at zero — a tab that disappears when it
            // empties reads as a changed set, not as a count of none.
            var severities = new List<AlertChip> { new("all", rows.Count) };
            severities.AddRange(new[] { "critical", "warning", "info" }
                .Select(s => new AlertChip(s, rows.Count(r => r.Severity == s))));

            // The four groups in the plate's fixed order, all four always. The
            // inbox decides priority — the reader does not sort it.
            var buckets = AlertInbox.Buckets
                .Select(b => new AlertChip(b, rows.Count(r => r.Bucket == b)))
                .ToList();

            return Results.Ok(new ProjectAlertsResponse(
                p.Id, p.NameAr, p.NameEn, p.DataDate?.ToString("yyyy-MM-dd"),
                rows.Count,
                AlertInbox.NeedsAction(live, dataDate),
                rules.Count,
                rules.Count(r => r.Enabled),
                severities, buckets, rows,
                rules.Select(r => new AlertRuleRow(
                    r.Code, r.NameAr, r.NameEn, r.TriggerAr, r.TriggerEn, r.Severity,
                    r.ChannelInApp, r.ChannelEmail, r.ChannelSms,
                    r.Recurrence, r.EscalateAfterHours, r.Enabled)).ToList()));
        });

        // [EP-PAL-02] POST /api/projects/{projectId}/alert-rules/{code}/enabled
        // web: project-alerts.api.ts setRuleEnabled() → project-alerts.page.ts
        // spec: ملحق الشكل 47 | rules: AlertInbox
        // tables: Projects · AlertRules
        //
        // The only write on this screen, and it writes ONE bool. Everything the
        // switch appears to do to the inbox — alerts leaving, the header count
        // dropping — is EP-PAL-01 re-reading `AlertInbox.Live` afterwards.
        app.MapPost("/api/projects/{projectId}/alert-rules/{code}/enabled",
            async (EpmDb db, HttpContext ctx, string projectId, string code,
                   SetRuleEnabledRequest body) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            var rule = await db.AlertRules
                .FirstOrDefaultAsync(r => r.ProjectId == projectId && r.Code == code);
            if (rule is null) return Results.NotFound(new { message = $"rule {code} not found on {projectId}" });

            rule.Enabled = body.Enabled;
            await db.SaveChangesAsync();

            return Results.Ok(new { rule.Code, rule.Enabled });
        });
    }
}
