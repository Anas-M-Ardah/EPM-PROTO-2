using Epm.Api.Data;
using Epm.Api.Features.Dev;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Alerts;

/// <summary>
/// SCR-E6 — Alerts Center, the portfolio-wide alert register (04 §2).
/// PORTED from DAlertsCenter (v1.1), ../epm@design/system-revamp
/// app/enterprise-areas.jsx:106.
///
/// ── NO ARITHMETIC HERE, AND NONE TO DO ───────────────────────────────────
/// This screen counts and filters rows. It derives nothing: an alert's severity
/// and kind are stored, its status is a bool, and its raised date is a record.
/// The one thing that looks like a rule — "is this alert overdue" — is BR-12
/// and belongs to the change-order workflow (Phase 5.4), which is what will
/// RAISE these rows. Recomputing overdue here would put the SLA rule in two
/// places; the alert is the output of the rule, not a second copy of it.
///
/// ── THE ACKNOWLEDGE IS REAL ──────────────────────────────────────────────
/// The reference toggles acknowledgement in component state, which is right for
/// a clickable prototype and wrong here: an acknowledgement is someone's name
/// against an alert. EP-ALR-02 writes it, with the persona as the recorder.
/// </summary>
public static class AlertsEndpoints
{
    public static void MapAlertsEndpoints(this WebApplication app)
    {
        // [EP-ALR-01] GET /api/alerts?q=&severity=&status=&workspace=&projectId=
        // web: alerts.api.ts list() → alerts.page.ts | spec: 04 §2 | rules: —
        // tables: Alerts · Projects
        app.MapGet("/api/alerts", async (
            EpmDb db,
            string? q,
            string? severity,
            string? status,
            string? workspace,
            string? projectId) =>
        {
            var alerts = await db.Alerts.AsNoTracking().ToListAsync();

            var projects = await db.Projects.AsNoTracking()
                .Select(p => new { p.Id, p.NameAr, p.NameEn, p.WorkspaceCode })
                .ToListAsync();

            // Workspace scoping reaches alerts THROUGH their project. An alert
            // with no ProjectId is enterprise-wide and therefore belongs to no
            // workspace — scoping to one correctly drops it.
            if (!string.IsNullOrWhiteSpace(workspace))
            {
                var inWs = projects.Where(p => p.WorkspaceCode == workspace).Select(p => p.Id).ToHashSet();
                alerts = alerts.Where(a => a.ProjectId != null && inWs.Contains(a.ProjectId)).ToList();
            }

            if (!string.IsNullOrWhiteSpace(projectId))
                alerts = alerts.Where(a => a.ProjectId == projectId).ToList();

            // The scoped set, before the severity/status filters. Both the cards
            // and their percentages are read off this, so selecting a card never
            // moves the numbers the card itself is showing.
            var scoped = alerts;

            var counts = new AlertCounts(
                scoped.Count,
                scoped.Count(a => !a.Acknowledged),
                scoped.Count(a => a.Acknowledged),
                scoped.GroupBy(a => a.Severity).ToDictionary(g => g.Key, g => g.Count()),
                scoped.Where(a => !a.Acknowledged)
                      .GroupBy(a => a.Severity)
                      .ToDictionary(g => g.Key, g => g.Count()));

            var filtered = scoped.AsEnumerable();

            if (!string.IsNullOrWhiteSpace(severity))
                filtered = filtered.Where(a => a.Severity == severity);

            if (!string.IsNullOrWhiteSpace(status))
                filtered = filtered.Where(a => StatusOf(a.Acknowledged) == status);

            if (!string.IsNullOrWhiteSpace(q))
            {
                var needle = q.Trim();
                filtered = filtered.Where(a =>
                    a.TitleAr.Contains(needle, StringComparison.OrdinalIgnoreCase)
                    || a.TitleEn.Contains(needle, StringComparison.OrdinalIgnoreCase)
                    || (a.TargetRef ?? "").Contains(needle, StringComparison.OrdinalIgnoreCase)
                    || (a.ProjectId ?? "").Contains(needle, StringComparison.OrdinalIgnoreCase));
            }

            // Newest first — the reference orders the feed by raised date
            // descending and nothing else. An inbox is not re-sortable by column
            // on purpose: the system decides priority, not the reader.
            var rows = filtered
                .OrderByDescending(a => a.RaisedAt)
                .ThenByDescending(a => a.Id)
                .Select(a =>
                {
                    var project = a.ProjectId is null
                        ? null
                        : projects.FirstOrDefault(p => p.Id == a.ProjectId);

                    return new AlertRow(
                        a.Id, a.ProjectId,
                        project?.NameAr, project?.NameEn,
                        a.Severity, a.Kind,
                        a.TitleAr, a.TitleEn,
                        a.TargetRef,
                        a.RaisedAt.ToString("yyyy-MM-dd"),
                        StatusOf(a.Acknowledged),
                        a.AcknowledgedByUserId);
                })
                .ToList();

            return Results.Ok(new AlertsResponse(rows, rows.Count, counts));
        });

        // [EP-ALR-02] POST /api/alerts/{id}/ack
        // web: alerts.api.ts acknowledge() → alerts.page.ts | spec: 04 §2 | rules: —
        // tables: Alerts
        app.MapPost("/api/alerts/{id:int}/ack", async (
            EpmDb db,
            HttpContext ctx,
            int id,
            AcknowledgeRequest body) =>
        {
            var alert = await db.Alerts.FirstOrDefaultAsync(a => a.Id == id);
            if (alert is null) return Results.NotFound();

            // The persona IS the identity in this prototype (P-05). Recording it
            // is the point of the endpoint: an acknowledgement nobody signed is
            // indistinguishable from the alert never having been seen.
            var persona = (Persona)ctx.Items["user"]!;

            alert.Acknowledged = body.Acknowledged;
            alert.AcknowledgedByUserId = body.Acknowledged ? persona.Id : null;

            await db.SaveChangesAsync();

            return Results.Ok(new { alert.Id, Status = StatusOf(alert.Acknowledged), alert.AcknowledgedByUserId });
        });
    }

    /// <summary>
    /// The bool as the code the `alert-status` lookup labels. One place, so the
    /// filter and the row can never disagree about what "open" means.
    /// </summary>
    private static string StatusOf(bool acknowledged) => acknowledged ? "acknowledged" : "open";
}
