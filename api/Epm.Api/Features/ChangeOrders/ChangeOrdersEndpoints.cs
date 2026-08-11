using Epm.Api.Data;
using Epm.Api.Data.Entities;
using Epm.Api.Domain;
using Epm.Api.Features.Dev;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.ChangeOrders;

/// <summary>
/// SCR-W8 — the change-order register (`03 §10`).
/// PORTED from the v1.1 change-order module: ../epm@design/system-revamp
/// app/vo-record.jsx `DModVO` :454.
///
/// ── LIFECYCLE IS ONE AXIS; ATTENTION IS ANOTHER ──────────────────────────
/// The reference's own comment says it best: *"Mixing them was why «بحاجة إلى
/// إجراء» sat next to «المعتمدة» as if they answered the same question."*
/// Lifecycle follows the workflow and is the same for everyone. Attention —
/// «بانتظار إجرائي» — depends on WHO IS LOOKING, and is resolved through
/// BR-14. So the groups below are lifecycle only, and the relation travels per
/// row for the filter to use.
///
/// ── THE RELATION IS RESOLVED HERE, NEVER IN THE BROWSER ──────────────────
/// `03 §7` makes BR-14 the entire authorisation model for an order. The
/// identity is a header (P-05, and it is fake on purpose), but what that
/// identity is ALLOWED to do is decided server-side. `CanAct` ships as a
/// boolean so a client cannot arrive at a different answer.
///
/// ── "NOW" IS THE PROJECT DATA DATE (D-06) ────────────────────────────────
/// Every age, lead time and SLA breach below is measured from `Projects.
/// DataDate`. The reference learned this the hard way — its own comment: *"a
/// fixed literal made every order look years late once inDate started deriving
/// from the contract term."*
///
/// ── NO ARITHMETIC OF ITS OWN ─────────────────────────────────────────────
/// The relation is Domain/ViewerRelation (BR-14), the lead time and the cycle
/// average Domain/SlaLeadTime (BR-12). This file queries, groups and projects.
/// </summary>
public static class ChangeOrdersEndpoints
{
    /// <summary>
    /// `03 §10`'s "overdue" is about the WHOLE ORDER, not one stage: how long
    /// it has sat since the incoming letter. The per-stage SLA is BR-12's
    /// `SlaDaysPerStage` and drives «تجاوزت السقف» instead — which is why
    /// `06 §12` can seed VO-02 (22 days, past both) and VO-06 (5 days, past
    /// neither) to prove the two chips are different sets.
    /// </summary>
    private const int OrderOverdueDays = 14;

    /// <summary>`03 §7`'s owner of the conditional rate-fixing stage (`02 §5`).</summary>
    private const string RateCommittee = "لجنة تثبيت الأسعار";

