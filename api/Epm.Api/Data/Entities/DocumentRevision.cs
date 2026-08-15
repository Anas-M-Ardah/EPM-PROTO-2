namespace Epm.Api.Data.Entities;

/// <summary>
/// مراجعة وثيقة — one issue of a document · **ملحق الشكل 46**.
///
/// ── «المراجعات لا تُحذف» ─────────────────────────────────────────────────
/// The plate says it in a notice of its own, inside the detail panel: *«كل ملف
/// جديد يُنشئ مراجعة جديدة؛ المراجعة السابقة تبقى في السجل معلَّمة كملغاة، ولا
/// يوجد استبدال في المكان»*. That is this table's entire reason for existing —
/// a revision is INSERTED, never updated, and the superseded one keeps its
/// file, its date and its transmittal number.
///
/// WHICH revision is current is therefore not a column: it is the highest
/// <see cref="No"/>, resolved by Domain/DocumentRevisions. A stored `isCurrent`
/// flag would be a second answer to a question the data already answers, and
/// the two would disagree the first time an old revision was inserted late.
/// </summary>
public class DocumentRevision
{
    public int Id { get; set; }

    /// <summary>→ Document.Id.</summary>
    public int DocumentId { get; set; }

    /// <summary>1, 2, 3 … rendered R1 · R2 · R3. Unique within the document.</summary>
    public int No { get; set; }

    public DateOnly? IssuedOn { get; set; }

    /// <summary>The office that issued THIS revision — it can differ from the document's.</summary>
    public string Issuer { get; set; } = "";

    /// <summary>«الإصدار الأولي» · «مطابقة للمنفَّذ» — what this revision was for.</summary>
    public string DescriptionAr { get; set; } = "";
    public string DescriptionEn { get; set; } = "";

    /// <summary>
    /// رقم التحويل — the transmittal the revision travelled on. It is per
    /// REVISION and not per document: the register prints TR-2416 against R2
    /// and TR-2417 against R1 of the same drawing.
    /// </summary>
    public string TransmittalNo { get; set; } = "";

    /// <summary>Name only — no bytes are stored in this prototype.</summary>
    public string FileName { get; set; } = "";

    /// <summary>
    /// Lookup `doc-status` — «حالة الإصدار»: approved معتمد · draft مسوّدة ·
    /// rejected مرفوض. It belongs to the REVISION, which is why a drawing can be
    /// approved at R1 and back in draft at R2.
    /// </summary>
    public string Status { get; set; } = "draft";
}
