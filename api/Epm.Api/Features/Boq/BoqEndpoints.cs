using Epm.Api.Data;
using Epm.Api.Data.Entities;
using Epm.Api.Domain;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Boq;

/// <summary>
/// SCR-W4 — the project workspace BOQ module (`04 §4`).
/// PORTED from the v1.1 BOQ module: ../epm@design/system-revamp
/// app/boq-workspace.jsx:16 · app/boq-register.jsx:435 · app/boq-assign.jsx:11.
///
/// ── THE CONTRACT IS THE SCOPE, AND IT IS CHECKED HERE ────────────────────
/// A BOQ item belongs to exactly one contract (non-negotiable #1), and every
/// route below carries both the project and the contract so the pair can be
/// verified: `/projects/A/boq/<a contract of B>` is a 404, not a 200 with
/// someone else's bill of quantities on screen. Same rule, same shape as
/// EP-CON-02 (P-01).
///
/// ── FIVE DERIVATIONS, FIVE RULES, NONE OF THEM STORED ────────────────────
///   BR-01  weight            Domain/BoqWeights   — sums to exactly 100.00
///   BR-02  activity weight   Domain/ScheduleWeights
///   BR-03  share + coverage  Domain/Allocation
///   BR-04  progress          Domain/ProgressReflection
///   BR-08  distribution      Domain/Distribution
///   BR-05  banded line       Domain/TierSplit.Effective
/// This file filters, joins, sorts, groups and projects. It computes nothing.
///
/// ── COVERAGE IS NOT WEIGHT ───────────────────────────────────────────────
/// `Coverage` compares Σ SHARES to 100%. `Weight` is the line's share of the
/// bill. They are different questions with different denominators, and `02 §3`
/// calls conflating them an early error — so they are separate fields, and
/// `AssignedWeight` is the one place they are deliberately multiplied.
///
/// ── WHY THE COMPUTED SHARE USES THE COST BASIS ───────────────────────────
/// `02 §2` says the weight basis is chosen at schedule import. Nothing stores
/// that choice yet, so the register always computes on COST — the basis every
/// activity has — and the man-hours toggle on the assignment screen is a
/// what-if that a person must SAVE to make binding. That way the register and
/// the assignment screen can never show two different coverages for one line.
/// See P-48.
/// </summary>
public static class BoqEndpoints
{
    /// <summary>02 §3 — Σ shares within this of 100 is `full`.</summary>
    private const decimal CoverageTolerance = 0.5m;

