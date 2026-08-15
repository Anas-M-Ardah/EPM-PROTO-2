namespace Epm.Api.Domain;

/// <summary>
/// **ملحق الشكل 46** — «المراجعات لا تُحذف».
///
/// rule: a document's CURRENT revision is the highest revision number it has.
///       Every earlier one is `superseded` — ملغاة — and stays in the register
///       with its own date, transmittal number and file.
/// spec: the plate states it as a notice inside the detail panel: *«كل ملف جديد
///       يُنشئ مراجعة جديدة؛ المراجعة السابقة تبقى في السجل معلَّمة كملغاة، ولا
///       يوجد استبدال في المكان»*.
/// example: ST-DR-002 carries R1 (2026-02-19, TR-2417) and R2 (2026-05-31,
///          TR-2416) → current R2 «الحالية», R1 «ملغاة», and the register's row
///          shows R2's status.
///
/// ── WHY THIS IS A RULE AND NOT A QUERY ───────────────────────────────────
/// Three screens read "the current revision" — the register row, the folder
/// counts and the status filters — and all three have to agree. And the rule
/// is not "the newest date": a revision issued late with an earlier date is
/// still R1. The NUMBER orders them, which is what the plate's own R1/R2 labels
/// mean.
/// </summary>
public static class DocumentRevisions
{
    /// <param name="No">1, 2, 3 … — R1 · R2 · R3.</param>
    public record Revision(int No, string Status);

    /// <summary>ملغاة — kept, never deleted (`03 §9`'s rule, in another module).</summary>
    public const string Superseded = "superseded";

    /// <summary>
    /// The revision in force: the highest number. Null only when a document has
    /// no revisions at all, which the register renders as «لا مراجعات» rather
    /// than inventing an R1.
    /// </summary>
    public static Revision? Current(IReadOnlyList<Revision> revisions)
        => revisions.Count == 0 ? null : revisions.OrderByDescending(r => r.No).First();

    /// <summary>
    /// True when this revision has been superseded by a later one. The register
    /// marks it ملغاة and keeps everything else about it.
    /// </summary>
    public static bool IsSuperseded(int no, IReadOnlyList<Revision> revisions)
        => revisions.Any(r => r.No > no);

    /// <summary>
    /// «قيد المراجعة» — documents whose CURRENT revision is still a draft. Not
    /// the count of draft revisions: a drawing approved at R1 and re-issued as a
    /// draft R2 is under review, and one that was a draft at R1 and approved at
    /// R2 is not.
    /// </summary>
    public static int UnderReview(IReadOnlyList<IReadOnlyList<Revision>> documents)
        => documents.Count(d => Current(d)?.Status == "draft");
}
