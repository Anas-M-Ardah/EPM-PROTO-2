/**
 * Member names are IDENTICAL to api/Epm.Api/Features/Boq/BoqDto.cs
 * (CLAUDE.md §2). `grep -rn "EP-BOQ-02" api web` returns every touchpoint.
 *
 * SCR-W4, ported from the v1.1 BOQ module — ../epm@design/system-revamp
 * app/boq-workspace.jsx:16 · app/boq-register.jsx:435 · app/boq-assign.jsx:11.
 *
 * NOTHING HERE IS COMPUTED IN THE BROWSER. Weight, share, assigned amount,
 * progress, coverage and distribution state all arrive derived from
 * api/Epm.Api/Domain/. The page formats them and nothing else.
 */

// ── EP-BOQ-01 · the contract gate ────────────────────────────────────────

export interface BoqContractOption {
  id: string;
  nameAr: string;
  nameEn: string;
  status: string;
  /** Lets the option say how big the bill is, and the empty state say which kind of empty it is. */
  itemCount: number;
}

export interface BoqGateResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  contracts: BoqContractOption[];
}

// ── EP-BOQ-02 · the register ─────────────────────────────────────────────

export interface BoqRow {
  code: string;
  descriptionAr: string;
  descriptionEn: string;
  unit: string;
  division: string;
  divisionName: string;
  /** imported · manual — the register badges a manual line. */
  source: string;
  /** Never overwritten, and what D-01 measures the 20% against. */
  originalQty: number;
  /** The EFFECTIVE quantity: Σ rate bands when re-priced, else the contracted one. */
  qty: number;
  rate: number;
  amount: number;
  /** BR-01 — sums to exactly 100.00 down the column. */
  weight: number;
  sharesTotal: number;
  /** weight × Σ shares ÷ 100. Below `weight` whenever coverage is not full. */
  assignedWeight: number;
  links: number;
  /** 06 §11 — unassigned · full · partial · over. */
  coverage: string;
  /** BR-04 — from the linked activities, never entered here. */
  progress: number;
  achievedAmount: number;
  achievedQty: number;
  distributed: number;
  remaining: number;
  /** 06 §10 — none · partial · full · over. */
  distributionState: string;
  banded: boolean;
  /** The SUPPLY sub-type's half of the line (D-14), or null on a works bill. */
  supply: BoqSupplyDetail | null;
}

/**
 * الفقرة التجهيزية (الأشكال 50–52) — the sub-type half of a row. Contracted
 * quantity, rate, amount and weight are NOT here: they are the base line's, so
 * a supply bill weighs and prices itself through the same rules a works bill
 * does. status · receivedPct · remainingQty all arrive derived from
 * api/Epm.Api/Domain/SupplyStatus.
 */
export interface BoqSupplyDetail {
  manufacturer: string;
  country: string;
  model: string;
  serialFrom: string;
  serialTo: string;
  suppliedQty: number;
  receivedQty: number;
  /** received · partial · supplied · pending. */
  status: string;
  receivedPct: number;
  remainingQty: number;
  warrantyMonths: number;
  warrantyExpiry: string | null;
  notes: string;
}

export interface BoqDivision {
  key: string;
  name: string;
  itemCount: number;
  amount: number;
  weight: number;
  achievedAmount: number;
  progress: number;
  links: number;
  hasOver: boolean;
}

export interface BoqTotals {
  itemCount: number;
  amount: number;
  /** Exactly 100.00 whenever there are rows — BR-01's promise, sent not assumed. */
  weight: number;
  achievedAmount: number;
  progress: number;
  links: number;
  contractOriginalValue: number;
  projectAmount: number;
}

export interface BoqRegisterResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  contractId: string;
  contractNameAr: string;
  contractNameEn: string;
  rows: BoqRow[];
  divisions: BoqDivision[];
  totals: BoqTotals;
  countByCoverage: Record<string, number>;
  countByDistribution: Record<string, number>;
  /** The project data date. "Now" is never the wall clock (D-06). */
  asOf: string;
  /**
   * works · supply · none (D-14) — the bill's SHAPE, from the project's type.
   * The page renders one column set off this rather than sniffing whether the
   * first row happens to carry `supply`: an empty supply bill has no rows to
   * sniff and still needs its own columns and its own empty state.
   */
  kind: string;
  /** Counts by supply status. Empty on a works bill. */
  countBySupplyStatus: Record<string, number>;
}

