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
/// ── TWO BASES, AND الشكل 14 USES BOTH ────────────────────────────────────
/// The header equation runs on the RECORDED BUDGET — الشكل 18's pair, stored
/// on the project — while the table below it totals CONTRACTUAL COMMITMENTS,
/// Σ of the contracts' effective values. On the plate those are 1,500,000,000
/// and 2,156,653,454, and «أساسا القياس» exists to set them against each other.
/// Everything that divides by «الكلفة المعدلة» — نسبة الصرف, الإنجاز المالي,
/// EAC and VAC — divides by the budget, which is §23-1's own definition and
/// what settles P-44. `Domain/BudgetBasis` holds it, and falls back to
/// commitments (naming the fallback) on a project with no budget recorded.
///
/// ── FOUR ENDPOINTS, AND ONLY THREE OF THEM WRITE ─────────────────────────
/// `EP-FIN-01` reads the whole module. `EP-FIN-02` registers a certificate
/// (المسار 8 steps 1–4). `EP-FIN-03` releases a desk, which is steps 5–9 and
/// the only path from `pending` to `certified` to `paid`. `EP-FIN-04` is
/// الشكل 18's «مدخل التحرير الوحيد للبيانات المالية للمشروع».
///
/// ── NO ARITHMETIC OF ITS OWN ─────────────────────────────────────────────
/// Effective values are Domain/Amendments (BR-09), the project total
/// Domain/ProjectValue (BR-00), the indices Domain/EarnedValue (BR-11), the
/// budget basis Domain/BudgetBasis, the certificate figures and §15-2's two
/// ceilings Domain/PaymentCertificate, the audit route and its state machine
/// Domain/AuditRoute, the physical % behind EV the SAME BoqEndpoints.Derive
/// SCR-W4 and SCR-W6 read (P-54), and the planned figure Domain/PlannedProgress
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

                // PAID ONLY, on all four, and the rule lives in the domain that
                // states it with the plates' figures beside it (P-26). Retention
                // is withheld FROM a payment and an advance is recovered BY one,
                // so a certificate that has been certified and not yet paid has
                // withheld nothing and recovered nothing. `CNT-0279`'s third
                // certificate is exactly that case.
                var payLines = pays.Select(x => new PaymentCertificate.Line(
                    x.Kind, x.Status, x.NetAmount, x.RetentionAmount, x.AdvanceRecovery, x.PaidDate?.Year)).ToList();

                var disbursed = PaymentCertificate.Disbursed(payLines);
                var certified = PaymentCertificate.CertifiedUnpaid(payLines);
                var retention = PaymentCertificate.RetentionHeld(payLines);
                var advanceOut = PaymentCertificate.AdvanceOutstanding(payLines);

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
                // PLANNED % on this contract's own activities. SPI is not what
                // الشكل 14 asks for, but EarnedValue.For takes it and only the
                // cost side is read here.
                var plannedFrac = contractActs.Sum(a => a.BudgetedCost) > 0m
                    ? contractActs.Sum(a => a.BudgetedCost
                          * PlannedProgress.PlannedPct(a.BaselineStart, a.BaselineFinish, asOf) / 100m)
                      / contractActs.Sum(a => a.BudgetedCost)
                    : 0m;

                // The ACTUAL fraction is the contract's, and every component
                // shares it — a component has no physical progress of its own
                // to measure, which is exactly what P-90 recorded. What it does
                // have is its own budget and its own spend, and those are the
                // only two inputs BR-11 needs once the percentage is known.
                var actualFrac = billed > 0m ? ProgressReflection.Rollup(billed, executed) / 100m : 0m;

                var evmC = EarnedValue.For(effective.Value, plannedFrac, actualFrac, disbursed);

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
                    M(disbursed), M(certified), M(retention), M(advanceOut),
                    M(effective.Value - disbursed),
                    pays.Count,
                    M(spentYear), forecast, variance,
                    components.Select(x =>
                    {
                        // Per ITEM, from the portions الشكل 9 records on each
                        // payment — the same three keys the contract card splits.
                        var itemSpent = M(pays.Where(y => y.Status == "paid").Sum(portion(x.Key)));

                        // «عند الإنجاز» AND «الفرق», PER COMPONENT — P-90 closed.
                        // The SAME `Domain/EarnedValue` call the contract row
                        // makes, given this component's own budget and its own
                        // cost: EAC = budget ÷ CPI reduces to spend ÷ actual%,
                        // so a component forecasts on the rate its own money is
                        // going out at. VAC is «الفرق» — the domain already
                        // returns budget − EAC and nothing recomputes it here.
                        //
                        // Null on a component that has spent nothing, exactly as
                        // the contract row is null then (P-09): a line with no
                        // cost yet is not forecast to cost nothing.
                        var evmX = EarnedValue.For(x.Revised, plannedFrac, actualFrac, itemSpent);

                        return x with
                        {
                            Original = M(x.Original),
                            Chg = M(x.Chg),
                            Revised = M(x.Revised),
                            SpentYear = M(spentIn(portion(x.Key))),
                            SpentToDate = itemSpent,
                            Forecast = evmX.Eac is null ? null : M(evmX.Eac.Value),
                            Variance = evmX.Vac is null ? null : M(evmX.Vac.Value),
                        };
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

            // ── WHICH FIGURE «الكلفة المعدلة» NAMES ──────────────────────
            // الشكل 14 runs its header equation on the RECORDED budget and
            // totals its table on the CONTRACT COMMITMENTS — two bases on one
            // plate, which is what «أساسا القياس» exists to explain. The rows
            // above are commitments; everything below divides by the budget.
            //
            // §23-1 settles P-44 in the client's own words: الإنجاز المالي is
            // «المصروف التراكمي نسبةً إلى الكلفة المعدلة». One derivation, and
            // SCR-W1 and SCR-W6 call the same function (P-54).
            var basis = BudgetBasis.For(p.PlannedCost, p.RevisedCost, revised);

            var evm = EarnedValue.For(basis.Revised, planned / 100m, physical / 100m, disbursedTotal);

            // The paid-only rules, from the domain that states them and the
            // tests that hold them to the plates (P-26).
            var lines = payments.Select(x => new PaymentCertificate.Line(
                x.Kind, x.Status, x.NetAmount, x.RetentionAmount, x.AdvanceRecovery, x.PaidDate?.Year)).ToList();

            var totals = new FinancialsTotals(
                M(approved), M(revised - approved), M(pendingChanges), M(revised),
                M(disbursedTotal), M(certifiedTotal),
                M(PaymentCertificate.RetentionHeld(lines)),
                M(PaymentCertificate.AdvanceOutstanding(lines)),
                M(BudgetBasis.Balance(basis, disbursedTotal)),
                BudgetBasis.SpendPct(basis, disbursedTotal) is { } pct ? Q(pct) : null,
                M(basis.Approved), M(basis.Changes), M(basis.Revised), basis.Source,
                M(rows.Sum(r => r.SpentYear)),
                M(revised),
                BudgetBasis.Gap(basis, revised) is { } gap ? M(gap) : null);

            var paymentRows = payments.Select(x =>
            {
                var c = contracts.First(y => y.Id == x.ContractId);
                return new FinancialsPaymentDto(
                    x.Id, x.ContractId, c.NameAr, c.NameEn, x.No, x.Kind, x.Status,
                    x.FinanceLetterNo, x.FinanceLetterDate?.ToString("yyyy-MM-dd"),
                    M(x.GrossAmount), M(x.RetentionAmount), M(x.AdvanceRecovery), M(x.NetAmount),
                    x.CertifiedDate?.ToString("yyyy-MM-dd"), x.PaidDate?.ToString("yyyy-MM-dd"),
                    x.RecordedByName, x.RecordedByRole, x.RecordedByParty,
                    x.Note);
            }).ToList();

            // ── الشكل 17 — مهل التدقيق ─────────────────────────────────
            // «السلفة الجارية» — the transaction whose delay this screen exists
            // to locate. It is the certificate WITH AN OPEN DESK: a paid one has
            // no lead time left to watch, and one that never entered the route
            // has no desk to be stuck at.
            //
            // Certified first, most recently certified before that (P-99), and
            // a still-pending certificate only when nothing is certified —
            // ordering by what the ministry owes rather than by what it filed.
            var stageIndex = await db.PaymentAuditStages.AsNoTracking()
                .Where(x => payments.Select(y => y.Id).Contains(x.PaymentId))
                .OrderBy(x => x.No)
                .ToListAsync();

            var inFlight = payments
                .Where(x => x.Status != "paid"
                            && AuditRoute.CurrentDesk(Route(stageIndex, x.Id), asOf) is not null)
                .OrderByDescending(x => x.Status == "certified")
                .ThenByDescending(x => x.CertifiedDate)
                .ThenByDescending(x => x.FinanceLetterDate)
                .FirstOrDefault();

            FinancialsAuditSlaDto? auditSla = null;

            if (inFlight is not null)
            {
                var stageRows = stageIndex.Where(x => x.PaymentId == inFlight.Id).OrderBy(x => x.No).ToList();
                var states = AuditRoute.States(Route(stageRows, inFlight.Id), asOf);

                var stages = stageRows.Zip(states, (x, s) => new FinancialsAuditStageDto(
                    x.No, x.StageKey, x.PartyAr, x.PartyEn, x.CapDays,
                    x.StartedAt?.ToString("yyyy-MM-dd"),
                    x.FinishedAt?.ToString("yyyy-MM-dd"),
                    s.ElapsedDays, s.Status,
                    // Whether THIS viewer may let the file go. The endpoint
                    // checks it again — this only decides whether a button is
                    // drawn, and what is drawn instead is the reason (P-96).
                    s.Status is AuditRoute.Current or AuditRoute.Overdue
                        && WorkspaceScope.User(http).CanReleaseAuditDesk(x.StageKey))).ToList();

                var current = states.FirstOrDefault(x => x.Status is AuditRoute.Current or AuditRoute.Overdue);
                var c0 = contracts.First(y => y.Id == inFlight.ContractId);

                auditSla = new FinancialsAuditSlaDto(
                    inFlight.Id,
                    c0.Id, c0.NameAr, c0.NameEn, inFlight.No, inFlight.Status, inFlight.FinanceLetterNo,
                    AuditRoute.Overall(Route(stageRows, inFlight.Id), asOf),
                    // مسار 8 step 6 — «تصعيد تلقائي إلى المستوى الإداري الأعلى»,
                    // derived from an overdue desk and never recorded, so the
                    // banner and the desk cannot disagree.
                    AuditRoute.Escalated(Route(stageRows, inFlight.Id), asOf),
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
                    }).ToList(),
                    // «سجّلتها محللة موازنة في قسم الحسابات». Read off the
                    // letter's FIRST certificate: one letter is registered as
                    // one act, so its rows carry one recorder, and taking the
                    // first states that rather than picking arbitrarily among
                    // several. Empty on a letter seeded before the column
                    // existed, and the panel then says nothing rather than
                    // naming somebody.
                    g.First().RecordedByName,
                    g.First().RecordedByRole,
                    g.First().RecordedByParty))
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

            // ── الشكل 18 — «البيانات المالية المسجّلة» ────────────────────
            // Gathered, never recomputed: each figure is the one جدول الكلف and
            // التخصيص السنوي already print, so the three screens cannot disagree
            // about a number they all call by the same name.
            var currentYear = year ?? allocRows.FirstOrDefault()?.Year;
            var currentAlloc = allocRows.FirstOrDefault(x => x.Year == currentYear);

            var lockedYear = currentAlloc is not null
                             && (currentAlloc.Closed || currentAlloc.Year < asOf.Year)
                             && p.TransferState != "approved";

            var records = new FinancialsRecordsDto(
                // The RECORDED pair, which is what this tab edits. الشكل 14's
                // strip reads the same two figures, so the card and the
                // equation cannot disagree about a number they both name.
                p.PlannedCost is null ? null : M(p.PlannedCost.Value),
                p.RevisedCost is null ? null : M(p.RevisedCost.Value),
                currentAlloc is null ? null : M(currentAlloc.Amount),
                currentAlloc is null ? null : totals.SpentYear,
                totals.Disbursed,
                totals.RetentionHeld,
                p.TransferState,
                // «نسبة الإنجاز المخطط» — P-53's curve, via the domain, so this
                // card and الشكل 4 read the same figure.
                basis.Revised > 0m ? Q(ProgressReflection.Rollup(basis.Revised, evm.Pv)) : null,
                ["retentionHeld", "transferState", "plannedProgressPct"],
                currentYear,
                // What the edit form may touch. The other four figures are
                // derived — spend is Σ payments (P-92), retention is paid-only
                // (P-26), planned % is P-53's curve — and a control the save
                // would ignore is worse than no control.
                ["approvedCost", "revisedCost", "annualAllocation", "transferState"],
                WorkspaceScope.User(http).CanEditFinancialRecords(),
                lockedYear);

            // ── الشكل 19 — «سجل التغييرات المالية» ────────────────────────
            // Built from what is STORED, newest first. Only an APPLIED amendment
            // and a RELEASED certificate moved money; a pending one is a
            // projection and never enters a log of what happened (02 §9).
            var changes = new List<FinancialsChangeDto>();

            foreach (var x in payments.Where(x => x.Status is "paid" or "certified"))
            {
                var at = x.PaidDate ?? x.CertifiedDate ?? x.FinanceLetterDate;
                if (at is null) continue;
                var c = contracts.First(y => y.Id == x.ContractId);
                changes.Add(new FinancialsChangeDto(
                    "payment",
                    x.FinanceLetterNo.Length > 0 ? x.FinanceLetterNo : $"#{x.No}",
                    at.Value.ToString("yyyy-MM-dd"),
                    $"دفعة مسجّلة — {c.NameAr}", $"Payment recorded — {c.NameEn}",
                    M(x.NetAmount), null, null,
                    // «سجّلتها محللة موازنة في قسم الحسابات» — recorded on the
                    // payment by EP-FIN-02, copied not joined.
                    x.RecordedByName, x.RecordedByRole, x.RecordedByParty));
            }

            foreach (var x in amendments.Where(x => x.AppliedAt != null))
            {
                var c = contracts.First(y => y.Id == x.ContractId);
                changes.Add(new FinancialsChangeDto(
                    "amendment", $"{c.Id} · {x.No}",
                    DateOnly.FromDateTime(x.AppliedAt!.Value).ToString("yyyy-MM-dd"),
                    $"ملحق معتمد ومطبَّق — {c.NameAr}", $"Amendment applied — {c.NameEn}",
                    M(x.DeltaValue),
                    // The only true before/after pair on this screen: an
                    // amendment stores the value it moved FROM and TO.
                    M(x.Value - x.DeltaValue), M(x.Value),
                    "", "", ""));
            }

            // The one kind that DOES carry «بصاحب الإجراء وصفته وجهته», because
            // ProjectAllocation records all three on the row.
            foreach (var x in allocRows.Where(x => x.At != default))
            {
                changes.Add(new FinancialsChangeDto(
                    "allocation", x.Year.ToString(),
                    x.At.ToString("yyyy-MM-dd"),
                    $"تخصيص سنة {x.Year}", $"Allocation for {x.Year}",
                    M(x.Amount), null, null,
                    x.ActorName, x.ActorRole, x.ActorParty));
            }

            // The FOURTH kind — «تعديل كلفة أو تخصيص». The only one that could
            // not be derived from a record that already existed, because
            // nothing kept the value a figure held before it was edited. It is
            // also the kind that carries a real before → after pair (P-179).
            var edits = await db.FinancialEdits.AsNoTracking()
                .Where(x => x.ProjectId == projectId)
                .OrderBy(x => x.Id)
                .ToListAsync();

            foreach (var x in edits)
            {
                // Money renders as money and a lookup code renders as a label,
                // so the pair travels in whichever of the two shapes fits. The
                // field decides, not the value's spelling.
                var numeric = x.Field != "transferState";

                changes.Add(new FinancialsChangeDto(
                    "record",
                    x.Year is null ? x.Field : $"{x.Field} · {x.Year}",
                    x.At.ToString("yyyy-MM-dd"),
                    RecordLabel(x.Field, ar: true), RecordLabel(x.Field, ar: false),
                    null,
                    numeric ? Parse(x.BeforeValue) : null,
                    numeric ? Parse(x.AfterValue) : null,
                    x.ActorName, x.ActorRole, x.ActorParty,
                    numeric ? null : x.BeforeValue,
                    numeric ? null : x.AfterValue));
            }

            var changeRows = changes
                .Where(x => year is null || x.At.StartsWith(year.ToString()!))
                .OrderByDescending(x => x.At).ThenBy(x => x.Kind)
                .ToList();

            return Results.Ok(new FinancialsResponse(
                p.Id, p.NameAr, p.NameEn, p.DataDate?.ToString("yyyy-MM-dd"),
                totals,
                rows, paymentRows, allocations, letters, auditSla, years, year,
                records, changeRows));
        });

        // [EP-FIN-02] POST /api/projects/{projectId}/financials/payments
        // web: financials/financials.api.ts registerPayment() → payment.wizard.ts
        // spec: ملحق الشكل 20 · المسار 8 steps 1–4 | rules: BR-12, D-03
        // tables: Payments · PaymentAttachments · PaymentAuditStages (WRITTEN)
        //
        // THE WRITE THIS SCREEN DID NOT HAVE (P-96, closed). `financials.api.ts`
        // used to carry a comment saying a certificate is raised against works
        // measured on site and that the wizard which does it was not built.
        // الشكل 20 is that wizard, and this is what it posts to.
        //
        // ── IT REGISTERS A CERTIFICATE, IT DOES NOT PAY ONE ──────────────────
        // The row lands `pending` with no `CertifiedDate` and no `PaidDate`, and
        // the audit route is created with its first desk open. Certifying and
        // disbursing are المسار 8 steps 5–9, and they belong to the DESKS —
        // `EP-FIN-03` is where they happen. P-26's rule holds: nothing this
        // endpoint writes moves المصروف.
        //
        // ── STEP 4's CEILINGS ARE CHECKED HERE ──────────────────────────────
        // «تحقق: الصرف ≤ التخصيص والتراكمي ≤ الكلفة المعدلة». A projection at
        // this point — no money has moved — but the place to refuse an amount
        // is before it enters a route four desks long. `EP-FIN-03` checks the
        // same rule again at the disbursement desk, where the money does move.
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

            // ── §15-2 · مسار 8 step 4 ───────────────────────────────────
            // «الصرف السنوي لا يتجاوز التخصيص السنوي، والمصروف التراكمي لا
            // يتجاوز الكلفة المعدلة». Measured on the PROJECT, not the
            // contract: an allocation is released to a project and the revised
            // cost is the project's budget.
            if (await Ceilings(db, p, net) is { } breach)
                return Results.UnprocessableEntity(BreachMessage(breach));

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
                // «سجّلتها …» — الشكل 16 names the person on the payment panel
                // and الشكل 19 names them again in the timeline. Copied, not
                // joined: a persona list can change and the record may not.
                RecordedByName = user.NameAr,
                RecordedByRole = user.RoleAr,
                RecordedByParty = user.Party,
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

            // الشكل 17's route, opened at its first desk — and it is
            // `Domain/AuditRoute.Shape`, the same three desks the fixture seeds
            // and the same caps the plate draws. This endpoint used to build a
            // four-desk route at D-03's uniform five days, so a certificate
            // registered here got a different route than every seeded one.
            var no = 1;
            foreach (var desk in AuditRoute.Shape)
            {
                db.PaymentAuditStages.Add(new Data.Entities.PaymentAuditStage
                {
                    PaymentId = payment.Id,
                    No = no,
                    StageKey = desk.Key,
                    PartyAr = desk.PartyAr,
                    PartyEn = desk.PartyEn,
                    CapDays = desk.CapDays,
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

        // [EP-FIN-03] POST /api/projects/{projectId}/financials/payments/{paymentId}/release
        // web: financials/financials.api.ts releaseDesk() → financials.page.ts
        // spec: ملحق الشكل 17 · المسار 8 steps 5–9 | rules: BR-12, D-03, D-06
        // tables: Payments · PaymentAuditStages *(written)*
        //
        // ── ONE ENDPOINT, NOT THREE ─────────────────────────────────────────
        // The desk that holds the file releases it. Whether that ADVANCES the
        // route, CERTIFIES the certificate or DISBURSES it is
        // `Domain/AuditRoute.Release`'s answer, not the caller's — which is
        // what keeps `Payment.Status` from ever disagreeing with the desks
        // beneath it. Three verbs would let a client certify a certificate
        // sitting at the disbursement desk.
        //
        // ── TWO GATES, BOTH OF WHICH MUST PASS ──────────────────────────────
        // The CAPACITY gate is here: `CanReleaseAuditDesk` matches the persona's
        // party against the desk's, so the resident engineer cannot release the
        // finance desk and the finance directorate cannot release the resident
        // engineer's. The ROUTE gate is in the domain: only the desk actually
        // holding the file may let it go. The screen hides the buttons, which
        // is courtesy; these are the rule.
        app.MapPost("/api/projects/{projectId}/financials/payments/{paymentId:int}/release", async (
            EpmDb db, HttpContext http, string projectId, int paymentId, PaymentReleaseInput input) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(http, p.WorkspaceCode) is { } denied) return denied;

            var asOf = p.DataDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var user = WorkspaceScope.User(http);

            var payment = await db.Payments.FirstOrDefaultAsync(x => x.Id == paymentId);
            if (payment is null)
                return Results.NotFound(new { message = $"payment {paymentId} not found" });

            // The certificate must belong to a contract of THIS project — the
            // same scope check `EP-PRG-02` makes, and for the same reason.
            var contract = await db.Contracts.AsNoTracking()
                .FirstOrDefaultAsync(c => c.Id == payment.ContractId && c.ProjectId == projectId);
            if (contract is null)
                return Results.NotFound(new { message = $"payment {paymentId} not found in project {projectId}" });

            var stageRows = await db.PaymentAuditStages
                .Where(x => x.PaymentId == payment.Id).OrderBy(x => x.No).ToListAsync();

            var desk = stageRows.FirstOrDefault(x => x.No == input.StageNo);
            if (desk is null)
                return Results.NotFound(new { message = $"stage {input.StageNo} is not on this route" });

            if (!user.CanReleaseAuditDesk(desk.StageKey))
                return Results.Json(new
                {
                    messageAr = $"إطلاق المعاملة من مرحلة «{desk.PartyAr}» يخصّ تلك الجهة وحدها.",
                    messageEn = $"Only {desk.PartyEn} may release this stage.",
                }, statusCode: 403);

            var transition = AuditRoute.Release(
                Route(stageRows, payment.Id), input.StageNo, asOf,
                wasCertified: payment.Status == PaymentCertificate.Certified);

            if (transition is null)
                return Results.UnprocessableEntity(new
                {
                    messageAr = "هذه المرحلة لا تحمل المعاملة الآن — لا يمكن إطلاقها.",
                    messageEn = "This desk is not holding the file, so it cannot release it.",
                });

            // ── §15-2, AGAIN, AND THIS TIME IT IS NOT A PROJECTION ──────────
            // Registration checked the ceilings against the figures as they
            // stood then. Months of route later the allocation may have been
            // consumed by another certificate or the revised cost lowered by
            // الشكل 18, and THIS is the moment the money moves.
            if (transition.Disbursed && await Ceilings(db, p, payment.NetAmount) is { } breach)
                return Results.UnprocessableEntity(BreachMessage(breach));

            desk.FinishedAt = asOf;

            if (transition.Opened is { } nextNo)
                stageRows.First(x => x.No == nextNo).StartedAt = asOf;

            payment.Status = transition.Status;
            if (transition.Certified) payment.CertifiedDate = asOf;
            if (transition.Disbursed) payment.PaidDate = asOf;

            if (!string.IsNullOrWhiteSpace(input.Note))
                payment.Note = input.Note.Trim();

            await db.SaveChangesAsync();

            // The identity and what changed, not the model — the same reason
            // `EP-FIN-02` gives, and the page re-reads on success.
            return Results.Ok(new PaymentReleaseResult(
                payment.Id, payment.No, payment.ContractId,
                payment.Status, transition.Certified, transition.Disbursed,
                transition.Opened is null ? null : stageRows.First(x => x.No == transition.Opened).StageKey));
        });

        // [EP-FIN-04] PUT /api/projects/{projectId}/financials/records
        // web: financials/financials.api.ts saveRecords() → financials.page.ts
        // spec: ملحق الشكل 18 · العرض الفني §7 · §15-1 | rules: BR-00, P-92, P-179
        // tables: Projects · ProjectAllocations · FinancialEdits *(written)*
        //
        // ── «مدخل التحرير الوحيد للبيانات المالية للمشروع» ──────────────────
        // الشكل 18 says it of itself, and it is the reason this endpoint takes
        // four fields and not eight: the card prints eight figures and only
        // four are STORED. المصروف السنوي and المصروف التراكمي are Σ payments
        // by `PaidDate` (P-92), مبلغ الأمانات is paid-only retention (P-26) and
        // نسبة الإنجاز المخطط is P-53's curve. Accepting a value for any of them
        // would let a typed number contradict the ledger it is derived from.
        //
        // ── ONE PARTY (§7) ──────────────────────────────────────────────────
        // «الدائرة المالية | … وتحرير البيانات المالية المسجّلة». The card is
        // badged «قيم معتمدة من الدائرة المالية» — a value another party could
        // change would not be that. المستخدم المختص records the planned cost at
        // definition (المسار 1); revising the budget afterwards is a different
        // act on the same column.
        //
        // ── EVERY CHANGED FIELD LEAVES ITS PREVIOUS VALUE BEHIND ────────────
        // One `FinancialEdits` row per moved field. That is what makes الشكل 19's
        // fourth event kind possible at all, and it is non-negotiable #6: an
        // original value is never overwritten, it becomes the record.
        app.MapPut("/api/projects/{projectId}/financials/records", async (
            EpmDb db, HttpContext http, string projectId, FinancialRecordsInput input) =>
        {
            var p = await db.Projects.FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(http, p.WorkspaceCode) is { } denied) return denied;

            var asOf = p.DataDate ?? DateOnly.FromDateTime(DateTime.UtcNow);
            var user = WorkspaceScope.User(http);

            if (!user.CanEditFinancialRecords())
                return Results.Json(new
                {
                    messageAr = "تحرير البيانات المالية المسجّلة يخصّ الدائرة المالية.",
                    messageEn = "Editing the recorded financial data belongs to the finance department.",
                }, statusCode: 403);

            var payments = await db.Payments.AsNoTracking()
                .Where(x => db.Contracts.Where(c => c.ProjectId == projectId).Select(c => c.Id)
                    .Contains(x.ContractId))
                .ToListAsync();

            var lines = payments.Select(x => new PaymentCertificate.Line(
                x.Kind, x.Status, x.NetAmount, x.RetentionAmount, x.AdvanceRecovery, x.PaidDate?.Year)).ToList();

            var spentToDate = PaymentCertificate.Disbursed(lines);

            // ── THE CEILINGS, READ BACKWARDS ────────────────────────────────
            // §15-2 forbids spend above the budget; lowering the budget under
            // spend already made says the same thing from the other side, and
            // it is the easier mistake because nothing on the screen is moving.
            if (input.RevisedCost?.Value is { } newRevised && newRevised < spentToDate)
                return Results.UnprocessableEntity(new
                {
                    messageAr = $"الكلفة المعدلة لا يمكن أن تقل عن المصروف التراكمي {spentToDate:N0} د.ع.",
                    messageEn = $"The revised cost cannot be below the cumulative spend of {spentToDate:N0} IQD.",
                    field = "revisedCost",
                });

            var changed = new List<string>();

            void Log(string field, int? year, string before, string after)
            {
                db.FinancialEdits.Add(new FinancialEdit
                {
                    ProjectId = projectId,
                    Field = field,
                    Year = year,
                    BeforeValue = before,
                    AfterValue = after,
                    ActorId = user.Id,
                    ActorName = user.NameAr,
                    ActorRole = user.RoleAr,
                    ActorParty = user.Party,
                    At = asOf,
                });
                changed.Add(field);
            }

            static string Str(decimal? v) => v is null ? "" : v.Value.ToString("0.##");

            if (input.ApprovedCost is { } approved && approved.Value != p.PlannedCost)
            {
                Log("approvedCost", null, Str(p.PlannedCost), Str(approved.Value));
                p.PlannedCost = approved.Value;
            }

            if (input.RevisedCost is { } revisedIn && revisedIn.Value != p.RevisedCost)
            {
                Log("revisedCost", null, Str(p.RevisedCost), Str(revisedIn.Value));
                p.RevisedCost = revisedIn.Value;
            }

            if (input.TransferState is { } transfer && (transfer.Value ?? "") != (p.TransferState ?? ""))
            {
                Log("transferState", null, p.TransferState ?? "", transfer.Value ?? "");
                p.TransferState = string.IsNullOrWhiteSpace(transfer.Value) ? null : transfer.Value;
            }

            if (input.AnnualAllocation is { } allocIn)
            {
                if (input.Year is not { } yr)
                    return Results.BadRequest(new
                    {
                        messageAr = "التخصيص السنوي يحتاج سنته المالية.",
                        messageEn = "An annual allocation needs the fiscal year it belongs to.",
                        field = "annualAllocation",
                    });

                var row = await db.ProjectAllocations
                    .FirstOrDefaultAsync(x => x.ProjectId == projectId && x.Year == yr);

                // «السنوات السابقة سجل مقفل لا يُغيَّر إلا بإجراء مناقلة معتمد»
                // (الشكل 15). The transfer state — read AFTER the patch above,
                // so approving one and reopening a year is a single save.
                var locked = (row?.Closed == true || yr < asOf.Year) && p.TransferState != "approved";
                if (locked)
                    return Results.UnprocessableEntity(new
                    {
                        messageAr = $"تخصيص سنة {yr} سجلّ مقفل — يُغيَّر بإجراء مناقلة معتمد لا بالتحرير المباشر.",
                        messageEn = $"The {yr} allocation is a closed record — it moves by an approved transfer, not by editing.",
                        field = "annualAllocation",
                    });

                var spentThatYear = PaymentCertificate.SpentIn(lines, yr);
                if (allocIn.Value is { } amount && amount < spentThatYear)
                    return Results.UnprocessableEntity(new
                    {
                        messageAr = $"تخصيص سنة {yr} لا يمكن أن يقل عن مصروفها {spentThatYear:N0} د.ع.",
                        messageEn = $"The {yr} allocation cannot be below its spend of {spentThatYear:N0} IQD.",
                        field = "annualAllocation",
                    });

                if (row is null && allocIn.Value is { } opening)
                {
                    Log("annualAllocation", yr, "", Str(opening));
                    db.ProjectAllocations.Add(new ProjectAllocation
                    {
                        ProjectId = projectId,
                        Year = yr,
                        Amount = opening,
                        ActorName = user.NameAr,
                        ActorRole = user.RoleAr,
                        ActorParty = user.Party,
                        At = asOf,
                    });
                }
                else if (row is not null && allocIn.Value is { } moved && moved != row.Amount)
                {
                    Log("annualAllocation", yr, Str(row.Amount), Str(moved));
                    row.Amount = moved;
                    row.ActorName = user.NameAr;
                    row.ActorRole = user.RoleAr;
                    row.ActorParty = user.Party;
                    row.At = asOf;
                }
            }

            // ── EVERY YEAR BEFORE THIS ONE IS NOW A CLOSED RECORD ───────────
            // `ProjectAllocation.Closed` was a column nothing wrote. The rule
            // الشكل 15 states is a rule about time, so the save that touches
            // the ledger is the moment to write it down.
            foreach (var old in await db.ProjectAllocations
                         .Where(x => x.ProjectId == projectId && x.Year < asOf.Year && !x.Closed)
                         .ToListAsync())
                old.Closed = true;

            await db.SaveChangesAsync();

            return Results.Ok(new FinancialRecordsResult(projectId, changed));
        });
    }

    /// <summary>
    /// One certificate's audit route in the shape `Domain/AuditRoute` reads —
    /// the entity's columns, and nothing of EF.
    /// </summary>
    private static List<AuditRoute.Stage> Route(
        IReadOnlyList<Data.Entities.PaymentAuditStage> rows, int paymentId) =>
        rows.Where(x => x.PaymentId == paymentId)
            .OrderBy(x => x.No)
            .Select(x => new AuditRoute.Stage(x.No, x.StageKey, x.StartedAt, x.FinishedAt, x.CapDays))
            .ToList();

    /// <summary>
    /// §15-2's two ceilings for a project, against a proposed amount. Both
    /// figures are the project's: an allocation is released to a project and
    /// the revised cost is the project's budget, so a certificate on either
    /// contract is measured against the same pair.
    /// </summary>
    private static async Task<PaymentCertificate.Breach?> Ceilings(
        EpmDb db, Data.Entities.Project p, decimal amount)
    {
        var asOf = p.DataDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

        var ids = await db.Contracts.AsNoTracking()
            .Where(c => c.ProjectId == p.Id).Select(c => c.Id).ToListAsync();

        // Materialised BEFORE the projection: a certificate that has not been
        // paid has no year, and `PaidDate.Value.Year` in a SQL projection is a
        // null read into an `int`.
        var lines = (await db.Payments.AsNoTracking()
                .Where(x => ids.Contains(x.ContractId))
                .ToListAsync())
            .Select(x => new PaymentCertificate.Line(
                x.Kind, x.Status, x.NetAmount, x.RetentionAmount, x.AdvanceRecovery, x.PaidDate?.Year))
            .ToList();

        var alloc = await db.ProjectAllocations.AsNoTracking()
            .Where(x => x.ProjectId == p.Id && x.Year == asOf.Year)
            .Select(x => (decimal?)x.Amount)
            .FirstOrDefaultAsync();

        return PaymentCertificate.Ceilings(
            amount,
            PaymentCertificate.SpentIn(lines, asOf.Year), alloc,
            PaymentCertificate.Disbursed(lines), p.RevisedCost);
    }

    /// <summary>
    /// The 422 a breached ceiling produces. Names WHICH ceiling and BY HOW
    /// MUCH — «تجاوز» with no figure is a refusal the person cannot act on.
    /// </summary>
    private static object BreachMessage(PaymentCertificate.Breach b) => b.Key == "allocation"
        ? new
        {
            messageAr = $"الصرف السنوي يتجاوز التخصيص — {b.Would:N0} مقابل تخصيص {b.Ceiling:N0} د.ع، بزيادة {b.Excess:N0}.",
            messageEn = $"Annual spend would exceed the allocation — {b.Would:N0} against {b.Ceiling:N0} IQD, over by {b.Excess:N0}.",
            field = "grossAmount",
            ceiling = b.Key,
        }
        : new
        {
            messageAr = $"المصروف التراكمي يتجاوز الكلفة المعدلة — {b.Would:N0} مقابل {b.Ceiling:N0} د.ع، بزيادة {b.Excess:N0}.",
            messageEn = $"Cumulative spend would exceed the revised cost — {b.Would:N0} against {b.Ceiling:N0} IQD, over by {b.Excess:N0}.",
            field = "grossAmount",
            ceiling = b.Key,
        };

    /// <summary>
    /// What الشكل 19 calls a recorded edit. The four keys `EP-FIN-04` writes,
    /// named here rather than in `lang.ts` because the log's row is built
    /// server-side and the client renders what it is given.
    /// </summary>
    private static string RecordLabel(string field, bool ar) => field switch
    {
        "approvedCost" => ar ? "تعديل الكلفة المقررة" : "Approved cost revised",
        "revisedCost" => ar ? "تعديل الكلفة المعدلة" : "Revised cost changed",
        "annualAllocation" => ar ? "تعديل التخصيص السنوي" : "Annual allocation changed",
        "transferState" => ar ? "تعديل حالة المناقلة" : "Transfer state changed",
        _ => field,
    };

    /// <summary>An empty stored value is UNSET, which is not zero (P-09).</summary>
    private static decimal? Parse(string v)
        => decimal.TryParse(v, System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture, out var d) ? M(d) : null;

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
