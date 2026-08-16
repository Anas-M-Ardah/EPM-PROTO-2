using Epm.Api.Data;
using Epm.Api.Features.Dev;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Audit;

/// <summary>
/// SCR-W15 — سجل التدقيق · `04 §3`.
///
/// ── THERE IS NO AUDIT TABLE, AND THAT IS THE DESIGN ──────────────────────
/// This screen writes nothing and stores nothing. It is a UNION of the trails
/// the system already keeps beside the records they belong to:
///
///   `ProjectActivityEvents`     — الشكل 11's project log (SCR-W2)
///   `ContractActivityEvents`    — الشكل 11's contract log (SCR-W3)
///   `ChangeOrderAuditEntries`   — the السجل tab of the CO record (SCR-W8)
///
/// A fourth table copying all three would be a second answer to «من غيّر هذا
/// الحقل ومتى» — and the copy would drift the first time one of the three
/// gained a column. The `AuditEvent` starting point is removed for that reason
/// (P-122); it never had a writer.
///
/// ── SOURCE IS NOT A CATEGORY ─────────────────────────────────────────────
/// A row's `Source` is the table it came out of, so it cannot be mislabelled.
/// The chips count what exists rather than what somebody classified.
///
/// ── THE ACTOR IS AS RECORDED, NOT AS RESOLVED NOW ────────────────────────
/// The project and contract trails copy the actor's name, role and party at the
/// moment of the edit — a persona list can change and the record may not. The
/// change-order trail stores only a user id and this endpoint resolves it, the
/// same way the record page does; that asymmetry is real and named in the gaps.
///
/// ── NO ARITHMETIC, SO NO `Domain/` FILE ──────────────────────────────────
/// Union, sort, count. Adding a rule here would be inventing one.
/// </summary>
public static class AuditEndpoints
{
    public const string Project = "project";
    public const string Contract = "contract";
    public const string ChangeOrder = "changeorder";

    public static void MapAuditEndpoints(this WebApplication app)
    {
        // [EP-AUD-01] GET /api/projects/{projectId}/audit
        // web: audit/audit.api.ts list() → audit.page.ts
        // spec: 04 §3 | rules: —
        // tables: Projects · ProjectActivityEvents · Contracts ·
        //         ContractActivityEvents · ChangeOrders · ChangeOrderAuditEntries
        app.MapGet("/api/projects/{projectId}/audit",
            async (EpmDb db, HttpContext ctx, string projectId) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            var rows = new List<(DateTime Order, AuditRow Row)>();

            // ── the project's own log ────────────────────────────────────
            var projectEvents = await db.ProjectActivityEvents.AsNoTracking()
                .Where(e => e.ProjectId == projectId)
                .ToListAsync();

            rows.AddRange(projectEvents.Select(e => (
                e.At.ToDateTime(TimeOnly.MinValue),
                new AuditRow(Project, projectId, e.Action, e.At.ToString("yyyy-MM-dd"),
                    false, e.ActorName, e.ActorRole, e.ActorParty,
                    null, null, null, null))));

            // ── every contract of this project ───────────────────────────
            // The contract is derived from the project and never asked for
            // again (CLAUDE.md §5.1), so the trail follows the same path.
            var contractIds = await db.Contracts.AsNoTracking()
                .Where(c => c.ProjectId == projectId)
                .Select(c => c.Id)
                .ToListAsync();

            var contractEvents = await db.ContractActivityEvents.AsNoTracking()
                .Where(e => contractIds.Contains(e.ContractId))
                .ToListAsync();

            rows.AddRange(contractEvents.Select(e =>
            {
                var isSystem = e.Source == "system";
                return (
                    e.At.ToDateTime(TimeOnly.MinValue),
                    new AuditRow(Contract, e.ContractId, e.Action, e.At.ToString("yyyy-MM-dd"),
                        isSystem,
                        isSystem ? null : e.ActorName,
                        isSystem ? null : e.ActorRole,
                        isSystem ? null : e.ActorParty,
                        e.Field, e.Before, e.After,
                        // «أمر تغييري VO-03 — تعديل تصميم الواجهة»: the order an
                        // automatic event came from, and what it was for.
                        e.RefId is null ? e.Note : $"{e.RefId}{(e.Note is null ? "" : $" — {e.Note}")}"));
            }));

            // ── every change order of this project ───────────────────────
            // Reached THROUGH the contracts, because a change order has no
            // project column: the contract is the working context and the
            // project is derived from it (CLAUDE.md §5.1).
            var orders = await db.ChangeOrders.AsNoTracking()
                .Where(o => contractIds.Contains(o.ContractId))
                .Select(o => new { o.Id, o.No })
                .ToListAsync();

            var orderIds = orders.Select(o => o.Id).ToList();
            var noById = orders.ToDictionary(o => o.Id, o => o.No);

            var orderEvents = await db.ChangeOrderAuditEntries.AsNoTracking()
                .Where(a => orderIds.Contains(a.ChangeOrderId))
                .ToListAsync();

            rows.AddRange(orderEvents.Select(a =>
            {
                // `system` is not a persona and must not be dressed as one (P-83).
                var isSystem = a.UserId == "system";
                var actor = isSystem ? null : Personas.Resolve(a.UserId);
                return (
                    a.At,
                    new AuditRow(ChangeOrder, noById[a.ChangeOrderId], a.Action,
                        a.At.ToString("yyyy-MM-dd HH:mm"),
                        isSystem,
                        actor?.NameAr, actor?.RoleAr, actor?.Party,
                        a.Field, a.PreviousValue, a.NewValue,
                        a.StageNo is null ? null : $"#{a.StageNo}"));
            }));

            // NEWEST FIRST. An audit trail is read from the last thing that
            // happened backwards — that is the question it answers.
            var ordered = rows
                .OrderByDescending(r => r.Order)
                .ThenByDescending(r => r.Row.Source)
                .Select(r => r.Row)
                .ToList();

            var sources = new List<AuditChip> { new("all", ordered.Count) };
            sources.AddRange(new[] { Project, Contract, ChangeOrder }
                .Select(s => new AuditChip(s, ordered.Count(r => r.Source == s))));

            return Results.Ok(new AuditResponse(
                p.Id, p.NameAr, p.NameEn, p.DataDate?.ToString("yyyy-MM-dd"),
                ordered.Count,
                ordered.Count(r => r.IsSystem),
                sources, ordered));
        });
    }
}
