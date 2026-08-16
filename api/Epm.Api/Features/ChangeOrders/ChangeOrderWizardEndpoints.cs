using Epm.Api.Data;
using Epm.Api.Data.Entities;
using Epm.Api.Domain;
using Epm.Api.Features.Boq;
using Epm.Api.Features.Dev;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.ChangeOrders;

/// <summary>
/// المسار 9 — the change-order CREATION WIZARD (`03 §8` · ملحق الأشكال 37–42).
/// PORTED from `docs/spec/reference/app/vo-wizard.jsx` `DVOCreateWizard` :6.
///
/// Its own file for the reason `Features/Boq/BoqImportEndpoints.cs` is: a
/// wizard is a different conversation from the register it opens over — three
/// endpoints that exist only while an order is being COMPOSED, and none of
/// which any screen reads afterwards.
///
/// ── THE CONTRACT IS SELECTED FIRST (`03 §8`, non-negotiable #1) ──────────
/// `EP-WIZ-01` returns the project's contracts each carrying ITS OWN lines and
/// activities. The client is never handed a flat list, so it cannot assemble an
/// order that spans two contracts — and BR-07's `cross-contract` gate still
/// checks it on the way in, because a UI that cannot express something is not
/// the same as a rule.
///
/// ── THE WIZARD COMPUTES NOTHING (CLAUDE.md §3.1) ────────────────────────
/// الشكل 39 re-splits as the two proposals are typed. Every one of those
/// figures comes from `EP-WIZ-02`, through the SAME Domain/ChangeOrderRecord
/// the record page reads — so what a user saw when they submitted is what the
/// record shows afterwards by construction. The reference computed it in the
/// browser (`vo-wizard.jsx` `bOne`); that is the one thing this port does not
/// copy.
///
/// ── NOTHING IS APPROVED HERE ─────────────────────────────────────────────
/// `02 §5`–§6: both parties merely PROPOSE, including the rate beyond 20%. No
/// endpoint below accepts an approved value, an approved rate or an approved
/// day count — those exist only after the pricing committee rules, and the
/// screens say so in words while they are missing.
/// </summary>
public static class ChangeOrderWizardEndpoints
{
    /// <summary>`03 §1` — who an official letter can arrive from.</summary>
    private static readonly string[] Parties =
        ["المقاول", "الاستشاري المصمم والمدقق", "الجهة المستفيدة", "دائرة المهندس المقيم"];

