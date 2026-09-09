namespace Epm.Api.Data.Entities;

/// <summary>
/// الأدلة المؤيدة for ONE progress reading — المسار 6 step 2, «إدخال نسبة
/// الإنجاز وإرفاق الأدلة», and step 5's «ما يدخله المستخدم: نسبة إنجاز النشاط
/// أو الكمية المنجزة، والأدلة المؤيدة».
///
/// The evidence is what makes the review a review: a reviewer deciding on a
/// bare percentage is initialling a number, and the track puts the attachment
/// in the same step as the number for that reason.
///
/// ── WHY NOT `Document` ────────────────────────────────────────────────────
/// The same answer `PaymentAttachment` gives: `Data/Entities/Document.cs` is
/// SCR-W12's versioned DRAWING register — revision labels, disciplines,
/// approval status — and a photo of a poured slab has none of those and needs a
/// reading id it does not have. This mirrors `PaymentAttachment` /
/// `ChangeOrderAttachment` / `SupplyReceiptAttachment`, which is the pattern
/// this codebase already uses for "files belonging to one record".
///
/// NO REAL FILE STORAGE, as everywhere else in the prototype: the row is the
/// metadata the panel prints, and opening one is a demo action.
///
/// FLAT: `db.ProgressReadingEvidence.Where(e => e.ReadingId == id)` IS the
/// relationship.
/// </summary>
public class ProgressReadingEvidence
{
    public int Id { get; set; }

    /// <summary>→ ProgressReading.Id</summary>
    public int ReadingId { get; set; }

    /// <summary>What the document IS — «ذرعة الأعمال المنجزة», «صور الموقع».</summary>
    public string TitleAr { get; set; } = "";
    public string TitleEn { get; set; } = "";

    public string FileName { get; set; } = "";
    public long SizeBytes { get; set; }
}
