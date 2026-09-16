using Epm.Api.Data;
using Epm.Api.Data.Entities;
using Epm.Api.Domain;
using Epm.Api.Features.Dev;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Documents;

/// <summary>
/// SCR-W12 — الوثائق والمخططات (**ملحق الشكل 46**).
///
/// ── ONE READ CARRIES THE REVISIONS TOO ───────────────────────────────────
/// The detail panel opens on a row already in the table and shows that
/// document's whole revision history. Fetching it separately would give the
/// panel its own chance to disagree with the row it opened from — the same
/// call SCR-W4's بطاقة البند made (P-84).
///
/// ── «المراجعات لا تُحذف» IS THE MODEL, NOT A MESSAGE ─────────────────────
/// Which revision is current is Domain/DocumentRevisions' answer — the highest
/// number — and every earlier one comes back marked `superseded` with its own
/// date, transmittal and file intact. Nothing here filters them out; the
/// «آخر مراجعة فقط» toggle is a VIEW over the same payload.
/// </summary>
public static class DocumentsEndpoints
{
    public static void MapDocumentsEndpoints(this WebApplication app)
    {
        // [EP-DOC-01] GET /api/projects/{projectId}/documents
        // web: documents/documents.api.ts list() → documents.page.ts
        // spec: ملحق الشكل 46 | rules: DocumentRevisions
        // tables: Projects · Documents · DocumentRevisions
        app.MapGet("/api/projects/{projectId}/documents",
            async (EpmDb db, HttpContext ctx, string projectId) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            // الشكل 46's folders and its register are both in DISCIPLINE order
            // — معماري · إنشائي · كهربائي · ميكانيكي · مدني · تقارير — which is
            // the lookup's own sort and not the alphabet. Reading it once here
            // keeps the two halves of the screen in the same order.
            var order = await db.Lookups.AsNoTracking()
                .Where(l => l.Kind == "doc-discipline")
                .OrderBy(l => l.Sort)
                .Select(l => l.Code)
                .ToListAsync();

            var docs = (await db.Documents.AsNoTracking()
                .Where(d => d.ProjectId == projectId)
                .ToListAsync())
                .OrderBy(d => order.IndexOf(d.Discipline) is var i && i >= 0 ? i : int.MaxValue)
                .ThenBy(d => d.Code)
                .ToList();

            var ids = docs.Select(d => d.Id).ToList();

            var revisions = await db.DocumentRevisions.AsNoTracking()
                .Where(r => ids.Contains(r.DocumentId))
                .OrderByDescending(r => r.No)
                .ToListAsync();

            var rows = docs.Select(d =>
            {
                var mine = revisions.Where(r => r.DocumentId == d.Id).ToList();
                var model = mine.Select(r => new DocumentRevisions.Revision(r.No, r.Status)).ToList();
                var current = DocumentRevisions.Current(model);

                var currentRow = current is null ? null : mine.First(r => r.No == current.No);

                return new DocumentRow(
                    d.Code, d.TitleAr, d.TitleEn, d.Discipline, d.Issuer,
                    current?.No,
                    currentRow?.IssuedOn?.ToString("yyyy-MM-dd"),
                    currentRow?.TransmittalNo,
                    // A document with no revision has no issue status to show —
                    // `none`, and the register says «لا مراجعات» rather than
                    // calling it a draft.
                    current?.Status ?? "none",
                    mine.Count,
                    // NEWEST FIRST, superseded ones included: the panel is a
                    // history, and a history that hides its earlier entries is
                    // exactly what the plate's notice forbids.
                    mine.Select(r => new RevisionRow(
                        r.No, r.IssuedOn?.ToString("yyyy-MM-dd"), r.Issuer,
                        r.DescriptionAr, r.DescriptionEn, r.TransmittalNo, r.FileName,
                        r.Status, DocumentRevisions.IsSuperseded(r.No, model),
                        r.DecisionNote, r.DecidedByUserId, r.DecidedAt?.ToString("yyyy-MM-dd"))).ToList());
            }).ToList();

            // الشكل 46's folders: «كل الوثائق» then معماري · إنشائي · كهربائي ·
            // ميكانيكي · مدني وبنى تحتية · تقارير ومراسلات — the DISCIPLINE
            // order, which is the lookup's own `Sort` and not the alphabet. A
            // folder list ordered by whatever code happened to be lowest would
            // reshuffle itself the first time a drawing was renumbered.
            var folders = new List<DisciplineFolder> { new("all", rows.Count) };
            folders.AddRange(docs
                .GroupBy(d => d.Discipline)
                .OrderBy(g => order.IndexOf(g.Key) is var i && i >= 0 ? i : int.MaxValue)
                .Select(g => new DisciplineFolder(g.Key, g.Count())));

            // The status chips, counted by CURRENT revision — `rejected` is
            // present at zero on the plate, and stays present here for the same
            // reason a severity band does: a chip that vanishes looks like a
            // changed set.
            var statuses = new List<DisciplineFolder>
            {
                new("all", rows.Count),
                new("approved", rows.Count(r => r.Status == "approved")),
                new("draft", rows.Count(r => r.Status == "draft")),
                new("rejected", rows.Count(r => r.Status == "rejected")),
            };

            return Results.Ok(new DocumentsResponse(
                p.Id, p.NameAr, p.NameEn, p.DataDate?.ToString("yyyy-MM-dd"),
                rows.Count,
                revisions.Count,
                DocumentRevisions.UnderReview(rows
                    .Select(r => (IReadOnlyList<DocumentRevisions.Revision>)r.Revisions
                        .Select(x => new DocumentRevisions.Revision(x.No, x.Status)).ToList())
                    .ToList()),
                folders, statuses, rows));
        });

