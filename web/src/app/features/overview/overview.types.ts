/**
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/Overview/OverviewDto.cs, so
 * `grep -rn "projectionValue" api web` finds both ends (CLAUDE.md §2).
 */

export interface OverviewProject {
  id: string;
  nameAr: string;
  nameEn: string;
  status: string;
  type: string;
  executionStage: string;
  fundingType: string;
  region: string;
  priority: string;
  branch: string;
  executor: string;
  workspaceCode: string;
  workspaceNameAr: string;
  workspaceNameEn: string;
  /** The project's own "now" (D-06). Never the wall clock. */
  dataDate: string | null;
  updatedAt: string | null;
}

export interface OverviewContract {
  id: string;
  nameAr: string;
  nameEn: string;
  status: string;
  /** The awarded value. NEVER overwritten. */
  originalValue: number;
  /** Original + Σ APPLIED amendment deltas (BR-09) — the value in force. */
  effectiveValue: number;
  start: string;
  originalFinish: string;
  /** Original finish + Σ applied delta days (BR-09). */
  effectiveFinish: string;
  forecastFinish: string | null;
  /** BR-10. Null when no forecast is recorded — which is not "on time". */
  delayDays: number | null;
  appliedAmendments: number;
  /** Approved but NOT applied. Never folded into the effective figures. */
  pendingAmendments: number;
  contractor: string;
  consultant: string;
}

export interface OverviewBeneficiary {
  code: string;
  nameAr: string;
  nameEn: string;
  type: string;
  /** The 01 §2.1 parent — a faculty's university. Null at the root. */
  parentNameAr: string | null;
  parentNameEn: string | null;
  /** False means it may not receive new quantity (01 §2.1). */
  active: boolean;
}

export interface OverviewTotals {
  originalValue: number;
  /** The project value: Σ contract effective values (BR-00). Never stored. */
  effectiveValue: number;
  /** What it WOULD be with every approved-but-unapplied amendment applied. */
  projectionValue: number;
  contractCount: number;
  appliedAmendments: number;
  pendingAmendments: number;
  delayDays: number | null;
  delayDrivenBy: string | null;
  /** REAL since Phase 4.4 (BR-04). Null until a contract has a bill to roll up. */
  physical: number | null;
  /** الشكل 4 prints the actual figure «مقابل مخطط» — they travel together. */
  planned: number | null;
  /** Disbursed ÷ effective value. PAID only, never merely certified (P-26). */
  financial: number | null;
  /** BR-11, against the planned figure P-53 derives. Null without a schedule. */
  spi: number | null;
  /** BR-11. Null before any money has actually been paid. */
  cpi: number | null;
  /** الشكل 4's «الحد المقبول 0.95» — a threshold somebody set, not a derivation. */
  acceptableIndex: number;
}

export interface OverviewAlerts {
  open: number;
  critical: number;
  warning: number;
  info: number;
}

export interface OverviewUnavailable {
  key: string;
  needsAr: string;
  needsEn: string;
}

/**
 * One module of الشكل 4's «خط سير المراحل».
 *
 * `id` matches the rail's module id (features/workspace/project-modules.ts) —
 * that is what lets the strip, the sidebar and the next-action link agree.
 *
 * `state` is one of: not-available · not-started · in-progress · needs-attention.
 * Deliberately NOT الشكل 4's approval words (معتمد · جاهز للمراجعة · مُعاد
 * بملاحظات): nothing in this system can say them truthfully.
 */
export interface OverviewModule {
  id: string;
  state: string;
  rows: number;
  waiting: number;
}

/** Modules STARTED out of modules AVAILABLE — الشكل 4's «4/8», honestly renamed. */
export interface OverviewProgress {
  started: number;
  available: number;
}

/** «الإجراء التالي المطلوب», or null when nothing is waiting. */
export interface OverviewNextAction {
  moduleId: string;
  reason: string;
  waiting: number;
}

/** الشكل 4's identity line. Three of these belong to the lead CONTRACT. */
export interface OverviewIdentity {
  beneficiaryAr: string | null;
  beneficiaryEn: string | null;
  contractor: string | null;
  consultant: string | null;
  type: string;
  fundingType: string;
  region: string;
  start: string | null;
  contractualFinish: string | null;
  /** More than one, and the dates above are the largest contract's. */
  contractCount: number;
}

/** الشكل 4's cost line and spend ratio. */
export interface OverviewCost {
  approved: number;
  revised: number;
  delta: number;
  spent: number;
  remaining: number;
  spendPct: number | null;
}

/** One point of الشكل 4's first chart. */
export interface OverviewProgressPoint {
  at: string;
  /** Derived from the baselines. Null when no baseline exists. */
  planned: number | null;
  /** Recorded, or the screen's own physical figure at the data date. */
  actual: number;
}

/** One card of الشكل 4's «التنبيهات النشطة». */
export interface OverviewAlertCard {
  id: number;
  severity: string;
  kind: string;
  titleAr: string;
  titleEn: string;
  raisedAt: string;
  targetRef: string | null;
  /** Where the card opens. Null when it points at nothing this screen reaches. */
  moduleId: string | null;
}

/** One period of an S-curve. The CLIENT labels it — «ش1» is a language call. */
export interface OverviewCurvePeriod {
  at: string;
  planCum: number;
  /** Null before the first measurement: the line starts where the record does. */
  actCum: number | null;
  planPeriod: number;
  actPeriod: number;
}

export interface OverviewResponse {
  project: OverviewProject;
  identity: OverviewIdentity;
  totals: OverviewTotals;
  cost: OverviewCost;
  progressSeries: OverviewProgressPoint[];
  /** «التقدم التراكمي · مخطط مقابل فعلي». */
  progressCurve: OverviewCurvePeriod[];
  /** «المنحنى المالي · الصرف المخطط مقابل الفعلي». */
  costCurve: OverviewCurvePeriod[];
  alerts: OverviewAlerts;
  alertCards: OverviewAlertCard[];
  unavailable: OverviewUnavailable[];
  modules: OverviewModule[];
  progress: OverviewProgress;
  nextAction: OverviewNextAction | null;
}
