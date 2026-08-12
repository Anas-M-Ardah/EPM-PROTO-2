using Epm.Api.Data;
using Epm.Api.Features.Dev;
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
        // المسار 2's writes, kept in their own method so the two reads below
        // stay readable as the screen they serve.
        MapContractWrites(app);

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

    // ─────────────────────────────────────────────────────────────────────
    // المسار 2 — إنشاء العقود وربطها بالمشروع
    //
    // «البداية: صدور الإحالة · النهاية: عقد نافذ جاهز لاستقبال حساب الكميات
    // والجدول الزمني والدفعات».
    //
    // Creation lives HERE, project-scoped, because المسار 2 validates «انتماء
    // العقد إلى مشروع واحد» and الشكل 6 puts «زر إضافة عقد» on «مساحة المشروع ›
    // العقود». The project is to a contract what the workspace is to a project.
    //
    // ── NO APPROVAL STEP ─────────────────────────────────────────────────
    // المسار 2 step 6 is «اعتماد العقد». Omitted, by the same client decision
    // that removed «اعتماد المشروع» from المسار 1: a contract is saved and is
    // live at once. Step 7 — «احتساب قيمة المشروع من مجموع قيم عقوده» — then
    // runs off contracts nobody approved. The arithmetic is untouched (BR-00);
    // what feeds it is not.
    // ─────────────────────────────────────────────────────────────────────
    private static void MapContractWrites(WebApplication app)
    {
        // [EP-CON-03] POST /api/projects/{projectId}/contracts
        // web: contract.api.ts create() → contract-form.page.ts | spec: المسار 2 steps 1-5
        // rules: BR-15, المسار 2 step 5 | tables: Contracts, ContractActivityEvents (WRITTEN)
        app.MapPost("/api/projects/{projectId}/contracts", async (
            EpmDb db, HttpContext ctx, string projectId, ContractDefinitionInput input) =>
        {
            var gate = await Gate(db, ctx, projectId);
            if (gate.Refusal is { } refusal) return refusal;

            var c = new Data.Entities.Contract { ProjectId = projectId };
            Apply(c, input);

            // «عدم تكرار رقم العقد داخل التشكيل» — the entity's codes, not the
            // project's and not the ministry's. Resolved by joining contracts
            // to the projects of this workspace, because a contract has no
            // workspace column of its own; the project it hangs off carries it.
            var codes = await CodesInEntity(db, gate.WorkspaceCode, excluding: null);

            var violations = ContractDefinition.Validate(Candidate(c), codes);
            if (violations.Count > 0) return Unprocessable(violations, create: true);

            Derive(c);
            db.Contracts.Add(c);
            db.ContractActivityEvents.Add(Event(c.Id, "created", gate.User, gate.Today));
            await db.SaveChangesAsync();

            return Results.Created(
                $"/api/projects/{projectId}/contracts/{c.Id}/definition", new { c.Id });
        });

        // [EP-CON-04] PUT /api/projects/{projectId}/contracts/{contractId}
        // web: contract.api.ts save() → contract-form.page.ts | spec: المسار 2 step 2-4
        // rules: BR-15, المسار 2 step 5 | tables: Contracts, ContractActivityEvents (WRITTEN)
        app.MapPut("/api/projects/{projectId}/contracts/{contractId}", async (
            EpmDb db, HttpContext ctx, string projectId, string contractId,
            ContractDefinitionInput input) =>
        {
            var gate = await Gate(db, ctx, projectId);
            if (gate.Refusal is { } refusal) return refusal;

            var c = await db.Contracts.FirstOrDefaultAsync(
                x => x.Id == contractId && x.ProjectId == projectId);
            if (c is null) return Results.NotFound(new { message = $"العقد «{contractId}» غير موجود." });

            // THE AWARDED FIGURES ARE NOT EDITABLE HERE. `OriginalValue`,
            // `OriginalFinish` and `OriginalDurationDays` are never overwritten
            // (non-negotiable #6) — an amendment moves them, and it does so by
            // layering a delta that both figures stay readable through. Apply()
            // deliberately does not touch them on an existing record.
            Apply(c, input, existing: true);

            var codes = await CodesInEntity(db, gate.WorkspaceCode, excluding: c.Id);

            var violations = ContractDefinition.Validate(Candidate(c), codes);
            if (violations.Count > 0) return Unprocessable(violations, create: false);

            db.ContractActivityEvents.Add(Event(c.Id, "updated", gate.User, gate.Today));
            await db.SaveChangesAsync();

            return Results.Ok(new { c.Id });
        });

        // [EP-CON-05] GET /api/projects/{projectId}/contracts/{contractId}/definition
        // web: contract.api.ts definition() → contract-form.page.ts | spec: الشكل 8
        // rules: BR-15 | tables: Contracts, Projects, ContractActivityEvents
        app.MapGet("/api/projects/{projectId}/contracts/{contractId}/definition", async (
            EpmDb db, HttpContext ctx, string projectId, string contractId) =>
        {
            var gate = await Gate(db, ctx, projectId, mustDefine: false);
            if (gate.Refusal is { } refusal) return refusal;

            var c = await db.Contracts.AsNoTracking().FirstOrDefaultAsync(
                x => x.Id == contractId && x.ProjectId == projectId);
            if (c is null) return Results.NotFound(new { message = $"العقد «{contractId}» غير موجود." });

            var events = await db.ContractActivityEvents.AsNoTracking()
                .Where(e => e.ContractId == contractId)
                .OrderByDescending(e => e.Id)
                .Select(e => new ContractEvent(
                    e.Id, e.Action, e.ActorName, e.ActorRole, e.ActorParty,
                    e.At.ToString("yyyy-MM-dd")))
                .ToListAsync();

            return Results.Ok(new ContractDefinitionResponse(
                projectId, gate.Project!.NameAr, gate.Project!.NameEn,
                Read(c), events,
                new ContractPermissions(Edit: gate.User.CanDefineProjects())));
        });
    }

    // ── المسار 2 helpers ─────────────────────────────────────────────────

    /// <summary>
    /// What every contract write checks before it does anything: the project
    /// exists, BR-15 allows this capacity into its workspace, and §23 allows
    /// this capacity to enter data at all. Returns the refusal or the context.
    /// </summary>
    private record WriteGate(
        IResult? Refusal, Data.Entities.Project? Project, string WorkspaceCode,
        Persona User, DateOnly Today);

    private static async Task<WriteGate> Gate(
        EpmDb db, HttpContext ctx, string projectId, bool mustDefine = true)
    {
        var user = WorkspaceScope.User(ctx);

        if (mustDefine && !user.CanDefineProjects())
            return new(Results.Json(new
            {
                messageAr = "إدخال العقود من صلاحيات المستخدم المختص في الجهة.",
                messageEn = "Entering contracts is a university specialist permission.",
            }, statusCode: StatusCodes.Status403Forbidden), null, "", user, default);

        var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
        if (p is null)
            return new(Results.NotFound(new { message = $"المشروع «{projectId}» غير موجود." }),
                null, "", user, default);

        // BR-15 against the PROJECT's workspace — a contract inherits its scope
        // from the project it belongs to, and has no workspace column of its own.
        if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied)
            return new(denied, null, "", user, default);

        return new(null, p, p.WorkspaceCode, user,
            p.DataDate ?? DateOnly.FromDateTime(DateTime.UtcNow));
    }

    /// <summary>
    /// «داخل التشكيل» — every contract code already used by any project of this
    /// workspace. Two flat queries and an in-memory filter, like every other
    /// relationship in this codebase.
    /// </summary>
    private static async Task<List<string>> CodesInEntity(
        EpmDb db, string workspaceCode, string? excluding)
    {
        var projectIds = await db.Projects.AsNoTracking()
            .Where(p => p.WorkspaceCode == workspaceCode)
            .Select(p => p.Id)
            .ToListAsync();

        return await db.Contracts.AsNoTracking()
            .Where(c => projectIds.Contains(c.ProjectId) && (excluding == null || c.Id != excluding))
            .Select(c => c.Id)
            .ToListAsync();
    }

    private static IResult Unprocessable(
        IReadOnlyList<ContractDefinition.Violation> violations, bool create) =>
        Results.UnprocessableEntity(new
        {
            messageAr = create
                ? "لا يمكن حفظ العقد قبل استكمال التحقق."
                : "لا يمكن حفظ التعديل قبل استكمال التحقق.",
            messageEn = create
                ? "The contract cannot be saved until validation passes."
                : "The change cannot be saved until validation passes.",
            violations = violations
                .Select(x => new ContractViolation(x.Field, x.MessageAr, x.MessageEn))
                .ToList(),
        });

    private static void Apply(
        Data.Entities.Contract c, ContractDefinitionInput d, bool existing = false)
    {
        string S(string? v) => (v ?? "").Trim();
        DateOnly? D(string? v) => DateOnly.TryParse(v, out var x) ? x : null;

        if (!existing) c.Id = S(d.Id);
        c.NameAr = S(d.NameAr);
        c.NameEn = S(d.NameEn);
        c.Component = S(d.Component);
        if (!string.IsNullOrWhiteSpace(d.Status)) c.Status = S(d.Status);

        c.AwardAmount = d.AwardAmount ?? 0m;
        c.ReserveAmount = d.ReserveAmount ?? 0m;
        c.SupervisionAmount = d.SupervisionAmount ?? 0m;
        c.MonitoringAmount = d.MonitoringAmount ?? 0m;

        if (D(d.Start) is { } start) c.Start = start;

        c.Contractor = S(d.Contractor);
        c.ExecutingParty = S(d.ExecutingParty);
        c.Consultant = S(d.Consultant);
        c.ContactInfo = S(d.ContactInfo);
        c.IncomingNo = S(d.IncomingNo);
        c.IncomingDate = D(d.IncomingDate);

        // ORIGINALS ONLY ON CREATE (non-negotiable #6). On an existing contract
        // the finish and the value are what was awarded, and only an amendment
        // moves them.
        if (!existing)
        {
            if (D(d.Finish) is { } finish) c.OriginalFinish = finish;
            c.OriginalValue = d.AwardAmount ?? 0m;
        }
    }

    /// <summary>The one derived column, computed after validation has passed.</summary>
    private static void Derive(Data.Entities.Contract c) =>
        c.OriginalDurationDays = ContractDefinition.DurationDays(c.Start, c.OriginalFinish);

    private static ContractDefinition.Candidate Candidate(Data.Entities.Contract c) => new(
        c.Id, c.ProjectId, c.NameAr, c.Component, c.Status,
        c.Start == default ? null : c.Start,
        c.OriginalFinish == default ? null : c.OriginalFinish,
        c.AwardAmount, c.ReserveAmount, c.SupervisionAmount, c.MonitoringAmount,
        c.Contractor);

    private static ContractDefinitionInput Read(Data.Entities.Contract c) => new(
        c.Id, c.NameAr, c.NameEn, c.Component, c.Status,
        c.AwardAmount, c.ReserveAmount, c.SupervisionAmount, c.MonitoringAmount,
        c.Start == default ? null : c.Start.ToString("yyyy-MM-dd"),
        c.OriginalFinish == default ? null : c.OriginalFinish.ToString("yyyy-MM-dd"),
        c.Contractor, c.ExecutingParty, c.Consultant, c.ContactInfo,
        c.IncomingNo, c.IncomingDate?.ToString("yyyy-MM-dd"));

    private static Data.Entities.ContractActivityEvent Event(
        string contractId, string action, Persona user, DateOnly at) => new()
    {
        ContractId = contractId,
        Action = action,
        ActorId = user.Id,
        ActorName = user.NameAr,
        ActorRole = user.RoleAr,
        ActorParty = user.Party,
        At = at,
    };

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
