using Epm.Api.Data;
using Epm.Api.Data.Entities;
using Epm.Api.Domain;
using Epm.Api.Features.Boq;
using Epm.Api.Features.Dev;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Supply;

/// <summary>
/// الفقرات التجهيزية — ملحق الأشكال 50–56 · المسارات 10 و11.
///
/// ── IT IS THE BOQ MODULE, NOT A SIXTEENTH TAB ────────────────────────────
/// The live prototype's own rule (`model.js:751` `EPM.modulesFor`): on a supply
/// project the `boq` module KEEPS ITS ID and swaps its label to «الفقرات
/// التجهيزية»; receipts and item inquiry become facets inside it rather than
/// top-level modules. So these endpoints read the SAME `BoqItems` a works bill
/// reads — weight, amount and the 20% rule run once, through BR-01 and BR-05 —
/// and add only what a device has and a works line does not (D-14).
///
/// ── THREE TABS, ONE READ ─────────────────────────────────────────────────
///   EP-SUP-01  الفقرات التجهيزية · الاستلامات · (both, one call)
///   EP-SUP-02  the item detail panel — الشكل 51 · الشكل 52
///   EP-SUP-03  استعلام الفقرات — الشكل 56
///   EP-SUP-04  تسجيل استلام — الشكل 53 · الشكل 54 (WRITES)
///
/// ── WHAT IS DERIVED HERE, AND WHAT IS RECORDED ───────────────────────────
/// RECORDED: the receipts. Every quantity, party, committee and محضر on them.
/// DERIVED: everything else — الكمية المستلمة is Σ the warehouse receipts,
/// المستلم per beneficiary is Σ that beneficiary's preliminary receipts, the
/// status is `Domain/SupplyStatus`, and نسبة الاستلام follows. Not one of them
/// is stored (`01 §3`).
/// </summary>
public static class SupplyEndpoints
{
    public static void MapSupplyEndpoints(this WebApplication app)
    {
        // [EP-SUP-01] GET /api/projects/{projectId}/supply/{contractId}
        // web: supply/supply.api.ts register() → supply.page.ts
        // spec: ملحق الشكل 50 · الشكل 55 | rules: BR-01, BR-08, SupplyStatus, SupplyReceipts
        // tables: BoqItems · SupplyItemDetails · SupplyReceipts · SupplyReceiptAttachments · BoqDistributions
        app.MapGet("/api/projects/{projectId}/supply/{contractId}", async (
            EpmDb db, HttpContext http, string projectId, string contractId) =>
        {
            var gate = await Gate(db, http, projectId, contractId);
            if (gate.Refusal is { } refusal) return refusal;

            var model = await Read(db, contractId);

            var totals = new SupplyTotals(
                model.Items.Count,
                Q(model.Items.Sum(i => i.ContractedQty)),
                Q(model.Items.Sum(i => i.ReceivedQty)),
                Q(model.Items.Sum(i => i.RemainingQty)),
                Q(SupplyStatus.ReceivedPct(
                    model.Items.Sum(i => i.ContractedQty),
                    model.Items.Sum(i => i.ReceivedQty))),
                M(model.Items.Sum(i => i.Amount)),
                model.BeneficiaryCount,
                model.Receipts.Count(r => r.Kind == SupplyReceipts.Warehouse),
                model.Receipts.Count(r => r.Kind == SupplyReceipts.Preliminary));

            return Results.Ok(new SupplyRegisterResponse(
                gate.Project.Id, gate.Project.NameAr, gate.Project.NameEn,
                gate.Contract.Id, gate.Contract.NameAr, gate.Contract.NameEn,
                gate.AsOf.ToString("yyyy-MM-dd"),
                model.Items, model.Receipts, totals,
                // EVERY key, including the zeroes — الشكل 50's five chips.
                Counts(model.Items.Select(i => i.Status)),
                gate.User.CanRecordReceipt()));
        });

        // [EP-SUP-02] GET /api/projects/{projectId}/supply/{contractId}/items/{code}
        // web: supply/supply.api.ts item() → supply.page.ts
        // spec: ملحق الشكل 51 · الشكل 52 | rules: BR-08, SupplyReceipts
        // tables: BoqItems · SupplyItemDetails · BoqDistributions · Workspaces · SupplyReceipts
        app.MapGet("/api/projects/{projectId}/supply/{contractId}/items/{code}", async (
            EpmDb db, HttpContext http, string projectId, string contractId, string code) =>
        {
            var gate = await Gate(db, http, projectId, contractId);
            if (gate.Refusal is { } refusal) return refusal;

            var item = await db.BoqItems.AsNoTracking()
                .FirstOrDefaultAsync(i => i.ContractId == contractId && i.Code == code);
            if (item is null)
                return Results.NotFound(new { message = $"supply item {code} not found in {contractId}" });

            var model = await Read(db, contractId);
            var row = model.Items.FirstOrDefault(i => i.Code == code);
            if (row is null)
                return Results.NotFound(new { message = $"supply item {code} not found in {contractId}" });

            var receipts = await Receipts(db, item.Id);
            var mine = model.Receipts.Where(r => r.ItemCode == code).ToList();

            // الشكل 51's «التوزيع على الجهات المستفيدة». المخصص is BR-08's
            // distribution; المستلم is Σ that beneficiary's PRELIMINARY receipts.
            // Two different tables answering two different questions about one
            // beneficiary, which is exactly what the plate's two columns are.
            var dist = await db.BoqDistributions.AsNoTracking()
                .Where(d => d.BoqItemId == item.Id).ToListAsync();

            var codes = dist.Select(d => d.BeneficiaryCode)
                .Concat(receipts.Where(r => r.BeneficiaryCode.Length > 0).Select(r => r.BeneficiaryCode))
                .Distinct()
                .ToList();

            // A beneficiary code IS a workspace code (P-174).
            var names = await db.Workspaces.AsNoTracking()
                .Where(w => codes.Contains(w.Code))
                .ToDictionaryAsync(w => w.Code);

            var beneficiaries = codes
                .Select(c => new SupplyBeneficiaryRow(
                    c,
                    names.TryGetValue(c, out var b) ? b.NameAr : c,
                    names.TryGetValue(c, out var b2) ? b2.NameEn : c,
                    Q(dist.Where(d => d.BeneficiaryCode == c).Sum(d => d.Qty)),
                    Q(SupplyReceipts.HandedOverTo(Domain(receipts), c))))
                .OrderBy(b => b.Code, StringComparer.Ordinal)
                .ToList();

            var allocated = dist.Sum(d => d.Qty);

            return Results.Ok(new SupplyItemDetailResponse(
                row, beneficiaries, mine,
                mine.SelectMany(r => r.Documents).ToList(),
                Q(allocated),
                Q(Math.Max(0m, item.OriginalQty - allocated)),
                Q(SupplyReceipts.Remaining(SupplyReceipts.Warehouse, item.OriginalQty, Domain(receipts))),
                Q(SupplyReceipts.Remaining(SupplyReceipts.Preliminary, item.OriginalQty, Domain(receipts)))));
        });

        // [EP-SUP-03] GET /api/projects/{projectId}/supply/{contractId}/inquiry?q=
        // web: supply/supply.api.ts inquiry() → supply.page.ts
        // spec: ملحق الشكل 56 | rules: — | tables: as EP-SUP-02
        //
        // «حقل بحث موحد يقبل التسلسل أو الرمز أو اسم الجهاز أو الرقم التسلسلي».
        // ONE field, four ways in — the plate's own point is that a person
        // holding a device does not know which identifier they have.
        app.MapGet("/api/projects/{projectId}/supply/{contractId}/inquiry", async (
            EpmDb db, HttpContext http, string projectId, string contractId, string? q) =>
        {
            var gate = await Gate(db, http, projectId, contractId);
            if (gate.Refusal is { } refusal) return refusal;

            var needle = (q ?? "").Trim();
            if (needle.Length == 0) return Results.Ok(Array.Empty<SupplyItemRow>());

            var model = await Read(db, contractId);

            var hits = model.Items.Where(i =>
                    i.Seq.ToString() == needle
                    || i.Code.Contains(needle, StringComparison.OrdinalIgnoreCase)
                    || i.Device.Contains(needle, StringComparison.OrdinalIgnoreCase)
                    || i.Manufacturer.Contains(needle, StringComparison.OrdinalIgnoreCase)
                    || i.Model.Contains(needle, StringComparison.OrdinalIgnoreCase)
                    // «أو الرقم التسلسلي» — the range as RECORDED, matched as a
                    // string. Parsing SN-2000…SN-2118 into a sequence and asking
                    // whether SN-2043 falls inside it would invent a numbering
                    // scheme the ministry has not stated (the range is recorded
                    // off the محضر, not generated).
                    || i.SerialFrom.Contains(needle, StringComparison.OrdinalIgnoreCase)
                    || i.SerialTo.Contains(needle, StringComparison.OrdinalIgnoreCase))
                .ToList();

            return Results.Ok(hits);
        });

        // [EP-SUP-04] POST /api/projects/{projectId}/supply/{contractId}/items/{code}/receipts
        // web: supply/supply.api.ts recordReceipt() → supply.page.ts
        // spec: ملحق الشكل 53 · الشكل 54 · المسار 11 | rules: SupplyReceipts
        // tables: SupplyReceipts · SupplyReceiptAttachments (WRITTEN)
        //
        // THE ONLY WAY A RECEIVED QUANTITY MOVES. There is no field for it on
        // any form: it is Σ these rows, and each row is a محضر with a date, a
        // party and a committee behind it.
        app.MapPost("/api/projects/{projectId}/supply/{contractId}/items/{code}/receipts", async (
            EpmDb db, HttpContext http, string projectId, string contractId, string code,
            SupplyReceiptInput input) =>
        {
            var gate = await Gate(db, http, projectId, contractId);
            if (gate.Refusal is { } refusal) return refusal;

            if (!gate.User.CanRecordReceipt())
                return Results.Json(new
                {
                    messageAr = "تسجيل الاستلام من صلاحية لجنة الفحص والاستلام أو مدير المشروع.",
                    messageEn = "Recording a receipt is the inspection & receipt committee’s or the project manager’s capacity.",
                }, statusCode: StatusCodes.Status403Forbidden);

            var item = await db.BoqItems.AsNoTracking()
                .FirstOrDefaultAsync(i => i.ContractId == contractId && i.Code == code);
            if (item is null)
                return Results.NotFound(new { message = $"supply item {code} not found in {contractId}" });

            var existing = await Receipts(db, item.Id);

            // `Domain/SupplyReceipts` — the ceiling, per kind. The wizard caps
            // the field; this is the rule, and a cap in a form is a courtesy
            // where this is a record.
            if (SupplyReceipts.Check(
                    input.Kind, input.Qty, input.BeneficiaryCode,
                    item.OriginalQty, Domain(existing)) is { } bad)
                return Results.BadRequest(new { messageAr = bad.MessageAr, messageEn = bad.MessageEn });

            // A preliminary receipt names a beneficiary; that beneficiary must
            // exist and be active (`02 §8`'s own import gate, at the movement).
            if (input.Kind == SupplyReceipts.Preliminary)
            {
                var ben = await db.Workspaces.AsNoTracking()
                    .FirstOrDefaultAsync(w => w.Code == input.BeneficiaryCode);
                if (ben is null || !ben.Active)
                    return Results.BadRequest(new
                    {
                        messageAr = "الجهة المستلمة غير معروفة أو غير فعّالة.",
                        messageEn = "The receiving beneficiary is unknown or inactive.",
                    });
            }

            var seq = await Seq(db, contractId, item.Id);
            var already = existing.Count(r => r.Kind == input.Kind);

            var receipt = new SupplyReceipt
            {
                BoqItemId = item.Id,
                Kind = input.Kind,
                No = SupplyReceipts.Number(input.Kind, projectId, seq, already + 1),
                // D-06 — the project data date, never the wall clock.
                Date = DateOnly.TryParse(input.Date, out var d) ? d : gate.AsOf,
                Qty = input.Qty,
                Store = input.Kind == SupplyReceipts.Warehouse ? (input.Store ?? "").Trim() : "",
                BeneficiaryCode = input.Kind == SupplyReceipts.Preliminary
                    ? (input.BeneficiaryCode ?? "").Trim() : "",
                Committee = (input.Committee ?? "").Trim(),
                Conformity = (input.Conformity ?? "").Trim(),
                Notes = (input.Notes ?? "").Trim(),
                ActorId = gate.User.Id,
                ActorName = gate.User.NameAr,
                ActorParty = gate.User.Party,
            };

            db.SupplyReceipts.Add(receipt);
            await db.SaveChangesAsync();

            foreach (var doc in (input.Documents ?? []).Where(x => !string.IsNullOrWhiteSpace(x.FileName)))
                db.SupplyReceiptAttachments.Add(new SupplyReceiptAttachment
                {
                    ReceiptId = receipt.Id,
                    TitleAr = doc.TitleAr,
                    TitleEn = doc.TitleEn,
                    FileName = doc.FileName,
                    SizeBytes = doc.SizeBytes,
                });

            await db.SaveChangesAsync();

            // THE WHOLE REGISTER COMES BACK. One receipt moves the item's
            // received quantity, its status chip, the beneficiary's المستلم
            // column, the totals strip and the receipts tab's own count — the
            // same reason SCR-W4's writes return the whole bill.
            var model = await Read(db, contractId);
            var totals = new SupplyTotals(
                model.Items.Count,
                Q(model.Items.Sum(i => i.ContractedQty)),
                Q(model.Items.Sum(i => i.ReceivedQty)),
                Q(model.Items.Sum(i => i.RemainingQty)),
                Q(SupplyStatus.ReceivedPct(
                    model.Items.Sum(i => i.ContractedQty),
                    model.Items.Sum(i => i.ReceivedQty))),
                M(model.Items.Sum(i => i.Amount)),
                model.BeneficiaryCount,
                model.Receipts.Count(r => r.Kind == SupplyReceipts.Warehouse),
                model.Receipts.Count(r => r.Kind == SupplyReceipts.Preliminary));

            return Results.Ok(new SupplyRegisterResponse(
                gate.Project.Id, gate.Project.NameAr, gate.Project.NameEn,
                gate.Contract.Id, gate.Contract.NameAr, gate.Contract.NameEn,
                gate.AsOf.ToString("yyyy-MM-dd"),
                model.Items, model.Receipts, totals,
                Counts(model.Items.Select(i => i.Status)),
                true));
        });
    }

