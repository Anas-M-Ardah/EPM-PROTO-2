using Epm.Api.Data;
using Epm.Api.Data.Entities;
using Epm.Api.Domain;
using Epm.Api.Features.Dev;
using Epm.Api.Features.Workspaces;
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
            // BR-15 — the register is workspace-scoped like every other module.
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

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

        // [EP-CHG-02] GET /api/projects/{projectId}/change-orders/{no}
        // web: change-orders/change-orders.api.ts record() → change-order.page.ts
        // spec: 03 §9 · ملحق الأشكال 30–34 | rules: BR-01, BR-05, BR-06, BR-09,
        //       BR-10, BR-12, BR-13, BR-14
        // tables: Projects · Contracts · ContractAmendments · ChangeOrders
        //       · ChangeOrderLines · ChangeOrderActivities · ChangeOrderStages
        //       · ChangeOrderExternalParties · ChangeOrderApplySteps
        //       · ChangeOrderAttachments · ChangeOrderAuditEntries · BoqItems
        //       · Activities
        //
        // ONE REQUEST FOR THE WHOLE RECORD. Six tabs, six plates, one read: the
        // page is a document about a decision somebody is being asked to take,
        // and a tab that arrives late is a tab that gets skipped.
        app.MapGet("/api/projects/{projectId}/change-orders/{no}",
            async (EpmDb db, HttpContext ctx, string projectId, string no) =>
        {
            var persona = (Persona)ctx.Items["user"]!;

            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            var asOf = p.DataDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

            // THE ORDER IS FOUND THROUGH ITS CONTRACT, never by number alone: a
            // number is unique within a contract (`01 §1`), so a project-scoped
            // lookup is what makes the URL unambiguous.
            var contracts = await db.Contracts.AsNoTracking()
                .Where(c => c.ProjectId == projectId).ToListAsync();
            var contractIds = contracts.Select(c => c.Id).ToList();

            var o = await db.ChangeOrders.AsNoTracking()
                .FirstOrDefaultAsync(x => contractIds.Contains(x.ContractId) && x.No == no);
            if (o is null) return Results.NotFound(new { message = $"change order {no} not found on {projectId}" });

            var contract = contracts.First(c => c.Id == o.ContractId);

            // ── the parts, one query each (CLAUDE.md §3.3) ────────────────
            var lines = await db.ChangeOrderLines.AsNoTracking()
                .Where(l => l.ChangeOrderId == o.Id).OrderBy(l => l.Id).ToListAsync();
            var coActs = await db.ChangeOrderActivities.AsNoTracking()
                .Where(a => a.ChangeOrderId == o.Id).OrderBy(a => a.Id).ToListAsync();
            var stageRows = await db.ChangeOrderStages.AsNoTracking()
                .Where(s => s.ChangeOrderId == o.Id).OrderBy(s => s.StageNo).ToListAsync();
            var external = await db.ChangeOrderExternalParties.AsNoTracking()
                .Where(x => x.ChangeOrderId == o.Id).OrderBy(x => x.Id).ToListAsync();
            var steps = await db.ChangeOrderApplySteps.AsNoTracking()
                .Where(s => s.ChangeOrderId == o.Id).ToListAsync();
            var files = await db.ChangeOrderAttachments.AsNoTracking()
                .Where(a => a.ChangeOrderId == o.Id).OrderBy(a => a.UploadedAt).ThenBy(a => a.Id).ToListAsync();
            var audit = await db.ChangeOrderAuditEntries.AsNoTracking()
                .Where(a => a.ChangeOrderId == o.Id).OrderBy(a => a.At).ThenBy(a => a.Id).ToListAsync();

            // EVERY BOQ line of the contract, not only the affected ones: a
            // weight is a share of the contract (BR-01), so the untouched lines
            // ARE the denominator.
            var allItems = await db.BoqItems.AsNoTracking()
                .Where(i => i.ContractId == o.ContractId).OrderBy(i => i.Code).ToListAsync();
            var itemById = allItems.ToDictionary(i => i.Id);

            var activityIds = coActs.Select(a => a.ActivityId).ToList();
            var activities = await db.Activities.AsNoTracking()
                .Where(a => activityIds.Contains(a.Id)).ToListAsync();

            var amendments = await db.ContractAmendments.AsNoTracking()
                .Where(a => a.ContractId == o.ContractId).OrderBy(a => a.No).ToListAsync();

            // ── the four columns per line (Domain/ChangeOrderRecord) ──────
            var domainLines = lines.ToDictionary(
                l => l.Id,
                l => new ChangeOrderRecord.Line(
                    itemById.TryGetValue(l.BoqItemId, out var it) ? it.Code : "—",
                    l.ChangeType, l.ContractedQty, l.BeforeQty, l.BeforeRate, l.BeforeAmount));

            ChangeOrderRecord.Column Col(ChangeOrderLine l, decimal? d, decimal? rate, decimal? excess)
                => ChangeOrderRecord.For(domainLines[l.Id], new(d, rate, excess));

            var contractorCols = lines.ToDictionary(l => l.Id,
                l => Col(l, l.ContractorDeltaQty, l.ContractorNewRate, l.ContractorExcessRate));
            var reDeptCols = lines.ToDictionary(l => l.Id,
                l => Col(l, l.ReDeptDeltaQty, l.ReDeptNewRate, l.ReDeptExcessRate));
            var approvedCols = lines.ToDictionary(l => l.Id,
                l => Col(l, l.ApprovedDeltaQty, l.ApprovedRate, l.ApprovedExcessRate));
            // APPLIED is not "approved again": it exists only once the order has
            // been applied, and it is what actually moved (non-negotiable #2).
            var appliedCols = lines.ToDictionary(l => l.Id,
                l => Col(l, l.AppliedDeltaQty, null, l.ApprovedExcessRate));

            // ── BR-01 recomputed for each column (الشكل 31 · أثر الأوزان) ──
            WeightSet Weights(Dictionary<int, ChangeOrderRecord.Column> cols)
            {
                var after = allItems.ToDictionary(i => i.Code, i => i.OriginalQty * i.UnitRate);
                foreach (var l in lines)
                {
                    if (!itemById.TryGetValue(l.BoqItemId, out var item)) continue;
                    if (cols[l.Id].AmountAfter is { } amt) after[item.Code] = amt;
                }

                var input = allItems
                    .Select(i => new ChangeOrderRecord.Amount(i.Code, i.OriginalQty * i.UnitRate, after[i.Code]))
                    .ToList();

                var affected = lines
                    .Where(l => itemById.ContainsKey(l.BoqItemId))
                    .Select(l => itemById[l.BoqItemId].Code)
                    .ToHashSet();

                var anyProposed = lines.Any(l => cols[l.Id].AmountAfter is not null);
                return new(ChangeOrderRecord.Weights(input, affected), anyProposed);
            }

            var wBefore = ChangeOrderRecord.Weights(
                allItems.Select(i => new ChangeOrderRecord.Amount(
                    i.Code, i.OriginalQty * i.UnitRate, i.OriginalQty * i.UnitRate)).ToList(),
                allItems.Select(i => i.Code).ToHashSet());

            var wProposed = Weights(reDeptCols);
            var wApproved = Weights(approvedCols);
            var wApplied = Weights(appliedCols);

            decimal? W(WeightSet s, string code)
                => s.Any && s.Impact.Rows.FirstOrDefault(r => r.Code == code) is { } row ? row.After : null;

            // ── الشكل 31's line table ──────────────────────────────────────
            var recordLines = lines.Select(l =>
            {
                var item = itemById.TryGetValue(l.BoqItemId, out var i) ? i : null;
                var code = item?.Code ?? "—";
                var before = wBefore.Rows.FirstOrDefault(r => r.Code == code)?.Before ?? 0m;

                RecordColumn C(ChangeOrderRecord.Column c, decimal? weight) => new(
                    c.QtyAfter, c.RateShown, M(c.AmountAfter), M(c.Impact),
                    c.AtRateQty, c.ExcessQty, c.TripsThreshold, weight);

                return new RecordLine(
                    code,
                    item?.DescriptionAr ?? "—", item?.DescriptionEn ?? "—", item?.Unit ?? "",
                    l.ChangeType, l.ContractedQty, l.BeforeQty, l.BeforeRate, M(l.BeforeAmount),
                    before, domainLines[l.Id].ContractedQty * Domain.TierSplit.Tier,
                    l.ApplyStatus,
                    C(contractorCols[l.Id], W(Weights(contractorCols), code)),
                    C(reDeptCols[l.Id], W(wProposed, code)),
                    C(approvedCols[l.Id], W(wApproved, code)),
                    C(appliedCols[l.Id], W(wApplied, code)));
            }).ToList();

            var netContractor = ChangeOrderRecord.Net(contractorCols.Values);
            var netReDept = ChangeOrderRecord.Net(reDeptCols.Values);
            var netApproved = ChangeOrderRecord.Net(approvedCols.Values);

            // The weight report shows the column that GOVERNS: applied once
            // applied, approved once approved, the RE department's proposal
            // until then (`02 §6`).
            var governing = wApplied.Any ? wApplied : wApproved.Any ? wApproved : wProposed;

            var weightRows = wBefore.Rows
                .Where(r => recordLines.Any(l => l.Code == r.Code))
                .Select(r =>
                {
                    var item = allItems.First(i => i.Code == r.Code);
                    var proposed = W(wProposed, r.Code);
                    var approved = W(wApproved, r.Code);
                    var applied = W(wApplied, r.Code);
                    var shown = applied ?? approved ?? proposed;
                    return new RecordWeightRow(
                        r.Code, item.DescriptionAr, item.DescriptionEn,
                        r.Before, proposed, approved, applied,
                        shown is null ? 0m : Math.Round(shown.Value - r.Before, 2, MidpointRounding.AwayFromZero));
                }).ToList();

            var weightState = o.Lifecycle switch
            {
                "closed" => "applied",
                "applied_partial" => o.WeightRecalcState == "failed" ? "fail" : "applied",
                "approved" => "approved",
                "rejected" or "cancelled" => "none",
                _ => lines.Count == 0 ? "none" : "review",
            };

            var weights = new RecordWeightImpact(
                Math.Round(wBefore.SumBefore, 2), Math.Round(governing.Impact.SumAfter, 2),
                governing.Impact.Valid,
                // The recalculation happened when the order was applied; before
                // that the figures on screen are a projection and say so.
                steps.FirstOrDefault(s => s.StepNo == 5)?.CompletedAt?.ToString("yyyy-MM-dd"),
                weightState,
                weightRows);

            // ── الشكل 31's redistribution table ────────────────────────────
            var redistribution = lines.Where(l => l.ChangeType == "redist").Select(l =>
            {
                var src = itemById.TryGetValue(l.BoqItemId, out var s) ? s : null;
                var tgt = l.TargetBoqItemId is { } t && itemById.TryGetValue(t, out var x) ? x : null;
                return new RecordRedistribution(
                    src?.Code ?? "—", src?.DescriptionAr ?? "—", src?.DescriptionEn ?? "—",
                    tgt?.Code, tgt?.DescriptionAr, tgt?.DescriptionEn,
                    l.DrawnQty ?? 0m, l.DistributedQty ?? 0m,
                    (l.DistributedQty ?? 0m) - (l.DrawnQty ?? 0m), 0m, l.ApplyStatus);
            }).ToList();

            // ── الشكل 32 — الأثر الزمني ────────────────────────────────────
            var recordActs = coActs.Select(a =>
            {
                var src = activities.FirstOrDefault(x => x.Id == a.ActivityId);
                var approvedRemaining = a.ApprovedDeltaDays is null
                    ? (int?)null : a.BeforeRemainingDuration + a.ApprovedDeltaDays.Value;

                return new RecordActivity(
                    src?.ActivityId ?? "—", src?.NameAr ?? "—", src?.NameEn ?? "—",
                    a.ChangeType, src?.ProgressPct ?? 0m, a.BeforeRemainingDuration,
                    a.RequestedDeltaDays, a.AnalysisDays, a.ApprovedDeltaDays, approvedRemaining,
                    a.BeforeStart?.ToString("yyyy-MM-dd"), a.BeforeFinish?.ToString("yyyy-MM-dd"),
                    a.ApprovedFinish?.ToString("yyyy-MM-dd"),
                    src?.IsCritical ?? false, a.ApplyStatus);
            }).ToList();

            // The contractual finish IN FORCE — BR-09's effective figure, which
            // for an APPLIED order already includes this order's own days. The
            // "before" the plate wants is therefore the finish without them.
            var appliedAmendments = amendments.Where(a => a.AppliedAt is not null).ToList();
            var effectiveFinish = appliedAmendments.Count > 0
                ? appliedAmendments.Last().Finish
                : contract.OriginalFinish;

            DateOnly? finishBefore = o.Lifecycle == "closed" && o.AppliedDays is { } ad
                ? effectiveFinish.AddDays(-ad)
                : effectiveFinish;

            var timeImpact = ChangeOrderRecord.Time(
                o.RequestedDays ?? 0,
                // The ORDER's analysis figure, not a roll-up of the activities'
                // — see ChangeOrder.AnalysisDays. Summing them would claim an
                // effect on the finish date that the critical path may not
                // support, which is exactly what الشكل 32's standing note warns
                // against.
                o.AnalysisDays,
                o.ApprovedDays,
                finishBefore);

            var time = new RecordTimeImpact(
                coActs.Count, timeImpact.RequestedDays, timeImpact.AnalysisDays, timeImpact.ApprovedDays,
                timeImpact.FinishBefore?.ToString("yyyy-MM-dd"),
                timeImpact.FinishForecast?.ToString("yyyy-MM-dd"),
                timeImpact.FinishApproved?.ToString("yyyy-MM-dd"),
                recordActs.Any(a => a.IsCritical), timeImpact.AffectsFinish,
                recordActs);

            // ── الشكل 33 — المسار ─────────────────────────────────────────
            var recordStages = stageRows.Select(s =>
            {
                var def = WorkflowMachine.Stages.FirstOrDefault(x => x.No == s.StageNo);
                var mine = external.Where(x => x.ChangeOrderStageId == s.Id).ToList();
                var (received, required) = WorkflowMachine.ExternalProgress(mine.Select(x => x.State).ToList());

                // OPEN stages are measured to the DATA DATE; closed ones to
                // their own action date. One clock, two endpoints (D-06).
                var end = s.ActionedAt ?? (s.Status is "active" or "overdue" ? asOf : null);
                var elapsed = s.SentAt is null || end is null ? 0 : end.Value.DayNumber - s.SentAt.Value.DayNumber;

                return new RecordStage(
                    s.StageNo, s.NameAr, s.NameEn, s.OwnerParty,
                    // The stored owner is the Arabic name BR-14 matches on; the
                    // English one is a LABEL off the domain table ().
                    def?.OwnerEn ?? s.OwnerParty,
                    s.Status, s.Applicable, s.SkipReason,
                    s.SentAt?.ToString("yyyy-MM-dd"), s.ActionedAt?.ToString("yyyy-MM-dd"),
                    elapsed, s.SlaDays,
                    s.Applicable && s.Status is "active" or "overdue" && elapsed > s.SlaDays,
                    s.Decision, s.DecisionNote,
                    def?.NoteAr ?? "", def?.NoteEn ?? "",
                    received, required,
                    mine.Select(x => new RecordExternalParty(
                        x.Id, x.PartyAr, x.PartyEn, x.State, x.CanCancel,
                        x.LetterNo, x.LetterDate?.ToString("yyyy-MM-dd"),
                        x.RecordedByUserId is null ? null : Personas.Resolve(x.RecordedByUserId).RoleAr,
                        x.Note)).ToList());
            }).ToList();

            var chain = stageRows.Where(s => s.Applicable).ToList();
            var current = chain.FirstOrDefault(s => s.Status is "active" or "overdue");

            var transaction = new RecordTransaction(
                o.IncomingDate?.ToString("yyyy-MM-dd"),
                o.IncomingDate is null ? 0 : asOf.DayNumber - o.IncomingDate.Value.DayNumber,
                recordStages.Any(s => s.Breached),
                // الشكل 33's «معدل دوران المعاملة» — time the transaction has
                // actually spent at desks, which is NOT its age: an order can be
                // 180 days old and have moved through six stages in 37.
                recordStages.Where(s => s.Applicable).Sum(s => s.ElapsedDays),
                current?.NameAr, current?.NameEn);

            // ── الشكل 30 — the nine application steps ─────────────────────
            var anyRateChanged = lines.Any(l => l.ChangeType == "rate")
                || lines.Any(l => l.ApprovedExcessRate is not null || l.ReDeptExcessRate is not null);
            var extendsTime = (o.ApprovedDays ?? o.RequestedDays ?? 0) > 0;

            var applySteps = WorkflowMachine.ApplyChecklist(anyRateChanged, extendsTime).Select(s =>
            {
                var stored = steps.FirstOrDefault(x => x.StepNo == s.No);
                // NOT STARTED is not NOT REQUIRED. An order that has not been
                // applied has no rows at all, and every required step reads
                // `todo` rather than borrowing a status it never had (`03 §6`).
                var status = stored?.Status ?? (s.Required ? "todo" : "na");
                return new RecordApplyStep(
                    s.No, s.SpecStep, s.Ar, s.En, status, stored?.Message,
                    stored?.CompletedAt?.ToString("yyyy-MM-dd"));
            }).ToList();

            // ── الشكل 30 — مدخلات سابقة لإدخال الأمر (`03 §1`) ────────────
            // NOT WORKFLOW STAGES, and the section says so on screen. The two
            // letters that precede entry are derived from the order's own
            // incoming letter, which is what the RE department entered them
            // against.
            var preInputs = new List<RecordPreInput>();

            if (o.ContractorLetterNo is not null)
                preInputs.Add(new("المقاول", "Contractor",
                    "طلب إصدار أمر الغيار مع الكلفة والمدة المقترحة",
                    "Request to issue the change order with the proposed cost and time",
                    o.ContractorLetterNo, o.ContractorLetterDate?.ToString("yyyy-MM-dd"), "in"));

            if (o.ConsultantLetterNo is not null)
                preInputs.Add(new("الاستشاري المصمم والمدقق", "Design & checking consultant",
                    "الموافقة على الفقرات كلياً أو جزئياً",
                    "Approval of the items in whole or in part",
                    o.ConsultantLetterNo, o.ConsultantLetterDate?.ToString("yyyy-MM-dd"), "in"));

            // ── الشكل 30 — أثر الأمر على العقد ────────────────────────────
            var originalValue = contract.OriginalValue;
            var effectiveValue = originalValue + appliedAmendments.Sum(a => a.DeltaValue);

            // The amendment this order produced. `ContractAmendment.
            // SourceChangeOrderId` is the link and it is the ONLY thing read
            // here: matching on (delta value, delta days) instead would pair an
            // order with somebody else's amendment the moment two orders moved
            // the same figures — which on a real contract is not unusual.
            var amendment = amendments.FirstOrDefault(a => a.SourceChangeOrderId == o.Id);

            var valueBefore = o.Lifecycle == "closed" && o.AppliedValue is { } av
                ? effectiveValue - av
                : effectiveValue;

            var contractImpact = new RecordContractImpact(
                M(valueBefore),
                M(o.ApprovedValue),
                o.ApprovedValue is null ? null : M(valueBefore + o.ApprovedValue.Value),
                amendment is null ? "none" : amendment.AppliedAt is not null ? "issued" : "pending",
                amendment?.No,
                timeImpact.FinishApproved?.ToString("yyyy-MM-dd"),
                // BR-10 charges the penalty against the contractual finish, so
                // only an order that MOVES that date moves the baseline.
                (o.ApprovedDays ?? 0) > 0 ? "recalculated" : "unchanged");

            var difference = ChangeOrderRecord.Decision(
                netReDept, o.RequestedDays, o.ApprovedValue, o.ApprovedDays);

            var linesOverTier = lines.Count(l =>
                contractorCols[l.Id].TripsThreshold || reDeptCols[l.Id].TripsThreshold);

            var excessRateState = linesOverTier == 0 ? "na"
                : lines.Any(l => l.ApprovedExcessRate is not null) ? "fixed"
                : "awaiting";

            var impact = new RecordImpactSummary(
                netContractor, netReDept, M(o.ApprovedValue), linesOverTier, excessRateState,
                o.RequestedDays ?? 0, o.ApprovedDays, lines.Count, coActs.Count);

            var decision = new RecordDecision(
                netContractor, o.RequestedDays, netReDept, o.RequestedDays,
                M(o.ApprovedValue), o.ApprovedDays,
                difference.ValueDelta, difference.DaysDelta,
                o.DecisionReason, o.DecisionDate?.ToString("yyyy-MM-dd"), o.ApprovingAuthority,
                linesOverTier > 0 ? RateCommittee : null);

            // ── BR-14, exactly as the register resolves it ────────────────
            var relationKey = Relation(o, stageRows, persona,
                externalPartyPending: external.Any(x =>
                    x.State == "wait" && current is not null && x.ChangeOrderStageId == current.Id));

            var lead = o.IncomingDate is null
                ? new SlaLeadTime.Result(0, false)
                : SlaLeadTime.For(asOf, o.IncomingDate.Value);

            var exceptions = Exceptions(o, current, lead, asOf);

            var card = new RecordCard(
                o.Lifecycle, current?.NameAr, current?.NameEn, lead.LeadDays,
                M(netReDept ?? o.RequestedValue), M(o.ApprovedValue), difference.ValueDelta,
                o.ApprovedValue is null ? null : M(valueBefore + o.ApprovedValue.Value),
                o.RequestedDays ?? 0, o.ApprovedDays,
                (timeImpact.FinishApproved ?? timeImpact.FinishBefore)?.ToString("yyyy-MM-dd"));

            string StageAr(int? n) => n is null ? "" : WorkflowMachine.Stages.FirstOrDefault(s => s.No == n)?.Ar ?? "";
            string StageEn(int? n) => n is null ? "" : WorkflowMachine.Stages.FirstOrDefault(s => s.No == n)?.En ?? "";

            var attachments = files.Select(a =>
            {
                var by = Personas.Resolve(a.UploadedByUserId);
                return new RecordAttachment(
                    a.FileName, a.Category, a.Version, a.UploadedAt.ToString("yyyy-MM-dd"),
                    by.Party, by.RoleEn, a.OriginStageNo,
                    StageAr(a.OriginStageNo), StageEn(a.OriginStageNo));
            }).ToList();

            var auditRows = audit.Select(a =>
            {
                // `system` is not a persona and must not be dressed as one: a
                // row the system wrote is told apart from a row a person wrote
                // (P-83, the same call الشكل 11 made).
                var isSystem = a.UserId == "system";
                var actor = isSystem ? null : Personas.Resolve(a.UserId);
                return new RecordAuditEntry(
                    a.At.ToString("yyyy-MM-dd HH:mm"),
                    isSystem ? "النظام" : actor!.RoleAr,
                    isSystem ? "System" : actor!.RoleEn,
                    a.Action, a.StageNo, StageAr(a.StageNo), StageEn(a.StageNo),
                    a.Field, a.PreviousValue, a.NewValue, a.Note, a.Version);
            }).ToList();

            // الشكل 30's «منتقي الأمر» — the project's other orders, reached
            // through its CONTRACTS because an order has no project column
            // (CLAUDE.md §5.1). Ordered by number so the picker reads like the
            // register it saves a trip to.
            var siblings = await db.ChangeOrders.AsNoTracking()
                .Where(x => contractIds.Contains(x.ContractId))
                .OrderBy(x => x.No)
                .Select(x => new RecordSibling(x.No, x.TitleAr, x.TitleEn, x.Lifecycle, x.No == no))
                .ToListAsync();

            return Results.Ok(new ChangeOrderRecordResponse(
                p.Id, p.NameAr, p.NameEn, p.DataDate?.ToString("yyyy-MM-dd"),
                persona.Id, persona.Party, persona.IsDelegate,
                o.No, o.ContractId, contract.NameAr, contract.NameEn,
                o.TitleAr, o.TitleEn, o.Type, o.Lifecycle, o.Justification,
                o.ResponsibleParty, o.IncomingNo, o.IncomingDate?.ToString("yyyy-MM-dd"),
                new ViewerRelationDto(relationKey, Domain.ViewerRelation.CanAct(relationKey),
                    current?.NameAr, current?.NameEn),
                exceptions, card,
                preInputs, impact, contractImpact, decision, applySteps,
                recordLines, netContractor, netReDept, netApproved, weights, redistribution,
                time, recordStages, transaction, attachments, auditRows, siblings));
        });
    }

    /// <summary>One column's weights, and whether that column exists at all.</summary>
    private record WeightSet(ChangeOrderRecord.WeightImpact Impact, bool Any);

    // ── one row ──────────────────────────────────────────────────────────

    private static ChangeOrderRow Row(
        ChangeOrder o,
        List<ChangeOrderStage> allStages,
        Dictionary<int, int> files,
        Persona persona,
        DateOnly asOf)
    {
        var mine = allStages.Where(s => s.ChangeOrderId == o.Id).ToList();
        var chain = mine.Where(s => s.Applicable).ToList();
        var current = chain.FirstOrDefault(s => s.Status is "active" or "overdue");

        // The register cannot know whether an external party is pending — it
        // does not read that table — so `recorder` is unreachable HERE and
        // reachable on the record, which does (EP-CHG-02).
        var relationKey = Relation(o, mine, persona, externalPartyPending: false);

        var lead = o.IncomingDate is null
            ? new SlaLeadTime.Result(0, false)
            : SlaLeadTime.For(asOf, o.IncomingDate.Value);

        var exceptions = Exceptions(o, current, lead, asOf);

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

    // ── the two answers the register and the record must agree on ────────
    // Both screens show the same order to the same person. If they resolved
    // its relation or its exception chips separately they would eventually
    // disagree, and the register's «بانتظار إجرائي» would send somebody to a
    // record that offers them nothing.

    /// <summary>
    /// BR-14 · `03 §7`. APPLICABLE STAGES ONLY: a skipped stage is listed on
    /// the record with its reason (`03 §2`) but it owns nothing, so it can make
    /// nobody `awaiting` and nobody `upcoming`.
    /// </summary>
    private static string Relation(
        ChangeOrder o, List<ChangeOrderStage> stages, Persona persona, bool externalPartyPending)
    {
        var chain = stages.Where(s => s.Applicable).ToList();
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

        return ViewerRelation.For(
            persona.Party, persona.IsDelegate, o.Lifecycle,
            current?.OwnerParty, executionOwner, done, todo, externalPartyPending);
    }

    /// <summary>`03 §10`'s chips — exceptions beside the lifecycle pill, never instead of it.</summary>
    private static List<ExceptionChip> Exceptions(
        ChangeOrder o, ChangeOrderStage? current, SlaLeadTime.Result lead, DateOnly asOf)
    {
        var exceptions = new List<ExceptionChip>();
        var inChain = o.Lifecycle is "pending" or "returned";

        // The stage clock is its own: how long THIS stage has been open, not
        // how long the order has existed.
        var stageBreached = current?.SentAt is not null
            && asOf.DayNumber - current.SentAt.Value.DayNumber > current.SlaDays;

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

        return exceptions;
    }

    private static decimal M(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);

    /// <summary>Null STAYS null — a missing figure is not a zero (P-09).</summary>
    private static decimal? M(decimal? v) => v is null ? null : M(v.Value);
}
