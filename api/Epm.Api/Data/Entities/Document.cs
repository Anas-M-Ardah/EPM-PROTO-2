namespace Epm.Api.Data.Entities;

/// <summary>
/// وثيقة أو مخطط — SCR-W12 · **ملحق الشكل 46**.
///
/// ── THE DOCUMENT IS THE IDENTITY; THE REVISION IS THE FILE ───────────────
/// The old shape carried `Revision`, `Status` and `FileName` on the document
/// itself, which makes a new revision an UPDATE — and الشكل 46 forbids exactly
/// that in its own words: «كل ملف جديد يُنشئ مراجعة جديدة؛ المراجعة السابقة تبقى
/// في السجل معلَّمة كملغاة، ولا يوجد استبدال في المكان».
///
/// So those three columns move to <see cref="DocumentRevision"/>, and what
/// stays here is what does NOT change when a new drawing is issued: the number,
/// the discipline, the title and the office that issues it.
/// </summary>
public class Document
{
    public int Id { get; set; }

    public string ProjectId { get; set; } = "";

    /// <summary>AR-DR-001 … — the number the register is read by.</summary>
    public string Code { get; set; } = "";

    public string TitleAr { get; set; } = "";
    public string TitleEn { get; set; } = "";

    /// <summary>
    /// Lookup `doc-discipline` — الشكل 46's folders: معماري · إنشائي · كهربائي ·
    /// ميكانيكي · مدني وبنى تحتية · تقارير ومراسلات.
    /// </summary>
    public string Discipline { get; set; } = "";

    /// <summary>«جهة الإصدار» — the office the document comes from.</summary>
    public string Issuer { get; set; } = "";
}
