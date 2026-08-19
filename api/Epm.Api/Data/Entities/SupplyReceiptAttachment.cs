namespace Epm.Api.Data.Entities;

/// <summary>
/// مستند استلام — الشكل 53 · الشكل 54's «مستندات الاستلام», and الشكل 52's
/// «أرشيف الفقرة».
///
/// The plates' own instruction is the contract this table keeps: «أرفق صورة
/// محضر الاستلام أو الذرعة — تبقى مع هذا الاستلام في سجل الفقرة». So a document
/// belongs to a RECEIPT, not to the item: the item's archive (الشكل 52's
/// «أرشيف الفقرة ·4») is the union of its receipts' documents, which is what
/// makes every file traceable to the movement it evidences.
///
/// A receipt with no document is a real and visible state — الشكل 55's
/// «المستندات» column prints «لا مستند» and the plate calls it «ثغرة توثيقية
/// تستوجب المعالجة». So it is not required, and it is reported.
///
/// NO REAL FILE STORAGE, as everywhere else in this prototype: the row is the
/// metadata, and opening one is a demo action.
/// </summary>
public class SupplyReceiptAttachment
{
    public int Id { get; set; }

    /// <summary>→ SupplyReceipt.Id</summary>
    public int ReceiptId { get; set; }

    public string TitleAr { get; set; } = "";
    public string TitleEn { get; set; } = "";

    public string FileName { get; set; } = "";
    public long SizeBytes { get; set; }
}
