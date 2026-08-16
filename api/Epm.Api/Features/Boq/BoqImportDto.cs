namespace Epm.Api.Features.Boq;

/// <summary>
/// Member names are IDENTICAL to web/src/app/features/boq/boq-import.types.ts
/// (CLAUDE.md §2). المسار 3 · الشكل 13.
/// </summary>

/// <summary>
/// One parsed row, as the wizard read it out of the file. The client does the
/// READING — a file is not business data until it is mapped — and the server
/// does every judgement about it.
/// </summary>
/// <param name="Row">1-based row number in the file, so a violation points somewhere.</param>
public record BoqImportRow(
    int Row,
    string Code,
    string Description,
    string Division,
    string Unit,
    decimal Qty,
    decimal Rate);

/// <param name="SheetType">«نوع الجدول» — initial · replace · revision.</param>
public record BoqImportPreviewRequest(
    string SheetType,
    IReadOnlyList<BoqImportRow> Rows);

public record BoqImportViolation(int Row, string Field, string MessageAr, string MessageEn);

/// <param name="Change">added · removed · changed · unchanged.</param>
public record BoqImportLine(
    string Code,
    string Description,
    string Change,
    decimal? BeforeQty,
    decimal? BeforeRate,
    decimal BeforeAmount,
    decimal? AfterQty,
    decimal? AfterRate,
    decimal AfterAmount);

/// <param name="Delta">After − before. Signed: an import can shrink a bill.</param>
public record BoqImportComparison(
    IReadOnlyList<BoqImportLine> Lines,
    int Added,
    int Removed,
    int Changed,
    int Unchanged,
    decimal BeforeTotal,
    decimal AfterTotal,
    decimal Delta);

/// <param name="CanSubmit">
/// False while any violation stands. Resolved SERVER-side so the wizard's submit
/// button and the endpoint cannot disagree — the same argument الشكل 8's «تعديل»
/// settles.
/// </param>
/// <param name="Weights">
/// BR-01 over the INCOMING amounts, in row order. Returned so the wizard can
/// show what the file would weigh at — and so «مجموع الأوزان 100.00%» is a
/// figure on screen rather than a claim.
/// </param>
public record BoqImportPreviewResponse(
    IReadOnlyList<BoqImportViolation> Violations,
    BoqImportComparison Comparison,
    IReadOnlyList<decimal> Weights,
    decimal WeightSum,
    bool CanSubmit);

/// <param name="FileName">Metadata only — no file is stored (CLAUDE.md §4).</param>
public record BoqImportSubmitRequest(
    string SheetType,
    string FileName,
    long FileSizeBytes,
    IReadOnlyList<BoqImportRow> Rows);

/// <summary>What was recorded, so the wizard can name the version it just made.</summary>
public record BoqImportVersionDto(
    int No,
    string State,
    string SheetType,
    string FileName,
    int ItemCount,
    decimal TotalAmount,
    decimal PreviousAmount,
    string ActorName,
    string ActorRole,
    string ActorParty,
    string At);
