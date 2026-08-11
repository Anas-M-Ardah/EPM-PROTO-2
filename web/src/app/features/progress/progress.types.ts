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
}