    // ── ONE derivation, shared by every read above ───────────────────────

    private record Model(
        List<SupplyItemRow> Items,
        List<SupplyReceiptRow> Receipts,
        int BeneficiaryCount);

    /// <summary>
    /// The bill, its device halves and its receipts, in three queries. Reads
    /// `BoqEndpoints.Derive` for the shared half so weight and amount are BR-01's
    /// own figures and not a second answer to them (the same call SCR-W6 makes
    /// for the same reason — P-54).
    /// </summary>
    private static async Task<Model> Read(EpmDb db, string contractId)
    {
        var derived = await BoqEndpoints.Derive(db, contractId, "cost");
        var ids = derived.Select(d => d.Item.Id).ToList();

        var details = await db.SupplyItemDetails.AsNoTracking()
            .Where(s => ids.Contains(s.BoqItemId))
            .ToDictionaryAsync(s => s.BoqItemId);

        var receipts = await db.SupplyReceipts.AsNoTracking()
            .Where(r => ids.Contains(r.BoqItemId))
            .OrderByDescending(r => r.Date).ThenByDescending(r => r.Id)
            .ToListAsync();

        var docs = (await db.SupplyReceiptAttachments.AsNoTracking()
                .Where(a => receipts.Select(r => r.Id).Contains(a.ReceiptId))
                .ToListAsync())
            .GroupBy(a => a.ReceiptId)
            .ToDictionary(g => g.Key, g => g.ToList());

        var benNames = await db.Workspaces.AsNoTracking()
            .ToDictionaryAsync(w => w.Code, w => w.NameAr);

        var dist = await db.BoqDistributions.AsNoTracking()
            .Where(d => ids.Contains(d.BoqItemId))
            .ToListAsync();

        var items = new List<SupplyItemRow>();
        var seq = 0;

        foreach (var d in derived)
        {
            seq++;
            var s = details.GetValueOrDefault(d.Item.Id) ?? new SupplyItemDetail();
            var mine = receipts.Where(r => r.BoqItemId == d.Item.Id).ToList();
            var asDomain = Domain(mine);

            // DERIVED, every one of them (01 §3).
            var received = SupplyReceipts.ReceivedInto(asDomain);
            var handed = SupplyReceipts.HandedOver(asDomain);

            items.Add(new SupplyItemRow(
                seq, d.Item.Code, d.Item.DescriptionAr, d.Item.DescriptionEn, d.Item.Unit,
                Q(d.Item.OriginalQty), M(d.Line.Rate), M(d.Line.Amount), d.Weight,
                // The DEVICE is the line's own description — the reference
                // normalises every فقرة to the inherited BOQ shape and hangs the
                // manufacturer and model off it (supply-items.jsx:30).
                d.Item.DescriptionAr,
                s.Manufacturer, s.Country, s.Model, s.SerialFrom, s.SerialTo,
                Q(s.SuppliedQty), Q(received), Q(handed),
                Q(SupplyStatus.Remaining(d.Item.OriginalQty, received)),
                Q(SupplyStatus.ReceivedPct(d.Item.OriginalQty, received)),
                SupplyStatus.Of(d.Item.OriginalQty, s.SuppliedQty, received),
                s.WarrantyMonths, s.WarrantyExpiry?.ToString("yyyy-MM-dd"), s.Notes,
                mine.Count(r => r.Kind == SupplyReceipts.Warehouse),
                mine.Count(r => r.Kind == SupplyReceipts.Preliminary),
                mine.Sum(r => docs.GetValueOrDefault(r.Id)?.Count ?? 0)));
        }

        var byId = derived.ToDictionary(d => d.Item.Id);

        var receiptRows = receipts.Select(r =>
        {
            var item = byId[r.BoqItemId];
            var itemSeq = derived.FindIndex(x => x.Item.Id == r.BoqItemId) + 1;

            return new SupplyReceiptRow(
                r.Id, r.No, r.Kind, r.Date.ToString("yyyy-MM-dd"), Q(r.Qty),
                r.Kind == SupplyReceipts.Preliminary
                    ? benNames.GetValueOrDefault(r.BeneficiaryCode, r.BeneficiaryCode)
                    : r.Store,
                r.Committee, r.Conformity, r.Notes,
                item.Item.Code, item.Item.DescriptionAr, itemSeq,
                (docs.GetValueOrDefault(r.Id) ?? [])
                    .Select(a => new SupplyReceiptDocDto(a.TitleAr, a.TitleEn, a.FileName, a.SizeBytes))
                    .ToList());
        }).ToList();

        return new Model(items, receiptRows,
            dist.Select(x => x.BeneficiaryCode).Distinct().Count());
    }

