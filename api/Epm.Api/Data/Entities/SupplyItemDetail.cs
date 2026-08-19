namespace Epm.Api.Data.Entities;

/// <summary>
/// The SUPPLY sub-type of a BOQ line — الفقرة التجهيزية (الأشكال 50–52).
///
/// FLAT, and an EXTENSION, not a replacement: the shared bill columns (code,
/// description, unit, quantity, rate, division, source) stay in `BoqItem`, and
/// this table carries only what a device has and a works line does not. One row
/// per supply `BoqItem`, joined the same way everything else here joins:
///   db.SupplyItemDetails.FirstOrDefault(s => s.BoqItemId == item.Id)
///
/// The reference does exactly this split in one object — it normalises every
/// فقرة to "the inherited BOQ shape" (code · unit · price · contractedQty ·
/// executedQty · total · weight) and hangs the device facts off the same record
/// (../epm/app/supply-items.jsx:30, :70). Two tables here because the base is
/// already a table, and because a works bill must not carry empty warranty
/// columns.
///
/// CONTRACTED QUANTITY IS NOT HERE. It is `BoqItem.OriginalQty`, the same
/// column a works line uses, so weight, amount and the 20% rule keep working on
/// a supply bill without a second code path.
///
/// DERIVED — never stored (01 §3):
///   ReceivedQty = Domain/SupplyReceipts.ReceivedInto(its SupplyReceipts rows)
///   Status      = SupplyStatus.Of(OriginalQty, SuppliedQty, ReceivedQty)
///   ReceivedPct = ReceivedQty ÷ OriginalQty
///   Remaining   = OriginalQty − ReceivedQty
/// </summary>
public class SupplyItemDetail
{
    public int Id { get; set; }

    /// <summary>→ BoqItem.Id. REQUIRED — a detail row without its line is orphaned data.</summary>
    public int BoqItemId { get; set; }

    // ── the device (الشكل 51's «عام» tab) ────────────────────────────────
    public string Manufacturer { get; set; } = "";
    public string Country { get; set; } = "";
    public string Model { get; set; } = "";

    /// <summary>Serial range as recorded on the receipt, not a parsed sequence.</summary>
    public string SerialFrom { get; set; } = "";
    public string SerialTo { get; set; } = "";

    // ── quantities beyond the contracted one ─────────────────────────────

    /// <summary>
    /// مجهَّز — delivered by the supplier, not yet receipted. The third quantity
    /// that makes `supplied — بانتظار الاستلام` a state distinct from `partial`.
    /// </summary>
    public decimal SuppliedQty { get; set; }

    // مستلَم IS NO LONGER HERE. It used to be a stored column with a comment
    // calling itself «a seam, not a design choice»: المسار 11 records receipts
    // as EVENTS and no table held them. `SupplyReceipts` is that table now, so
    // the received quantity is Σ its warehouse rows and is DERIVED at
    // projection time like every other figure in this system (01 §3):
    //
    //   ReceivedQty = Domain/SupplyReceipts.ReceivedInto(rows for this item)
    //
    // The reference stores it on the item for the same reason this once did —
    // it has no receipts table either (model.js:598). That is a prototype's
    // licence and not a record's.

    // ── warranty (الشكل 51) ──────────────────────────────────────────────
    public int WarrantyMonths { get; set; }

    /// <summary>Absolute date, so it survives a change to WarrantyMonths.</summary>
    public DateOnly? WarrantyExpiry { get; set; }

    public string Notes { get; set; } = "";
}
