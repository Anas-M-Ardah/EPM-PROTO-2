using Epm.Api.Data;
using Epm.Api.Features.Workspaces;
using Epm.Api.Data.Entities;
using Epm.Api.Domain;
using Epm.Api.Features.Boq;
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
        app.MapGet("/api/projects/{projectId}/financials", async (EpmDb db, HttpContext http, string projectId) =>
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
                var components = new List<FinancialsComponentDto>
                {
                    new("award", "الإحالة", "Award", c.AwardAmount, chg, c.AwardAmount + chg),
                    new("reserve", "الاحتياط", "Reserve", c.ReserveAmount, 0m, c.ReserveAmount),
                    new("supervision", "الإشراف والمراقبة", "Supervision & monitoring",
                        c.SupervisionAmount, 0m, c.SupervisionAmount),
                };

                rows.Add(new FinancialsContractDto(
                    c.Id, c.NameAr, c.NameEn, c.Status,
                    M(c.OriginalValue), M(chg), M(effective.Value),
                    M(disbursed), M(certified), M(retention), M(Math.Max(0m, advanceOut)),
                    M(effective.Value - disbursed),
                    pays.Count,
                    components.Select(x => x with
                    {
                        Original = M(x.Original),
                        Chg = M(x.Chg),
                        Revised = M(x.Revised),
                    }).ToList()));

                // EV's input, from the ONE derivation SCR-W4 and SCR-W6 read.
                var derived = await BoqEndpoints.Derive(db, c.Id, "cost");
                executedTotal += derived.Sum(d => d.Progress.AchievedAmount);
                billedTotal += derived.Sum(d => d.Line.Amount);

                var acts = await db.Activities.AsNoTracking()
                    .Where(a => a.ContractId == c.Id && !a.IsMilestone).ToListAsync();
                plannedBasis += acts.Sum(a => a.BudgetedCost);
                plannedWeighted += acts.Sum(a =>
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
                Q(ProgressReflection.Rollup(revised, disbursedTotal)));

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
                new("allocation",
                    "يتطلب جدول التخصيصات السنوية للوزارة — لا يسجّله هذا النموذج بعد.",
                    "Needs the ministry's yearly allocation table — this data model does not record one."),
                new("sla",
                    "يتطلب تواريخ مراحل تدقيق المستخلص — لا تسجّلها جداول الدفعات بعد.",
                    "Needs the per-stage audit dates of a certificate — the payment tables do not record them."),
            };

            return Results.Ok(new FinancialsResponse(
                p.Id, p.NameAr, p.NameEn, p.DataDate?.ToString("yyyy-MM-dd"),
                totals,
                new FinancialsEvm(
                    M(revised), M(evm.Pv), M(evm.Ev), M(evm.Ac),
                    R(evm.Cpi), R(evm.Spi), Money(evm.Eac), Money(evm.Vac)),
                rows, paymentRows, unavailable));
        });
    }

    private static decimal M(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
    private static decimal Q(decimal v) => Math.Round(v, 4, MidpointRounding.AwayFromZero);
    private static decimal? R(decimal? v) => v is null ? null : Math.Round(v.Value, 2, MidpointRounding.AwayFromZero);
    private static decimal? Money(decimal? v) => v is null ? null : M(v.Value);
}
