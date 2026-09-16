using Epm.Api.Data;
using Epm.Api.Data.Entities;
using Epm.Api.Domain;
using Epm.Api.Features.Dev;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace Epm.Api.Features.ChangeOrders;

/// <summary>
/// `03 §3`–§7 — TAKING A DECISION on a change order, and APPLYING it.
/// The three endpoints that WRITE to an order that already exists.
///
/// ── THE GATE IS HERE, NOT IN THE BROWSER (BR-14 · `03 §7`) ──────────────
/// Every one of these resolves the viewer's relation from the persona header
/// and refuses anything the relation does not allow. The record page hides the
/// controls, which is courtesy; this is the rule. A screen that hid a button
/// while the endpoint accepted the call would have no authorisation model at
/// all.
///
/// ── APPROVING CHANGES NOTHING (`02 §9`, non-negotiable #2) ──────────────
/// `EP-WFL-01` moves a lifecycle and a stage pointer. It writes no amendment,
/// no quantity and no date. `EP-WFL-03` is the only endpoint in this system
/// that moves a contract, and it is a separate deliberate act.
///
/// ── EVERY WRITE LEAVES AN AUDIT ROW ─────────────────────────────────────
/// `01 §4` — one row per changed field, with the previous value beside the new
/// one. The record's السجل tab is not a view of these endpoints' intentions; it
/// is a view of what they wrote.
/// </summary>
public static class ChangeOrderWorkflowEndpoints
{
    /// <param name="Note">Required for `return`, `reject` and `cancel` (`03 §5`).</param>
    /// <param name="Approvals">
    /// P-252 — لجنة تثبيت الأسعار's own entry, honored only when the stage
    /// being decided is 3 and the decision is `approve`. Required then, at
    /// least one line: a stage-3 approval with nothing entered is the
    /// "computed guess" `02 §6` forbids, in a different shape.
    /// </param>
    /// <param name="ApprovedDays">
    /// Stage 3 only, as with <see cref="Approvals"/>. Days are an ORDER-level
    /// figure, not a per-line one (unlike value), so this is separate from
    /// <see cref="Approvals"/> rather than folded into it. Defaults to the
    /// requested days when the committee makes no change.
    /// </param>
    public record DecisionInput(
        string Decision, string? Note,
        IReadOnlyList<LineApproval>? Approvals = null, int? ApprovedDays = null);

    /// <summary>
    /// One line's committee-entered figures — mirrors `ChangeOrderLine`'s own
    /// `Approved*` columns exactly, so the endpoint just copies them across.
    /// Keyed by the BOQ item's <see cref="Code"/> — the same identity
    /// `ChangeOrderRecordDto`'s `RecordLine.Code` already exposes to the
    /// Angular page and every other tab on this record addresses a line by,
    /// never the internal `ChangeOrderLine.Id` the frontend is never handed.
    /// </summary>
    public record LineApproval(string Code, decimal? DeltaQty, decimal? Rate, decimal? ExcessRate);

    /// <param name="State">`in` وردت · `back` أُعيد · `na` غير مطلوب (`03 §3`).</param>
    /// <param name="LetterNo">
    /// Every delegated record REQUIRES an official letter number and date
    /// (`03 §4`) — the outcome belongs to a party that is not a system user,
    /// and the letter is the only thing that makes it a record rather than an
    /// assertion.
    /// </param>
    public record ExternalInput(string State, string LetterNo, string LetterDate, string? Note);

    public record WorkflowResult(string No, string Lifecycle, int? CurrentStageNo, string Message);

    /// <summary>`03 §3`'s stage-4 parties — the only two that may cancel (D-04).</summary>
    private static readonly string[] MayCancel = ["لجنة المراجعة المصادقة", "الدائرة الإدارية والمالية"];