    public static void MapChangeOrderWizardEndpoints(this WebApplication app)
    {
        // [EP-WIZ-01] GET /api/projects/{projectId}/change-orders/new
        // web: change-orders/change-order-wizard.api.ts source() → change-order.wizard.ts
        // spec: 03 §8 · ملحق الشكل 37 · الشكل 38 | rules: BR-01, BR-04, BR-09
        // tables: Projects · Contracts · ContractAmendments · BoqItems
        //       · BoqRateBands · BoqActivityLinks · BoqDistributions · Activities
        app.MapGet("/api/projects/{projectId}/change-orders/new",
            async (EpmDb db, HttpContext ctx, string projectId) =>
        {
            var persona = (Persona)ctx.Items["user"]!;

            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            var contracts = await db.Contracts.AsNoTracking()
                .Where(c => c.ProjectId == projectId).OrderBy(c => c.Id).ToListAsync();

            var amendments = await db.ContractAmendments.AsNoTracking()
                .Where(a => contracts.Select(c => c.Id).Contains(a.ContractId))
                .OrderBy(a => a.No).ToListAsync();

            var model = new List<WizardContract>();

            foreach (var c in contracts)
            {
                // BR-09 — the value and finish IN FORCE. An approved-but-unapplied
                // amendment is a projection and is NOT what a new order is added
                // to (`02 §9`), so only applied ones count here.
                var applied = amendments.Where(a => a.ContractId == c.Id && a.AppliedAt is not null).ToList();
                var value = c.OriginalValue + applied.Sum(a => a.DeltaValue);
                var finish = applied.Count > 0 ? applied.Last().Finish : c.OriginalFinish;
                var duration = c.OriginalDurationDays + applied.Sum(a => a.DeltaDays);

                // The BOQ register's OWN derivation, not a second one (P-54):
                // weight is BR-01's and the executed quantity is BR-04's, and a
                // wizard that recomputed either could offer a line whose figures
                // disagree with the register the user just came from.
                var derived = await BoqEndpoints.Derive(db, c.Id, "cost");

                var lines = derived.Select(d => new WizardBoqLine(
                    d.Item.Code, d.Item.DescriptionAr, d.Item.DescriptionEn, d.Item.Unit,
                    d.Item.Division, d.Item.DivisionName,
                    d.Item.OriginalQty,
                    Q(d.Progress.AchievedQty),
                    d.Item.UnitRate,
                    M(d.Line.Amount),
                    d.Weight,
                    d.Progress.Progress >= 100m ? "completed"
                        : d.Progress.Progress > 0m ? "inprogress" : "notstarted")).ToList();

                var activities = await db.Activities.AsNoTracking()
                    .Where(a => a.ContractId == c.Id && !a.IsMilestone)
                    .OrderBy(a => a.ActivityId).ToListAsync();

                model.Add(new WizardContract(
                    c.Id, c.NameAr, c.NameEn, c.Status, M(value),
                    finish.ToString("yyyy-MM-dd"), duration,
                    lines,
                    activities.Select(a => new WizardActivity(
                        a.ActivityId, a.NameAr, a.NameEn, a.WbsNames,
                        (a.ActualStart ?? a.BaselineStart)?.ToString("yyyy-MM-dd"),
                        (a.ForecastFinish ?? a.BaselineFinish)?.ToString("yyyy-MM-dd"),
                        a.ProgressPct, a.RemainingDuration, a.IsCritical, a.Status)).ToList()));
            }

            return Results.Ok(new WizardSourceResponse(
                p.Id, p.NameAr, p.NameEn, p.DataDate?.ToString("yyyy-MM-dd"),
                persona.Id, persona.Party, Parties, model));
        });

        // [EP-WIZ-02] POST /api/projects/{projectId}/change-orders/preview
        // web: change-order-wizard.api.ts preview() → change-order.wizard.ts
        // spec: 03 §8 steps 2–3 · ملحق الشكل 39 · الشكل 40 | rules: BR-01, BR-05,
        //       BR-06, BR-07, BR-13
        // tables: Projects · Contracts · ContractAmendments · BoqItems · Activities *(read only)*
        //
        // WRITES NOTHING. It is the wizard's arithmetic, moved to where the
        // arithmetic lives — call it as the inputs change, not once at the end.
        app.MapPost("/api/projects/{projectId}/change-orders/preview",
            async (EpmDb db, HttpContext ctx, string projectId, WizardDraft draft) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            var contract = await db.Contracts.AsNoTracking()
                .FirstOrDefaultAsync(c => c.ProjectId == projectId && c.Id == draft.ContractId);
            if (contract is null)
                return Results.NotFound(new { message = $"contract {draft.ContractId} not on {projectId}" });

            return Results.Ok(await Preview(db, contract, draft));
        });

