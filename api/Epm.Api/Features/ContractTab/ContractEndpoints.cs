using Epm.Api.Data;
using Epm.Api.Features.Workspaces;
using Epm.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.ContractTab;

/// <summary>
/// SCR-W3 — the project workspace Contract module (`04 §7`).
/// PORTED from DModContractNew + DContractAmendments (v1.1),
/// ../epm@design/system-revamp app/project-modules.jsx:363 and
/// app/contract-amendments.jsx:301.
///
/// ── THIS IS WHERE "APPROVED ≠ APPLIED" BECOMES VISIBLE ───────────────────
/// Every other screen shows the consequence of the amendment rules; this one
/// shows the chain itself. Three figures, three meanings, never mixed:
///
///   ORIGINAL    the awarded value. Never overwritten (non-negotiable #6).
///   EFFECTIVE   original + Σ APPLIED deltas (BR-09). What the contract IS.
///   PROJECTION  effective + Σ approved-but-UNAPPLIED deltas (02 §9). What it
///               WOULD be. Its own field, its own line on screen, never inside
///               the effective figure.
///
/// `CNT-0279` is the case that proves it: awarded 240,000,000, one applied
/// amendment takes it to 250,000,000, and a second — approved by the committee
/// in June and still not applied — would take it to 253,000,000. The contract
/// is worth 250,000,000 today. Reporting 253 would be reporting a decision that
/// has not been carried out.
///
/// ── THE PENALTY IS THE MOST CONSEQUENTIAL THING AN AMENDMENT DOES ────────
/// An applied order moves BOTH terms of BR-10: the value (raising the per-day
/// charge and the cap) and the contractual finish (usually cutting the days).
/// `Penalty.Compare` returns before, after and WAIVED — and the waived amount
/// is what the time extension actually bought. A screen showing only the
/// current penalty hides that entirely.
///
/// ── NO ARITHMETIC OF ITS OWN ─────────────────────────────────────────────
/// The chain comes from Domain/Amendments (BR-09), the penalty from
/// Domain/Penalty (BR-10), the value roll-up from Domain/ProjectValue (BR-00).
/// This file filters, joins, sorts, sums stored columns and projects.
/// </summary>
public static class ContractEndpoints
{
    public static void MapContractEndpoints(this WebApplication app)
    {
        // [EP-CON-01] GET /api/projects/{projectId}/contracts
        // web: contract-tab/contract.api.ts register() → contract.page.ts
        // spec: 04 §7 | rules: BR-00, BR-09
        // tables: Projects · Contracts · ContractAmendments · Payments
        app.MapGet("/api/projects/{projectId}/contracts", async (EpmDb db, HttpContext http, string projectId) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(http, p.WorkspaceCode) is { } denied) return denied;

            var contracts = await db.Contracts.AsNoTracking()
                .Where(c => c.ProjectId == projectId).OrderBy(c => c.Id).ToListAsync();

            var ids = contracts.Select(c => c.Id).ToList();

            var amendments = await db.ContractAmendments.AsNoTracking()
                .Where(a => ids.Contains(a.ContractId)).ToListAsync();

            var payments = await db.Payments.AsNoTracking()
                .Where(x => ids.Contains(x.ContractId)).ToListAsync();

            var rows = contracts.Select(c =>
            {
                var deltas = Deltas(amendments, c.Id);
                var original = Original(c);
                var effective = Amendments.Effective(original, deltas);

                return new ContractRow(
                    c.Id, c.NameAr, c.NameEn, c.Status,
                    c.OriginalValue, effective.Value,
                    c.Start.ToString("yyyy-MM-dd"),
                    c.OriginalFinish.ToString("yyyy-MM-dd"),
                    effective.Finish.ToString("yyyy-MM-dd"),
                    deltas.Count(d => d.Applied),
                    deltas.Count(d => !d.Applied),
                    // PAID only. A certified certificate the ministry has not
                    // released money against has not been disbursed, and
                    // counting it would overstate spend on every delayed project
                    // — which is exactly where the figure matters most.
                    payments.Where(x => x.ContractId == c.Id && x.Status == "paid")
                            .Sum(x => x.NetAmount),
                    c.Contractor);
            }).ToList();

            var effectiveTotal = ProjectValue.Total(rows.Select(r => r.EffectiveValue));
            var originalTotal = ProjectValue.Total(rows.Select(r => r.OriginalValue));

            var totals = new ContractRegisterTotals(
                rows.Count,
                originalTotal,
                // Signed. A decrease is a real outcome of a change order and
                // must keep its minus.
                effectiveTotal - originalTotal,
                effectiveTotal,
                effectiveTotal + amendments.Where(a => a.AppliedAt == null).Sum(a => a.DeltaValue),
                rows.Sum(r => r.Addenda),
                rows.Sum(r => r.Pending),
                payments.Where(x => x.Status == "paid").Sum(x => x.NetAmount),
                payments.Where(x => x.Status is "paid" or "certified").Sum(x => x.NetAmount),
                rows.Count == 0 ? null : rows.Min(r => r.Start),
                rows.Count == 0 ? null : rows.Max(r => r.EffectiveFinish));

            var countByStatus = rows
                .GroupBy(r => r.Status)
                .ToDictionary(g => g.Key, g => g.Count());

            return Results.Ok(new ContractRegisterResponse(
                p.Id, p.NameAr, p.NameEn, rows, totals, countByStatus));
        });

        // [EP-CON-02] GET /api/projects/{projectId}/contracts/{contractId}
        // web: contract-tab/contract.api.ts detail() → contract.page.ts
        // spec: 04 §7 | rules: BR-09, BR-10
        // tables: Projects · Contracts · ContractAmendments · Payments
        app.MapGet("/api/projects/{projectId}/contracts/{contractId}",
            async (EpmDb db, HttpContext http, string projectId, string contractId) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(http, p.WorkspaceCode) is { } denied) return denied;

            var c = await db.Contracts.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == contractId);

            // CONTRACT SCOPING, CHECKED HERE WHERE IT CAN BE READ (P-01).
            // A contract belongs to exactly one project (non-negotiable #1), so
            // /projects/A/contracts/<a contract of B> is not a 200 with someone
            // else's money on screen.
            if (c is null || c.ProjectId != projectId)
                return Results.NotFound(new { message = $"contract {contractId} not found in project {projectId}" });

            var amendments = await db.ContractAmendments.AsNoTracking()
                .Where(a => a.ContractId == c.Id).OrderBy(a => a.No).ToListAsync();

            var payments = await db.Payments.AsNoTracking()
                .Where(x => x.ContractId == c.Id).OrderBy(x => x.No).ToListAsync();

            var deltas = Deltas(amendments, c.Id);
            var original = Original(c);
            var effective = Amendments.Effective(original, deltas);
            var projection = Amendments.Projection(effective, deltas);

            var lastAppliedNo = deltas.Where(d => d.Applied).Select(d => d.No).DefaultIfEmpty(0).Max();

            // ── the chain ────────────────────────────────────────────────
            // Row 0 is the original contract and is always `original` (P-16).
            var versions = new List<AmendmentVersion>
            {
                new(0, Amendments.VersionState(0, lastAppliedNo, true, false),
                    null, c.Start.ToString("yyyy-MM-dd"),
                    0m, 0,
                    c.OriginalValue,
                    c.OriginalFinish.ToString("yyyy-MM-dd"),
                    c.OriginalDurationDays,
                    true),
            };

            // Applied rows carry the RUNNING state after each link, recomputed
            // through the rule rather than read from the stored Value column —
            // the column is a convenience, the rule is the answer.
            var running = original;
            foreach (var a in amendments.Where(a => a.AppliedAt != null).OrderBy(a => a.No))
            {
                running = Amendments.Apply(running, a.DeltaValue, a.DeltaDays);
                versions.Add(new AmendmentVersion(
                    a.No,
                    Amendments.VersionState(a.No, lastAppliedNo, true, false),
                    a.SourceChangeOrderId?.ToString(),
                    a.AppliedAt?.ToString("yyyy-MM-dd"),
                    a.DeltaValue, a.DeltaDays,
                    running.Value,
                    running.Finish.ToString("yyyy-MM-dd"),
                    running.Duration,
                    true));
            }

            // Approved-but-unapplied. Each is shown against what the contract
            // WOULD become, applied on top of the effective version — never
            // chained into it.
            var pendingRunning = effective;
            var pending = new List<AmendmentVersion>();
            foreach (var a in amendments.Where(a => a.AppliedAt == null).OrderBy(a => a.No))
            {
                pendingRunning = Amendments.Apply(pendingRunning, a.DeltaValue, a.DeltaDays);
                pending.Add(new AmendmentVersion(
                    a.No,
                    Amendments.VersionState(a.No, lastAppliedNo, false, a.State == "partial"),
                    a.SourceChangeOrderId?.ToString(),
                    null,
                    a.DeltaValue, a.DeltaDays,
                    pendingRunning.Value,
                    pendingRunning.Finish.ToString("yyyy-MM-dd"),
                    pendingRunning.Duration,
                    false));
            }

            // ── the penalty, before and after (BR-10) ────────────────────
            PenaltyImpact penalty;
            if (c.ForecastFinish is null)
            {
                penalty = new PenaltyImpact(0, 0, 0, 0, 0, 0, 0,
                    Penalty.PerDayPct, Penalty.CapPct, true);
            }
            else
            {
                var impact = Penalty.Compare(
                    c.OriginalValue, c.OriginalFinish,
                    effective.Value, effective.Finish,
                    c.ForecastFinish.Value);

                penalty = new PenaltyImpact(
                    impact.Before.Days, impact.Before.Amount, impact.Before.Cap,
                    impact.After.Days, impact.After.Amount, impact.After.Cap,
                    impact.Waived,
                    Penalty.PerDayPct, Penalty.CapPct, false);
            }

            var disbursed = payments.Where(x => x.Status == "paid").Sum(x => x.NetAmount);

            var money = new ContractMoney(
                disbursed,
                payments.Where(x => x.Status is "paid" or "certified").Sum(x => x.NetAmount),
                payments.Sum(x => x.RetentionAmount),
                payments.Sum(x => x.AdvanceRecovery),
                effective.Value - disbursed,
                [
                    // Spent is null on all three: a payment is recorded against
                    // the CONTRACT, not against one of its three expense items,
                    // so splitting disbursement across them would be an
                    // apportionment nobody authorised (P-09).
                    new CostLine("award", c.AwardAmount, null),
                    new CostLine("reserve", c.ReserveAmount, null),
                    new CostLine("supervision", c.SupervisionAmount, null),
                ]);

            var detail = new ContractDetail(
                c.Id, p.Id, p.NameAr, p.NameEn,
                c.NameAr, c.NameEn, c.Status,
                c.Contractor, c.Consultant,
                c.Start.ToString("yyyy-MM-dd"),
                c.OriginalFinish.ToString("yyyy-MM-dd"),
                effective.Finish.ToString("yyyy-MM-dd"),
                c.ForecastFinish?.ToString("yyyy-MM-dd"),
                c.ForecastFinish is null
                    ? null
                    : Penalty.DelayDays(effective.Finish, c.ForecastFinish.Value),
                c.OriginalDurationDays,
                effective.Duration,
                c.OriginalValue, effective.Value, projection.Value,
                c.IncomingNo,
                c.IncomingDate?.ToString("yyyy-MM-dd"));

            var unavailable = new List<ContractUnavailable>
            {
                new("cost-line-spend",
                    "المصروف مسجَّل على العقد لا على بنوده الثلاثة، فلا يمكن توزيعه على الإحالة والاحتياط والإشراف دون قرار توزيع.",
                    "Spend is recorded against the contract, not against its three expense items, so it cannot be split across award, reserve and supervision without an apportionment decision."),
                new("amendment-source",
                    "لم يُبنَ سجل الأوامر التغييرية بعد (المرحلة 5.1)، فلا يمكن ربط الملحق بالأمر الذي أنشأه.",
                    "The change-order register does not exist yet (Phase 5.1), so an amendment cannot yet be linked to the order that created it."),
                new("financial-pct",
                    "لم يحدّد 02 §4 مقام النسبة المالية (القيمة النافذة أم الكلفة الكلية) — تُعرض المبالغ دون نسبة.",
                    "02 §4 does not fix the denominator for financial % (effective value or total contract cost) — the amounts are shown without a percentage."),
            };

            var paymentRows = payments.Select(x => new ContractPayment(
                x.No, x.Kind, x.FinanceLetterNo,
                x.FinanceLetterDate?.ToString("yyyy-MM-dd"),
                x.GrossAmount, x.RetentionAmount, x.AdvanceRecovery, x.NetAmount,
                x.CertifiedDate?.ToString("yyyy-MM-dd"),
                x.PaidDate?.ToString("yyyy-MM-dd"),
                x.Status, x.Note)).ToList();

            return Results.Ok(new ContractDetailResponse(
                detail, money, versions, pending, penalty, paymentRows, unavailable));
        });
    }

    /// <summary>The BR-09 input: one delta per amendment, applied or not.</summary>
    private static List<Amendments.Delta> Deltas(
        IEnumerable<Data.Entities.ContractAmendment> all, string contractId) =>
        all.Where(a => a.ContractId == contractId)
           .OrderBy(a => a.No)
           .Select(a => new Amendments.Delta(a.No, a.DeltaValue, a.DeltaDays, a.AppliedAt != null))
           .ToList();

    private static Amendments.Version Original(Data.Entities.Contract c) =>
        new(0, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays);
}