    public static void MapChangeOrderWorkflowEndpoints(this WebApplication app)
    {
        // [EP-CO-02] PUT /api/projects/{projectId}/change-orders/{no}
        // Only the creator may edit a draft or a returned order. The endpoint
        // never accepts contract identity, baseline, approved or applied data.
        app.MapPut("/api/projects/{projectId}/change-orders/{no}",
            async (EpmDb db, HttpContext ctx, string projectId, string no, WizardDraft input) =>
        {
            var found = await Load(db, ctx, projectId, no);
            if (found.Error is { } e) return e;
            var (_, order, _, _, asOf, persona) = found;

            var denial = ChangeOrderAuthorization.DenialReason(
                order!.Lifecycle, order.CreatedByUserId, persona!.Id);
            if (denial is not null)
            {
                db.ChangeOrderAuditEntries.Add(Audit(order, asOf, persona.Id, "denied-edit", null,
                    "change-order", order.Lifecycle, "edit", denial, version: 2,
                    anchor: "EP-CO-02"));
                await db.SaveChangesAsync();
                return Results.StatusCode(StatusCodes.Status403Forbidden);
            }

            if (input.ContractId != order.ContractId || input.Type != order.Type)
            {
                db.ChangeOrderAuditEntries.Add(Audit(order, asOf, persona.Id, "denied-edit", null,
                    "core-fields", order.ContractId, input.ContractId,
                    "العقد ونوع الأمر غير قابلين للتغيير.", version: 2, anchor: "EP-CO-01"));
                await db.SaveChangesAsync();
                return Results.BadRequest(new { message = "لا يمكن تغيير العقد أو نوع الأمر بعد إنشاء الأمر" });
            }

            var version = (await db.ChangeOrderAuditEntries
                .Where(x => x.ChangeOrderId == order.Id).MaxAsync(x => (int?)x.Version) ?? 0) + 1;
            void Record(string field, string? before, string? after)
            {
                if (before != after)
                    db.ChangeOrderAuditEntries.Add(Audit(order, asOf, persona.Id, "edit", null,
                        field, before, after, null, version, "EP-CO-09"));
            }

            Record("Justification", order.Justification, input.Justification);
            Record("ResponsibleParty", order.ResponsibleParty, input.ResponsibleParty);
            Record("IncomingNo", order.IncomingNo, input.IncomingNo);
            order.Justification = input.Justification;
            order.ResponsibleParty = input.ResponsibleParty;
            order.IncomingNo = input.IncomingNo;
            if (DateOnly.TryParse(input.IncomingDate, out var incomingDate)) order.IncomingDate = incomingDate;

            var items = await db.BoqItems.AsNoTracking().Where(x => x.ContractId == order.ContractId).ToListAsync();
            var itemByCode = items.ToDictionary(x => x.Code, StringComparer.OrdinalIgnoreCase);
            var lines = await db.ChangeOrderLines.Where(x => x.ChangeOrderId == order.Id).ToListAsync();
            foreach (var proposed in input.Lines)
            {
                if (!itemByCode.TryGetValue(proposed.Code, out var item)) continue;
                var line = lines.FirstOrDefault(x => x.BoqItemId == item.Id);
                if (line is null) continue;
                Record($"{proposed.Code}.proposal", Proposal(line), Proposal(proposed));
                line.ContractorDeltaQty = proposed.ContractorDeltaQty;
                line.ContractorNewRate = proposed.ContractorNewRate;
                line.ContractorExcessRate = proposed.ContractorExcessRate;
                line.ReDeptDeltaQty = proposed.ReDeptDeltaQty;
                line.ReDeptNewRate = proposed.ReDeptNewRate;
                line.ReDeptExcessRate = proposed.ReDeptExcessRate;
                line.TargetBoqItemId = proposed.TargetCode is null || !itemByCode.TryGetValue(proposed.TargetCode, out var target) ? null : target.Id;
                line.DrawnQty = proposed.DrawnQty;
                line.DistributedQty = proposed.DistributedQty;
            }

            var activities = await db.ChangeOrderActivities
                .Where(x => x.ChangeOrderId == order.Id).ToListAsync();
            var sourceActivities = await db.Activities.AsNoTracking()
                .Where(x => x.ContractId == order.ContractId).ToListAsync();
            foreach (var proposed in input.Activities)
            {
                var source = sourceActivities.FirstOrDefault(x =>
                    string.Equals(x.ActivityId, proposed.ActivityId, StringComparison.OrdinalIgnoreCase));
                var activity = source is null ? null : activities.FirstOrDefault(x => x.ActivityId == source.Id);
                if (activity is null) continue;
                Record($"{proposed.ActivityId}.proposal", ActivityProposal(activity), ActivityProposal(proposed));
                activity.ChangeType = proposed.ChangeType;
                activity.RequestedDeltaDays = proposed.RequestedDeltaDays;
                activity.RequestedStart = DateOnly.TryParse(proposed.RequestedStart, out var start) ? start : null;
                activity.RequestedFinish = DateOnly.TryParse(proposed.RequestedFinish, out var finish) ? finish : null;
            }

            await db.SaveChangesAsync();
            return Results.Ok(new WorkflowResult(order.No, order.Lifecycle, null, "سُجّل التعديل"));
        });

        // [EP-WFL-01] POST /api/projects/{projectId}/change-orders/{no}/decisions
        // web: change-orders.api.ts decide() → change-order.page.ts
        // spec: 03 §5 · §7 · ملحق الشكل 33 | rules: BR-13, BR-14
        // tables: ChangeOrders · ChangeOrderStages · ChangeOrderAuditEntries *(written)*
        app.MapPost("/api/projects/{projectId}/change-orders/{no}/decisions",
            async (EpmDb db, HttpContext ctx, string projectId, string no, DecisionInput input) =>
        {
            var found = await Load(db, ctx, projectId, no);
            if (found.Error is { } e) return e;
            var (p, order, stages, externals, asOf, persona) = found;

            var current = stages.FirstOrDefault(s => s.Applicable && s.Status is "active" or "overdue");
            var relation = Relation(order!, stages, externals, persona!, current);

            var offered = WorkflowMachine.Available(
                order!.Lifecycle, relation,
                current is null ? [] : externals.Where(x => x.ChangeOrderStageId == current.Id)
                    .Select(x => x.State).ToList());

            if (offered.FirstOrDefault(d => d.Key == input.Decision) is not { } decision)
            {
                db.ChangeOrderAuditEntries.Add(Audit(order!, asOf, persona!.Id, "denied-transition",
                    current?.StageNo, "lifecycle", Life(order!.Lifecycle), input.Decision,
                    "الانتقال مرفوض بحسب المرحلة أو صلاحية المستخدم.", version: 2,
                    anchor: "EP-CO-02"));
                await db.SaveChangesAsync();
                return Results.StatusCode(StatusCodes.Status403Forbidden);
            }

            // `03 §5` — a return or a rejection without a stated reason is a
            // decision the next reader cannot act on.
            if (decision.NeedsNote && string.IsNullOrWhiteSpace(input.Note))
                return Results.UnprocessableEntity(new
                {
                    message = "التعليق إلزامي عند الإعادة أو الرفض أو الإلغاء",
                    field = "note",
                });

            // D-04 — cancelling belongs to the two external parties of stage 4,
            // recorded by their delegate. Nobody else may end an order this way.
            if (input.Decision == "cancel" && !persona!.IsDelegate)
            {
                db.ChangeOrderAuditEntries.Add(Audit(order!, asOf, persona.Id, "denied-transition",
                    current?.StageNo, "lifecycle", Life(order!.Lifecycle), input.Decision,
                    "الإلغاء يتطلب مسجلاً مفوضاً.", version: 2, anchor: "EP-CO-02"));
                await db.SaveChangesAsync();
                return Results.StatusCode(StatusCodes.Status403Forbidden);
            }

            var before = order.Lifecycle;

            if (input.Decision == "resubmit")
            {
                // `03 §5` — back into the chain at the first applicable stage,
                // with the clock restarting from today-as-the-project-knows-it.
                var reviewLines = await db.ChangeOrderLines.Where(l => l.ChangeOrderId == order.Id).ToListAsync();
                var previousReview = JsonSerializer.Serialize(new { stages, lines = reviewLines,
                    order.ApprovedValue, order.ApprovedDays, order.DecisionDate, order.ApprovingAuthority });
                ChangeOrderReview.Restart(order, stages, reviewLines, asOf);
                db.ChangeOrderAuditEntries.Add(Audit(order, asOf, persona!.Id, "review-restarted", null,
                    "review-cycle", previousReview,
                    JsonSerializer.Serialize(new { stages, lines = reviewLines,
                        order.ApprovedValue, order.ApprovedDays, order.DecisionDate, order.ApprovingAuthority }),
                    "أُعيد بدء المسار وأُلغيت القيم المعتمدة السابقة لحين إعادة التدقيق."));
            }
            else
            {
                var plan = Plan(order, stages);
                var t = WorkflowMachine.Decide(current!.StageNo, input.Decision, plan);

                // ── P-252 — لجنة تثبيت الأسعار's decision IS the approved
                // value (`02 §6`), on every order, never a computed guess.
                // Checked before anything else is written so a rejected
                // stage-3 approval leaves no partial state behind.
                if (input.Decision == "approve" && current.StageNo == 3)
                {
                    if (input.Approvals is not { Count: > 0 })
                        return Results.UnprocessableEntity(new
                        {
                            message = "يجب إدخال القيمة المعتمدة من لجنة تثبيت الأسعار قبل اعتماد هذه المرحلة",
                            field = "approvals",
                        });

                    var lines = await db.ChangeOrderLines
                        .Where(l => l.ChangeOrderId == order.Id).ToListAsync();
                    var items = await db.BoqItems
                        .Where(i => i.ContractId == order.ContractId).ToListAsync();
                    var itemById = items.ToDictionary(i => i.Id);
                    var lineByCode = lines.ToDictionary(l =>
                        itemById.TryGetValue(l.BoqItemId, out var it) ? it.Code : "—");

                    // Validate every required line before mutating any approved figures.
                    var required = lineByCode.Where(x => x.Value.ReDeptDeltaQty is not null || x.Value.ReDeptNewRate is not null);
                    if (input.Approvals.Select(a => a.Code).Distinct().Count() != input.Approvals.Count
                        || input.Approvals.Any(a => !lineByCode.ContainsKey(a.Code))
                        || required.Any(x => input.Approvals.FirstOrDefault(a => a.Code == x.Key) is not { } a
                            || !ChangeOrderReview.ValidApproval(x.Value, a.DeltaQty, a.Rate, a.ExcessRate)))
                        return Results.UnprocessableEntity(new
                        {
                            message = "يجب إدخال القيمة المعتمدة من لجنة تثبيت الأسعار قبل اعتماد هذه المرحلة",
                            field = "approvals",
                        });

                    foreach (var a in input.Approvals)
                    {
                        if (!lineByCode.TryGetValue(a.Code, out var line)) continue;

                        line.ApprovedDeltaQty = a.DeltaQty;
                        line.ApprovedRate = a.Rate;
                        line.ApprovedExcessRate = a.ExcessRate;
                        db.ChangeOrderAuditEntries.Add(Audit(order, asOf, persona!.Id,
                            "approval-recalculation", current.StageNo,
                            $"{a.Code}.approved", null,
                            $"qty={a.DeltaQty?.ToString() ?? "null"};rate={a.Rate?.ToString() ?? "null"};excessRate={a.ExcessRate?.ToString() ?? "null"}",
                            "أُعيد احتساب قيمة السطر من مدخلات لجنة التسعير.", version: 2,
                            anchor: "EP-CO-09"));
                    }

                    // Same Line/Column/Net pattern ChangeOrdersEndpoints.cs
                    // uses for the contractor's and RE department's own
                    // columns (`:225-244,304-305`) — the approved column is
                    // computed the identical way, off the figures just
                    // written above.
                    var domainLines = lines.ToDictionary(l => l.Id, l => new ChangeOrderRecord.Line(
                        itemById.TryGetValue(l.BoqItemId, out var it) ? it.Code : "—",
                        l.ChangeType, l.ContractedQty, l.BeforeQty, l.BeforeRate, l.BeforeAmount,
                        order.Type == "supply"));

                    var approvedCols = lines.Select(l => ChangeOrderRecord.For(
                        domainLines[l.Id],
                        new ChangeOrderRecord.Party(l.ApprovedDeltaQty, l.ApprovedRate, l.ApprovedExcessRate)));

                    order.ApprovedValue = ChangeOrderRecord.Net(approvedCols);
                    order.ApprovedDays = input.ApprovedDays ?? order.RequestedDays;
                }

                current.Decision = input.Decision;
                current.DecisionNote = input.Note;
                current.DecidedByUserId = persona!.Id;
                current.ActionedAt = asOf;
                current.Status = input.Decision == "return" ? "returned" : "done";

                order.Lifecycle = t.Lifecycle;

                // `03 §5` — a RETURN keeps its own history: the stage that sent
                // the order back stays `returned` with its decision on it, and
                // the stage it went back TO reopens.
                if (t.StageNo is { } next)
                {
                    var target = stages.First(s => s.StageNo == next);
                    target.Status = "active";
                    target.SentAt = asOf;
                    if (input.Decision == "return")
                    {
                        target.ActionedAt = null;
                        target.Decision = null;
                    }
                }

                if (input.Decision is "approve" && t.StageNo is null)
                {
                    // The chain is complete. `02 §9`: the contract has NOT
                    // changed, and the decision date is recorded so the
                    // register's cycle average has something real to measure.
                    order.DecisionDate = asOf;
                    order.ApprovingAuthority = current.OwnerParty;

                    // ── THE PROJECTION BECOMES A ROW (`02 §9`) ───────────
                    // An approved-but-unapplied order is a PENDING amendment:
                    // that is how SCR-E3, SCR-W1 and SCR-W3 already show it
                    // beside their effective figures without folding it in. It
                    // is created here and flipped to `effective` by EP-WFL-03 —
                    // never inserted twice, which is what made VO-05 carry two
                    // amendments numbered 2 the first time this ran.
                    var already = await db.ContractAmendments
                        .AnyAsync(a => a.SourceChangeOrderId == order.Id);

                    if (!already && order.ApprovedValue is { } approvedValue)
                    {
                        var chain = await db.ContractAmendments
                            .Where(a => a.ContractId == order.ContractId).ToListAsync();

                        var effectiveNow = Amendments.Effective(
                            await OriginalOf(db, order.ContractId),
                            chain.Select(a => new Amendments.Delta(
                                a.No, a.DeltaValue, a.DeltaDays, a.AppliedAt is not null)).ToList());

                        var projected = Amendments.Apply(effectiveNow, approvedValue, order.ApprovedDays ?? 0);

                        db.ContractAmendments.Add(new ContractAmendment
                        {
                            ContractId = order.ContractId,
                            No = chain.Count == 0 ? 1 : chain.Max(a => a.No) + 1,
                            SourceChangeOrderId = order.Id,
                            DeltaValue = approvedValue,
                            DeltaDays = order.ApprovedDays ?? 0,
                            Value = projected.Value,
                            Finish = projected.Finish,
                            DurationDays = projected.Duration,
                            // `02 §9` — approved, NOT applied. The null AppliedAt
                            // is the whole rule (BR-09).
                            State = "pending",
                            AppliedAt = null,
                        });
                    }
                }
            }

            db.ChangeOrderAuditEntries.Add(Audit(order, asOf, persona!.Id, input.Decision,
                current?.StageNo, "lifecycle", Life(before), Life(order.Lifecycle), input.Note));

            await db.SaveChangesAsync();

            var open = stages.FirstOrDefault(s => s.Applicable && s.Status == "active");
            return Results.Ok(new WorkflowResult(order.No, order.Lifecycle, open?.StageNo,
                input.Decision == "approve" && order.Lifecycle == "approved"
                    ? "اكتمل المسار — الأمر معتمد ولم يُطبَّق بعد"
                    : "سُجِّل القرار"));
        });

        // [EP-WFL-02] POST /api/projects/{projectId}/change-orders/{no}/external/{partyId}
        // web: change-orders.api.ts recordExternal() → change-order.page.ts
        // spec: 03 §3 · §4 · ملحق الشكل 33 | rules: BR-14
        // tables: ChangeOrderExternalParties · ChangeOrderAuditEntries *(written)*
        //
        // THE DECISION IS THE PARTY'S; THE DELEGATE IS THE RECORDER (`03 §4`).
        // Both names are kept, and the audit row says which is which.
        app.MapPost("/api/projects/{projectId}/change-orders/{no}/external/{partyId:int}",
            async (EpmDb db, HttpContext ctx, string projectId, string no, int partyId, ExternalInput input) =>
        {
            var found = await Load(db, ctx, projectId, no);
            if (found.Error is { } e) return e;
            var (p, order, stages, externals, asOf, persona) = found;

            var party = externals.FirstOrDefault(x => x.Id == partyId);
            if (party is null) return Results.NotFound(new { message = "external party not found on this order" });

            // `03 §4` — recording on behalf of a party is the DELEGATE's job,
            // and BR-14 calls that relation `recorder`. A stage owner acting in
            // their own right does not get to answer for somebody else.
            if (!persona!.IsDelegate)
            {
                db.ChangeOrderAuditEntries.Add(Audit(order!, asOf, persona.Id, "denied-external-record",
                    null, "external-party", null, input.State,
                    "تسجيل قرار جهة خارجية يتطلب صفة الممثل المفوض.", version: 2, anchor: "EP-CO-02"));
                await db.SaveChangesAsync();
                return Results.StatusCode(StatusCodes.Status403Forbidden);
            }

            var stage = stages.FirstOrDefault(s => s.Id == party.ChangeOrderStageId);
            if (stage is null || stage.Status is not ("active" or "overdue"))
                return Results.UnprocessableEntity(new
                {
                    message = "لا يمكن تسجيل قرار جهة خارجية إلا في المرحلة المفتوحة",
                });

            if (string.IsNullOrWhiteSpace(input.LetterNo) || !DateOnly.TryParse(input.LetterDate, out var letterDate))
                return Results.UnprocessableEntity(new
                {
                    message = "رقم الكتاب الرسمي وتاريخه إلزاميان لتسجيل قرار جهة خارجية",
                    field = "letterNo",
                });

            var previous = party.State;

            party.State = input.State;
            party.LetterNo = input.LetterNo;
            party.LetterDate = letterDate;
            party.RecordedByUserId = persona.Id;
            party.RecordedAt = asOf.ToDateTime(TimeOnly.FromDateTime(DateTime.UtcNow));
            party.Note = input.Note;

            // D-04 — a party that may cancel, and did, ends the order. The
            // cancellation is the PARTY's, recorded by the delegate.
            if (input.State == "back" && party.CanCancel && MayCancel.Contains(party.PartyAr))
            {
                order!.Lifecycle = "cancelled";
                stage.Status = "returned";
                stage.Decision = "cancel";
                stage.ActionedAt = asOf;
            }

            db.ChangeOrderAuditEntries.Add(Audit(order!, asOf, persona.Id, "record-external",
                stage.StageNo, party.PartyAr, StateLabel(previous), StateLabel(input.State),
                $"سُجِّل نيابةً عن {party.PartyAr} بموجب الكتاب {input.LetterNo}."
                + (string.IsNullOrWhiteSpace(input.Note) ? "" : " " + input.Note), version: 2));

            await db.SaveChangesAsync();

            var mine = externals.Where(x => x.ChangeOrderStageId == stage.Id).Select(x => x.State).ToList();
            var (received, required) = WorkflowMachine.ExternalProgress(mine);

            return Results.Ok(new WorkflowResult(order!.No, order.Lifecycle, stage.StageNo,
                WorkflowMachine.CanCompleteStage(mine)
                    ? "وردت جميع الأطراف الخارجية — يمكن إتمام المرحلة"
                    : $"سُجِّل القرار — الأطراف الخارجية {received}/{required}"));
        });

        // [EP-WFL-03] POST /api/projects/{projectId}/change-orders/{no}/apply
        // web: change-orders.api.ts apply() → change-order.page.ts
        // spec: 03 §6 · 02 §9 · ملحق الشكل 30 | rules: BR-01, BR-05, BR-09, BR-10
        // tables: ContractAmendments · BoqRateBands · Activities · ChangeOrders
        //       · ChangeOrderLines · ChangeOrderRedistributions · BoqDistributions
        //       · ChangeOrderActivities · ChangeOrderApplySteps
        //       · ChangeOrderAuditEntries *(all **written**)*
        //
        // THE ONLY ENDPOINT IN THIS SYSTEM THAT MOVES A CONTRACT.
        app.MapPost("/api/projects/{projectId}/change-orders/{no}/apply",
            async (EpmDb db, HttpContext ctx, string projectId, string no) =>
        {
            var found = await Load(db, ctx, projectId, no);
            if (found.Error is { } e) return e;
            var (p, order, stages, externals, asOf, persona) = found;

            var current = stages.FirstOrDefault(s => s.Applicable && s.Status is "active" or "overdue");
            var relation = Relation(order!, stages, externals, persona!, current);

            if (!WorkflowMachine.Available(order!.Lifecycle, relation, []).Any(d => d.Key == "apply"))
            {
                db.ChangeOrderAuditEntries.Add(Audit(order!, asOf, persona!.Id, "denied-transition",
                    current?.StageNo, "lifecycle", Life(order.Lifecycle), "apply",
                    "التطبيق مرفوض بحسب المرحلة أو صلاحية المستخدم.", version: 2, anchor: "EP-CO-02"));
                await db.SaveChangesAsync();
                return Results.StatusCode(StatusCodes.Status403Forbidden);
            }

            if (order.ApprovedValue is null)
                return Results.UnprocessableEntity(new
                {
                    message = "لا يمكن التطبيق قبل اعتماد القيمة من لجنة التسعير",
                });

            await using var applyTransaction = await db.Database.BeginTransactionAsync();

            var contract = await db.Contracts.FirstAsync(c => c.Id == order.ContractId);
            var amendments = await db.ContractAmendments
                .Where(a => a.ContractId == contract.Id).OrderBy(a => a.No).ToListAsync();

            var items = await db.BoqItems.Where(i => i.ContractId == contract.Id).ToListAsync();
            var bands = await db.BoqRateBands
                .Where(b => items.Select(i => i.Id).Contains(b.BoqItemId))
                .OrderBy(b => b.Seq).ToListAsync();

            var lines = await db.ChangeOrderLines.Where(l => l.ChangeOrderId == order.Id).ToListAsync();
            var coActs = await db.ChangeOrderActivities.Where(a => a.ChangeOrderId == order.Id).ToListAsync();
            var activities = await db.Activities.Where(a => a.ContractId == contract.Id).ToListAsync();

            var lineByItem = lines.ToDictionary(l => l.BoqItemId);

            // BR-09's effective version — original plus APPLIED deltas only.
            var effective = Amendments.Effective(
                new Amendments.Version(0, contract.OriginalValue, contract.OriginalFinish, contract.OriginalDurationDays),
                amendments.Select(a => new Amendments.Delta(a.No, a.DeltaValue, a.DeltaDays, a.AppliedAt is not null)).ToList());

            var planInput = items.Select(i =>
            {
                var l = lineByItem.TryGetValue(i.Id, out var x) ? x : null;
                return new ChangeOrderApply.LineInput(
                    i.Code,
                    l?.ChangeType ?? "none",
                    i.OriginalQty,
                    i.UnitRate,
                    bands.Where(b => b.BoqItemId == i.Id)
                         .Select(b => new TierSplit.Band(b.Qty, b.Rate)).ToList(),
                    l?.ApprovedDeltaQty,
                    l?.ApprovedRate,
                    l?.ApprovedExcessRate);
            }).ToList();

            var actChanges = coActs.Select(a =>
            {
                var src = activities.First(x => x.Id == a.ActivityId);
                var days = a.ApprovedDeltaDays ?? 0;
                var before = src.ForecastFinish ?? src.BaselineFinish;
                return new ChangeOrderApply.ActivityChange(
                    src.ActivityId, before, before?.AddDays(days),
                    src.RemainingDuration, src.RemainingDuration + days, days);
            }).ToList();

            var plan = ChangeOrderApply.Plan(
                effective, order.ApprovedValue.Value, order.ApprovedDays ?? 0, planInput, actChanges);

            var outcomes = ChangeOrderApply.StepOutcomes(plan);
            var checklist = WorkflowMachine.ApplyChecklist(plan.AnyRateChanged, plan.PenaltyMoves);

            db.ChangeOrderAuditEntries.Add(Audit(order, asOf, "system", "recalculation",
                current?.StageNo, "weights", $"{plan.Weights.SumBefore:0.00}%",
                $"{plan.Weights.SumAfter:0.00}%",
                "أُعيد احتساب الأوزان والأثر من القيم المصدرية قبل التطبيق.", version: 2,
                anchor: "EP-CO-05"));

            // ── the steps, recorded before anything else ────────────────
            var existing = await db.ChangeOrderApplySteps
                .Where(s => s.ChangeOrderId == order.Id).ToListAsync();
            db.ChangeOrderApplySteps.RemoveRange(existing);

            foreach (var s in checklist)
                db.ChangeOrderApplySteps.Add(new ChangeOrderApplyStep
                {
                    ChangeOrderId = order.Id,
                    StepNo = s.No,
                    NameAr = s.Ar,
                    NameEn = s.En,
                    Status = s.Required ? outcomes[s.No] : "na",
                    Message = s.No == 5 && !plan.Weights.Valid
                        ? $"مجموع الأوزان بعد إعادة الاحتساب {plan.Weights.SumAfter:0.00}% — لا يبلغ 100.00%. لم تُطبَّق بقية الخطوات."
                        : null,
                    CompletedAt = outcomes[s.No] == "done" ? asOf.ToDateTime(TimeOnly.MinValue) : null,
                });

            // ── `03 §6`'s failable step (BR-01) ──────────────────────────
            // A plan whose weights do not verify writes NOTHING to the
            // contract: the order stays in applied_partial, the register raises
            // فشل التطبيق, and the record says which step stopped and why.
            if (!plan.Weights.Valid)
            {
                order.Lifecycle = "applied_partial";
                order.WeightRecalcState = "failed";

                db.ChangeOrderAuditEntries.Add(Audit(order, asOf, "system", "apply-failed",
                    current?.StageNo, "weightsSum",
                    $"{plan.Weights.SumBefore:0.00}%", $"{plan.Weights.SumAfter:0.00}%",
                    "فشل إعادة احتساب الأوزان — لم يُطبَّق الأمر.", version: 2));

                await db.SaveChangesAsync();
                await applyTransaction.CommitAsync();

                return Results.UnprocessableEntity(new
                {
                    message = "فشل تطبيق الأمر عند إعادة احتساب الأوزان — لم يتغيّر العقد",
                    step = 5,
                    sumAfter = plan.Weights.SumAfter,
                });
            }

            // ── BR-09 — the amendment IS the application ─────────────────
            // The approval already created it as `pending` (`02 §9`); applying
            // FLIPS THAT ROW rather than adding another. A second row would
            // double-count the order in every effective figure the moment both
            // were applied — and would leave the projection the contract
            // screens read pointing at an order that has already landed.
            var amendment = await db.ContractAmendments
                .FirstOrDefaultAsync(a => a.SourceChangeOrderId == order.Id && a.AppliedAt == null);

            if (amendment is null)
            {
                amendment = new ContractAmendment
                {
                    ContractId = contract.Id,
                    No = plan.Amendment.No,
                    SourceChangeOrderId = order.Id,
                    DeltaValue = order.ApprovedValue.Value,
                    DeltaDays = order.ApprovedDays ?? 0,
                };
                db.ContractAmendments.Add(amendment);
            }

            amendment.Value = plan.Amendment.Value;
            amendment.Finish = plan.Amendment.Finish;
            amendment.DurationDays = plan.Amendment.Duration;
            amendment.State = "effective";
            amendment.AppliedAt = asOf.ToDateTime(TimeOnly.MinValue);

            // ── the lines: quantity moves into BANDS, originals untouched ─
            foreach (var change in plan.Lines)
            {
                var item = items.First(i => i.Code == change.Code);
                if (!lineByItem.TryGetValue(item.Id, out var coLine)) continue;

                db.BoqRateBands.RemoveRange(bands.Where(b => b.BoqItemId == item.Id));

                // The second band, when there is one, is the portion beyond
                // 20% that لجنة تثبيت الأسعار re-priced — flagged so a reader
                // can see the line carries two rates BY RULE (`02 §5`).
                var seq = 1;
                foreach (var b in change.Bands)
                    db.BoqRateBands.Add(new BoqRateBand
                    {
                        BoqItemId = item.Id, Seq = seq, Qty = b.Qty, Rate = b.Rate,
                        SourceChangeOrderId = order.Id,
                        IsExcessBand = seq++ > 1,
                    });

                coLine.AppliedDeltaQty = coLine.ApprovedDeltaQty;
                coLine.ApplyStatus = "done";

                db.ChangeOrderAuditEntries.Add(Audit(order, asOf, "system", "apply",
                    current?.StageNo, item.Code + ".qty",
                    change.QtyBefore.ToString("0.##"), change.QtyAfter.ToString("0.##"),
                    null, version: 2));
            }

            // ── الشكل 58 — إعادة التوزيع بين الجهات المستفيدة ─────────────
            // The ONE thing a supply redistribution moves. It runs beside the
            // band rewrite above and not inside it, because it is a different
            // movement: the line's quantity, rate, amount and weight are all
            // untouched here — الشكل 59 prints «الحالي 111 · المقترح 111 · الأثر
            // 0» — and only BR-08's per-beneficiary rows change.
            //
            // Approved ≠ applied (§5.2): every row below has sat in the database
            // since submission with `AppliedQty` null, and THIS is where it is
            // written.
            var lineIds = lineByItem.Values.Select(l => l.Id).ToList();
            var transfers = await db.ChangeOrderRedistributions
                .Where(t => lineIds.Contains(t.ChangeOrderLineId) && t.AppliedQty == null)
                .OrderBy(t => t.Id).ToListAsync();

            if (transfers.Count > 0)
            {
                var itemOfLine = lineByItem.ToDictionary(kv => kv.Value.Id, kv => kv.Key);
                var dist = await db.BoqDistributions
                    .Where(d => itemOfLine.Values.Contains(d.BoqItemId)).ToListAsync();

                foreach (var t in transfers)
                {
                    if (!itemOfLine.TryGetValue(t.ChangeOrderLineId, out var itemId)) continue;

                    var from = dist.FirstOrDefault(d =>
                        d.BoqItemId == itemId && d.BeneficiaryCode == t.FromBeneficiaryCode);
                    if (from is null) continue;

                    var to = dist.FirstOrDefault(d =>
                        d.BoqItemId == itemId && d.BeneficiaryCode == t.ToBeneficiaryCode);

                    // جامعة تلعفر's case — a beneficiary that held nothing gets
                    // a row rather than being refused. `02 §8`'s ceiling is on
                    // the ITEM's total, which this leaves exactly where it was.
                    if (to is null)
                    {
                        to = new BoqDistribution
                        {
                            BoqItemId = itemId, BeneficiaryCode = t.ToBeneficiaryCode, Qty = 0m,
                        };
                        db.BoqDistributions.Add(to);
                        dist.Add(to);
                    }

                    var code = items.First(i => i.Id == itemId).Code;
                    var fromBefore = from.Qty;
                    var toBefore = to.Qty;

                    from.Qty -= t.Qty;
                    to.Qty += t.Qty;
                    t.AppliedQty = t.Qty;

                    db.ChangeOrderAuditEntries.Add(Audit(order, asOf, "system", "apply",
                        current?.StageNo, $"{code}.dist.{t.FromBeneficiaryCode}",
                        fromBefore.ToString("0.##"), from.Qty.ToString("0.##"),
                        $"نُقلت {t.Qty:0.##} إلى {t.ToBeneficiaryCode} دون أثر على قيمة العقد.",
                        version: 2));

                    db.ChangeOrderAuditEntries.Add(Audit(order, asOf, "system", "apply",
                        current?.StageNo, $"{code}.dist.{t.ToBeneficiaryCode}",
                        toBefore.ToString("0.##"), to.Qty.ToString("0.##"),
                        null, version: 2));
                }
            }

            // ── the schedule ─────────────────────────────────────────────
            foreach (var change in plan.Activities.Where(a => a.DeltaDays != 0))
            {
                var src = activities.First(a => a.ActivityId == change.ActivityId);
                src.ForecastFinish = change.FinishAfter;
                src.RemainingDuration = change.RemainingAfter;

                var coAct = coActs.First(a => a.ActivityId == src.Id);
                coAct.AppliedDeltaDays = change.DeltaDays;
                coAct.ApplyStatus = "done";

                db.ChangeOrderAuditEntries.Add(Audit(order, asOf, "system", "apply",
                    current?.StageNo, src.ActivityId + ".finish",
                    change.FinishBefore?.ToString("yyyy-MM-dd"), change.FinishAfter?.ToString("yyyy-MM-dd"),
                    null, version: 2));
            }

            // ── the contract, and BR-10's baseline with it ───────────────
            db.ChangeOrderAuditEntries.Add(Audit(order, asOf, "system", "apply",
                current?.StageNo, "contractValue",
                effective.Value.ToString("N0"), plan.Amendment.Value.ToString("N0"),
                $"ملحق العقد رقم {amendment.No}.", version: 2));

            if (plan.PenaltyMoves)
                db.ChangeOrderAuditEntries.Add(Audit(order, asOf, "system", "apply",
                    current?.StageNo, "contractualFinish",
                    effective.Finish.ToString("yyyy-MM-dd"), plan.Amendment.Finish.ToString("yyyy-MM-dd"),
                    "أُعيد احتساب الغرامات التأخيرية على التاريخ الجديد (BR-10).", version: 2));

            order.AppliedValue = order.ApprovedValue;
            order.AppliedDays = order.ApprovedDays;
            order.WeightRecalcState = "applied";
            order.Lifecycle = "closed";

            // `03 §6` — the execution stage is what CLOSES, and it closes here
            // rather than at approval, which is the whole point of the split.
            if (current is not null)
            {
                current.Status = "done";
                current.Decision = "approve";
                current.ActionedAt = asOf;
            }

            db.ChangeOrderAuditEntries.Add(Audit(order, asOf, persona!.Id, "close",
                current?.StageNo, "lifecycle", "مطبَّق", "مغلق", null, version: 2));

            await db.SaveChangesAsync();
            await applyTransaction.CommitAsync();

            return Results.Ok(new WorkflowResult(order.No, order.Lifecycle, null,
                $"طُبِّق الأمر وصدر ملحق العقد رقم {amendment.No} — تغيّرت قيمة العقد والكميات"));
        });
    }

