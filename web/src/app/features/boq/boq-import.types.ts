/**
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/Boq/BoqImportDto.cs (CLAUDE.md §2).
 *
 * المسار 3 · الشكل 13 — استيراد جدول الكميات.
 */

/** One parsed row. `row` is 1-based IN THE FILE, so a violation points somewhere. */
export interface BoqImportRow {
  row: number;
  code: string;
  description: string;
  division: string;
  unit: string;
  qty: number;
  rate: number;
}

export interface BoqImportViolation {
  row: number;
  field: string;
  messageAr: string;
  messageEn: string;
}

export interface BoqImportLine {
  code: string;
  description: string;
  /** added · removed · changed · unchanged. */
  change: string;
  beforeQty: number | null;
  beforeRate: number | null;
  beforeAmount: number;
  afterQty: number | null;
  afterRate: number | null;
  afterAmount: number;
}

export interface BoqImportComparison {
  lines: BoqImportLine[];
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
  beforeTotal: number;
  afterTotal: number;
  /** Signed — an import can shrink a bill. */
  delta: number;
}

export interface BoqImportPreviewResponse {
  violations: BoqImportViolation[];
  comparison: BoqImportComparison;
  /** BR-01 over the incoming amounts, in row order. */
  weights: number[];
  /** 100.00 whenever the bill totals more than zero (D-07). */
  weightSum: number;
  /** Resolved server-side; the submit button never decides for itself. */
  canSubmit: boolean;
}

export interface BoqImportVersionDto {
  no: number;
  /**
   * submitted · approved · superseded · lapsed. At most one version per
   * contract is `submitted` — EP-BOQ-10 lapses an earlier pending one on a new
   * submission, EP-BOQ-13 lapses any other on approval — which is what lets
   * boq.page.ts draw ONE pending bar.
   */
  state: string;
  sheetType: string;
  fileName: string;
  itemCount: number;
  totalAmount: number;
  previousAmount: number;
  actorName: string;
  actorRole: string;
  actorParty: string;
  at: string;
  /** Who approved it (المسار 3 step 7) — empty until approved. */
  approverName: string;
  approverRole: string;
  approverParty: string;
  approvedAt: string | null;
}
