namespace Epm.Api.Features.Supply;

/// <summary>
/// الشكل 50 — one فقرة تجهيزية on the register.
///
/// THE SHARED HALF IS THE BILL'S. Code, unit, contracted quantity, unit rate,
/// amount and weight all come from `BoqItem` and run through BR-01 exactly as a
/// works line does (D-14); only the device half and the receipt figures are
/// this module's.
/// </summary>
/// <param name="Seq">1-based order within the bill — the receipt numbers use it.</param>
/// <param name="ReceivedQty">
/// DERIVED — Σ the item's WAREHOUSE receipts. الشكل 50's «الاستلام 95 / 111» is
/// what has ARRIVED, not what beneficiaries have collected.
/// </param>
/// <param name="HandedOverQty">
/// Σ its PRELIMINARY receipts — what beneficiaries have taken delivery of.
/// الشكل 56 prints both because they are different quantities.
/// </param>
public record SupplyItemRow(
    int Seq,
    string Code,
    string DescriptionAr,
    string DescriptionEn,
    string Unit,
    decimal ContractedQty,
    decimal Rate,
    decimal Amount,
    decimal Weight,
    string Device,
    string Manufacturer,
    string Country,
    string Model,
    string SerialFrom,
    string SerialTo,
    decimal SuppliedQty,
    decimal ReceivedQty,
    decimal HandedOverQty,
    decimal RemainingQty,
    decimal ReceivedPct,
    string Status,
    int WarrantyMonths,
    string? WarrantyExpiry,
    string Notes,
    int WarehouseReceipts,
    int PreliminaryReceipts,
    int Documents);

/// <param name="AllocatedQty">المخصص — from `BoqDistributions` (BR-08).</param>
/// <param name="ReceivedQty">المستلم — Σ this beneficiary's PRELIMINARY receipts.</param>
public record SupplyBeneficiaryRow(
    string Code,
    string NameAr,
    string NameEn,
    decimal AllocatedQty,
    decimal ReceivedQty);

public record SupplyReceiptDocDto(string TitleAr, string TitleEn, string FileName, long SizeBytes);

/// <param name="Kind">warehouse · preliminary.</param>
/// <param name="Party">
/// «المخزن» on a warehouse receipt, the beneficiary's name on a preliminary
/// one. الشكل 55's own column is «المخزن», and الشكل 56's is «الجهة أو المخزن» —
/// one column, whichever party the movement was with.
/// </param>
public record SupplyReceiptRow(
    int Id,
    string No,
    string Kind,
    string Date,
    decimal Qty,
    string Party,
    string Committee,
    string Conformity,
    string Notes,
    string ItemCode,
    string ItemDevice,
    int ItemSeq,
    IReadOnlyList<SupplyReceiptDocDto> Documents);

/// <param name="ItemCount">الشكل 50's footer — «الفقرات 7 / 7».</param>
/// <param name="ReceivedPct">Σ received ÷ Σ contracted, at the bill level.</param>
public record SupplyTotals(
    int ItemCount,
    decimal ContractedQty,
    decimal ReceivedQty,
    decimal RemainingQty,
    decimal ReceivedPct,
    decimal Amount,
    int Beneficiaries,
    int WarehouseReceipts,
    int PreliminaryReceipts);

/// <param name="CountByStatus">
/// الشكل 50's five filter chips, EVERY key present including the zeroes: a chip
/// that disappears when its count is nought is one whose absence has to be
/// interpreted.
/// </param>
public record SupplyRegisterResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string ContractId,
    string ContractNameAr,
    string ContractNameEn,
    string AsOf,
    IReadOnlyList<SupplyItemRow> Items,
    IReadOnlyList<SupplyReceiptRow> Receipts,
    SupplyTotals Totals,
    IReadOnlyDictionary<string, int> CountByStatus,
    bool CanRecord);

/// <summary>
/// الشكل 51 · الشكل 52 — the item detail panel: عام · التوزيع · الاستلامات ·
/// الكلفة · السجل, in one read.
/// </summary>
/// <param name="Documents">
/// الشكل 52's «أرشيف الفقرة» — the union of the item's receipts' documents,
/// which is what makes every file traceable to the movement it evidences.
/// </param>
public record SupplyItemDetailResponse(
    SupplyItemRow Item,
    IReadOnlyList<SupplyBeneficiaryRow> Beneficiaries,
    IReadOnlyList<SupplyReceiptRow> Receipts,
    IReadOnlyList<SupplyReceiptDocDto> Documents,
    decimal AllocatedQty,
    decimal UnallocatedQty,
    /// <summary>What may still be booked, per kind — الشكل 53/54's «المتبقي».</summary>
    decimal RemainingWarehouse,
    decimal RemainingPreliminary);

/// <summary>الشكل 53 · الشكل 54 — the two receipt drawers, one shape.</summary>
/// <param name="No">
/// NOT SENT. `Domain/SupplyReceipts.Number` generates it: the plates draw the
/// field «غير قابل للتحرير», and a number a person could type is one they could
/// duplicate.
/// </param>
public record SupplyReceiptInput(
    string Kind,
    string? Date,
    decimal Qty,
    string? Store,
    string? BeneficiaryCode,
    string? Committee,
    string? Conformity,
    string? Notes,
    IReadOnlyList<SupplyReceiptDocDto>? Documents);
