/**
 * الفقرات التجهيزية — ملحق الأشكال 50–56.
 *
 * Member names match `Features/Supply/SupplyDto.cs` exactly, so one `grep`
 * crosses the language boundary (CLAUDE.md §2).
 */

export interface SupplyItemRow {
  seq: number;
  code: string;
  descriptionAr: string;
  descriptionEn: string;
  unit: string;
  contractedQty: number;
  rate: number;
  amount: number;
  /** BR-01 — this line's share of the bill, largest-remainder rounded. */
  weight: number;
  device: string;
  manufacturer: string;
  country: string;
  model: string;
  serialFrom: string;
  serialTo: string;
  suppliedQty: number;
  /** DERIVED — Σ WAREHOUSE receipts. What has ARRIVED, not what was collected. */
  receivedQty: number;
  /** Σ PRELIMINARY receipts — what beneficiaries have taken delivery of. */
  handedOverQty: number;
  remainingQty: number;
  receivedPct: number;
  /** received · partial · supplied · pending — `Domain/SupplyStatus`. */
  status: string;
  warrantyMonths: number;
  warrantyExpiry: string | null;
  notes: string;
  warehouseReceipts: number;
  preliminaryReceipts: number;
  documents: number;
}

export interface SupplyBeneficiaryRow {
  code: string;
  nameAr: string;
  nameEn: string;
  /** المخصص — BR-08's distribution. */
  allocatedQty: number;
  /** المستلم — Σ this beneficiary's preliminary receipts. */
  receivedQty: number;
}

export interface SupplyReceiptDoc {
  titleAr: string;
  titleEn: string;
  fileName: string;
  sizeBytes: number;
}

export interface SupplyReceiptRow {
  id: number;
  no: string;
  /** warehouse · preliminary. */
  kind: string;
  date: string;
  qty: number;
  /** The store on a warehouse receipt, the beneficiary on a preliminary one. */
  party: string;
  committee: string;
  conformity: string;
  notes: string;
  itemCode: string;
  itemDevice: string;
  itemSeq: number;
  documents: SupplyReceiptDoc[];
}

export interface SupplyTotals {
  itemCount: number;
  contractedQty: number;
  receivedQty: number;
  remainingQty: number;
  receivedPct: number;
  amount: number;
  beneficiaries: number;
  warehouseReceipts: number;
  preliminaryReceipts: number;
}

export interface SupplyRegisterResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  contractId: string;
  contractNameAr: string;
  contractNameEn: string;
  asOf: string;
  items: SupplyItemRow[];
  receipts: SupplyReceiptRow[];
  totals: SupplyTotals;
  /** Every key, including the zeroes — الشكل 50's five chips. */
  countByStatus: Record<string, number>;
  /** لجنة الفحص والاستلام or مدير المشروع. Checked again on the server. */
  canRecord: boolean;
}

export interface SupplyItemDetailResponse {
  item: SupplyItemRow;
  beneficiaries: SupplyBeneficiaryRow[];
  receipts: SupplyReceiptRow[];
  /** أرشيف الفقرة — the union of its receipts' documents (الشكل 52). */
  documents: SupplyReceiptDoc[];
  allocatedQty: number;
  unallocatedQty: number;
  /** الشكل 53's «المتبقي» — what may still arrive. */
  remainingWarehouse: number;
  /** الشكل 54's — what has arrived and not yet been handed over. */
  remainingPreliminary: number;
}

export interface SupplyReceiptInput {
  kind: string;
  date: string;
  qty: number;
  store: string;
  beneficiaryCode: string;
  committee: string;
  conformity: string;
  notes: string;
  documents: SupplyReceiptDoc[];
}
