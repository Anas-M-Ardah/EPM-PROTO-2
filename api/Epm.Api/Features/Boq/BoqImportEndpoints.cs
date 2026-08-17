using Epm.Api.Data;
using Epm.Api.Domain;
using Epm.Api.Features.Dev;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Boq;

/// <summary>
/// المسار 3 · الشكل 13 — «استيراد حساب الكميات من ملف Excel عبر معالج متدرّج
/// ينتهي بتقديم النسخة للاعتماد بوصفها إصدارًا جديدًا لا استبدالًا للقائم».
///
/// The wizard's five steps are one question asked twice: «is this file
/// acceptable, and what would it do?» (preview) and «record it» (submit).
/// Reading the file is the client's — a spreadsheet is not business data until
/// its columns are mapped, and المسار 3 makes «مطابقة الأعمدة» a user step.
///
/// ── SUBMITTING IS INERT; APPROVING IS NOT ────────────────────────────────
/// EP-BOQ-09 and EP-BOQ-10 do not write `BoqItems`: a submitted version is a
/// proposal, which is what «يُقدَّم للاعتماد ولا يُستبدل الجدول السابق» requires.
/// EP-BOQ-13 is المسار 3 steps 7–8 — the approval that makes the sheet the
/// contract's live bill. Even there, no previous VERSION is deleted; the header
/// and rows of every submission stay in `BoqImportVersions`/`Items` for good,
/// and it is the live lines that are replaced.
///
/// Step 8's «تحديث أوزان البنود» is not a write. BR-01 derives weights from the
/// lines at projection time (01 §3), so replacing the lines updates the weights
/// by construction.
/// </summary>
public static class BoqImportEndpoints
{
    public static void MapBoqImportEndpoints(this WebApplication app)
    {
        // [EP-BOQ-09] POST /api/projects/{projectId}/boq/{contractId}/import/preview
        // web: boq/boq-import.api.ts preview() → boq-import.wizard.ts
        // spec: المسار 3 steps 4-5 · ملحق الشكل 13 | rules: BR-01, Domain/BoqImport
        // tables: Projects · Contracts · BoqItems (READ ONLY)
        app.MapPost("/api/projects/{projectId}/boq/{contractId}/import/preview", async (
            EpmDb db, HttpContext ctx, string projectId, string contractId,
            BoqImportPreviewRequest input) =>
        {
            var gate = await Gate(db, ctx, projectId, contractId);
            if (gate.Refusal is { } refusal) return refusal;

            var rows = Candidates(input.Rows);

            // المسار 3 step 5 — «صحة الكميات والأسعار ومجموع الأوزان 100.00%».
            var violations = BoqImport.Validate(rows);

            // step 4 — «مقارنته بالإصدار القائم». The CURRENT bill, read as the
            // register holds it: amounts derived, never stored (CLAUDE.md §3.5).
            // Read through the SAME BoqEndpoints.Derive the register renders,
            // never off the raw columns: a re-priced line (BR-05) has an
            // effective quantity and a blended rate, so comparing a file
            // against the contracted figures would report a change on every
            // banded item that nobody made (P-54).
            var derived = await BoqEndpoints.Derive(db, contractId, "cost");
            var current = derived
                .Select(d => new BoqImport.Existing(
                    d.Item.Code, d.Item.DescriptionAr, d.Line.Qty, d.Line.Rate, d.Line.Amount))
                .ToList();

            var cmp = BoqImport.Compare(current, rows);

            // BR-01 over what the file WOULD become. Shown rather than claimed:
            // the wizard prints the sum, and it is 100.00 by largest remainder
            // (D-07) whenever the bill totals more than zero.
            var weights = BoqWeights.ForContract(rows.Select(r => r.Amount).ToList());

            return Results.Ok(new BoqImportPreviewResponse(
                violations
                    .Select(x => new BoqImportViolation(x.Row, x.Field, x.MessageAr, x.MessageEn))
                    .ToList(),
                Dto(cmp),
                weights,
                weights.Sum(),
                // The gate the button reads. Resolved here so a client that
                // forgets to check cannot submit what this refuses.
                CanSubmit: violations.Count == 0));
        });

        // [EP-BOQ-10] POST /api/projects/{projectId}/boq/{contractId}/import/submit
        // web: boq/boq-import.api.ts submit() → boq-import.wizard.ts
        // spec: المسار 3 step 6 · ملحق الشكل 13 | rules: Domain/BoqImport
        // tables: BoqImportVersions · BoqImportVersionItems (WRITTEN) · BoqItems (READ)
        app.MapPost("/api/projects/{projectId}/boq/{contractId}/import/submit", async (
            EpmDb db, HttpContext ctx, string projectId, string contractId,
            BoqImportSubmitRequest input) =>
        {
            var gate = await Gate(db, ctx, projectId, contractId);
            if (gate.Refusal is { } refusal) return refusal;

            var rows = Candidates(input.Rows);

            // VALIDATED AGAIN, SERVER-SIDE. The preview is a courtesy to the
            // wizard; this is the check that counts, and it is the same rule
            // called the same way — a second implementation is how the two
            // answers drift apart.
            var violations = BoqImport.Validate(rows);
            if (violations.Count > 0)
                return Results.UnprocessableEntity(new
                {
                    messageAr = "لا يمكن تقديم النسخة قبل معالجة الملاحظات.",
                    messageEn = "The version cannot be submitted until the findings are resolved.",
                    violations = violations
                        .Select(x => new BoqImportViolation(x.Row, x.Field, x.MessageAr, x.MessageEn))
                        .ToList(),
                });

            // The same model the preview compared against, for the same reason.
            var previous = (await BoqEndpoints.Derive(db, contractId, "cost"))
                .Sum(d => d.Line.Amount);

            // Per contract, 1-based. `Max + 1` over this contract's rows: the
            // number is the version's NAME on screen, so it counts what this
            // contract has seen and not what the database has.
            var no = (await db.BoqImportVersions.AsNoTracking()
                .Where(v => v.ContractId == contractId)
                .MaxAsync(v => (int?)v.No) ?? 0) + 1;

            var version = new Data.Entities.BoqImportVersion
            {
                ContractId = contractId,
                No = no,
                State = "submitted",
                SheetType = string.IsNullOrWhiteSpace(input.SheetType) ? "replace" : input.SheetType,
                FileName = input.FileName ?? "",
                FileSizeBytes = input.FileSizeBytes,
                ItemCount = rows.Count,
                TotalAmount = rows.Sum(r => r.Amount),
                PreviousAmount = previous,
                ActorId = gate.User.Id,
                ActorName = gate.User.NameAr,
                ActorRole = gate.User.RoleAr,
                ActorParty = gate.User.Party,
                At = gate.Today,
            };

            db.BoqImportVersions.Add(version);
            await db.SaveChangesAsync();          // the id the items hang off

            db.BoqImportVersionItems.AddRange(rows.Select(r => new Data.Entities.BoqImportVersionItem
            {
                VersionId = version.Id,
                Code = r.Code.Trim(),
                Description = r.Description.Trim(),
                Division = r.Division.Trim(),
                Unit = r.Unit.Trim(),
                Qty = r.Qty,
                Rate = r.Rate,
                // STORED, not derived — this is a record of what was submitted,
                // and re-deriving it later would restate a signed document.
                Amount = r.Amount,
            }));
            await db.SaveChangesAsync();

            return Results.Ok(Dto(version));
        });

        // [EP-BOQ-13] POST /api/projects/{projectId}/boq/{contractId}/import/versions/{no}/approve
        // web: not wired yet — API only
        // spec: المسار 3 steps 7–8 «اعتماد الإصدار الجديد» · «حفظ الإصدار وتحديث
        //       أوزان البنود وقيمة العقد المرجعية» | rules: BR-01, D-14
        // tables: BoqImportVersions · BoqItems · SupplyItemDetails (WRITTEN)
        //
        // ── THIS IS THE STEP THAT MOVES A VERSION INTO THE BILL ──────────
        // Submission (EP-BOQ-10) is inert by construction; approval is where the
        // register changes. The previous version is NOT deleted — its header and
        // its rows stay in BoqImportVersions/Items, which is what «لا يُمحى
        // إصدار سابق» means. What IS replaced is the LIVE bill: the approved
        // sheet becomes the contract's lines.
        //
        // Weights are not written anywhere. BR-01 derives them from the lines at
        // projection time (01 §3), so step 8's «تحديث أوزان البنود» happens by
        // the lines changing — storing a weight would be the second answer that
        // later disagrees with the first.
        app.MapPost("/api/projects/{projectId}/boq/{contractId}/import/versions/{no:int}/approve", async (
            EpmDb db, HttpContext ctx, string projectId, string contractId, int no) =>
        {
            // `mustDefine: false` — this route's capacity is the APPROVER's, not
            // the submitter's, and it is checked immediately below.
            var gate = await Gate(db, ctx, projectId, contractId, mustDefine: false);
            if (gate.Refusal is { } refusal) return refusal;

            // المسار 3 step 7 — separation of duties. The specialist who
            // submitted the sheet may not approve it.
            if (!gate.User.CanApproveBoqImport())
                return Results.Json(new
                {
                    messageAr = "اعتماد إصدار جدول الكميات من صلاحيات إدارة المشاريع، لا المستخدم المختص الذي قدّمه.",
                    messageEn = "Approving a BOQ version is a project-management permission, not the specialist who submitted it.",
                }, statusCode: StatusCodes.Status403Forbidden);

            var project = await db.Projects.AsNoTracking().FirstAsync(p => p.Id == projectId);

            // D-14 — a bill can only be approved into a shape that exists.
            if (!BoqKind.Accepts(project.Type))
            {
                var (ar, en) = BoqKind.Unsupported(project.Type);
                return Results.BadRequest(new { messageAr = ar, messageEn = en });
            }

            var version = await db.BoqImportVersions
                .FirstOrDefaultAsync(v => v.ContractId == contractId && v.No == no);
            if (version is null)
                return Results.NotFound(new
                {
                    message = $"الإصدار رقم {no} غير موجود في العقد «{contractId}».",
                });

            // ONLY A SUBMITTED VERSION CAN BE APPROVED. Approving an approved one
            // would re-run the replacement against a bill that has since moved,
            // silently discarding every manual line added after it.
            if (version.State != "submitted")
                return Results.Conflict(new
                {
                    messageAr = $"الإصدار رقم {no} حالته «{version.State}» ولا يمكن اعتماده.",
                    messageEn = $"Version {no} is `{version.State}` and cannot be approved.",
                });

            var rows = await db.BoqImportVersionItems.AsNoTracking()
                .Where(i => i.VersionId == version.Id).ToListAsync();

            if (rows.Count == 0)
                return Results.UnprocessableEntity(new
                {
                    messageAr = "الإصدار لا يحوي بنودًا.",
                    messageEn = "The version carries no items.",
                });

            // ── the replacement ──────────────────────────────────────────
            // A BANDED LINE BLOCKS THE WHOLE APPROVAL (02 §5). Its quantity and
            // rate came from a priced decision of لجنة تثبيت الأسعار via an
            // APPLIED change order; letting a spreadsheet overwrite that would
            // discard a binding committee rate with no record. Refusing the
            // sheet is the only honest answer — the change order is the way to
            // move a banded line.
            var existing = await db.BoqItems
                .Where(i => i.ContractId == contractId).ToListAsync();
            var existingIds = existing.Select(i => i.Id).ToList();

            var bandedCodes = await db.BoqRateBands.AsNoTracking()
                .Where(b => existingIds.Contains(b.BoqItemId))
                .Join(db.BoqItems.AsNoTracking(), b => b.BoqItemId, i => i.Id, (_, i) => i.Code)
                .Distinct().ToListAsync();

            if (bandedCodes.Count > 0)
                return Results.Conflict(new
                {
                    messageAr = "لا يمكن اعتماد الإصدار: بنود مُعاد تسعيرها بأمر تغييري مطبَّق "
                                + $"({string.Join("، ", bandedCodes)}) لا تُستبدل من ملف.",
                    messageEn = "Cannot approve: lines re-priced by an applied change order "
                                + $"({string.Join(", ", bandedCodes)}) may not be replaced from a sheet.",
                    codes = bandedCodes,
                });

            // The dependants of every line that is going away. No foreign keys,
            // so nothing cascades — the rows have to be named (P-01).
            db.BoqDistributions.RemoveRange(
                db.BoqDistributions.Where(d => existingIds.Contains(d.BoqItemId)));
            db.BoqActivityLinks.RemoveRange(
                db.BoqActivityLinks.Where(l => existingIds.Contains(l.BoqItemId)));
            db.SupplyItemDetails.RemoveRange(
                db.SupplyItemDetails.Where(s => existingIds.Contains(s.BoqItemId)));
            db.BoqItems.RemoveRange(existing);

            db.BoqItems.AddRange(rows.Select(r => new Data.Entities.BoqItem
            {
                ContractId = contractId,
                Code = r.Code,
                // The sheet carries ONE description column. It lands in the
                // Arabic field because Arabic is the primary label (06 preamble);
                // the English one stays empty rather than holding a copy that
                // would read as a translation nobody made.
                DescriptionAr = r.Description,
                DescriptionEn = "",
                Unit = r.Unit,
                Division = r.Division,
                DivisionName = r.Division,
                Source = "imported",
                OriginalQty = r.Qty,
                UnitRate = r.Rate,
            }));

            version.State = "approved";
            // Attribution, not decoration: this is the record of who moved the
            // contract's bill. The submitter's Actor* columns stay untouched.
            version.ApproverId = gate.User.Id;
            version.ApproverName = gate.User.NameAr;
            version.ApproverRole = gate.User.RoleAr;
            version.ApproverParty = gate.User.Party;
            version.ApprovedAt = gate.Today;
            await db.SaveChangesAsync();

            // No SupplyItemDetails are written here even on a supply bill: an
            // Excel sheet carries the shared columns only, so every imported
            // supply line starts `pending` with nothing supplied or received,
            // and the register fills that half in from an empty detail. The
            // device facts arrive by editing the line or, later, by receipts.
            return Results.Ok(Dto(version));
        });

        // [EP-BOQ-11] GET /api/projects/{projectId}/boq/{contractId}/import/versions
        // web: boq/boq-import.api.ts versions() → boq.page.ts
        // spec: ملحق الشكل 13 | tables: BoqImportVersions
        //
        // «يحمي البيانات التاريخية: لا يُمحى إصدار سابق» is only true if the
        // versions are visible somewhere. The register reads this to say that an
        // import is waiting — otherwise a submission would vanish the moment the
        // dialog closed.
        app.MapGet("/api/projects/{projectId}/boq/{contractId}/import/versions", async (
            EpmDb db, HttpContext ctx, string projectId, string contractId) =>
        {
            var gate = await Gate(db, ctx, projectId, contractId, mustDefine: false);
            if (gate.Refusal is { } refusal) return refusal;

            var versions = await db.BoqImportVersions.AsNoTracking()
                .Where(v => v.ContractId == contractId)
                .OrderByDescending(v => v.No)
                .ToListAsync();

            return Results.Ok(versions.Select(Dto).ToList());
        });
    }

