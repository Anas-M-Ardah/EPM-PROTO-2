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
  /** «الكلفة المقررة» — الشكل 27 prints it as the revised card's comparison. */
  approvedCost: number;
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

/**
 * One READING of the whole project — الشكل 25's table: التاريخ · المادي ·
 * المالي · المصدر · المستخدم, one row per date. NOT one row per contract
 * event; that detail is the audit log's, and the section's footer links there.
 */
export interface ProgressUpdateRow {
  at: string;
  physical: number;
  financial: number;
  /** The party that endorsed the reading, RECORDED — never a label by row index. */
  source: string;
  by: string;
}

/**
 * الشكل 25's «مرجع المقارنة», resolved server-side by
 * `api/Epm.Api/Domain/ComparisonPeriod.cs` — one earlier READING that every
 * tile's delta is measured from, not a baseline picker (P-198).
 *
 * The deltas arrive computed. Subtracting two readings in the browser would be
 * arithmetic, and `CLAUDE.md §3.1` gives Angular none.
 */
export interface ProgressPeriod {
  /** previous · quarter · start */
  id: string;
  /** False when the record cannot support the span. Still rendered, disabled. */
  available: boolean;
  whyAr: string | null;
  whyEn: string | null;
  /** The reading compared against. Null for بداية المشروع, which uses zero. */
  priorAt: string | null;
  priorPhysical: number;
  priorFinancial: number;
  /** Points, signed. */
  physicalDelta: number;
  financialDelta: number;
}

/**
 * The threshold band on each of الأشكال 25–28's KPI cards, resolved by
 * `api/Epm.Api/Domain/TileThreshold.cs`. One member per tile that HAS a band —
 * revised cost, cumulative spend, critical count and levels-complete are
 * magnitudes and have none (P-199).
 *
 * `'ok' | 'warn' | 'bad' | 'none'`, typed loosely here for the same reason
 * every other code column is: the vocabulary is the server's.
 */
export interface ProgressTileStates {
  physical: string;
  financial: string;
  delay: string;
  indices: string;
  wbsRollup: string;
  wbsGap: string;
  eac: string;
  vac: string;
  pendingOrders: string;
  delayCost: string;
  negativeFloat: string;
  atRisk: string;
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
  updates: ProgressUpdateRow[];
  periods: ProgressPeriod[];
  defaultPeriod: string;
  /** Z10's «آخر تحديث للإنجاز» — the newest reading, not the data date. */
  lastUpdateAt: string | null;
  tileStates: ProgressTileStates;
  /**
   * الملخص's «منحنى الإنجاز». Month ends from `Domain/ProgressSeries.Monthly`,
   * the same function SCR-W1's curve is drawn from. **EMPTY when the series is
   * not drawable** — the tile is then not rendered (P-144).
   *
   * Shaped to `CurvePeriod` in `shared/scurve.component.ts`, member for member.
   */
  curve: ProgressCurvePeriod[];
}

export interface ProgressCurvePeriod {
  /** The month end. The CLIENT labels it — `fmt.month`, as SCR-W1 does. */
  at: string;
  planCum: number;
  /** Null before the first RECORDED update — the line starts where the log does. */
  actCum: number | null;
  planPeriod: number;
  actPeriod: number;
}