// ── EP-BOQ-03 · the inline row edit ──────────────────────────────────────

export interface BoqItemEdit {
  descriptionAr: string;
  descriptionEn: string;
  unit: string;
  qty: number;
  rate: number;
}

// ── EP-BOQ-12 · «الإدخال اليدوي» (المسار 3 step 3ب) ──────────────────────

/**
 * ONE SHAPE, TWO KINDS. `supply` is required on a supply bill and REFUSED on a
 * works one — the server rejects the wrong pairing rather than ignoring it, so
 * the form must send exactly what the bill's kind calls for.
 */
export interface BoqItemCreate {
  code: string;
  descriptionAr: string;
  descriptionEn: string;
  unit: string;
  qty: number;
  rate: number;
  division?: string;
  divisionName?: string;
  supply?: BoqSupplyInput;
}

export interface BoqSupplyInput {
  manufacturer?: string;
  country?: string;
  model?: string;
  serialFrom?: string;
  serialTo?: string;
  suppliedQty: number;
  receivedQty: number;
  warrantyMonths: number;
  warrantyExpiry?: string;
  notes?: string;
}

// ── EP-BOQ-05 / EP-BOQ-06 · the distribution drawer ──────────────────────

export interface BoqDistributionRow {
  beneficiaryCode: string;
  beneficiaryNameAr: string;
  beneficiaryNameEn: string;
  siteCode: string | null;
  qty: number;
  /** The most this row may hold: the line's quantity less every other row (02 §8). */
  cap: number;
}

export interface BoqContractBeneficiary {
  code: string;
  nameAr: string;
  nameEn: string;
}

export interface BoqDistributionResponse {
  contractId: string;
  code: string;
  descriptionAr: string;
  descriptionEn: string;
  unit: string;
  qty: number;
  distributed: number;
  remaining: number;
  excess: number;
  state: string;
  rows: BoqDistributionRow[];
  /** THIS PROJECT's beneficiaries only (02 §8, gate 2) — never the master list. */
  beneficiaries: BoqContractBeneficiary[];
}

export interface BoqDistributionInput {
  beneficiaryCode: string;
  siteCode: string | null;
  qty: number;
}

export interface BoqDistributionSave {
  rows: BoqDistributionInput[];
}

// ── EP-BOQ-07 · the activity-assignment view ─────────────────────────────

export interface BoqActivity {
  activityId: string;
  nameAr: string;
  nameEn: string;
  wbsPath: string;
  wbsNames: string;
  status: string;
  progress: number;
  absoluteWeightCost: number;
  /** Null when the P6 file carried no man-hours — the toggle then falls back to cost. */
  absoluteWeightManHours: number | null;
  isMilestone: boolean;
}

export interface BoqAllocationRow {
  activityId: string;
  activityNameAr: string;
  activityNameEn: string;
  wbsNames: string;
  activityWeight: number;
  activityProgress: number;
  /** The share in force — computed (BR-03) unless the line is overridden. */
  sharePct: number;
  /** What BR-03 says it would be. A reset restores this. */
  computedPct: number;
  assigned: number;
  absoluteWeight: number;
  isDuplicate: boolean;
}

export interface BoqAllocation {
  code: string;
  descriptionAr: string;
  descriptionEn: string;
  unit: string;
  qty: number;
  amount: number;
  weight: number;
  sharesTotal: number;
  coverage: string;
  /** The override is per BOQ ITEM, not per link (02 §3, P-47). */
  isManual: boolean;
  rows: BoqAllocationRow[];
}

export interface BoqAssignmentResponse {
  contractId: string;
  basis: string;
  manHoursAvailable: boolean;
  activities: BoqActivity[];
  items: BoqAllocation[];
  countByCoverage: Record<string, number>;
}

// ── EP-BOQ-08 · save one line's allocation ───────────────────────────────

export interface BoqAllocationInput {
  activityId: string;
  sharePct: number;
}

export interface BoqAllocationSave {
  /** True discards the override and restores BR-03's shares; `rows` is ignored. */
  reset: boolean;
  rows: BoqAllocationInput[];
}
