namespace Epm.Api.Data.Entities;

/// <summary>
/// المرفقات — the documents that support ONE payment (الشكل 9's side panel).
///
/// «المرفقات: كتاب المالية (96 KB) وذرعة الأعمال المنجزة (188 KB)» — a payment
/// is certified against an official finance letter and a measurement sheet, and
/// الشكل 9 puts them beside the payment «فتختصر التدقيق اللاحق وتمنع ضياع
/// المستندات». That sentence is the reason this table exists: the attachment
/// has to hang off the PAYMENT, not off the project's document register.
///
/// ── WHY NOT `Document` ────────────────────────────────────────────────────
/// `Data/Entities/Document.cs` is SCR-W12's versioned DRAWING register —
/// revision labels, disciplines, approval status. A payment attachment has none
/// of those and needs a payment id it does not have. Wiring it in would mean
/// adding a column and ignoring eight, which is not what CLAUDE.md §4 means by
/// pruning an entity to what its page shows.
///
/// This mirrors `ChangeOrderAttachment` — the same shape, scoped to its own
/// parent record — because that is the pattern this codebase already uses for
/// "files belonging to one record".
///
/// NO REAL FILE STORAGE, as everywhere else in the prototype: the row is the
/// metadata الشكل 9 prints, and opening one is a demo action.
///
/// FLAT: `db.PaymentAttachments.Where(a => a.PaymentId == id)` IS the relationship.
/// </summary>
public class PaymentAttachment
{
    public int Id { get; set; }

    /// <summary>→ Payment.Id</summary>
    public int PaymentId { get; set; }

    /// <summary>What the document IS — «كتاب المالية», «ذرعة الأعمال المنجزة».</summary>
    public string TitleAr { get; set; } = "";
    public string TitleEn { get; set; } = "";

    public string FileName { get; set; } = "";
    public long SizeBytes { get; set; }
}