    private static async Task<List<SupplyReceipt>> Receipts(EpmDb db, int boqItemId) =>
        await db.SupplyReceipts.AsNoTracking()
            .Where(r => r.BoqItemId == boqItemId)
            .OrderBy(r => r.Date).ThenBy(r => r.Id)
            .ToListAsync();

    /// <summary>Entity rows → the shape `Domain/SupplyReceipts` reasons about.</summary>
    private static List<SupplyReceipts.Receipt> Domain(IEnumerable<SupplyReceipt> rows) =>
        rows.Select(r => new SupplyReceipts.Receipt(r.Kind, r.Qty, r.BeneficiaryCode)).ToList();

    /// <summary>The item's 1-based position in its bill — the receipt number reads it.</summary>
    private static async Task<int> Seq(EpmDb db, string contractId, int boqItemId)
    {
        var ids = await db.BoqItems.AsNoTracking()
            .Where(i => i.ContractId == contractId)
            .OrderBy(i => i.Code)
            .Select(i => i.Id)
            .ToListAsync();

        return ids.IndexOf(boqItemId) + 1;
    }

    /// <summary>
    /// الشكل 50's five chips, EVERY key present including the zeroes: a chip
    /// that disappears when its count is nought is one whose absence has to be
    /// interpreted, where one reading «0» is a fact.
    /// </summary>
    private static Dictionary<string, int> Counts(IEnumerable<string> values)
    {
        var counts = new Dictionary<string, int>
        {
            [SupplyStatus.Received] = 0,
            [SupplyStatus.Partial] = 0,
            [SupplyStatus.Supplied] = 0,
            [SupplyStatus.Pending] = 0,
        };

        foreach (var v in values)
            if (counts.ContainsKey(v)) counts[v]++;

        return counts;
    }

