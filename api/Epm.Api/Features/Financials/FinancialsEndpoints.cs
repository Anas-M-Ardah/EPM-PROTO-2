using Epm.Api.Data;
using Epm.Api.Features.Workspaces;
using Epm.Api.Data.Entities;
using Epm.Api.Domain;
using Epm.Api.Features.Boq;
using Epm.Api.Features.Dev;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Financials;

/// <summary>
/// SCR-W7 — the project workspace Financials module (`04 §3`).
/// PORTED from the v1.1 financial module: ../epm@design/system-revamp
/// app/project-modules.jsx `DModFinancialNew` :907.
///
/// ── THE RECONCILIATION IS THE SCREEN ─────────────────────────────────────
/// Approved + approved changes = revised − disbursed = balance, with every
/// middle term visible. It is the same shape SCR-W3's contract register uses
/// for values, and for the same reason: a total whose parts are hidden is a
/// total nobody can check.
///
/// ── FOUR FIGURES PER CERTIFICATE, NOT ONE ────────────────────────────────
/// gross − retention − advance recovery = net. Retention held is a LIABILITY
/// the ministry still owes; advance outstanding is one the CONTRACTOR still
/// owes. Collapsing them into a single "amount" is what makes either balance
/// impossible to find a year later.
///
/// ── WHAT THIS SCREEN DELIBERATELY DOES NOT SHOW ──────────────────────────
/// The reference has an ANNUAL ALLOCATION tab — allocation, spend and
/// utilisation per fiscal year — and an ADVANCE AUDIT SLA tab driven by
/// `EPM.paymentSLA`. Neither has a source in this data model: no table records
/// a yearly ministry allocation, and no column records when a certificate
/// entered each audit stage. `01` does not define either. They are returned as
/// `unavailable` with the reason, rather than invented from a payment date —
/// the same treatment SCR-E1 gives physical % and SCR-E5 gave the critical
/// path (P-09, P-56).
///
/// ── NO ARITHMETIC OF ITS OWN ─────────────────────────────────────────────
/// Effective values are Domain/Amendments (BR-09), the project total
/// Domain/ProjectValue (BR-00), the indices Domain/EarnedValue (BR-11), the
/// physical % behind EV comes from the SAME BoqEndpoints.Derive SCR-W4 and
/// SCR-W6 read (P-54), and the planned figure from Domain/PlannedProgress
/// (P-53). This file queries, groups and projects.
/// </summary>
public static class FinancialsEndpoints
{
    public static void MapFinancialsEndpoints(this WebApplication app)
    {
        // [EP-FIN-01] GET /api/projects/{projectId}/financials
        // web: financials/financials.api.ts get() → financials.page.ts
        // spec: 04 §3 | rules: BR-00, BR-04, BR-09, BR-11 + P-53
        // tables: Projects · Contracts · ContractAmendments · Payments
        //         BoqItems · BoqRateBands · BoqActivityLinks · Activities
        app.MapGet("/api/projects/{projectId}/financials", async (
            EpmDb db, HttpContext http, string projectId, int? year) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(http, p.WorkspaceCode) is { } denied) return denied;

            var asOf = p.DataDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

            var contracts = await db.Contracts.AsNoTracking()
                .Where(c => c.ProjectId == projectId).OrderBy(c => c.Id).ToListAsync();
            var ids = contracts.Select(c => c.Id).ToList();

            var amendments = await db.ContractAmendments.AsNoTracking()
                .Where(x => ids.Contains(x.ContractId)).OrderBy(x => x.No).ToListAsync();
            var payments = await db.Payments.AsNoTracking()
                .Where(x => ids.Contains(x.ContractId))
                .OrderBy(x => x.ContractId).ThenBy(x => x.No).ToListAsync();

            var rows = new List<FinancialsContractDto>();
            var effectiveValues = new List<decimal>();
            decimal pendingChanges = 0m;
            decimal executedTotal = 0m, billedTotal = 0m;
            decimal plannedWeighted = 0m, plannedBasis = 0m;

            foreach (var c in contracts)
            {
                var mine = amendments.Where(x => x.ContractId == c.Id).ToList();
                var deltas = mine
                    .Select(x => new Amendments.Delta(x.No, x.DeltaValue, x.DeltaDays, x.AppliedAt != null))
                    .ToList();

                var original = new Amendments.Version(0, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays);
                var effective = Amendments.Effective(original, deltas);
                effectiveValues.Add(effective.Value);

                // 02 §9 — the projection. It is shown BESIDE the totals and
                // folded into none of them.
                pendingChanges += Amendments.Projection(effective, deltas).Value - effective.Value;

                var chg = effective.Value - c.OriginalValue;
                var pays = payments.Where(x => x.ContractId == c.Id).ToList();

                var disbursed = pays.Where(x => x.Status == "paid").Sum(x => x.NetAmount);
                var certified = pays.Where(x => x.Status == "certified").Sum(x => x.NetAmount);

                // PAID ONLY, on both of these, for the same reason disbursed is
                // (P-26). Retention is withheld FROM a payment and an advance is
                // recovered BY one — so a certificate that has been certified
                // and not yet paid has withheld nothing and recovered nothing.
                // `CNT-0279`'s third certificate is exactly that case, and
                // counting it would report 5,525,000 of retention the ministry
                // is not yet holding and 4,850,000 of advance the contractor has
                // not yet repaid.
                var retention = pays.Where(x => x.Status == "paid").Sum(x => x.RetentionAmount);
                var advanceOut = pays.Where(x => x.Kind == "advance" && x.Status == "paid").Sum(x => x.NetAmount)
                                 - pays.Where(x => x.Status == "paid").Sum(x => x.AdvanceRecovery);

                // The award carries the whole change; the reserve and the
                // supervision allowance are untouched by a change order.
                // `SpentYear` / `SpentToDate` are filled per row below, and the
                // forecast stays null on a component — see the DTO note (P-90).
                var components = new List<FinancialsComponentDto>
                {
                    new("award", "الإحالة", "Award", c.AwardAmount, chg, c.AwardAmount + chg,
                        0m, 0m, null, null),
                    new("reserve", "الاحتياط", "Reserve", c.ReserveAmount, 0m, c.ReserveAmount,
                        0m, 0m, null, null),
                    new("supervision", "الإشراف والمراقبة", "Supervision & monitoring",
                        c.SupervisionAmount, 0m, c.SupervisionAmount, 0m, 0m, null, null),
                };

                // EV's input, from the ONE derivation SCR-W4 and SCR-W6 read.
                // Read BEFORE the row is built now, because الشكل 14's forecast
                // column is BR-11 on this contract and needs its earned value.
                var derived = await BoqEndpoints.Derive(db, c.Id, "cost");
                var contractActs = await db.Activities.AsNoTracking()
                    .Where(a => a.ContractId == c.Id && !a.IsMilestone).ToListAsync();
                var executed = derived.Sum(d => d.Progress.AchievedAmount);
                var billed = derived.Sum(d => d.Line.Amount);
                executedTotal += executed;
                billedTotal += billed;

                // «عند الإنجاز» — BR-11's EAC, per contract: its budget over its
                // OWN cost performance. Null when nothing has been disbursed,
                // because a CPI has no denominator then (P-09) — a contract
                // that has spent nothing is not forecast to cost nothing.
                var evmC = EarnedValue.For(
                    effective.Value,
                    // PLANNED % on this contract's own activities. SPI is not
                    // what الشكل 14 asks for, but EarnedValue.For takes it and
                    // only the cost side is read here.
                    contractActs.Sum(a => a.BudgetedCost) > 0m
                        ? contractActs.Sum(a => a.BudgetedCost
                              * PlannedProgress.PlannedPct(a.BaselineStart, a.BaselineFinish, asOf) / 100m)
                          / contractActs.Sum(a => a.BudgetedCost)
                        : 0m,
                    billed > 0m ? ProgressReflection.Rollup(billed, executed) / 100m : 0m,
                    disbursed);

                decimal? forecast = disbursed > 0m && evmC.Eac is not null ? M(evmC.Eac.Value) : null;
                decimal? variance = forecast is null ? null : M(effective.Value - forecast.Value);

                // «مصروف السنة» — a certificate belongs to the year its MONEY
                // moved (PaidDate), not the year it was certified: this column
                // sits under «الفعلي», and the ministry's year is a cash year.
                decimal spentIn(Func<Data.Entities.Payment, decimal> part) =>
                    pays.Where(x => x.Status == "paid"
                            && (year is null || (x.PaidDate?.Year ?? 0) == year))
                        .Sum(part);

                var spentYear = spentIn(x => x.NetAmount);

                rows.Add(new FinancialsContractDto(
                    c.Id, c.NameAr, c.NameEn, c.Status,
                    M(c.OriginalValue), M(chg), M(effective.Value),
                    M(disbursed), M(certified), M(retention), M(Math.Max(0m, advanceOut)),
                    M(effective.Value - disbursed),
                    pays.Count,
                    M(spentYear), forecast, variance,
                    components.Select(x => x with
                    {
                        Original = M(x.Original),
                        Chg = M(x.Chg),
                        Revised = M(x.Revised),
                        // Per ITEM, from the portions الشكل 9 records on each
                        // payment — the same three keys the contract card splits.
                        SpentYear = M(spentIn(portion(x.Key))),
                        SpentToDate = M(pays.Where(y => y.Status == "paid").Sum(portion(x.Key))),
                    }).ToList()));

                plannedBasis += contractActs.Sum(a => a.BudgetedCost);
                plannedWeighted += contractActs.Sum(a =>
                    a.BudgetedCost * PlannedProgress.PlannedPct(a.BaselineStart, a.BaselineFinish, asOf) / 100m);
            }

            var revised = ProjectValue.Total(effectiveValues);
            var approved = contracts.Sum(c => c.OriginalValue);

            // P-26's rule: PAID only. Certified-and-unpaid is money owed, and it
            // travels in its own field so it can be seen rather than assumed.
            var disbursedTotal = payments.Where(x => x.Status == "paid").Sum(x => x.NetAmount);
            var certifiedTotal = payments.Where(x => x.Status == "certified").Sum(x => x.NetAmount);

            var physical = ProgressReflection.Rollup(billedTotal, executedTotal);
            var planned = ProgressReflection.Rollup(plannedBasis, plannedWeighted);
            var evm = EarnedValue.For(revised, planned / 100m, physical / 100m, disbursedTotal);

            var totals = new FinancialsTotals(
                M(approved), M(revised - approved), M(pendingChanges), M(revised),
                M(disbursedTotal), M(certifiedTotal),
                M(payments.Where(x => x.Status == "paid").Sum(x => x.RetentionAmount)),
                M(Math.Max(0m, payments.Where(x => x.Kind == "advance" && x.Status == "paid").Sum(x => x.NetAmount)
                               - payments.Where(x => x.Status == "paid").Sum(x => x.AdvanceRecovery))),
                M(revised - disbursedTotal),
                Q(ProgressReflection.Rollup(revised, disbursedTotal)),
                M(rows.Sum(r => r.SpentYear)),
                // «أساسا القياس»: the project's approved budget against what its
                // contracts commit. `Projects.PlannedCost` is the budget المسار 1
                // records; the commitments are BR-00 over BR-09. The gap is what
                // الشكل 14's note box exists to raise, and it is signed —
                // negative means the contracts have outrun the budget.
                p.PlannedCost is null ? null : M(p.PlannedCost.Value),
                M(revised),
                p.PlannedCost is null ? null : M(p.PlannedCost.Value - revised));

            var paymentRows = payments.Select(x =>
            {
                var c = contracts.First(y => y.Id == x.ContractId);
                return new FinancialsPaymentDto(
                    x.Id, x.ContractId, c.NameAr, c.NameEn, x.No, x.Kind, x.Status,
                    x.FinanceLetterNo, x.FinanceLetterDate?.ToString("yyyy-MM-dd"),
                    M(x.GrossAmount), M(x.RetentionAmount), M(x.AdvanceRecovery), M(x.NetAmount),
                    x.CertifiedDate?.ToString("yyyy-MM-dd"), x.PaidDate?.ToString("yyyy-MM-dd"),
                    x.Note);
            }).ToList();

            // P-56 — two tabs of the reference that have no source here.
            var unavailable = new List<FinancialsUnavailable>
            {
                // `allocation` is GONE: `ProjectAllocations` exists now and
                // الشكل 15 reads it (P-92). What is still missing is the SCREEN
                // that edits it — الشكل 18's «البيانات المسجّلة» — and that tab
                // names its own gap.
                // `sla` is GONE: `PaymentAuditStages` records the route now and
                // الشكل 17 reads it (P-97). Both of P-56's gaps are closed.
            };

            // ── الشكل 17 — مهل التدقيق ─────────────────────────────────
            // «السلفة الجارية»: the certificate that has been certified and
            // not yet paid. One at a time — a paid certificate has no lead
            // time left to watch, and a pending one has not entered the route.
            var inFlight = payments
                .Where(x => x.Status == "certified")
                .OrderByDescending(x => x.CertifiedDate)
                .FirstOrDefault();

            FinancialsAuditSlaDto? auditSla = null;

            if (inFlight is not null)
            {
                var stageRows = await db.PaymentAuditStages.AsNoTracking()
                    .Where(x => x.PaymentId == inFlight.Id)
                    .OrderBy(x => x.No)
                    .ToListAsync();

                var stages = stageRows.Select(x =>
                {
                    // BR-12 against the DATA DATE (D-06). A finished stage is
                    // measured to its own finish; the one holding the file is
                    // measured to today-as-the-project-knows-it.
                    int? elapsed = x.StartedAt is null
                        ? null
                        : (x.FinishedAt ?? asOf).DayNumber - x.StartedAt.Value.DayNumber;

                    var state =
                        x.FinishedAt is not null ? "done" :
                        x.StartedAt is null ? "waiting" :
                        SlaLeadTime.For(asOf, x.StartedAt.Value, x.CapDays).Overdue ? "overdue" :
                        "current";

                    return new FinancialsAuditStageDto(
                        x.No, x.StageKey, x.PartyAr, x.PartyEn, x.CapDays,
                        x.StartedAt?.ToString("yyyy-MM-dd"),
                        x.FinishedAt?.ToString("yyyy-MM-dd"),
                        elapsed, state);
                }).ToList();

                var current = stages.FirstOrDefault(x => x.State is "current" or "overdue");
                var c0 = contracts.First(y => y.Id == inFlight.ContractId);

                auditSla = new FinancialsAuditSlaDto(
                    c0.Id, c0.NameAr, c0.NameEn, inFlight.No, inFlight.FinanceLetterNo,
                    // «ضمن المهلة» unless a desk has passed its own cap.
                    stages.Any(x => x.State == "overdue") ? "overdue" : "within",
                    inFlight.LegalDueDate?.ToString("yyyy-MM-dd"),
                    inFlight.LegalDueDate is null
                        ? null
                        : inFlight.LegalDueDate.Value.DayNumber - asOf.DayNumber,
                    current is null ? null : LookupParty(stageRows, current.No, ar: true),
                    current is null ? null : LookupParty(stageRows, current.No, ar: false),
                    stages);
            }

            // ── الشكل 16 — سجل الدفعات ─────────────────────────────────
            // «دفعة واحدة تشمل أكثر من عقد مع توزيع معلن». The grouping key is
            // the OFFICIAL LETTER, which every payment already carries and
            // which is what the ministry files by — so a letter covering two
            // contracts is two rows sharing it, and no new table is needed
            // to say so (P-94).
            var letters = payments
                .Where(x => year is null
                    || (x.PaidDate?.Year ?? x.FinanceLetterDate?.Year ?? 0) == year)
                .GroupBy(x => new { x.FinanceLetterNo, x.FinanceLetterDate })
                .OrderByDescending(g => g.Key.FinanceLetterDate)
                .Select(g => new FinancialsLetterDto(
                    g.Key.FinanceLetterNo,
                    g.Key.FinanceLetterDate?.ToString("yyyy-MM-dd"),
                    g.Select(x => x.ContractId).Distinct().Count(),
                    M(g.Sum(x => x.NetAmount)),
                    // Two statuses inside one letter is the case a single
                    // status would hide: paid on one contract, certified on
                    // the other (P-26).
                    g.Select(x => x.Status).Distinct().OrderBy(x => x).ToList(),
                    g.GroupBy(x => x.ContractId).Select(cg =>
                    {
                        var c = contracts.First(y => y.Id == cg.Key);
                        return new FinancialsLetterShareDto(
                            cg.Key, c.NameAr, c.NameEn, c.Status,
                            // The same three portions الشكل 9 records on the
                            // payment — one apportionment, read by both screens.
                            M(cg.Sum(x => x.AwardPortion)),
                            M(cg.Sum(x => x.ReservePortion)),
                            M(cg.Sum(x => x.SupervisionPortion)),
                            M(cg.Sum(x => x.NetAmount)));
                    }).ToList()))
                .ToList();

            // ── الشكل 15 — التخصيص السنوي ──────────────────────────────
            // The allocation is recorded; the spend is DERIVED from the
            // payments whose money moved in the year, so this tab and جدول
            // الكلف cannot report a different figure for one year.
            var allocRows = await db.ProjectAllocations.AsNoTracking()
                .Where(x => x.ProjectId == projectId)
                .OrderByDescending(x => x.Year)
                .ToListAsync();

            var allocations = allocRows
                .Where(x => year is null || x.Year == year)
                .Select(x =>
                {
                    var spent = payments
                        .Where(y => y.Status == "paid" && (y.PaidDate?.Year ?? 0) == x.Year)
                        .Sum(y => y.NetAmount);

                    return new FinancialsAllocationDto(
                        x.Year, M(x.Amount), M(spent), M(x.Amount - spent),
                        // A year with nothing released has no consumption to
                        // report — that is not 0% (P-09).
                        x.Amount > 0m ? Q(ProgressReflection.Rollup(x.Amount, spent)) : null,
                        x.Closed, x.ActorName, x.ActorRole, x.ActorParty,
                        x.At == default ? null : x.At.ToString("yyyy-MM-dd"));
                })
                .ToList();

            // The filter offers only years that HAVE a paid certificate: a
            // dropdown of empty years is a list of ways to see nothing.
            var years = payments
                .Where(x => x.Status == "paid" && x.PaidDate != null)
                .Select(x => x.PaidDate!.Value.Year)
                .Distinct().OrderByDescending(y => y).ToList();

            return Results.Ok(new FinancialsResponse(
                p.Id, p.NameAr, p.NameEn, p.DataDate?.ToString("yyyy-MM-dd"),
                totals,
                new FinancialsEvm(
                    M(revised), M(evm.Pv), M(evm.Ev), M(evm.Ac),
                    R(evm.Cpi), R(evm.Spi), Money(evm.Eac), Money(evm.Vac)),
                rows, paymentRows, unavailable, allocations, letters, auditSla, years, year));
        });

        // [EP-FIN-02] POST /api/projects/{projectId}/financials/payments
        // web: financials/financials.api.ts registerPayment() → payment.wizard.ts
        // spec: ملحق الشكل 20 · المسار 8 step 1 | rules: BR-12, D-03
        // tables: Payments · PaymentAttachments · PaymentAuditStages (WRITTEN)
        //
        // THE WRITE THIS SCREEN DID NOT HAVE (P-96, closed). `financials.api.ts`
        // used to carry a comment saying a certificate is raised against works
        // measured on site and that the wizard which does it was not built.
        // الشكل 20 is that wizard, and this is what it posts to.
        //
        // ── IT REGISTERS A CERTIFICATE, IT DOES NOT PAY ONE ──────────────────
        // The row lands `pending` with no `CertifiedDate` and no `PaidDate`, and
        // the audit route is created with its first desk open. المسار 8's
        // steps 2–4 — review, certify, disburse — are decisions with owners and
        // dates that no screen in this build asks for, and writing them here
        // would record approvals nobody gave. P-26's rule holds: nothing this
        // endpoint writes moves المصروف.
        //
        // ── THE ORDER OF THE STEPS IS THE CONTROL ───────────────────────────
        // الشكل 20: «يفرض ترتيبًا ثابتًا لإجراء الصرف: عقود ← مبالغ ← كتاب مالية
        // ← ذرعات ← مراجعة، فيمنع تسجيل دفعة ناقصة المستندات». So the letter and
        // at least one ذرعة are REQUIRED here and not merely asked for in the UI.
        app.MapPost("/api/projects/{projectId}/financials/payments", async (
            EpmDb db, HttpContext http, string projectId, PaymentRegisterInput input) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(http, p.WorkspaceCode) is { } denied) return denied;

            var user = WorkspaceScope.User(http);
            if (!user.CanRegisterPayment())
                return Results.StatusCode(403);

            var contract = await db.Contracts.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == input.ContractId && c.ProjectId == projectId);
            if (contract is null)
                return Results.NotFound(new
                {
                    messageAr = "العقد غير موجود في هذا المشروع.",
                    messageEn = $"contract {input.ContractId} not found in project {projectId}",
                });

            if (input.GrossAmount <= 0m)
                return Results.BadRequest(new
                {
                    messageAr = "المبلغ الإجمالي يجب أن يكون أكبر من صفر.",
                    messageEn = "The gross amount must be greater than zero.",
                });

            // A retention or an advance recovery cannot exceed what is being
            // certified — a net of less than nothing is not a payment.
            var net = input.GrossAmount - input.RetentionAmount - input.AdvanceRecovery;
            if (input.RetentionAmount < 0m || input.AdvanceRecovery < 0m || net <= 0m)
                return Results.BadRequest(new
                {
                    messageAr = "الاستقطاعات تتجاوز المبلغ الإجمالي — الصافي يجب أن يكون أكبر من صفر.",
                    messageEn = "Deductions exceed the gross amount — the net must be greater than zero.",
                });

            // الشكل 20 step 3 — «كتاب المالية». Its number AND its date, because
            // BR-12 measures the audit route from the date and a letter with no
            // number cannot be found again in the ministry's own registry.
            if (string.IsNullOrWhiteSpace(input.FinanceLetterNo) || input.FinanceLetterDate is null)
                return Results.BadRequest(new
                {
                    messageAr = "كتاب المالية مطلوب برقمه وتاريخه.",
                    messageEn = "The finance letter is required, with its number and date.",
                });

            // الشكل 20 step 4 — «ذرعات الأعمال». The plate's own reasoning:
            // «ربط الدفعة إلزاميًا بكتاب مالية وبذرعات الأعمال يجعل الصرف
            // مستندًا إلى إنجاز موثّق». At least one.
            var files = (input.Attachments ?? [])
                .Where(a => !string.IsNullOrWhiteSpace(a.FileName))
                .ToList();
            if (files.Count == 0)
                return Results.BadRequest(new
                {
                    messageAr = "أرفق ذرعة الأعمال المنجزة — لا تُسجَّل دفعة بلا سند إنجاز.",
                    messageEn = "Attach the measurement sheet — no payment is registered without evidence of work done.",
                });

            // The three expense items the payment is drawn against must add up
            // to it (الشكل 9's own split). Sent by the wizard so the person
            // decides the split, checked here so the sum cannot be wrong.
            var split = input.AwardPortion + input.ReservePortion + input.SupervisionPortion;
            if (Math.Abs(split - net) > 0.01m)
                return Results.BadRequest(new
                {
                    messageAr = "توزيع المبلغ على بنود الكلفة لا يساوي صافي الدفعة.",
                    messageEn = "The split across the expense items does not equal the net amount.",
                });

            // P-79 — NO PAYMENT CODE IS INVENTED. The number is the next
            // sequential one on this contract, which is what «دفعة N» prints;
            // whether the ministry has an official scheme is still open.
            var lastNo = await db.Payments
                .Where(x => x.ContractId == contract.Id)
                .MaxAsync(x => (int?)x.No) ?? 0;

            var payment = new Data.Entities.Payment
            {
                ContractId = contract.Id,
                No = lastNo + 1,
                Kind = string.IsNullOrWhiteSpace(input.Kind) ? "interim" : input.Kind,
                GrossAmount = input.GrossAmount,
                RetentionAmount = input.RetentionAmount,
                AdvanceRecovery = input.AdvanceRecovery,
                NetAmount = net,
                AwardPortion = input.AwardPortion,
                ReservePortion = input.ReservePortion,
                SupervisionPortion = input.SupervisionPortion,
                FinanceLetterNo = input.FinanceLetterNo.Trim(),
                FinanceLetterDate = input.FinanceLetterDate,
                // PENDING, with no certified and no paid date. See above.
                Status = "pending",
                Note = (input.Note ?? "").Trim(),
            };

            db.Payments.Add(payment);
            await db.SaveChangesAsync();

            foreach (var f in files)
                db.PaymentAttachments.Add(new Data.Entities.PaymentAttachment
                {
                    PaymentId = payment.Id,
                    TitleAr = (f.TitleAr ?? "").Trim(),
                    TitleEn = (f.TitleEn ?? "").Trim(),
                    FileName = f.FileName!.Trim(),
                    SizeBytes = f.SizeBytes,
                });

            // الشكل 17's route, opened at its first desk. The caps are D-03's
            // default; `PaymentAuditStage.CapDays` records them per stage
            // precisely so an instruction can change one without a migration.
            var route = new[]
            {
                ("resident-engineer", "دائرة المهندس المقيم", "Resident engineer department"),
                ("finance", "الدائرة المالية", "Finance department"),
                ("audit", "الرقابة المالية", "Financial control"),
                ("disbursement", "الصرف", "Disbursement"),
            };

            var no = 1;
            foreach (var (key, ar, en) in route)
            {
                db.PaymentAuditStages.Add(new Data.Entities.PaymentAuditStage
                {
                    PaymentId = payment.Id,
                    No = no,
                    StageKey = key,
                    PartyAr = ar,
                    PartyEn = en,
                    CapDays = SlaLeadTime.SlaDaysPerStage,
                    // Only the FIRST desk has the file. The rest have not
                    // received it, and a start date on them would make BR-12
                    // measure a wait that has not begun.
                    StartedAt = no == 1 ? input.FinanceLetterDate : null,
                    FinishedAt = null,
                });
                no++;
            }

            await db.SaveChangesAsync();

            // THE IDENTITY COMES BACK, NOT THE MODEL — and this is the one write
            // in the build that does it that way. EP-FIN-01 is a 300-line inline
            // projection over eight tables; extracting it to be re-run here
            // would be a refactor of the read path in service of the write, and
            // the client is a wizard that closes on success and re-reads the
            // page it is standing on. The reason is here so the next person does
            // not read the difference as an oversight.
            return Results.Ok(new PaymentRegisterResult(
                payment.Id, payment.No, payment.ContractId, M(payment.NetAmount)));
        });
    }

    /// <summary>Which payment column carries a given expense item's share (الشكل 9).</summary>
    private static Func<Data.Entities.Payment, decimal> portion(string key) => key switch
    {
        "award" => x => x.AwardPortion,
        "reserve" => x => x.ReservePortion,
        _ => x => x.SupervisionPortion,
    };

    /// <summary>The desk's own name, as الشكل 17 prints it under the stage.</summary>
    private static string LookupParty(
        IReadOnlyList<Data.Entities.PaymentAuditStage> rows, int no, bool ar)
    {
        var r = rows.First(x => x.No == no);
        return ar ? r.PartyAr : r.PartyEn;
    }

    private static decimal M(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
    private static decimal Q(decimal v) => Math.Round(v, 4, MidpointRounding.AwayFromZero);
    private static decimal? R(decimal? v) => v is null ? null : Math.Round(v.Value, 2, MidpointRounding.AwayFromZero);
    private static decimal? Money(decimal? v) => v is null ? null : M(v.Value);
}