        // [EP-WIZ-03] POST /api/projects/{projectId}/change-orders
        // web: change-order-wizard.api.ts create() → change-order.wizard.ts
        // spec: 03 §8 step 5 · ملحق الشكل 42 | rules: BR-07, BR-13
        // tables: ChangeOrders · ChangeOrderLines · ChangeOrderActivities
        //       · ChangeOrderStages · ChangeOrderAttachments
        //       · ChangeOrderAuditEntries *(all **written**)*
        app.MapPost("/api/projects/{projectId}/change-orders",
            async (EpmDb db, HttpContext ctx, string projectId, string kind, WizardDraft draft) =>
        {
            var persona = (Persona)ctx.Items["user"]!;

            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            var contract = await db.Contracts.AsNoTracking()
                .FirstOrDefaultAsync(c => c.ProjectId == projectId && c.Id == draft.ContractId);
            if (contract is null)
                return Results.NotFound(new { message = $"contract {draft.ContractId} not on {projectId}" });

            var submitting = kind == "submit";
            var preview = await Preview(db, contract, draft);

            // `02 §7` — submission is BLOCKED, not warned, and the response
            // names the offending lines so the wizard can point at them. A DRAFT
            // is allowed to be incomplete: that is what a draft is.
            if (submitting && !preview.CanSubmit)
                return Results.UnprocessableEntity(new
                {
                    message = "لا يمكن إرسال الأمر: توجد مخالفات في بنوده",
                    issues = preview.Issues.Where(i => i.Blocking).ToList(),
                });

            var asOf = p.DataDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var items = await db.BoqItems.AsNoTracking()
                .Where(i => i.ContractId == contract.Id).ToListAsync();
            var activities = await db.Activities.AsNoTracking()
                .Where(a => a.ContractId == contract.Id).ToListAsync();

            // ── THE NUMBER IS UNIQUE ACROSS THE PROJECT ──────────────────
            // `ChangeOrder.No` is documented as unique within the CONTRACT, and
            // that stays true — but the record's URL is project-scoped
            // (`…/projects/{id}/changeorders/VO-01`), so two contracts of one
            // project minting the same VO-06 would make one of them
            // unreachable. Taking the next free number across the project
            // satisfies both: still unique per contract, and now addressable.
            // `06 §12`'s own fixture numbers VO-01…VO-06 across two contracts
            // exactly this way.
            var projectContractIds = await db.Contracts.AsNoTracking()
                .Where(c => c.ProjectId == projectId).Select(c => c.Id).ToListAsync();
            var taken = await db.ChangeOrders.AsNoTracking()
                .Where(o => projectContractIds.Contains(o.ContractId)).Select(o => o.No).ToListAsync();
            var next = 1;
            while (taken.Contains($"VO-{next:00}")) next++;

            var order = new ChangeOrder
            {
                No = $"VO-{next:00}",
                ContractId = contract.Id,
                TitleAr = Title(draft, "ar"),
                TitleEn = Title(draft, "en"),
                Type = draft.Type,
                Justification = draft.Justification ?? "",
                ResponsibleParty = draft.ResponsibleParty ?? "",
                IncomingNo = draft.IncomingNo ?? "",
                IncomingDate = Date(draft.IncomingDate) ?? asOf,
                Lifecycle = submitting ? "pending" : "draft",
                // `02 §6` — the RE department's proposal is what the header
                // carries. NOTHING approved is written: no approved value, no
                // approved days, no approved rate.
                RequestedValue = preview.Summary.ReDeptNet ?? preview.Summary.ContractorNet ?? 0m,
                RequestedDays = preview.Summary.RequestedDays,
                CreatedByUserId = persona.Id,
                CreatedAt = DateTime.UtcNow,
            };

            db.ChangeOrders.Add(order);
            await db.SaveChangesAsync();

            foreach (var l in draft.Lines)
            {
                var item = items.FirstOrDefault(i => i.Code == l.Code);
                if (item is null) continue;

                var target = l.TargetCode is null ? null : items.FirstOrDefault(i => i.Code == l.TargetCode);
                var executed = preview.Lines.FirstOrDefault(x => x.Code == l.Code);

                db.ChangeOrderLines.Add(new ChangeOrderLine
                {
                    ChangeOrderId = order.Id,
                    BoqItemId = item.Id,
                    ChangeType = l.ChangeType,
                    // D-01 — the ORIGINAL quantity is the 20% basis and it is
                    // FROZEN onto the line: re-reading it later would let a
                    // subsequent order move this order's threshold.
                    ContractedQty = item.OriginalQty,
                    ExecutedQty = item.OriginalQty - (executed?.Remaining ?? item.OriginalQty),
                    BeforeQty = item.OriginalQty,
                    BeforeRate = item.UnitRate,
                    BeforeAmount = M(item.OriginalQty * item.UnitRate),
                    ContractorDeltaQty = l.ContractorDeltaQty,
                    ContractorNewRate = l.ContractorNewRate,
                    ContractorExcessRate = l.ContractorExcessRate,
                    ReDeptDeltaQty = l.ReDeptDeltaQty,
                    ReDeptNewRate = l.ReDeptNewRate,
                    ReDeptExcessRate = l.ReDeptExcessRate,
                    TargetBoqItemId = target?.Id,
                    DrawnQty = l.DrawnQty,
                    DistributedQty = l.DistributedQty,
                    ApplyStatus = "todo",
                });
            }

            foreach (var a in draft.Activities)
            {
                var act = activities.FirstOrDefault(x => x.ActivityId == a.ActivityId);
                if (act is null) continue;

                db.ChangeOrderActivities.Add(new ChangeOrderActivity
                {
                    ChangeOrderId = order.Id,
                    ActivityId = act.Id,
                    ChangeType = a.ChangeType,
                    BeforeStart = act.ActualStart ?? act.BaselineStart,
                    BeforeFinish = act.ForecastFinish ?? act.BaselineFinish,
                    BeforeRemainingDuration = act.RemainingDuration,
                    RequestedDeltaDays = a.RequestedDeltaDays,
                    RequestedStart = Date(a.RequestedStart),
                    RequestedFinish = Date(a.RequestedFinish),
                    // The schedule ANALYSIS has not run yet — `03 §8` puts it in
                    // the chain, not in the wizard — so no analysis figure is
                    // invented here (P-102).
                    ApplyStatus = "todo",
                });
            }

            foreach (var f in draft.Attachments)
                db.ChangeOrderAttachments.Add(new ChangeOrderAttachment
                {
                    ChangeOrderId = order.Id,
                    FileName = f.FileName,
                    Category = f.Category,
                    SizeBytes = f.SizeBytes,
                    Version = 1,
                    OriginStageNo = 1,
                    UploadedByUserId = persona.Id,
                    UploadedAt = asOf.ToDateTime(TimeOnly.MinValue),
                });

            // ── THE CHAIN IS PLANNED, NOT TYPED (BR-13) ──────────────────
            // A submitted order enters at stage 1 with all six rows present —
            // the two conditional ones carrying their REASON rather than being
            // dropped (`03 §2`). A draft has no chain at all: it has not been
            // referred to anybody.
            if (submitting)
            {
                var plan = WorkflowMachine.Plan(
                    preview.Summary.LinesOverTier > 0,
                    NeedsEndorsement(preview, contract));

                int[] slaOf = [3, 5, 7, 10, 14, 7];
                var first = plan.First(x => x.Active).Def.No;

                foreach (var s in plan)
                    db.ChangeOrderStages.Add(new ChangeOrderStage
                    {
                        ChangeOrderId = order.Id,
                        StageNo = s.Def.No,
                        NameAr = s.Def.Ar,
                        NameEn = s.Def.En,
                        OwnerParty = s.Def.Owner,
                        Applicable = s.Active,
                        SkipReason = s.SkipAr,
                        Status = !s.Active ? "pending" : s.Def.No == first ? "active" : "pending",
                        SentAt = s.Active && s.Def.No == first ? asOf : null,
                        SlaDays = slaOf[s.Def.No - 1],
                    });

                order.CurrentStageId = null;   // resolved off the chain, never stored twice
            }

            db.ChangeOrderAuditEntries.Add(new ChangeOrderAuditEntry
            {
                ChangeOrderId = order.Id,
                At = asOf.ToDateTime(TimeOnly.FromDateTime(DateTime.UtcNow)),
                UserId = persona.Id,
                Action = "create",
                StageNo = 1,
                NewValue = order.No,
                Note = order.Justification,
                Version = 1,
            });

            if (submitting)
                db.ChangeOrderAuditEntries.Add(new ChangeOrderAuditEntry
                {
                    ChangeOrderId = order.Id,
                    At = asOf.ToDateTime(TimeOnly.FromDateTime(DateTime.UtcNow)),
                    UserId = persona.Id,
                    Action = "submit",
                    StageNo = 1,
                    Field = "lifecycle",
                    PreviousValue = "مسودة",
                    NewValue = "قيد الاعتماد",
                    Version = 1,
                });

            await db.SaveChangesAsync();

            return Results.Created(
                $"/api/projects/{projectId}/change-orders/{order.No}",
                new WizardCreateResponse(order.No, order.Lifecycle, order.Id));
        });
    }

    // ── the preview, shared by EP-WIZ-02 and the submit gate ─────────────

    private static async Task<WizardPreviewResponse> Preview(EpmDb db, Contract contract, WizardDraft draft)
    {
        var derived = await BoqEndpoints.Derive(db, contract.Id, "cost");
        var byCode = derived.ToDictionary(d => d.Item.Code);

        var amendments = await db.ContractAmendments.AsNoTracking()
            .Where(a => a.ContractId == contract.Id && a.AppliedAt != null).ToListAsync();
        var contractValue = contract.OriginalValue + amendments.Sum(a => a.DeltaValue);

        var lines = new List<PreviewLine>();
        var gateLines = new List<ChangeOrderGates.Line>();

        decimal? conNet = null, reNet = null;
        var overTier = 0;

        foreach (var input in draft.Lines)
        {
            if (!byCode.TryGetValue(input.Code, out var d)) continue;

            var item = d.Item;
            var executed = Q(d.Progress.AchievedQty);
            var domainLine = new ChangeOrderRecord.Line(
                item.Code, input.ChangeType, item.OriginalQty, item.OriginalQty,
                item.UnitRate, M(item.OriginalQty * item.UnitRate));

            // ONE function, twice — and it is the same one the record page uses.
            var con = ChangeOrderRecord.For(domainLine,
                new(input.ContractorDeltaQty, input.ContractorNewRate, input.ContractorExcessRate));
            var re = ChangeOrderRecord.For(domainLine,
                new(input.ReDeptDeltaQty, input.ReDeptNewRate, input.ReDeptExcessRate));

            if (con.Impact is { } ci) conNet = (conNet ?? 0m) + ci;
            if (re.Impact is { } ri) reNet = (reNet ?? 0m) + ri;
            if (con.TripsThreshold || re.TripsThreshold) overTier++;

            lines.Add(new PreviewLine(
                item.Code, item.DescriptionAr, item.DescriptionEn, item.Unit, input.ChangeType,
                item.OriginalQty, item.UnitRate, M(item.OriginalQty * item.UnitRate),
                domainLine.ContractedQty * TierSplit.Tier,
                Math.Max(0m, item.OriginalQty - executed),
                d.Weight,
                Party(con, item.UnitRate), Party(re, item.UnitRate),
                con.Impact is not null && re.Impact is not null
                    && Math.Abs(con.Impact.Value - re.Impact.Value) > 0.5m));

            gateLines.Add(new ChangeOrderGates.Line(
                item.Code, contract.Id, input.ChangeType,
                item.OriginalQty, executed,
                input.ContractorDeltaQty ?? 0m, input.ReDeptDeltaQty ?? 0m,
                input.TargetCode, input.DrawnQty ?? 0m, input.DistributedQty ?? 0m));
        }

        // BR-07 — every reason this order cannot be submitted. The wizard is
        // supposed to PREVENT most of these by capping its fields (`02 §7`);
        // these are the backstop, and they are what the 422 lists.
        var issues = ChangeOrderGates.Validate(new ChangeOrderGates.Order(
            contract.Id, gateLines,
            draft.Activities.Select(a => new ChangeOrderGates.Activity(a.ActivityId, contract.Id)).ToList()));

        // BR-01 over the RE department's column, on every line of the contract.
        var afterByCode = derived.ToDictionary(x => x.Item.Code, x => M(x.Line.Amount));
        foreach (var l in lines)
            if (l.ReDept.AmountAfter is { } amt) afterByCode[l.Code] = amt;

        var weightInput = derived
            .Select(x => new ChangeOrderRecord.Amount(x.Item.Code, M(x.Line.Amount), afterByCode[x.Item.Code]))
            .ToList();
        var affected = lines.Select(l => l.Code).ToHashSet();
        var weights = ChangeOrderRecord.Weights(weightInput, affected);

        var requestedDays = draft.Activities.Sum(a => a.RequestedDeltaDays ?? 0);

        var summary = new PreviewSummary(
            draft.Lines.Count, draft.Activities.Count, M(contractValue),
            M(conNet), M(reNet),
            conNet is null ? null : M(contractValue + conNet.Value),
            reNet is null ? null : M(contractValue + reNet.Value),
            // D-08 — no approved value exists until financial review, so every
            // revised figure on this screen is تقديرية and says so.
            true,
            overTier,
            overTier == 0 ? "na" : "awaiting",
            requestedDays,
            "awaiting-financial-review");

        var plan = WorkflowMachine.Plan(overTier > 0, NeedsEndorsementFrom(reNet ?? conNet, requestedDays, contract));

        var path = plan.Select(s => new PreviewStage(
            s.Def.No, s.Def.Ar, s.Def.En, s.Def.Owner, s.Def.OwnerEn,
            s.Active, s.SkipAr, s.SkipEn)).ToList();

        return new WizardPreviewResponse(
            lines,
            summary,
            new PreviewWeights(
                Math.Round(weights.SumBefore, 2), Math.Round(weights.SumAfter, 2),
                Math.Round(weights.Rows.Sum(r => Math.Abs(r.Delta)), 2), weights.Valid),
            path,
            issues.Select(i => new PreviewIssue(i.Gate, i.Ref, i.MsgAr, i.MsgEn, true)).ToList(),
            // An EMPTY order is a gate of its own (BR-07), so `CanSubmit` is
            // exactly "no blocking issue" — never "the user filled something in".
            issues.Count == 0);
    }

    /// <summary>
    /// الشكل 39 prints the two halves as an EQUATION — «42.4 نقطة × 18,834 =
    /// +798,562» — so both the quantity and the money of each half travel, and
    /// the screen multiplies nothing.
    /// </summary>
    private static PreviewParty Party(ChangeOrderRecord.Column c, decimal originalRate) => new(
        c.QtyAfter, c.RateShown, M(c.AmountAfter), M(c.Impact),
        c.AtRateQty, M(c.AtRateQty * originalRate),
        c.ExcessQty, M(c.ExcessQty * (c.RateShown ?? originalRate)),
        c.TripsThreshold);

    /// <summary>
    /// `03 §2`'s stage 4 — needed when the order carries a financial impact to
    /// allocate, OR when the extension exceeds a quarter of the contract's
    /// duration (`03 §3`).
    /// </summary>
    private static bool NeedsEndorsement(WizardPreviewResponse preview, Contract contract)
        => NeedsEndorsementFrom(preview.Summary.ReDeptNet ?? preview.Summary.ContractorNet,
            preview.Summary.RequestedDays, contract);

    private static bool NeedsEndorsementFrom(decimal? net, int requestedDays, Contract contract)
        => (net ?? 0m) != 0m
           || WorkflowMachine.ExceedsQuarterDuration(requestedDays, contract.OriginalDurationDays);

    /// <summary>
    /// `03 §8` asks for no title field, and الشكل 42 prints the justification
    /// where a title would be. So the title IS the justification's first line —
    /// invented text on a legal record would be worse than a repeated one.
    /// </summary>
    private static string Title(WizardDraft draft, string lang)
    {
        var j = (draft.Justification ?? "").Trim();
        if (j.Length > 0)
        {
            var firstLine = j.Split('\n')[0].Trim();
            return firstLine.Length <= 120 ? firstLine : firstLine[..120].TrimEnd() + "…";
        }
        return draft.Type == "supply"
            ? (lang == "ar" ? "أمر تغييري — تجهيز / إعادة توزيع كميات" : "Change order — supply / redistribution")
            : (lang == "ar" ? "أمر تغييري — كلفة / مدة" : "Change order — cost / time");
    }

    private static DateOnly? Date(string? v)
        => DateOnly.TryParse(v, out var d) ? d : null;

    private static decimal M(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
    private static decimal? M(decimal? v) => v is null ? null : M(v.Value);
    private static decimal Q(decimal v) => Math.Round(v, 4, MidpointRounding.AwayFromZero);
}