    public static void MapChangeOrdersEndpoints(this WebApplication app)
    {
        // [EP-CHG-01] GET /api/projects/{projectId}/change-orders
        // web: change-orders/change-orders.api.ts list() → change-orders.page.ts
        // spec: 03 §10 · 03 §7 | rules: BR-12, BR-14
        // tables: Projects · Contracts · ChangeOrders · ChangeOrderStages
        //       · ChangeOrderAttachments
        app.MapGet("/api/projects/{projectId}/change-orders",
            async (EpmDb db, HttpContext ctx, string projectId) =>
        {
            var persona = (Persona)ctx.Items["user"]!;

            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });

            // D-06 — never DateTime.Now.
            var asOf = p.DataDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

            var contractIds = await db.Contracts.AsNoTracking()
                .Where(c => c.ProjectId == projectId).Select(c => c.Id).ToListAsync();

            var orders = await db.ChangeOrders.AsNoTracking()
                .Where(o => contractIds.Contains(o.ContractId))
                .OrderByDescending(o => o.IncomingDate).ThenBy(o => o.No)
                .ToListAsync();

            var ids = orders.Select(o => o.Id).ToList();

            var stages = await db.ChangeOrderStages.AsNoTracking()
                .Where(s => ids.Contains(s.ChangeOrderId))
                .OrderBy(s => s.ChangeOrderId).ThenBy(s => s.StageNo)
                .ToListAsync();

            var files = await db.ChangeOrderAttachments.AsNoTracking()
                .Where(a => ids.Contains(a.ChangeOrderId))
                .GroupBy(a => a.ChangeOrderId)
                .Select(g => new { g.Key, N = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.N);

            var rows = orders.Select(o => Row(o, stages, files, persona, asOf)).ToList();

            // Lifecycle groups — the same for every viewer. `03 §10` names four;
            // `draft` is a fifth the reference shows only when non-empty, and
            // `cancelled` joins `rejected` because both are terminal refusals.
            var groups = new List<ChangeOrderGroup>
            {
                new("draft", rows.Count(r => r.Lifecycle == "draft")),
                new("pending", rows.Count(r => r.Lifecycle is "pending")),
                new("returned", rows.Count(r => r.Lifecycle == "returned")),
                new("applying", rows.Count(r => r.Lifecycle is "approved" or "applied_partial")),
                new("closed", rows.Count(r => r.Lifecycle == "closed")),
                new("rejected", rows.Count(r => r.Lifecycle is "rejected" or "cancelled")),
            };

            // TWO DIFFERENT SETS, deliberately.
            //   `pending`   — the indicator, and it must agree with the GROUP of
            //                 the same name or the register contradicts itself.
            //   `inChain`   — everything somebody still has to act on, which
            //                 includes a returned order: it is back with its
            //                 originator to revise, and that is an action.
            var pending = rows.Where(r => r.Lifecycle == "pending").ToList();
            var inChain = rows.Where(r => r.Lifecycle is "pending" or "returned").ToList();

            // BR-12's average is over CLOSED orders only: an order still in the
            // chain has no cycle time yet, and folding its age in would drag the
            // mean towards whatever is currently open.
            var closedCycles = orders
                .Where(o => o.Lifecycle == "closed" && o.IncomingDate is not null && o.DecisionDate is not null)
                .Select(o => o.DecisionDate!.Value.DayNumber - o.IncomingDate!.Value.DayNumber)
                .ToList();

            var indicators = new ChangeOrderIndicators(
                M(rows.Where(r => r.Lifecycle is "approved" or "applied_partial" or "closed")
                      .Sum(r => r.ValueIsApproved ? r.Value : 0m)),
                pending.Count,
                inChain.Count(r => r.Exceptions.Any(x => x.Code == "sla-breached")),
                inChain.Count(r => r.Exceptions.Any(x => x.Code == "overdue")),
                SlaLeadTime.AverageCycleDays(closedCycles) is { } avg
                    ? Math.Round(avg, 1, MidpointRounding.AwayFromZero)
                    : null);

            return Results.Ok(new ChangeOrdersResponse(
                p.Id, p.NameAr, p.NameEn, p.DataDate?.ToString("yyyy-MM-dd"),
                persona.Id, persona.Party, persona.IsDelegate,
                rows.Count(r => r.Relation.CanAct),
                indicators, groups, rows));
        });
    }

    // ── one row ──────────────────────────────────────────────────────────

    private static ChangeOrderRow Row(
        ChangeOrder o,
        List<ChangeOrderStage> allStages,
        Dictionary<int, int> files,
        Persona persona,
        DateOnly asOf)
    {
        var mine = allStages.Where(s => s.ChangeOrderId == o.Id).ToList();

        // APPLICABLE STAGES ONLY. A skipped stage is listed on the record with
        // its reason (`03 §2`, Phase 5.4) but it owns nothing, so it can make
        // nobody `awaiting` and nobody `upcoming`.
        var chain = mine.Where(s => s.Applicable).ToList();

        var current = chain.FirstOrDefault(s => s.Status is "active" or "overdue");
        // A `returned` stage HAS acted — it is the stage that sent the order
        // back — so its owner is `acted`, not `upcoming`. The return itself
        // stays on the record (`03 §5`) while the order sits with whoever must
        // revise it.
        var done = chain.Where(s => s.Status is "done" or "returned").Select(s => s.OwnerParty).Distinct().ToList();
        var todo = chain.Where(s => s.Status is "pending").Select(s => s.OwnerParty).Distinct().ToList();

        // `03 §6` — applying is the last applicable stage owner's job, so they
        // are the one awaiting once the chain itself is complete.
        var executionOwner = chain.LastOrDefault()?.OwnerParty;

        var relationKey = ViewerRelation.For(
            persona.Party, persona.IsDelegate, o.Lifecycle,
            current?.OwnerParty, executionOwner, done, todo,
            // Phase 5.4 registers ChangeOrderExternalParty; until then nothing
            // is pending against an external party, and `recorder` is therefore
            // unreachable rather than falsely claimed.
            externalPartyPending: false);

        var lead = o.IncomingDate is null
            ? new SlaLeadTime.Result(0, false)
            : SlaLeadTime.For(asOf, o.IncomingDate.Value);

        // The stage clock is its own: how long THIS stage has been open, not
        // how long the order has existed.
        var stageBreached = current?.SentAt is not null
            && asOf.DayNumber - current.SentAt.Value.DayNumber > current.SlaDays;

        var exceptions = new List<ExceptionChip>();
        var inChain = o.Lifecycle is "pending" or "returned";

        if (inChain && lead.LeadDays > OrderOverdueDays)
            exceptions.Add(new("overdue", "متأخر", "Overdue"));
        if (inChain && stageBreached)
            exceptions.Add(new("sla-breached", "تجاوزت السقف", "SLA breached"));
        // `02 §9` — approving changes nothing; APPLYING is what moves figures,
        // and it can fail. That failure is an exception on the register, not a
        // lifecycle of its own.
        if (o.Lifecycle == "applied_partial" && o.WeightRecalcState == "failed")
            exceptions.Add(new("apply-failed", "فشل التطبيق", "Apply failed"));
        // SITTING AT rate fixing — not merely having it later in the chain.
        // `03 §2` makes the stage conditional on a line tripping the 20% rule
        // (`02 §5`), so most orders that carry it are simply on their way
        // there; the chip is for the ones stopped at it, because only those
        // are waiting on a committee that can re-price the excess.
        if (inChain && current?.OwnerParty == RateCommittee)
            exceptions.Add(new("awaiting-rate-fixing", "بانتظار تثبيت الأسعار", "Awaiting rate fixing"));

        // `02 §6` — the approved value governs once it exists; until then the RE
        // department's proposal is what is displayed, and the row says which.
        var approved = o.ApprovedValue is not null;

        var lastAction = chain
            .Where(s => s.ActionedAt is not null)
            .Select(s => s.ActionedAt!.Value)
            .DefaultIfEmpty()
            .Max();

        return new ChangeOrderRow(
            o.Id, o.No, o.ContractId, o.TitleAr, o.TitleEn, o.Type, o.Lifecycle,
            o.Justification, o.ResponsibleParty, o.IncomingNo,
            o.IncomingDate?.ToString("yyyy-MM-dd"),
            M(approved ? o.ApprovedValue!.Value : o.RequestedValue ?? 0m),
            approved,
            (approved ? o.ApprovedDays : o.RequestedDays) ?? 0,
            lead.LeadDays,
            current?.StageNo,
            current?.NameAr,
            current?.NameEn,
            current?.OwnerParty,
            lastAction == default ? null : lastAction.ToString("yyyy-MM-dd"),
            files.TryGetValue(o.Id, out var n) ? n : 0,
            new ViewerRelationDto(
                relationKey,
                ViewerRelation.CanAct(relationKey),
                current?.NameAr,
                current?.NameEn),
            exceptions);
    }

    private static decimal M(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
}