    // ── the scope check, once ────────────────────────────────────────────

    private record GateResult(IResult? Refusal, Project Project, Contract Contract, Persona User, DateOnly AsOf);

    private static async Task<GateResult> Gate(
        EpmDb db, HttpContext http, string projectId, string contractId)
    {
        var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
        if (p is null)
            return new(Results.NotFound(new { message = $"project {projectId} not found" }), null!, null!, null!, default);

        if (WorkspaceScope.Deny(http, p.WorkspaceCode) is { } denied)
            return new(denied, null!, null!, null!, default);

        // D-14 — this module exists only where the bill's SHAPE is `supply`.
        // A works project asking for it is a 404 and not an empty register:
        // an empty list would read as "this contract has no supply items".
        if (BoqKind.ForProjectType(p.Type) != BoqKind.Supply)
            return new(Results.NotFound(new
            {
                messageAr = "الفقرات التجهيزية وحدة في مشاريع التجهيز وحدها.",
                messageEn = "Supply items are a module of equipment projects only.",
            }), null!, null!, null!, default);

        var c = await db.Contracts.AsNoTracking().FirstOrDefaultAsync(x => x.Id == contractId);
        if (c is null || c.ProjectId != projectId)
            return new(Results.NotFound(new
            {
                message = $"contract {contractId} not found in project {projectId}",
            }), null!, null!, null!, default);

        return new(null, p, c, WorkspaceScope.User(http),
            p.DataDate ?? DateOnly.FromDateTime(DateTime.UtcNow));
    }

    private static decimal M(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
    private static decimal Q(decimal v) => Math.Round(v, 4, MidpointRounding.AwayFromZero);
}
