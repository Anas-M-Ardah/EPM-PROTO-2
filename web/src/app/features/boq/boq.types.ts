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
  /**
   * `04 §6` — the amendment badge and the cell delta, or null when no approved
   * order has ever touched this line. Null rather than a zeroed object: an
   * untouched row prints no badge, and a count of 0 is a badge.
   */
  amendment: BoqAmendmentMark | null;
}

export interface BoqAmendmentSource {
  no: string;
  /** From the LINE's own applied delta — a partial apply moves some lines and not others. */
  isApplied: boolean;
}

/**
 * `Domain/AmendmentDisclosure` decides `state`; this carries it and the two
 * deltas the cell prints beneath its figure.
 */
export interface BoqAmendmentMark {
  count: number;
  appliedCount: number;
  pendingCount: number;
  /** applied · pending · mixed. */
  state: string;
  originalQty: number;
  originalAmount: number;
  /** Effective − original. SETTLED — already inside the row's own `qty`. */
  deltaQty: number;
  deltaAmount: number;
  /** What the approved-unapplied orders would add. Null when none is awaiting application. */
  pendingDeltaQty: number | null;
  pendingDeltaAmount: number | null;
  sources: BoqAmendmentSource[];
}

// ── EP-BOQ-17 · the drawer behind the badge ──────────────────────────────

export interface BoqAmendmentStep {
  no: string;
  at: string | null;
  isApplied: boolean;
  qtyFrom: number;
  qtyTo: number;
  amountFrom: number;
  amountTo: number;
  /** BR-05's re-priced portion, attributed to the order that introduced it. */
  excessQty: number;
  excessRate: number | null;
}

export interface BoqAmendmentBand {
  qty: number;
  rate: number;
  amount: number;
  isExcess: boolean;
  sourceNo: string | null;
}

export interface BoqAmendmentDetail {
  code: string;
  descriptionAr: string;
  descriptionEn: string;
  unit: string;
  count: number;
  appliedCount: number;
  pendingCount: number;
  state: string;
  originalQty: number;
  originalAmount: number;
  effectiveQty: number;
  effectiveAmount: number;
  blendedRate: number;
  banded: boolean;
  pendingQty: number | null;
  pendingAmount: number | null;
  chain: BoqAmendmentStep[];
  bands: BoqAmendmentBand[];
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
  /** DERIVED — Σ the item's WAREHOUSE receipts (المسار 11), never stored. */
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
  // NO receivedQty: a new item has received nothing, and what it receives
  // later is a محضر (المسار 11 · EP-SUP-04) rather than a field.
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

// ── EP-BOQ-14 / 15 / 16 · «العروض» saved views (ملحق الشكل 12) ────────────

/**
 * A named set of register controls, restored by one click.
 *
 * A RECORD, NOT A BROWSER PREFERENCE. The reference holds these in
 * localStorage; here they are rows owned by the X-Epm-User persona, so a view
 * survives the session and one user never sees another's. See
 * api/Epm.Api/Data/Entities/BoqSavedView.cs for the reasoning.
 *
 * `sortKey`/`sortDir` are the reference's `sort: { k, d }`, split in two.
 */
export interface BoqSavedView {
  id: number;
  name: string;
  query: string;
  /** The 06 §11 coverage chip. Empty string means «الكل». */
  coverage: string;
  /** The column keys that are SHOWN. A key absent from the grid is ignored. */
  visibleColumns: string[];
  /** The sorted column, or empty for the bill's own order (code within division). */
  sortKey: string;
  /** asc · desc. Ignored when `sortKey` is empty. */
  sortDir: string;
}

/** Saving a view. A name that already exists updates that view rather than failing. */
export interface BoqSavedViewInput {
  name: string;
  query: string;
  coverage: string;
  visibleColumns: string[];
  sortKey: string;
  sortDir: string;
}

// ── EP-PRJ-05 / 06 · «الجهات المستفيدة» (ملحق الشكل 12) ───────────────────

/**
 * One WORKSPACE, with this project's use of it as a beneficiary (P-174). There
 * is no second master list — «جهة مستفيدة» is a ROLE a workspace plays on a
 * project, and `Projects.BeneficiaryCodes` is a CSV of `Workspaces.Code`.
 *
 * Member names match `ProjectBeneficiaryRow` in
 * api/Epm.Api/Features/Projects/ProjectsDto.cs — the endpoints live in the
 * PROJECTS feature because the tick writes `Projects.BeneficiaryCodes`, even
 * though the drawer opens from the BOQ toolbar.
 */
export interface ProjectBeneficiaryRow {
  code: string;
  nameAr: string;
  nameEn: string;
  /** Lookup kind `workspace-kind` (P-68). NOT `beneficiary-type`, which is gone. */
  kind: string;
  /** The ministry's own state. Independent of `assigned`. */
  active: boolean;
  /** The tick — does THIS project use it. */
  assigned: boolean;
}
