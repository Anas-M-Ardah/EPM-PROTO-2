namespace Epm.Api.Data.Entities;

/// <summary>
/// استلام فقرة تجهيزية — المسار 11 · الأشكال 52–55.
///
/// THE SEAM `SupplyItemDetail` NAMED, CLOSED. That entity's own comment said
/// `ReceivedQty` was «stored today, and that is a seam, not a design choice»,
/// because المسار 11 records receipts as EVENTS and no table held them. This is
/// that table, and `ReceivedQty` is gone: the received quantity is now Σ the
/// warehouse receipts below, derived at projection time like every other
/// figure in this system (`01 §3`).
///
/// ── ONE ROW PER MOVEMENT, AND TWO KINDS OF MOVEMENT ──────────────────────
///   warehouse    استلام مخزني — the devices arriving at the ministry's store,
///                against a محضر and a receiving committee (الشكل 53).
///   preliminary  استلام أولي — a beneficiary taking delivery of some of what
///                arrived, against a conformity finding (الشكل 54).
///
/// They are NOT the same event and do not net against each other; the ceilings
/// are `Domain/SupplyReceipts`'s, and the reason is الشكل 54's own: «تفصل
/// النافذة بوضوح بين حركة الإدخال إلى المخزن وبين تسلّم الجهة المستفيدة».
///
/// FLAT: `db.SupplyReceipts.Where(r => r.BoqItemId == item.Id)` IS the
/// relationship. No navigation properties, no foreign keys (CLAUDE.md §3.3).
/// </summary>
public class SupplyReceipt
{
    public int Id { get; set; }

    /// <summary>→ BoqItem.Id. The فقرة this movement is against.</summary>
    public int BoqItemId { get; set; }

    /// <summary>`warehouse` · `preliminary` — `Domain/SupplyReceipts`.</summary>
    public string Kind { get; set; } = "";

    /// <summary>
    /// WR-…/PR-… — GENERATED, never typed (`Domain/SupplyReceipts.Number`).
    /// الشكل 53 draws the field «غير قابل للتحرير», and a receipt number is what
    /// a محضر is filed under: one a person could type is one they could
    /// duplicate.
    /// </summary>
    public string No { get; set; } = "";

    public DateOnly Date { get; set; }

    public decimal Qty { get; set; }

    /// <summary>«المخزن» — on a warehouse receipt. Empty on a preliminary one.</summary>
    public string Store { get; set; } = "";

    /// <summary>
    /// → Beneficiary.Code. REQUIRED on a preliminary receipt: الشكل 54 «تُحمّل
    /// الجامعة المستلمة مسؤولية الكمية», and a hand-over to nobody is a quantity
    /// off the books with no owner. Empty on a warehouse receipt — a store is
    /// not a beneficiary.
    /// </summary>
    public string BeneficiaryCode { get; set; } = "";

    /// <summary>«لجنة الاستلام» — the committee named on the محضر.</summary>
    public string Committee { get; set; } = "";

    /// <summary>«المطابقة» — مطابق · غير مطابق, as the plate's own select offers.</summary>
    public string Conformity { get; set; } = "";

    public string Notes { get; set; } = "";

    // ── who recorded it ──────────────────────────────────────────────────
    public string ActorId { get; set; } = "";
    public string ActorName { get; set; } = "";
    public string ActorParty { get; set; } = "";
}
