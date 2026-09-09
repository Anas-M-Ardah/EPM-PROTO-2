using Epm.Api.Data;
using Epm.Api.Data.Entities;
using Epm.Api.Domain;
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
                        r.Status, DocumentRevisions.IsSuperseded(r.No, model))).ToList());
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

            var existing = await db.DocumentRevisions
                .Where(r => r.DocumentId == doc.Id).Select(r => r.No).ToListAsync();
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
    }
}