    // ── helpers ──────────────────────────────────────────────────────────

    private record ImportGate(IResult? Refusal, Persona User, DateOnly Today);

    /// <summary>
    /// What both writes check: the project exists, BR-15 lets this capacity into
    /// its workspace, the contract belongs to THAT project («انتماء البنود إلى
    /// العقد المختار حصرًا» — enforced where the contract is known), and §23 lets
    /// this capacity enter data at all.
    /// </summary>
    private static async Task<ImportGate> Gate(
        EpmDb db, HttpContext ctx, string projectId, string contractId, bool mustDefine = true)
    {
        var user = WorkspaceScope.User(ctx);

        if (mustDefine && !user.CanDefineProjects())
            return new(Results.Json(new
            {
                messageAr = "استيراد جدول الكميات من صلاحيات المستخدم المختص في الجهة.",
                messageEn = "Importing a bill of quantities is a university specialist permission.",
            }, statusCode: StatusCodes.Status403Forbidden), user, default);

        var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
        if (p is null)
            return new(Results.NotFound(new { message = $"المشروع «{projectId}» غير موجود." }),
                user, default);

        if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied)
            return new(denied, user, default);

        var belongs = await db.Contracts.AsNoTracking()
            .AnyAsync(c => c.Id == contractId && c.ProjectId == projectId);
        if (!belongs)
            return new(Results.NotFound(new
            {
                message = $"العقد «{contractId}» غير موجود في المشروع «{projectId}».",
            }), user, default);

