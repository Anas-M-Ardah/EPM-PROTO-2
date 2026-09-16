using Epm.Api.Data;
using Epm.Api.Data.Entities;
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

            // P-268 — a project with no rule could never raise an alert. Give it
            // the plate's set once; after that the rules are the project's own
            // and switching one off is remembered.
            if (rules.Count == 0)
            {
                db.AlertRules.AddRange(DefaultAlertRules.For(projectId));
                await db.SaveChangesAsync();
                rules = await db.AlertRules.AsNoTracking()
                    .Where(r => r.ProjectId == projectId)
                    .OrderBy(r => r.Id)
                    .ToListAsync();
            }

            // The DATA DATE, never a wall clock (D-06). A project with no data
            // date has no "now" to measure against, so every alert reads as a
            // notice rather than silently becoming overdue.
            var dataDate = p.DataDate ?? DateOnly.MaxValue;

            // P-254 — the rule is the source of the alert (`Features/Alerts/
            // AlertsEndpoints.cs`'s own architecture note): raise real rows for
            // whichever ENABLED rule's condition is computable, before reading
            // them back below exactly as any other alert.
            if (p.DataDate is not null)
                await EvaluateAndRaise(db, p, dataDate, rules.Where(r => r.Enabled).ToList());

            var alerts = await db.Alerts.AsNoTracking()
                .Where(a => a.ProjectId == projectId)
                .OrderByDescending(a => a.RaisedAt)
                .ToListAsync();

            var live = AlertInbox.Live(
                alerts.Select(a => new AlertInbox.Item(a.Id, a.RuleCode, a.DueOn, a.Acknowledged)).ToList(),
                rules.Select(r => new AlertInbox.Rule(r.Code, r.Enabled)).ToList());

            var liveIds = live.Select(x => x.Id).ToHashSet();

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

    /// <summary>
    /// P-254 — loads what each computable rule in `Domain/AlertRuleEngine.cs`
    /// needs, calls it, and find-or-creates a real `Alert` for every firing —
    /// keyed on (RuleCode, TargetRef) so a rule that already raised one does
    /// not raise it again on the next visit. Nothing here computes a rule
    /// itself (CLAUDE.md §3.1); this is loading and persistence only.
    /// </summary>
    private static async Task EvaluateAndRaise(
        EpmDb db, Project p, DateOnly dataDate, List<AlertRule> enabledRules)
    {
        var enabledCodes = enabledRules.Select(r => r.Code).ToHashSet();
        var severityOf = enabledRules.ToDictionary(r => r.Code, r => r.Severity);

        var contractIds = await db.Contracts.AsNoTracking()
            .Where(c => c.ProjectId == p.Id).Select(c => c.Id).ToListAsync();

        var firings = new List<AlertRuleEngine.Firing>();

        // ── R1 / R3 — schedule (activities) ──────────────────────────────
        if (enabledCodes.Contains("R1") || enabledCodes.Contains("R3"))
        {
            var activities = await db.Activities.AsNoTracking()
                .Where(a => contractIds.Contains(a.ContractId))
                .Select(a => new AlertRuleEngine.ActivityRow(
                    a.ActivityId, a.NameAr, a.NameEn, a.IsCritical, a.IsMilestone,
                    a.BaselineFinish, a.ForecastFinish))
                .ToListAsync();

            if (enabledCodes.Contains("R1")) firings.AddRange(AlertRuleEngine.CriticalPathSlip(activities, dataDate));
            if (enabledCodes.Contains("R3")) firings.AddRange(AlertRuleEngine.MilestoneApproaching(activities, dataDate));
        }

        // ── R2 / R9 — spend ratio ─────────────────────────────────────────
        if (enabledCodes.Contains("R2") || enabledCodes.Contains("R9"))
        {
            var contracts = await db.Contracts.AsNoTracking()
                .Where(c => c.ProjectId == p.Id).ToListAsync();
            var amendments = await db.ContractAmendments.AsNoTracking()
                .Where(a => contractIds.Contains(a.ContractId)).ToListAsync();
            var payments = await db.Payments.AsNoTracking()
                .Where(x => contractIds.Contains(x.ContractId)).ToListAsync();

            var effectiveValues = contracts.Select(c =>
            {
                var mine = amendments.Where(a => a.ContractId == c.Id)
                    .Select(a => new Amendments.Delta(a.No, a.DeltaValue, a.DeltaDays, a.AppliedAt != null))
                    .ToList();
                return Amendments.Effective(
                    new Amendments.Version(0, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays), mine).Value;
            }).ToList();

            var budget = BudgetBasis.For(p.PlannedCost, p.RevisedCost, ProjectValue.Total(effectiveValues));
            var disbursed = payments.Where(x => x.Status == "paid").Sum(x => x.NetAmount);
            var spendPct = BudgetBasis.SpendPct(budget, disbursed);

            firings.AddRange(AlertRuleEngine.SpendRatio(spendPct, dataDate)
                .Where(f => enabledCodes.Contains(f.RuleCode)));
        }

        // ── R4 — stale progress ───────────────────────────────────────────
        if (enabledCodes.Contains("R4"))
        {
            var readings = await db.ProgressReadings.AsNoTracking()
                .Where(r => contractIds.Contains(r.ContractId)).ToListAsync();

            var byContract = contractIds.Select(id => new AlertRuleEngine.ContractProgressRow(
                id, readings.Where(r => r.ContractId == id).Select(r => (DateOnly?)r.At)
                    .OrderByDescending(d => d).FirstOrDefault())).ToList();

            firings.AddRange(AlertRuleEngine.StaleProgress(byContract, dataDate));
        }

        // ── R5 — documents awaiting approval ──────────────────────────────
        if (enabledCodes.Contains("R5"))
        {
            var docs = await db.Documents.AsNoTracking().Where(d => d.ProjectId == p.Id).ToListAsync();
            var docIds = docs.Select(d => d.Id).ToList();
            var revisions = await db.DocumentRevisions.AsNoTracking()
                .Where(r => docIds.Contains(r.DocumentId)).ToListAsync();

            var rows = docs.Select(d =>
            {
                var model = revisions.Where(r => r.DocumentId == d.Id)
                    .Select(r => new DocumentRevisions.Revision(r.No, r.Status)).ToList();
                var current = DocumentRevisions.Current(model);
                return new AlertRuleEngine.DocumentRow(d.Code, d.TitleAr, d.TitleEn, current?.Status ?? "none");
            }).ToList();

            firings.AddRange(AlertRuleEngine.DocumentsAwaitingApproval(rows, dataDate));
        }

        // ── R6 — overdue meeting actions ──────────────────────────────────
        if (enabledCodes.Contains("R6"))
        {
            var meetingIds = await db.Meetings.AsNoTracking()
                .Where(m => m.ProjectId == p.Id).Select(m => m.Id).ToListAsync();
            var actions = await db.MeetingActions.AsNoTracking()
                .Where(a => meetingIds.Contains(a.MeetingId))
                .Select(a => new AlertRuleEngine.MeetingActionRow(a.Code, a.TitleAr, a.TitleEn, a.Status))
                .ToListAsync();

            firings.AddRange(AlertRuleEngine.OverdueMeetingActions(actions, dataDate));
        }

        // ── R7 — open high risks ───────────────────────────────────────────
        if (enabledCodes.Contains("R7"))
        {
            var risks = await db.Risks.AsNoTracking().Where(r => r.ProjectId == p.Id)
                .Select(r => new AlertRuleEngine.RiskRow(r.Code, r.TitleAr, r.TitleEn, r.Status, r.Probability, r.Impact))
                .ToListAsync();

            firings.AddRange(AlertRuleEngine.OpenHighRisks(risks, dataDate));
        }

        // ── R8 — change orders awaiting a decision ─────────────────────────
        if (enabledCodes.Contains("R8"))
        {
            var orders = await db.ChangeOrders.AsNoTracking()
                .Where(o => contractIds.Contains(o.ContractId))
                .Select(o => new AlertRuleEngine.ChangeOrderRow(o.No, o.TitleAr, o.TitleEn, o.Lifecycle))
                .ToListAsync();

            firings.AddRange(AlertRuleEngine.ChangeOrdersAwaitingDecision(orders, dataDate));
        }

        // ── R12 — payment audit-desk SLA ───────────────────────────────────
        if (enabledCodes.Contains("R12"))
        {
            var payments = await db.Payments.AsNoTracking()
                .Where(x => contractIds.Contains(x.ContractId)).ToListAsync();
            var paymentIds = payments.Select(x => x.Id).ToList();
            var stages = await db.PaymentAuditStages.AsNoTracking()
                .Where(s => paymentIds.Contains(s.PaymentId)).ToListAsync();

            var rows = stages.Select(s =>
            {
                var payment = payments.First(x => x.Id == s.PaymentId);
                return new AlertRuleEngine.AuditStageRow(
                    payment.ContractId + "-" + payment.No, s.PartyAr, s.PartyEn, s.StartedAt, s.FinishedAt, s.CapDays);
            }).ToList();

            firings.AddRange(AlertRuleEngine.AuditSlaBreached(rows, dataDate));
        }

        // ── R13 / R14 — BOQ allocation coverage ─────────────────────────────
        if (enabledCodes.Contains("R13") || enabledCodes.Contains("R14"))
        {
            var items = await db.BoqItems.AsNoTracking()
                .Where(i => contractIds.Contains(i.ContractId)).ToListAsync();
            var itemIds = items.Select(i => i.Id).ToList();
            var links = await db.BoqActivityLinks.AsNoTracking()
                .Where(l => itemIds.Contains(l.BoqItemId)).ToListAsync();

            var rows = items.Select(i => new AlertRuleEngine.BoqItemSharesRow(
                i.Code, links.Where(l => l.BoqItemId == i.Id).Select(l => l.SharePct).ToList())).ToList();

            firings.AddRange(AlertRuleEngine.AllocationCoverage(rows, dataDate)
                .Where(f => enabledCodes.Contains(f.RuleCode)));
        }

        if (firings.Count == 0) return;

        var existing = await db.Alerts
            .Where(a => a.ProjectId == p.Id && a.RuleCode != null)
            .Select(a => new { a.RuleCode, a.TargetRef })
            .ToListAsync();
        var existingKeys = existing.Select(a => (a.RuleCode, a.TargetRef)).ToHashSet();

        // «الرمز · القنوات · الشدة» come from the RULE (الشكل 47's own model,
        // `Alert.RuleCode` doc comment) — never invented per alert.
        var kindOf = new Dictionary<string, string>
        {
            ["R1"] = "schedule-slip", ["R3"] = "schedule-slip",
            ["R2"] = "budget", ["R9"] = "budget",
            ["R6"] = "sla-overdue", ["R8"] = "sla-overdue", ["R12"] = "sla-overdue",
        };

        foreach (var f in firings)
        {
            if (existingKeys.Contains((f.RuleCode, f.TargetRef))) continue;

            db.Alerts.Add(new Alert
            {
                ProjectId = p.Id,
                RuleCode = f.RuleCode,
                Severity = severityOf.GetValueOrDefault(f.RuleCode, "warning"),
                Kind = kindOf.GetValueOrDefault(f.RuleCode, "other"),
                TitleAr = f.TitleAr,
                TitleEn = f.TitleEn,
                TargetRef = f.TargetRef,
                RaisedAt = dataDate.ToDateTime(TimeOnly.MinValue),
                DueOn = f.DueOn,
                Acknowledged = false,
            });
            existingKeys.Add((f.RuleCode, f.TargetRef));
        }

        await db.SaveChangesAsync();
    }
}
