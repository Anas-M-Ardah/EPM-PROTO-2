namespace Epm.Api.Features.Documents;

/// <summary>
/// Member names are IDENTICAL to
/// web/src/app/features/documents/documents.types.ts (CLAUDE.md §2).
///
/// SCR-W12 — الوثائق والمخططات · **ملحق الشكل 46**.
/// </summary>

/// <param name="Superseded">ملغاة — kept in the register, never removed.</param>
public record RevisionRow(
    int No,
    string? IssuedOn,
    string Issuer,
    string DescriptionAr,
    string DescriptionEn,
    string TransmittalNo,
    string FileName,
    string Status,
    bool Superseded,
    /// <summary>P-267 — the reason on a rejection, an optional note on an approval.</summary>
    string? DecisionNote,
    string? DecidedByUserId,
    string? DecidedAt);

/// <param name="Decision">`approve` or `reject` — المسار 12 step 6 / 5أ.</param>
/// <param name="Note">Required on `reject` («رفض المراجعة مع بيان السبب»).</param>
public record DocumentDecisionInput(string Decision, string? Note);

/// <param name="CurrentRevisionNo">
/// The highest revision number — DERIVED by Domain/DocumentRevisions, never a
/// stored flag. Null when a document has no revision at all, which the register
/// prints as «لا مراجعات» rather than inventing an R1.
/// </param>
/// <param name="Status">
/// «حالة الإصدار» of the CURRENT revision. A drawing approved at R1 and
/// re-issued as a draft R2 reads مسوّدة, which is what «قيد المراجعة» counts.
/// </param>
public record DocumentRow(
    string Code,
    string TitleAr,
    string TitleEn,
    string Discipline,
    string Issuer,
    int? CurrentRevisionNo,
    string? CurrentIssuedOn,
    string? CurrentTransmittalNo,
    string Status,
    int RevisionCount,
    IReadOnlyList<RevisionRow> Revisions);

/// <param name="Code">`all` for «كل الوثائق», otherwise the discipline code.</param>
public record DisciplineFolder(string Code, int Count);

/// <summary>
/// P-253 — `EP-DOC-02`'s body. Mirrors the reference's own real `upload(id)`
/// (`project-modules.jsx:2161-2174`) field-for-field: a new file is always a
/// NEW revision, never a replacement in place.
/// </summary>
public record RevisionInput(
    string? IssuedOn, string Issuer, string? DescriptionAr, string? DescriptionEn,
    string TransmittalNo, string FileName);

public record DocumentsResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string? DataDate,
    /// <summary>«14 وثيقة · 21 مراجعة» — the Z6 counter.</summary>
    int DocumentCount,
    int RevisionCount,
    /// <summary>«قيد المراجعة» — documents whose CURRENT revision is a draft.</summary>
    int UnderReview,
    IReadOnlyList<DisciplineFolder> Folders,
    /// <summary>The status chips: الكل · معتمد · مسوّدة · مرفوض, counted by current revision.</summary>
    IReadOnlyList<DisciplineFolder> Statuses,
    IReadOnlyList<DocumentRow> Rows);