    // ── TRANSPORT PRECISION ──────────────────────────────────────────────
    // Money to 2dp, quantities and percentages to 4dp — the precisions EpmDb
    // stores these columns at, and the only ones any screen can render.
    //
    // This is a PROJECTION, not arithmetic. 5.8 / 11.0 is a repeating decimal,
    // so without it a share travels as 52.727272727272727272727272730 and an
    // assigned amount of exactly 14,094,000 arrives with a ...0001 on the end.
    // Every total below is summed from the FULL-precision value and rounded
    // once, at the end, so a rounded column can never fail to add up.
    private static decimal M(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
    private static decimal Q(decimal v) => Math.Round(v, 4, MidpointRounding.AwayFromZero);

    public static void MapBoqEndpoints(this WebApplication app)
    {
        // [EP-BOQ-01] GET /api/projects/{projectId}/boq
        // web: boq/boq.api.ts gate() → boq.page.ts
        // spec: 04 §4 | rules: — | tables: Projects · Contracts · BoqItems
        //
        // THE CONTRACT SELECTOR COMES FIRST (04 §4). Nothing renders until a
        // contract is chosen, because "the BOQ" is not a thing a project has —
        // each of its contracts has one.
        app.MapGet("/api/projects/{projectId}/boq", async (EpmDb db, HttpContext http, string projectId) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            // BR-15. The gate does its own lookup rather than going through
            // Load() — it has no contract yet — so it needs its own guard.
            if (WorkspaceScope.Deny(http, p.WorkspaceCode) is { } denied) return denied;

            var contracts = await db.Contracts.AsNoTracking()
                .Where(c => c.ProjectId == projectId).OrderBy(c => c.Id).ToListAsync();

            var ids = contracts.Select(c => c.Id).ToList();
            var counts = await db.BoqItems.AsNoTracking()
                .Where(i => ids.Contains(i.ContractId))
                .GroupBy(i => i.ContractId)
                .Select(g => new { g.Key, N = g.Count() })
                .ToDictionaryAsync(x => x.Key, x => x.N);

            var options = contracts
                .Select(c => new BoqContractOption(
                    c.Id, c.NameAr, c.NameEn, c.Status,
                    counts.TryGetValue(c.Id, out var n) ? n : 0))
                .ToList();

            return Results.Ok(new BoqGateResponse(p.Id, p.NameAr, p.NameEn, options));
        });

        // [EP-BOQ-02] GET /api/projects/{projectId}/boq/{contractId}
        // web: boq/boq.api.ts register() → boq.page.ts
        // spec: 04 §4 | rules: BR-01, BR-03, BR-04, BR-05, BR-08
        // tables: Projects · Contracts · BoqItems · BoqRateBands ·
        //         BoqActivityLinks · BoqDistributions · Activities
        app.MapGet("/api/projects/{projectId}/boq/{contractId}",
            async (EpmDb db, HttpContext http, string projectId, string contractId) =>
        {
            var ctx = await Load(db, http, projectId, contractId);
            return ctx.Error ?? Results.Ok(await Register(db, ctx));
        });

        // [EP-BOQ-03] PUT /api/projects/{projectId}/boq/{contractId}/items/{code}
        // web: boq/boq.api.ts saveItem() → boq.page.ts
        // spec: 04 §4 | rules: BR-05 | tables: BoqItems · BoqRateBands
        //
        // The inline row edit. It moves the description, the unit, the quantity
        // and the rate — never the code, which is the line's identity, and never
        // the contract, which is its scope.
        app.MapPut("/api/projects/{projectId}/boq/{contractId}/items/{code}",
            async (EpmDb db, HttpContext http, string projectId, string contractId, string code, BoqItemEdit input) =>
        {
            var ctx = await Load(db, http, projectId, contractId);
            if (ctx.Error is not null) return ctx.Error;

            var item = await db.BoqItems
                .FirstOrDefaultAsync(i => i.ContractId == contractId && i.Code == code);
            if (item is null)
                return Results.NotFound(new { message = $"BOQ item {code} not found in contract {contractId}" });

            if (string.IsNullOrWhiteSpace(input.DescriptionAr))
                return Results.BadRequest(new { message = "الوصف مطلوب" });
            if (string.IsNullOrWhiteSpace(input.Unit))
                return Results.BadRequest(new { message = "الوحدة مطلوبة" });
            if (input.Qty <= 0m || input.Rate <= 0m)
                return Results.BadRequest(new { message = "الكمية وسعر الوحدة يجب أن يكونا أكبر من صفر" });

            // A BANDED LINE IS NOT EDITABLE HERE (02 §5). Its quantity and rate
            // are the sum of bands an APPLIED change order wrote, and typing
            // over them would silently discard a priced decision of the
            // rate-fixing committee. The change order is the only way back.
            var banded = await db.BoqRateBands.AnyAsync(b => b.BoqItemId == item.Id);
            if (banded)
                return Results.BadRequest(new
                {
                    message = "هذا البند مُعاد تسعيره بأمر تغييري مطبَّق، فكميته وسعره يأتيان من شرائح الأسعار ولا يُعدَّلان هنا.",
                });

            // A DECREASE CANNOT STRAND A DISTRIBUTION (02 §8, D-05). If the
            // quantity already handed to beneficiaries exceeds the new one, the
            // distribution has to be revised first — the edit does not silently
            // leave rows pointing at quantity that no longer exists.
            var distributed = await db.BoqDistributions
                .Where(d => d.BoqItemId == item.Id).SumAsync(d => (decimal?)d.Qty) ?? 0m;
            if (Distribution.DecreaseBlocksApply(input.Qty, distributed))
                return Results.BadRequest(new
                {
                    message = $"الكمية الموزّعة على الجهات المستفيدة ({distributed:0.###}) تتجاوز الكمية الجديدة ({input.Qty:0.###}) — عدّل التوزيع أولاً.",
                });

            item.DescriptionAr = input.DescriptionAr.Trim();
            item.DescriptionEn = input.DescriptionEn.Trim();
            item.Unit = input.Unit.Trim();
            item.OriginalQty = input.Qty;
            item.UnitRate = input.Rate;
            await db.SaveChangesAsync();

            // The whole register comes back rather than the one row: this edit
            // moves an amount, and an amount moves EVERY weight in the contract
            // (BR-01's denominator). Returning the row alone would leave nine
            // other weights on screen that no longer add to 100.00.
            return Results.Ok(await Register(db, ctx));
        });

        // [EP-BOQ-04] DELETE /api/projects/{projectId}/boq/{contractId}/items/{code}
        // web: boq/boq.api.ts deleteItem() → boq.page.ts
        // spec: 04 §4 | rules: BR-01
        // tables: BoqItems · BoqDistributions · BoqActivityLinks · BoqRateBands
        //
        // `04 §4`: delete confirms in-row and CLEARS THAT ITEM'S DISTRIBUTION.
        // Its links and bands go the same way — with no foreign keys they would
        // otherwise survive as rows pointing at a line that no longer exists.
        app.MapDelete("/api/projects/{projectId}/boq/{contractId}/items/{code}",
            async (EpmDb db, HttpContext http, string projectId, string contractId, string code) =>
        {
            var ctx = await Load(db, http, projectId, contractId);
            if (ctx.Error is not null) return ctx.Error;

            var item = await db.BoqItems
                .FirstOrDefaultAsync(i => i.ContractId == contractId && i.Code == code);
            if (item is null)
                return Results.NotFound(new { message = $"BOQ item {code} not found in contract {contractId}" });

            db.BoqDistributions.RemoveRange(db.BoqDistributions.Where(d => d.BoqItemId == item.Id));
            db.BoqActivityLinks.RemoveRange(db.BoqActivityLinks.Where(l => l.BoqItemId == item.Id));
            db.BoqRateBands.RemoveRange(db.BoqRateBands.Where(b => b.BoqItemId == item.Id));
            db.BoqItems.Remove(item);
            await db.SaveChangesAsync();

            return Results.Ok(await Register(db, ctx));
        });

        // [EP-BOQ-05] GET /api/projects/{projectId}/boq/{contractId}/items/{code}/distribution
        // web: boq/boq.api.ts distribution() → boq.page.ts
        // spec: 04 §4, 02 §8 | rules: BR-08
        // tables: Projects · BoqItems · BoqDistributions · Beneficiaries
        app.MapGet("/api/projects/{projectId}/boq/{contractId}/items/{code}/distribution",
            async (EpmDb db, HttpContext http, string projectId, string contractId, string code) =>
        {
            var ctx = await Load(db, http, projectId, contractId);
            if (ctx.Error is not null) return ctx.Error;

            var item = await db.BoqItems.AsNoTracking()
                .FirstOrDefaultAsync(i => i.ContractId == contractId && i.Code == code);
            if (item is null)
                return Results.NotFound(new { message = $"BOQ item {code} not found in contract {contractId}" });

            return Results.Ok(await DistributionOf(db, ctx, item));
        });

        // [EP-BOQ-06] PUT /api/projects/{projectId}/boq/{contractId}/items/{code}/distribution
        // web: boq/boq.api.ts saveDistribution() → boq.page.ts
        // spec: 04 §4, 02 §8 | rules: BR-08
        // tables: Projects · BoqItems · BoqDistributions · Beneficiaries
        app.MapPut("/api/projects/{projectId}/boq/{contractId}/items/{code}/distribution",
            async (EpmDb db, HttpContext http, string projectId, string contractId, string code, BoqDistributionSave input) =>
        {
            var ctx = await Load(db, http, projectId, contractId);
            if (ctx.Error is not null) return ctx.Error;

            var item = await db.BoqItems.AsNoTracking()
                .FirstOrDefaultAsync(i => i.ContractId == contractId && i.Code == code);
            if (item is null)
                return Results.NotFound(new { message = $"BOQ item {code} not found in contract {contractId}" });

            var allowed = await ProjectBeneficiaries(db, ctx.Project);
            var rows = input.Rows ?? [];

            // 02 §8's import gates, checked where they can be read (P-01).
            // Gate 2 — the beneficiary must be assigned to THIS project and active.
            foreach (var r in rows)
            {
                if (!allowed.Any(b => b.Code == r.BeneficiaryCode))
                    return Results.BadRequest(new
                    {
                        message = $"الجهة {r.BeneficiaryCode} غير مرتبطة بهذا المشروع.",
                    });
                if (r.Qty < 0m)
                    return Results.BadRequest(new { message = "الكمية لا يمكن أن تكون سالبة." });
            }

            // Gate 4 — one row per beneficiary. Two rows for the same entity is
            // not a bigger share, it is a bill nobody can reconcile.
            var duplicate = rows.GroupBy(r => r.BeneficiaryCode).FirstOrDefault(g => g.Count() > 1);
            if (duplicate is not null)
                return Results.BadRequest(new
                {
                    message = $"الجهة {duplicate.Key} مكرّرة — لكل جهة سطر واحد.",
                });

            var qty = await EffectiveQty(db, item);
            var result = Distribution.For(qty, rows.Select(r => r.Qty).ToList());

            // 02 §8 PREVENTS rather than flags: the drawer caps every input at
            // the remaining quantity, so this can only be reached by a legacy
            // row that was imported `over` — and then revising it is exactly
            // what the screen is asking for, so the save is refused rather than
            // silently truncated.
            if (result.Excess > 0m)
                return Results.BadRequest(new
                {
                    message = $"مجموع التوزيع ({result.Distributed:0.###}) يتجاوز كمية البند ({qty:0.###}) بمقدار {result.Excess:0.###} — عدّل الكميات قبل الحفظ.",
                });

            db.BoqDistributions.RemoveRange(db.BoqDistributions.Where(d => d.BoqItemId == item.Id));
            db.BoqDistributions.AddRange(rows
                // A zero-quantity row is not a distribution, it is a row someone
                // emptied. Keeping it would show a beneficiary as served with
                // nothing.
                .Where(r => r.Qty > 0m)
                .Select(r => new BoqDistribution
                {
                    BoqItemId = item.Id,
                    BeneficiaryCode = r.BeneficiaryCode,
                    SiteCode = string.IsNullOrWhiteSpace(r.SiteCode) ? null : r.SiteCode.Trim(),
                    Qty = r.Qty,
                }));
            await db.SaveChangesAsync();

            return Results.Ok(await DistributionOf(db, ctx, item));
        });

        // [EP-BOQ-07] GET /api/projects/{projectId}/boq/{contractId}/assignment
        // web: boq/boq.api.ts assignment() → boq.page.ts
        // spec: 04 §4, 02 §2, 02 §3 | rules: BR-02, BR-03
        // tables: Projects · Contracts · BoqItems · BoqRateBands ·
        //         BoqActivityLinks · Activities
        app.MapGet("/api/projects/{projectId}/boq/{contractId}/assignment",
            async (EpmDb db, HttpContext http, string projectId, string contractId, string? basis) =>
        {
            var ctx = await Load(db, http, projectId, contractId);
            return ctx.Error ?? Results.Ok(await Assignment(db, ctx, basis == "mh" ? "mh" : "cost"));
        });

        // [EP-BOQ-08] PUT /api/projects/{projectId}/boq/{contractId}/items/{code}/allocation
        // web: boq/boq.api.ts saveAllocation() → boq.page.ts
        // spec: 04 §4, 02 §3 | rules: BR-03
        // tables: BoqItems · BoqActivityLinks · Activities
        //
        // THE OVERRIDE IS PER LINE, NOT PER LINK (02 §3, P-47). Either every
        // share on this line is the rule's, or every share is a person's.
        app.MapPut("/api/projects/{projectId}/boq/{contractId}/items/{code}/allocation",
            async (EpmDb db, HttpContext http, string projectId, string contractId, string code, BoqAllocationSave input) =>
        {
            var ctx = await Load(db, http, projectId, contractId);
            if (ctx.Error is not null) return ctx.Error;

            var item = await db.BoqItems.AsNoTracking()
                .FirstOrDefaultAsync(i => i.ContractId == contractId && i.Code == code);
            if (item is null)
                return Results.NotFound(new { message = $"BOQ item {code} not found in contract {contractId}" });

            var links = await db.BoqActivityLinks.Where(l => l.BoqItemId == item.Id).ToListAsync();

            if (input.Reset)
            {
                // Reset restores the COMPUTED value (02 §3) — it does not delete
                // the links. Which activities deliver this line is a fact about
                // the work; how the value splits between them is the rule's.
                foreach (var l in links) l.IsManual = false;
                await db.SaveChangesAsync();
                return Results.Ok(await Assignment(db, ctx, "cost"));
            }

            var activities = await db.Activities.AsNoTracking()
                .Where(a => a.ContractId == contractId).ToListAsync();
            var rows = input.Rows ?? [];

            foreach (var r in rows)
            {
                var a = activities.FirstOrDefault(x => x.ActivityId == r.ActivityId);
                if (a is null)
                    return Results.BadRequest(new
                    {
                        message = $"النشاط {r.ActivityId} لا ينتمي إلى العقد {contractId}.",
                    });
                // 02 §2 — a milestone has zero duration and zero cost, so its
                // weight is 0 and it is excluded from allocation. Linking to one
                // would give a share of a line to work that has no value.
                if (a.IsMilestone)
                    return Results.BadRequest(new
                    {
                        message = $"النشاط {r.ActivityId} حَدَث فارق (milestone) ولا يدخل في التخصيص.",
                    });
                if (r.SharePct < 0m)
                    return Results.BadRequest(new { message = "الحصة لا يمكن أن تكون سالبة." });
            }

            var dup = rows.GroupBy(r => r.ActivityId).FirstOrDefault(g => g.Count() > 1);
            if (dup is not null)
                return Results.BadRequest(new
                {
                    message = $"النشاط {dup.Key} مكرّر — ادمج الحصص في سطر واحد.",
                });

            // Over-allocation is a real STATE (06 §11) that legacy data can be
            // in, but it is not a thing a person may newly save: more than 100%
            // of a line's value would be earned by the work linked to it.
            var total = rows.Sum(r => r.SharePct);
            if (total > 100m + CoverageTolerance)
                return Results.BadRequest(new
                {
                    message = $"مجموع الحصص {total:0.#}% يتجاوز 100% — صحّح التخصيص قبل الحفظ.",
                });

            db.BoqActivityLinks.RemoveRange(links);
            db.BoqActivityLinks.AddRange(rows.Select(r => new BoqActivityLink
            {
                BoqItemId = item.Id,
                ActivityId = activities.First(a => a.ActivityId == r.ActivityId).Id,
                SharePct = r.SharePct,
                IsManual = true,
            }));
            await db.SaveChangesAsync();

            return Results.Ok(await Assignment(db, ctx, "cost"));
        });
    }

