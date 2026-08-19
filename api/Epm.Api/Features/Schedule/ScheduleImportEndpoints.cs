using Epm.Api.Data;
using Epm.Api.Data.Entities;
using Epm.Api.Domain;
using Epm.Api.Features.Dev;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Schedule;

/// <summary>
/// المسار 4 · الشكل 24 — «استيراد الجدول الزمني».
///
/// Three endpoints and one rule between them: **an import never replaces
/// anything until somebody approves it.**
///
///   EP-SCD-04  preview   — validate + impact, writes nothing
///   EP-SCD-05  submit    — writes a VERSION and its rows
///   EP-SCD-06  approve   — the only route that touches `Activities`
///
/// ── WHY THE SEPARATION IS SHARPER HERE THAN ON THE BILL ──────────────────
/// `Activities.BaselineStart`/`BaselineFinish` are the datum for every slip,
/// float, planned percentage, SPI and penalty baseline in the system. Replacing
/// them in place would move what «الانزياح» MEANS on SCR-E5, SCR-W5, SCR-W6,
/// SCR-W1 and the contract tab, all at once and with no record. So the file
/// lands in a version table and stays there until a second person accepts it.
///
/// ── WHAT AN APPROVAL DOES AND DOES NOT MOVE ──────────────────────────────
/// It writes the PLAN: id, name, WBS, baseline dates, duration, cost, hours,
/// milestone flag, predecessors. It does NOT touch EXECUTION — progress, actual
/// dates, float, criticality and forecast finish belong to the schedule in
/// force, and an activity that already exists keeps every one of them. A
/// re-import is a re-baseline, not a reset.
/// </summary>
public static class ScheduleImportEndpoints
{
    public static void MapScheduleImportEndpoints(this WebApplication app)
    {
        // [EP-SCD-04] POST /api/projects/{projectId}/schedule/{contractId}/import/preview
        // web: schedule/schedule-import.api.ts preview() → schedule-import.wizard.ts
        // spec: ملحق الشكل 24 · المسار 4 steps 3–4 | rules: ScheduleImport, BR-02
        // tables: Projects · Contracts · Activities (READ ONLY)
        //
        // WRITES NOTHING. Steps 3 and 4 of the wizard — «التحقق» and «تحليل
        // الأثر» — are questions, and asking one must not change the schedule.
        app.MapPost("/api/projects/{projectId}/schedule/{contractId}/import/preview", async (
            EpmDb db, HttpContext http, string projectId, string contractId,
            ScheduleImportPreviewRequest input) =>
        {
            var gate = await Gate(db, http, projectId, contractId);
            if (gate.Refusal is { } refusal) return refusal;

            if (!ScheduleImport.IsKnownFormat(input.Format))
                return Results.BadRequest(new
                {
                    messageAr = "صيغة غير مدعومة — المدعوم: Primavera XER · P6 XML · Excel.",
                    messageEn = "Unsupported format — supported: Primavera XER · P6 XML · Excel.",
                });

            if (!ScheduleImport.IsKnownBasis(input.Basis))
                return Results.BadRequest(new
                {
                    messageAr = "أساس الوزن غير معروف — الكلفة المدرجة أو ساعات العمل المدرجة.",
                    messageEn = "Unknown weight basis — budgeted cost or budgeted man-hours.",
                });

            var rows = Candidates(input.Rows);
            var violations = ScheduleImport.Validate(rows, input.Basis!);
            var impact = ScheduleImport.Compare(rows, await Current(db, contractId));

            var manHoursComplete = rows.Where(r => !r.IsMilestone)
                .All(r => (r.BudgetedManHours ?? 0m) > 0m);

            return Results.Ok(new ScheduleImportPreviewResponse(
                contractId, input.Format!, input.Basis!,
                rows.Count,
                M(rows.Sum(r => r.BudgetedCost)),
                M(rows.Sum(r => r.BudgetedManHours ?? 0m)),
                manHoursComplete,
                violations.Select(v => new ScheduleImportViolationDto(
                    v.Row, v.Field, v.MessageAr, v.MessageEn)).ToList(),
                ImpactDto(impact),
                // THE SERVER'S ANSWER. A client that forgot to check its own
                // violations still cannot submit a broken file (P-01).
                violations.Count == 0));
        });

        // [EP-SCD-05] POST /api/projects/{projectId}/schedule/{contractId}/import/versions
        // web: schedule/schedule-import.api.ts submit() → schedule-import.wizard.ts
        // spec: ملحق الشكل 24 · المسار 4 step 5 | rules: ScheduleImport
        // tables: ScheduleImportVersions · ScheduleImportVersionItems (WRITTEN)
        //
        // «تأكيد وتقديم». It writes a VERSION and NOT `Activities` — see the
        // class comment. The validation runs again here rather than trusting
        // the preview: two calls, and the schedule can move between them.
        app.MapPost("/api/projects/{projectId}/schedule/{contractId}/import/versions", async (
            EpmDb db, HttpContext http, string projectId, string contractId,
            ScheduleImportPreviewRequest input) =>
        {
            var gate = await Gate(db, http, projectId, contractId);
            if (gate.Refusal is { } refusal) return refusal;

            if (!ScheduleImport.IsKnownFormat(input.Format) || !ScheduleImport.IsKnownBasis(input.Basis))
                return Results.BadRequest(new
                {
                    messageAr = "الصيغة أو أساس الوزن غير مقبول.",
                    messageEn = "The format or the weight basis is not accepted.",
                });

            var rows = Candidates(input.Rows);
            var violations = ScheduleImport.Validate(rows, input.Basis!);
            if (violations.Count > 0)
                return Results.BadRequest(new
                {
                    messageAr = "الملف لم يجتز التحقق — صحّح المخالفات ثم أعد التقديم.",
                    messageEn = "The file did not pass validation — fix the violations and submit again.",
                    violations = violations.Select(v => new ScheduleImportViolationDto(
                        v.Row, v.Field, v.MessageAr, v.MessageEn)).ToList(),
                });

            var impact = ScheduleImport.Compare(rows, await Current(db, contractId));

            var lastNo = await db.ScheduleImportVersions
                .Where(v => v.ContractId == contractId)
                .MaxAsync(v => (int?)v.No) ?? 0;

            var version = new ScheduleImportVersion
            {
                ContractId = contractId,
                No = lastNo + 1,
                State = "submitted",
                Format = input.Format!,
                Basis = input.Basis!,
                ActorId = gate.User.Id,
                ActorName = gate.User.NameAr,
                ActorRole = gate.User.RoleAr,
                ActorParty = gate.User.Party,
                At = gate.AsOf,
                FileName = (input.FileName ?? "").Trim(),
                FileSizeBytes = input.FileSizeBytes,
                ActivityCount = rows.Count,
                TotalCost = rows.Sum(r => r.BudgetedCost),
                FinishBefore = impact.FinishBefore,
                FinishAfter = impact.FinishAfter,
                ContractFinishDelta = impact.ContractFinishDelta,
                Added = impact.Added,
                Removed = impact.Removed,
                Moved = impact.Moved,
            };

            db.ScheduleImportVersions.Add(version);
            await db.SaveChangesAsync();

            foreach (var r in rows)
                db.ScheduleImportVersionItems.Add(new ScheduleImportVersionItem
                {
                    VersionId = version.Id,
                    ActivityId = r.ActivityId,
                    Name = r.Name,
                    WbsPath = r.WbsPath,
                    WbsNames = r.WbsNames,
                    BaselineStart = r.BaselineStart,
                    BaselineFinish = r.BaselineFinish,
                    Duration = r.Duration,
                    BudgetedCost = r.BudgetedCost,
                    // BOTH bases are stored whatever this version chose, so it
                    // can be re-read on the other one later (02 §2).
                    BudgetedManHours = r.BudgetedManHours,
                    IsMilestone = r.IsMilestone,
                    Predecessors = r.Predecessors,
                });

            await db.SaveChangesAsync();

            return Results.Ok(await Versions(db, contractId));
        });

        // [EP-SCD-06] POST …/import/versions/{no}/approve
        // web: schedule/schedule-import.api.ts approve() → schedule.page.ts
        // spec: ملحق الشكل 24 · المسار 4 | rules: ScheduleImport
        // tables: Activities (WRITTEN) · ScheduleImportVersions (WRITTEN)
        //
        // THE ONLY ROUTE THAT MOVES A BASELINE, and the only one with a capacity
        // of its own. Same separation `EP-BOQ-13` keeps: whoever submitted the
        // programme does not get to accept it.
        app.MapPost("/api/projects/{projectId}/schedule/{contractId}/import/versions/{no:int}/approve", async (
            EpmDb db, HttpContext http, string projectId, string contractId, int no) =>
        {
            var gate = await Gate(db, http, projectId, contractId);
            if (gate.Refusal is { } refusal) return refusal;

            if (!gate.User.CanApproveBoqImport())
                return Results.Json(new
                {
                    messageAr = "اعتماد إصدار الجدول الزمني من صلاحيات دائرة المهندس المقيم أو مدير المشروع — خط الأساس هو ما يُقاس عليه الانزياح والغرامة.",
                    messageEn = "Approving a schedule version is the resident-engineer department’s or the project manager’s permission — the baseline is what slip and penalty are measured against.",
                }, statusCode: StatusCodes.Status403Forbidden);

            var version = await db.ScheduleImportVersions
                .FirstOrDefaultAsync(v => v.ContractId == contractId && v.No == no);
            if (version is null)
                return Results.NotFound(new
                {
                    message = $"الإصدار رقم {no} غير موجود في العقد «{contractId}».",
                });

            // ONLY A SUBMITTED VERSION CAN BE APPROVED. Re-approving would
            // re-baseline against a schedule that has since moved.
            if (version.State != "submitted")
                return Results.Conflict(new
                {
                    messageAr = $"الإصدار رقم {no} ليس قيد الاعتماد.",
                    messageEn = $"Version {no} is not awaiting approval.",
                });

            // THE SUBMITTER MAY NOT APPROVE THEIR OWN. The capacity check above
            // is about the ROLE; this is about the person, and both are needed —
            // a resident engineer submitting and then approving would make the
            // second signature a formality.
            if (version.ActorId == gate.User.Id)
                return Results.Json(new
                {
                    messageAr = "لا يعتمد الإصدار من قدّمه.",
                    messageEn = "The person who submitted a version may not approve it.",
                }, statusCode: StatusCodes.Status403Forbidden);

            var items = await db.ScheduleImportVersionItems.AsNoTracking()
                .Where(i => i.VersionId == version.Id).ToListAsync();

            var existing = await db.Activities
                .Where(a => a.ContractId == contractId).ToListAsync();
            var byId = existing.ToDictionary(a => a.ActivityId, StringComparer.OrdinalIgnoreCase);

            foreach (var i in items)
            {
                if (!byId.TryGetValue(i.ActivityId, out var a))
                {
                    a = new Activity { ContractId = contractId, ActivityId = i.ActivityId };
                    db.Activities.Add(a);
                }

                // ── THE PLAN, and only the plan ──────────────────────────
                a.NameAr = i.Name;
                a.NameEn = i.Name;
                a.WbsPath = i.WbsPath;
                a.WbsNames = i.WbsNames;
                a.BaselineStart = i.BaselineStart;
                a.BaselineFinish = i.BaselineFinish;
                a.OriginalDuration = i.Duration;
                a.BudgetedCost = i.BudgetedCost;
                a.BudgetedManHours = i.BudgetedManHours;
                a.IsMilestone = i.IsMilestone;
                a.Predecessors = i.Predecessors;

                // ── EXECUTION IS NOT TOUCHED ─────────────────────────────
                // Progress, actual dates, float, criticality and the forecast
                // finish belong to the schedule in force. A re-baseline is not
                // a reset, and an activity 82% built stays 82% built.
                //
                // A NEW activity is the one exception, and only because it has
                // no execution yet: it starts not-started, with its forecast on
                // its baseline finish, which is what «لم يبدأ» means.
                if (a.Id == 0)
                {
                    a.Status = "notstarted";
                    a.ProgressPct = 0m;
                    a.ForecastFinish = i.BaselineFinish;
                    a.RemainingDuration = i.IsMilestone ? 0 : i.Duration;
                    a.Calendar = i.IsMilestone ? "—" : "6 أيام/أسبوع";
                }
            }

            // AN ACTIVITY THE FILE OMITS IS NOT DELETED. It carries BOQ links,
            // progress and earned value, and dropping it would take them with
            // it silently. `Domain/ScheduleImport.Compare` counts and NAMES it
            // so the person sees it before approving; removing it is a decision
            // that needs its own screen, and there is none.
            var superseded = await db.ScheduleImportVersions
                .Where(v => v.ContractId == contractId && v.State == "approved")
                .ToListAsync();
            foreach (var s in superseded) s.State = "superseded";

            version.State = "approved";
            version.ApproverId = gate.User.Id;
            version.ApproverName = gate.User.NameAr;
            version.ApproverRole = gate.User.RoleAr;
            version.ApproverParty = gate.User.Party;
            version.ApprovedAt = gate.AsOf;

            await db.SaveChangesAsync();

            return Results.Ok(await Versions(db, contractId));
        });

        // [EP-SCD-07] GET /api/projects/{projectId}/schedule/{contractId}/import/versions
        // web: schedule/schedule-import.api.ts versions() → schedule.page.ts
        // spec: ملحق الشكل 24 | rules: — | tables: ScheduleImportVersions
        app.MapGet("/api/projects/{projectId}/schedule/{contractId}/import/versions", async (
            EpmDb db, HttpContext http, string projectId, string contractId) =>
        {
            var gate = await Gate(db, http, projectId, contractId);
            return gate.Refusal ?? Results.Ok(await Versions(db, contractId));
        });
    }