    // ── shared loading and gating ────────────────────────────────────────

    private record Found(
        IResult? Error, Project? Project, ChangeOrder? Order,
        List<ChangeOrderStage> Stages, List<ChangeOrderExternalParty> Externals,
        DateOnly AsOf, Persona? Persona)
    {
        public void Deconstruct(out Project? p, out ChangeOrder? o, out List<ChangeOrderStage> s,
            out List<ChangeOrderExternalParty> x, out DateOnly asOf, out Persona? persona)
            => (p, o, s, x, asOf, persona) = (Project, Order, Stages, Externals, AsOf, Persona);
    }

    private static async Task<Found> Load(EpmDb db, HttpContext ctx, string projectId, string no)
    {
        var persona = (Persona)ctx.Items["user"]!;
        var empty = new List<ChangeOrderStage>();

        var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
        if (p is null)
            return new(Results.NotFound(new { message = $"project {projectId} not found" }),
                null, null, empty, [], default, null);

        if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied)
            return new(denied, null, null, empty, [], default, null);

        var contractIds = await db.Contracts.AsNoTracking()
            .Where(c => c.ProjectId == projectId).Select(c => c.Id).ToListAsync();

        // TRACKED — these endpoints write.
        var order = await db.ChangeOrders
            .FirstOrDefaultAsync(o => contractIds.Contains(o.ContractId) && o.No == no);
        if (order is null)
            return new(Results.NotFound(new { message = $"change order {no} not found on {projectId}" }),
                null, null, empty, [], default, null);