    // ── the scope check, once ────────────────────────────────────────────

    /// <summary>
    /// Every route resolves the same pair. A contract belongs to exactly one
    /// project (01 §1), so a mismatch is a 404 and not a filtered empty list —
    /// an empty list would read as "this contract has no BOQ".
    /// </summary>
    private record Ctx(Project Project, Contract Contract, IResult? Error)
    {
        public static Ctx Fail(IResult error) => new(null!, null!, error);
    }

    private static async Task<Ctx> Load(EpmDb db, HttpContext http, string projectId, string contractId)
    {
        var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
        if (p is null)
            return Ctx.Fail(Results.NotFound(new { message = $"project {projectId} not found" }));

        // BR-15 — a project inside a workspace this user is not assigned to is
        // data outside their تشكيل (§7). One check here covers all seven BOQ
        // endpoints, because all seven already come through this gate.
        if (WorkspaceScope.Deny(http, p.WorkspaceCode) is { } denied) return Ctx.Fail(denied);

        var c = await db.Contracts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == contractId);
        if (c is null || c.ProjectId != projectId)
            return Ctx.Fail(Results.NotFound(new
            {
                message = $"contract {contractId} not found in project {projectId}",
            }));

        return new Ctx(p, c, null);
    }

    // ── the register ─────────────────────────────────────────────────────

    private static async Task<BoqRegisterResponse> Register(EpmDb db, Ctx ctx)
    {
        var model = await Derive(db, ctx.Contract.Id, "cost");

        var rows = new List<BoqRow>();
        foreach (var d in model)
        {
            rows.Add(new BoqRow(
                d.Item.Code, d.Item.DescriptionAr, d.Item.DescriptionEn, d.Item.Unit,
                d.Item.Division, d.Item.DivisionName, d.Item.Source,
                Q(d.Item.OriginalQty), Q(d.Line.Qty), M(d.Line.Rate), M(d.Line.Amount),
                d.Weight, Q(d.SharesTotal), Q(d.AssignedWeight), d.Links.Count, d.Coverage,
                Q(d.Progress.Progress), M(d.Progress.AchievedAmount), Q(d.Progress.AchievedQty),
                Q(d.Distribution.Distributed), Q(d.Distribution.Remaining), d.Distribution.State,
                d.Line.Banded));
        }

        // Divisions in first-appearance order — a division is a label on the
        // lines filed under it (01 §2.4), so its order is theirs and there is no
        // separate table to sort by.
        var divisions = new List<BoqDivision>();
        foreach (var g in model.Where(d => !string.IsNullOrEmpty(d.Item.Division))
                               .GroupBy(d => d.Item.Division))
        {
            var amount = g.Sum(d => d.Line.Amount);
            var achieved = g.Sum(d => d.Progress.AchievedAmount);
            divisions.Add(new BoqDivision(
                g.Key,
                g.First().Item.DivisionName is { Length: > 0 } n ? n : g.Key,
                g.Count(),
                M(amount),
                g.Sum(d => d.Weight),
                M(achieved),
                Q(ProgressReflection.Rollup(amount, achieved)),
                g.Sum(d => d.Links.Count),
                g.Any(d => d.Coverage == "over")));
        }

        var totalAmount = ProjectValue.Total(model.Select(d => d.Line.Amount));
        var totalAchieved = model.Sum(d => d.Progress.AchievedAmount);

        // The Z10 bar shows the PROJECT's bill beside this contract's, which is
        // the only figure on this screen that reaches outside the contract —
        // and it is a sum of contracts, so it goes through BR-00 (01 §3).
        var siblingIds = await db.Contracts.AsNoTracking()
            .Where(c => c.ProjectId == ctx.Project.Id).Select(c => c.Id).ToListAsync();
        var projectAmount = ProjectValue.Total(await ContractAmounts(db, siblingIds));

        var totals = new BoqTotals(
            model.Count, M(totalAmount),
            model.Count == 0 ? 0m : model.Sum(d => d.Weight),
            M(totalAchieved),
            Q(ProgressReflection.Rollup(totalAmount, totalAchieved)),
            model.Sum(d => d.Links.Count),
            ctx.Contract.OriginalValue,
            M(projectAmount));

        return new BoqRegisterResponse(
            ctx.Project.Id, ctx.Project.NameAr, ctx.Project.NameEn,
            ctx.Contract.Id, ctx.Contract.NameAr, ctx.Contract.NameEn,
            rows, divisions, totals,
            Counts(model.Select(d => d.Coverage), ["unassigned", "full", "partial", "over"]),
            Counts(model.Select(d => d.Distribution.State), ["none", "partial", "full", "over"]),
            // "Now" is the project data date, never DateTime.Now (D-06).
            ctx.Project.DataDate?.ToString("yyyy-MM-dd") ?? "");
    }

    /// <summary>Every contract's BOQ total, for the project roll-up.</summary>
    private static async Task<List<decimal>> ContractAmounts(EpmDb db, List<string> contractIds)
    {
        var items = await db.BoqItems.AsNoTracking()
            .Where(i => contractIds.Contains(i.ContractId)).ToListAsync();
        var bands = await db.BoqRateBands.AsNoTracking()
            .Where(b => items.Select(i => i.Id).Contains(b.BoqItemId)).ToListAsync();

        return contractIds
            .Select(cid => items.Where(i => i.ContractId == cid)
                .Sum(i => TierSplit.Effective(i.OriginalQty, i.UnitRate, BandsOf(bands, i.Id)).Amount))
            .ToList();
    }

    // ── the assignment screen ────────────────────────────────────────────

    private static async Task<BoqAssignmentResponse> Assignment(EpmDb db, Ctx ctx, string basis)
    {
        var activities = await db.Activities.AsNoTracking()
            .Where(a => a.ContractId == ctx.Contract.Id)
            .OrderBy(a => a.WbsPath).ThenBy(a => a.ActivityId)
            .ToListAsync();

        // 02 §2 — milestones carry zero basis and are excluded from allocation,
        // so they are excluded from the denominator too. Including them would be
        // dividing by a total that no activity can ever earn against.
        var assignable = activities.Where(a => !a.IsMilestone).ToList();
        var costTotal = assignable.Sum(a => a.BudgetedCost);
        var mhTotal = assignable.Sum(a => a.BudgetedManHours ?? 0m);
        var manHoursAvailable = assignable.Count > 0
            && assignable.All(a => a.BudgetedManHours is > 0m);

        var acts = activities.Select(a => new BoqActivity(
            a.ActivityId, a.NameAr, a.NameEn, a.WbsPath, a.WbsNames, a.Status, Q(a.ProgressPct),
            a.IsMilestone ? 0m : Q(ScheduleWeights.For(a.BudgetedCost, costTotal, costTotal).Absolute),
            !manHoursAvailable || a.IsMilestone
                ? null
                : Q(ScheduleWeights.For(a.BudgetedManHours!.Value, mhTotal, mhTotal).Absolute),
            a.IsMilestone)).ToList();

        var model = await Derive(db, ctx.Contract.Id, manHoursAvailable ? basis : "cost");

        var items = model.Select(d => new BoqAllocation(
            d.Item.Code, d.Item.DescriptionAr, d.Item.DescriptionEn, d.Item.Unit,
            Q(d.Line.Qty), M(d.Line.Amount), d.Weight, Q(d.SharesTotal), d.Coverage, d.IsManual,
            d.Links.Select(l => new BoqAllocationRow(
                l.Activity.ActivityId, l.Activity.NameAr, l.Activity.NameEn, l.Activity.WbsNames,
                Q(l.ActivityWeight), Q(l.Activity.ProgressPct),
                Q(l.SharePct), Q(l.ComputedPct),
                M(d.Line.Amount * l.SharePct / 100m),
                Q(Allocation.AbsoluteWeight(d.Weight, l.SharePct)),
                d.Links.Count(x => x.Activity.ActivityId == l.Activity.ActivityId) > 1)).ToList()))
            .ToList();

        return new BoqAssignmentResponse(
            ctx.Contract.Id,
            manHoursAvailable ? basis : "cost",
            manHoursAvailable,
            acts, items,
            Counts(model.Select(d => d.Coverage), ["unassigned", "full", "partial", "over"]));
    }

    // ── the distribution drawer ──────────────────────────────────────────

    private static async Task<BoqDistributionResponse> DistributionOf(EpmDb db, Ctx ctx, BoqItem item)
    {
        var rows = await db.BoqDistributions.AsNoTracking()
            .Where(d => d.BoqItemId == item.Id).OrderBy(d => d.Id).ToListAsync();

        var bens = await ProjectBeneficiaries(db, ctx.Project);
        var qty = await EffectiveQty(db, item);
        var result = Distribution.For(qty, rows.Select(r => r.Qty).ToList());

        var outRows = rows.Select(r =>
        {
            var b = bens.FirstOrDefault(x => x.Code == r.BeneficiaryCode);
            return new BoqDistributionRow(
                r.BeneficiaryCode,
                b?.NameAr ?? r.BeneficiaryCode,
                b?.NameEn ?? r.BeneficiaryCode,
                r.SiteCode,
                Q(r.Qty),
                // The cap this row would have if it were the one being typed
                // into: the line's quantity less every OTHER row (02 §8).
                Q(Distribution.CapFor(qty, rows.Where(x => x.Id != r.Id).Select(x => x.Qty).ToList())));
        }).ToList();

        return new BoqDistributionResponse(
            item.ContractId, item.Code, item.DescriptionAr, item.DescriptionEn, item.Unit,
            Q(qty), Q(result.Distributed), Q(result.Remaining), Q(result.Excess), result.State,
            outRows,
            bens.Select(b => new BoqContractBeneficiary(b.Code, b.NameAr, b.NameEn)).ToList());
    }

    /// <summary>
    /// 01 §2.1 — `Projects.BeneficiaryCodes` is a CSV of codes, and 02 §8's
    /// second import gate says a distribution may only name a beneficiary
    /// assigned to THIS project and still active. That CSV is the assignment.
    /// </summary>
    private static async Task<List<Beneficiary>> ProjectBeneficiaries(EpmDb db, Project p)
    {
        var codes = (p.BeneficiaryCodes ?? "")
            .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();

        return await db.Beneficiaries.AsNoTracking()
            .Where(b => codes.Contains(b.Code) && b.Active)
            .OrderBy(b => b.Code)
            .ToListAsync();
    }

    private static async Task<decimal> EffectiveQty(EpmDb db, BoqItem item)
    {
        var bands = await db.BoqRateBands.AsNoTracking()
            .Where(b => b.BoqItemId == item.Id).OrderBy(b => b.Seq).ToListAsync();
        return TierSplit.Effective(item.OriginalQty, item.UnitRate, BandsOf(bands, item.Id)).Qty;
    }

    // ── ONE derivation, shared by every read above ───────────────────────
    //
    // INTERNAL, NOT PRIVATE, SINCE PHASE 4.4 (P-54). SCR-W6 shows a BOQ line's
    // progress, achieved quantity and achieved amount beside the activity that
    // moves them, and those are this function's output. Re-deriving them in
    // ProgressEndpoints would be the second derivation the comment below exists
    // to forbid — the same trap, one screen further on. This is a projection
    // helper, not a service class: it holds no state, injects nothing, and the
    // arithmetic inside it is still entirely Domain/'s.

    internal record DerivedLink(Activity Activity, decimal ActivityWeight, decimal SharePct, decimal ComputedPct);

    internal record Derived(
        BoqItem Item,
        TierSplit.Line Line,
        decimal Weight,
        IReadOnlyList<DerivedLink> Links,
        decimal SharesTotal,
        decimal AssignedWeight,
        string Coverage,
        bool IsManual,
        ProgressReflection.Result Progress,
        Distribution.Result Distribution);

    /// <summary>
    /// The register and the assignment screen are two views of ONE model, so
    /// they are derived by one function. Two of them would be two chances for
    /// the coverage on the grid to disagree with the coverage in the editor.
    /// </summary>
    internal static async Task<List<Derived>> Derive(EpmDb db, string contractId, string basis)
    {
        var items = await db.BoqItems.AsNoTracking()
            .Where(i => i.ContractId == contractId)
            .OrderBy(i => i.Division).ThenBy(i => i.Code)
            .ToListAsync();

        if (items.Count == 0) return [];

        var ids = items.Select(i => i.Id).ToList();

        var bands = await db.BoqRateBands.AsNoTracking()
            .Where(b => ids.Contains(b.BoqItemId)).OrderBy(b => b.Seq).ToListAsync();
        var links = await db.BoqActivityLinks.AsNoTracking()
            .Where(l => ids.Contains(l.BoqItemId)).OrderBy(l => l.Id).ToListAsync();
        var dists = await db.BoqDistributions.AsNoTracking()
            .Where(d => ids.Contains(d.BoqItemId)).ToListAsync();
        var activities = await db.Activities.AsNoTracking()
            .Where(a => a.ContractId == contractId).ToListAsync();

        var actById = activities.ToDictionary(a => a.Id);

        // BR-02's denominator, once per contract (milestones excluded, 02 §2).
        var assignable = activities.Where(a => !a.IsMilestone).ToList();
        var costTotal = assignable.Sum(a => a.BudgetedCost);
        var mhTotal = assignable.Sum(a => a.BudgetedManHours ?? 0m);
        var useMh = basis == "mh" && mhTotal > 0m;

        decimal Weight(Activity a) => a.IsMilestone
            ? 0m
            : useMh
                ? ScheduleWeights.For(a.BudgetedManHours ?? 0m, mhTotal, mhTotal).Absolute
                : ScheduleWeights.For(a.BudgetedCost, costTotal, costTotal).Absolute;

        // BR-05 first: the line's effective quantity, rate and amount are what
        // every other rule takes as its input.
        var lines = items.ToDictionary(
            i => i.Id,
            i => TierSplit.Effective(i.OriginalQty, i.UnitRate, BandsOf(bands, i.Id)));

        // BR-01 — the weight column, over THIS CONTRACT's amounts, in item
        // order so out[i] belongs to items[i].
        var weights = BoqWeights.ForContract(items.Select(i => lines[i.Id].Amount).ToList());

        var derived = new List<Derived>(items.Count);

        for (var idx = 0; idx < items.Count; idx++)
        {
            var i = items[idx];
            var line = lines[i.Id];
            var mine = links.Where(l => l.BoqItemId == i.Id && actById.ContainsKey(l.ActivityId)).ToList();

            // THE OVERRIDE IS PER LINE (02 §3, P-47). One manual link puts the
            // whole line in override mode: mixing a stored share with a computed
            // one gives a total nobody chose and a coverage nobody can explain.
            var isManual = mine.Any(l => l.IsManual);

            var absWeights = mine.Select(l => Weight(actById[l.ActivityId])).ToList();
            var computed = Allocation.Shares(absWeights, line.Amount);

            var derivedLinks = mine.Select((l, k) => new DerivedLink(
                actById[l.ActivityId],
                absWeights[k],
                isManual ? l.SharePct : computed[k].Pct,
                computed[k].Pct)).ToList();

            var shares = derivedLinks.Select(l => l.SharePct).ToList();
            var sharesTotal = shares.Sum();

            var progress = ProgressReflection.For(
                derivedLinks.Select(l => new ProgressReflection.Link(l.SharePct, l.Activity.ProgressPct)).ToList(),
                line.Amount, line.Qty);

            var distribution = Distribution.For(
                line.Qty,
                dists.Where(d => d.BoqItemId == i.Id).Select(d => d.Qty).ToList());

            derived.Add(new Derived(
                i, line, weights[idx], derivedLinks, sharesTotal,
                Allocation.AbsoluteWeight(weights[idx], sharesTotal),
                Allocation.CoverageStatus(shares),
                isManual, progress, distribution));
        }

        return derived;
    }

    private static List<TierSplit.Band> BandsOf(IEnumerable<BoqRateBand> all, int boqItemId) =>
        all.Where(b => b.BoqItemId == boqItemId)
           .OrderBy(b => b.Seq)
           .Select(b => new TierSplit.Band(b.Qty, b.Rate))
           .ToList();

    /// <summary>
    /// Counts with EVERY key present, including the zeroes. A filter chip that
    /// disappears when its count is nought is a chip whose absence has to be
    /// interpreted; one reading «0» is a fact.
    /// </summary>
    private static Dictionary<string, int> Counts(IEnumerable<string> values, string[] keys)
    {
        var counts = keys.ToDictionary(k => k, _ => 0);
        foreach (var v in values)
            if (counts.ContainsKey(v)) counts[v]++;
        return counts;
    }
}