    // ── the scope check, once ────────────────────────────────────────────

    private record GateResult(IResult? Refusal, Persona User, DateOnly AsOf);

    private static async Task<GateResult> Gate(
        EpmDb db, HttpContext http, string projectId, string contractId)
    {
        var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
        if (p is null)
            return new(Results.NotFound(new { message = $"project {projectId} not found" }), null!, default);

        if (WorkspaceScope.Deny(http, p.WorkspaceCode) is { } denied)
            return new(denied, null!, default);

        var c = await db.Contracts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == contractId);
        if (c is null || c.ProjectId != projectId)
            return new(Results.NotFound(new
            {
                message = $"contract {contractId} not found in project {projectId}",
            }), null!, default);

        // D-06 — "now" is the project data date, never the wall clock.
        return new(null, WorkspaceScope.User(http),
            p.DataDate ?? DateOnly.FromDateTime(DateTime.UtcNow));
    }

    // ── projection helpers ───────────────────────────────────────────────

    private static List<ScheduleImport.Candidate> Candidates(IReadOnlyList<ScheduleImportRow>? rows) =>
        (rows ?? [])
        .Select(r => new ScheduleImport.Candidate(
            r.Row,
            (r.ActivityId ?? "").Trim(),
            (r.Name ?? "").Trim(),
            (r.WbsPath ?? "").Trim(),
            (r.WbsNames ?? "").Trim(),
            Date(r.BaselineStart),
            Date(r.BaselineFinish),
            r.BudgetedCost,
            r.BudgetedManHours,
            r.IsMilestone,
            (r.Predecessors ?? "").Trim()))
        .ToList();

    /// <summary>The schedule IN FORCE, as the impact compares against it.</summary>
    private static async Task<List<ScheduleImport.Existing>> Current(EpmDb db, string contractId) =>
        await db.Activities.AsNoTracking()
            .Where(a => a.ContractId == contractId)
            .Select(a => new ScheduleImport.Existing(a.ActivityId, a.NameAr, a.BaselineFinish))
            .ToListAsync();

    private static ScheduleImportImpactDto ImpactDto(ScheduleImport.Impact i) => new(
        i.Added, i.Removed, i.Moved, i.Unchanged,
        Iso(i.FinishBefore), Iso(i.FinishAfter), i.ContractFinishDelta,
        i.Changes.Select(c => new ScheduleImportChangeDto(
            c.ActivityId, c.Name, c.Kind, Iso(c.BeforeFinish), Iso(c.AfterFinish), c.SlipDays)).ToList());

    private static async Task<List<ScheduleImportVersionDto>> Versions(EpmDb db, string contractId) =>
        (await db.ScheduleImportVersions.AsNoTracking()
            .Where(v => v.ContractId == contractId)
            .OrderByDescending(v => v.No)
            .ToListAsync())
        .Select(v => new ScheduleImportVersionDto(
            v.Id, v.No, v.State, v.Format, v.Basis, v.FileName, v.FileSizeBytes,
            v.ActivityCount, M(v.TotalCost),
            Iso(v.FinishBefore), Iso(v.FinishAfter), v.ContractFinishDelta,
            v.Added, v.Removed, v.Moved,
            v.At.ToString("yyyy-MM-dd"), v.ActorName, v.ActorParty,
            v.ApprovedAt?.ToString("yyyy-MM-dd"), v.ApproverName, v.ApproverParty))
        .ToList();

    private static DateOnly? Date(string? iso) =>
        DateOnly.TryParse(iso, out var d) ? d : null;

    private static string? Iso(DateOnly? d) => d?.ToString("yyyy-MM-dd");

    private static decimal M(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
}