        var stages = await db.ChangeOrderStages
            .Where(s => s.ChangeOrderId == order.Id).OrderBy(s => s.StageNo).ToListAsync();
        var externals = await db.ChangeOrderExternalParties
            .Where(x => x.ChangeOrderId == order.Id).ToListAsync();

        return new(null, p, order, stages, externals,
            p.DataDate ?? DateOnly.FromDateTime(DateTime.UtcNow), persona);
    }

    /// <summary>BR-14, resolved exactly as EP-CHG-01 and EP-CHG-02 resolve it.</summary>
    private static string Relation(
        ChangeOrder o, List<ChangeOrderStage> stages, List<ChangeOrderExternalParty> externals,
        Persona persona, ChangeOrderStage? current)
    {
        var chain = stages.Where(s => s.Applicable).ToList();
        var done = chain.Where(s => s.Status is "done" or "returned").Select(s => s.OwnerParty).Distinct().ToList();
        var todo = chain.Where(s => s.Status is "pending").Select(s => s.OwnerParty).Distinct().ToList();

        return ViewerRelation.For(
            persona.Party, persona.IsDelegate, o.Lifecycle,
            current?.OwnerParty, chain.LastOrDefault()?.OwnerParty, done, todo,
            externalPartyPending: current is not null
                && externals.Any(x => x.ChangeOrderStageId == current.Id && x.State == "wait"));
    }

    /// <summary>BR-13's plan for THIS order, read off the stages it already has.</summary>
    private static IReadOnlyList<WorkflowMachine.PlannedStage> Plan(
        ChangeOrder o, List<ChangeOrderStage> stages)
        // الشكل 60 — a supply order's stages 1 and 6 belong to لجنة الفحص
        // والاستلام, and BR-14 reads the owner off the DEF, so the swap has to
        // happen here or the order has an owner no persona can be.
        => WorkflowMachine.StagesFor(o.Type == "supply").Select(def =>
        {
            var row = stages.FirstOrDefault(s => s.StageNo == def.No);
            return new WorkflowMachine.PlannedStage(def, row?.Applicable ?? true, row?.SkipReason, row?.SkipReason);
        }).ToList();

    /// <summary>Version 0 — the contract as awarded, which BR-09 measures from.</summary>
    private static async Task<Amendments.Version> OriginalOf(EpmDb db, string contractId)
    {
        var c = await db.Contracts.AsNoTracking().FirstAsync(x => x.Id == contractId);
        return new Amendments.Version(0, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays);
    }

    private static ChangeOrderAuditEntry Audit(
        ChangeOrder o, DateOnly asOf, string userId, string action, int? stageNo,
        string? field, string? previous, string? next, string? note, int version = 1,
        string anchor = "EP-CO-09") => new()
    {
        ChangeOrderId = o.Id,
        At = asOf.ToDateTime(TimeOnly.FromDateTime(DateTime.UtcNow)),
        UserId = userId,
        ActorRole = userId == "system" ? "system"
            : Personas.All.FirstOrDefault(p => p.Id == userId)?.RoleAr ?? "unknown",
        Action = action,
        TraceabilityAnchor = anchor,
        StageNo = stageNo,
        Field = field,
        PreviousValue = previous,
        NewValue = next,
        BeforeSnapshot = JsonSerializer.Serialize(new { action, stageNo, field, value = previous }),
        AfterSnapshot = JsonSerializer.Serialize(new { action, stageNo, field, value = next }),
        Note = note,
        Version = version,
    };

    private static string Life(string code) => code switch
    {
        "draft" => "مسودة",
        "pending" => "قيد الاعتماد",
        "returned" => "معاد للتعديل",
        "approved" => "معتمد",
        "applied_partial" => "معتمد — قيد التطبيق",
        "closed" => "مغلق",
        "rejected" => "مرفوض",
        "cancelled" => "ملغى",
        _ => code,
    };

    private static string Proposal(ChangeOrderLine line) =>
        $"{line.ChangeType}|{line.ContractorDeltaQty}|{line.ContractorNewRate}|{line.ContractorExcessRate}|" +
        $"{line.ReDeptDeltaQty}|{line.ReDeptNewRate}|{line.ReDeptExcessRate}|{line.TargetBoqItemId}|{line.DrawnQty}|{line.DistributedQty}";

    private static string Proposal(WizardLineInput line) =>
        $"{line.ChangeType}|{line.ContractorDeltaQty}|{line.ContractorNewRate}|{line.ContractorExcessRate}|" +
        $"{line.ReDeptDeltaQty}|{line.ReDeptNewRate}|{line.ReDeptExcessRate}|{line.TargetCode}|{line.DrawnQty}|{line.DistributedQty}";

    private static string ActivityProposal(ChangeOrderActivity activity) =>
        $"{activity.ChangeType}|{activity.RequestedDeltaDays}|{activity.RequestedStart}|{activity.RequestedFinish}";

    private static string ActivityProposal(WizardActivityInput activity) =>
        $"{activity.ChangeType}|{activity.RequestedDeltaDays}|{activity.RequestedStart}|{activity.RequestedFinish}";

    private static string StateLabel(string code) => code switch
    {
        "wait" => "بانتظار الجهة",
        "in" => "وردت",
        "back" => "أُعيد",
        "na" => "غير مطلوب",
        _ => code,
    };
}