        return new(null, user, p.DataDate ?? DateOnly.FromDateTime(DateTime.UtcNow));
    }

    private static List<BoqImport.Candidate> Candidates(IReadOnlyList<BoqImportRow> rows) =>
        (rows ?? []).Select(r => new BoqImport.Candidate(
            r.Row, r.Code ?? "", r.Description ?? "", r.Division ?? "",
            r.Unit ?? "", r.Qty, r.Rate)).ToList();

    private static BoqImportComparison Dto(BoqImport.Comparison c) => new(
        c.Lines.Select(l => new BoqImportLine(
            l.Code, l.Description, l.Change.ToString().ToLowerInvariant(),
            l.BeforeQty, l.BeforeRate, l.BeforeAmount,
            l.AfterQty, l.AfterRate, l.AfterAmount)).ToList(),
        c.Added, c.Removed, c.Changed, c.Unchanged,
        c.BeforeTotal, c.AfterTotal, c.Delta);

    private static BoqImportVersionDto Dto(Data.Entities.BoqImportVersion v) => new(
        v.No, v.State, v.SheetType, v.FileName, v.ItemCount, v.TotalAmount, v.PreviousAmount,
        v.ActorName, v.ActorRole, v.ActorParty, v.At.ToString("yyyy-MM-dd"),
        v.ApproverName, v.ApproverRole, v.ApproverParty,
        v.ApprovedAt?.ToString("yyyy-MM-dd"));
}