        // [EP-DOC-02] POST /api/projects/{projectId}/documents/{code}/revisions
        // web: documents.api.ts uploadRevision() → documents.page.ts
        // spec: ملحق الشكل 46 | rules: DocumentRevisions
        // tables: Documents · DocumentRevisions *(written)*
        //
        // P-253 — «رفع مراجعة» made real. Keyed by CODE, not the internal row
        // id: `DocumentRow` never carries one (CLAUDE.md §2's DTO/TS parity),
        // and every other tab on this register already addresses a document by
        // its code. No `Personas.cs` capacity is document-shaped — open to any
        // authenticated persona for this pass, recorded as an open question.
        //
        // A NEW FILE IS ALWAYS A NEW REVISION (`ملحق الشكل 46`'s own notice:
        // «كل ملف جديد يُنشئ مراجعة جديدة؛ المراجعة السابقة تبقى في السجل
        // معلَّمة كملغاة»). There is no "replace this revision" endpoint and
        // there must not be one.
        app.MapPost("/api/projects/{projectId}/documents/{code}/revisions",
            async (EpmDb db, HttpContext ctx, string projectId, string code, RevisionInput input) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            var doc = await db.Documents.FirstOrDefaultAsync(d => d.ProjectId == projectId && d.Code == code);
            if (doc is null) return Results.NotFound(new { message = $"document {code} not found on {projectId}" });

            if (string.IsNullOrWhiteSpace(input.Issuer) || string.IsNullOrWhiteSpace(input.TransmittalNo)
                || string.IsNullOrWhiteSpace(input.FileName))
                return Results.UnprocessableEntity(new
                {
                    message = "جهة الإصدار ورقم التحويل والملف إلزامية لرفع مراجعة",
                });

            if (!DateOnly.TryParse(input.IssuedOn, out var issuedOn))
                issuedOn = p.DataDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

            var prior = await db.DocumentRevisions
                .Where(r => r.DocumentId == doc.Id).ToListAsync();

            // المسار 12 step 3 — «لا تكرار في الاسم والإصدار» (P-267). The same
            // transmittal or the same file on the same document is the same
            // issue posted twice, and it would silently supersede itself.
            var transmittal = input.TransmittalNo.Trim();
            var fileName = input.FileName.Trim();
            if (prior.Any(r => string.Equals(r.TransmittalNo, transmittal, StringComparison.OrdinalIgnoreCase)
                            || string.Equals(r.FileName, fileName, StringComparison.OrdinalIgnoreCase)))
                return Results.Conflict(new
                {
                    message = $"مراجعة بنفس رقم التحويل «{transmittal}» أو اسم الملف «{fileName}» مسجَّلة لهذه الوثيقة — لا تكرار",
                    messageEn = "A revision with the same transmittal number or file name is already registered for this document.",
                });

            var existing = prior.Select(r => r.No).ToList();
            var no = existing.Count == 0 ? 1 : existing.Max() + 1;

            db.DocumentRevisions.Add(new DocumentRevision
            {
                DocumentId = doc.Id,
                No = no,
                IssuedOn = issuedOn,
                Issuer = input.Issuer.Trim(),
                DescriptionAr = input.DescriptionAr?.Trim() ?? "",
                DescriptionEn = input.DescriptionEn?.Trim() ?? "",
                TransmittalNo = input.TransmittalNo.Trim(),
                FileName = input.FileName.Trim(),
                // The new revision is always DRAFT — reissuing a drawing reopens
                // its review, exactly as an R1 that was approved and an R2 that
                // supersedes it are two different facts (DocumentRevisions.cs).
                Status = "draft",
            });

            await db.SaveChangesAsync();

            return Results.Ok(new { documentCode = doc.Code, revisionNo = no });
        });

        // [EP-DOC-03] POST /api/projects/{projectId}/documents/{code}/revisions/{no}/decision
        // web: documents.api.ts decide() → documents.page.ts
        // spec: المسار 12 steps 5–6 · 5أ | rules: DocumentRevisions.CanDecide, Personas.CanDecideDocument
        // tables: Documents · DocumentRevisions *(written)*
        // P-267 — «اعتماد المراجعة» / «رفض المراجعة مع بيان السبب». Only the current
        // draft may be decided; a rejection must state its reason.
        app.MapPost("/api/projects/{projectId}/documents/{code}/revisions/{no:int}/decision",
            async (EpmDb db, HttpContext ctx, string projectId, string code, int no, DocumentDecisionInput input) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            var user = WorkspaceScope.User(ctx);
            if (!user.CanDecideDocument())
                return Results.Json(new
                {
                    message = "اعتماد الوثائق أو رفضها من صلاحية دائرة المهندس المقيم أو مدير المشروع",
                    messageEn = "Approving or rejecting a document belongs to the RE department or the project manager.",
                }, statusCode: StatusCodes.Status403Forbidden);

            var doc = await db.Documents.AsNoTracking().FirstOrDefaultAsync(d => d.ProjectId == projectId && d.Code == code);
            if (doc is null) return Results.NotFound(new { message = $"document {code} not found on {projectId}" });

            var revisions = await db.DocumentRevisions.Where(r => r.DocumentId == doc.Id).ToListAsync();
            var target = revisions.FirstOrDefault(r => r.No == no);
            if (target is null) return Results.NotFound(new { message = $"revision R{no} not found on {code}" });

            var decision = (input.Decision ?? "").Trim().ToLowerInvariant();
            if (decision is not ("approve" or "reject"))
                return Results.BadRequest(new { message = "القرار إما اعتماد أو رفض", messageEn = "The decision is approve or reject." });

            var model = revisions.Select(r => new DocumentRevisions.Revision(r.No, r.Status)).ToList();
            if (!DocumentRevisions.CanDecide(no, model))
                return Results.Conflict(new
                {
                    message = "لا يُبتّ إلا في المراجعة الحالية وهي مسوّدة",
                    messageEn = "Only the current revision, while it is a draft, can be decided.",
                });

            var note = input.Note?.Trim();
            if (decision == "reject" && string.IsNullOrWhiteSpace(note))
                return Results.UnprocessableEntity(new
                {
                    message = "سبب الرفض مطلوب",
                    messageEn = "A rejection must state its reason.",
                    field = "note",
                });

            target.Status = decision == "approve" ? "approved" : "rejected";
            target.DecisionNote = string.IsNullOrWhiteSpace(note) ? null : note;
            target.DecidedByUserId = user.Id;
            // D-06 — the project data date, never the wall clock.
            target.DecidedAt = p.DataDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

            await db.SaveChangesAsync();
            return Results.Ok(new { documentCode = doc.Code, revisionNo = no, status = target.Status });
        });
    }
}
