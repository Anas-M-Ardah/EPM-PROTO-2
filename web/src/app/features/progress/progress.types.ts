/**
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/Progress/ProgressDto.cs, so
 * `grep -rn "achievedAmount" api web` finds both ends (CLAUDE.md §2).
 */

export interface ProgressHeadline {
  /** Weight-rolled BOQ progress across every contract (BR-04, 02 §4). */
  physical: number;
  /** Disbursed ÷ effective value. PAID only, never merely certified (P-26). */
  financial: number;
  /** What the baseline requires at the data date. An assumption — see P-53. */
  planned: number;
  /** BR-10's own figure. Null when no forecast is recorded. */
  delayDays: number | null;
  baselineFinish: string | null;
  forecastFinish: string | null;
}

/** BR-11 — DIAGNOSTICS. 13px, --on-surface-variant, never coloured by threshold. */
export interface ProgressEvm {
  budget: number;
  pv: number;
  ev: number;
  ac: number;
  /** Null before any cost — an em dash, never a 0 that asserts failure (P-09). */
  cpi: number | null;
  spi: number | null;
  eac: number | null;
  vac: number | null;
}

export interface ProgressActivity {
  activityId: string;
  nameAr: string;
  nameEn: string;
  contractId: string;
  wbsPath: string;
  status: string;
  progressPct: number;
  plannedPct: number;
  absoluteWeight: number;
  originalDuration: number;
  remainingDuration: number;
  isMilestone: boolean;
  isCritical: boolean;
  baselineStart: string | null;
  baselineFinish: string | null;
  /** The BOQ lines this activity feeds. Empty = its progress earns nothing. */
  boqCodes: string[];
}

export interface ProgressContributor {
  activityId: string;
  nameAr: string;
  nameEn: string;
  sharePct: number;
  progressPct: number;
}

export interface ProgressBoq {
  code: string;
  descriptionAr: string;
  descriptionEn: string;
  contractId: string;
  unit: string;
  effectiveQty: number;
  amount: number;
  progress: number;
  achievedQty: number;
  achievedAmount: number;
  remainingValue: number;
  coverage: string;
  contributors: ProgressContributor[];
}

export interface ProgressContract {
  id: string;
  nameAr: string;
  nameEn: string;
  status: string;
  effectiveValue: number;
  executed: number;
  physical: number;
  planned: number;
  activities: number;
  boqLines: number;
}

/**
 * الشكل 26 — one WBS node's rollup. «محسوب صعودًا من الأنشطة، لا يُدخل يدويًا»:
 * there is no write path to any figure here.
 */
export interface ProgressWbs {
  path: string;
  nameAr: string;
  nameEn: string;
  level: number;
  contractId: string;
  progress: number;
  planned: number;
  /** Progress − planned, SIGNED. Never coloured by its sign. */
  gap: number;
  weight: number;
  activities: number;
  isComplete: boolean;
}

/** الشكل 27's six cards. Every figure is a READING of one already computed. */
export interface ProgressCostImpact {
  disbursed: number;
  revisedCost: number;
  disbursedPct: number;
  eac: number | null;
  vac: number | null;
  delayDays: number;
  /** `Domain/ScheduleImpact` — «تقدير غير تعاقدي لا يُطالَب به». */
  delayCostImpact: number;
  approvedOrders: number;
  approvedOrderCount: number;
  /** 02 §9 — counted, and carried into nothing. */
  pendingOrders: number;
  pendingOrderCount: number;
}

export interface ProgressAtRisk {
  activityId: string;
  nameAr: string;
  nameEn: string;
  contractId: string;
  status: string;
  isCritical: boolean;
  totalFloat: number;
  slipDays: number;
  baselineFinish: string | null;
  forecastFinish: string | null;
}

export interface ProgressScheduleRisk {
  delayDays: number;
  criticalCount: number;
  activityCount: number;
  /** «لا يمكن إنجازها في موعدها دون تسريع» — the plate's own words. */
  negativeFloat: number;
  atRiskCount: number;
  /** الشكل 28 prints the threshold on the card. */
  atRiskThresholdDays: number;
  atRisk: ProgressAtRisk[];
}

/** الشكل 25 — «كل سطر معتمد من قسم مصدره — لا يُحرَّر هنا». */
export interface ProgressUpdate {
  at: string;
  contractId: string;
  before: number | null;
  after: number;
  actorName: string;
  actorParty: string;
}

export interface ProgressResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  dataDate: string | null;
  headline: ProgressHeadline;
  evm: ProgressEvm;
  contracts: ProgressContract[];
  activities: ProgressActivity[];
  boqLines: ProgressBoq[];
  wbs: ProgressWbs[];
  costImpact: ProgressCostImpact;
  scheduleRisk: ProgressScheduleRisk;
  updates: ProgressUpdate[];
}
