/**
 * Member names are IDENTICAL to api/Epm.Api/Features/Schedule/ScheduleDto.cs
 * (CLAUDE.md §2). `grep -rn "EP-SCD-02" api web` crosses both stacks.
 *
 * SCR-W5, ported from the v1.1 schedule module — ../epm@design/system-revamp
 * app/schedule-module.jsx `DGantt` :80 · `DSchedTable` :257 · `DModSchedule` :437.
 *
 * NOTHING HERE IS COMPUTED IN THE BROWSER except bar geometry, which is pixels.
 * Both weights, the roll-up, the slip and the timeline bounds arrive derived.
 */

// ── EP-SCD-01 · the contract gate ────────────────────────────────────────

export interface ScheduleContractOption {
  id: string;
  nameAr: string;
  nameEn: string;
  status: string;
  /** Zero means no P6 schedule has been imported for this contract. */
  activityCount: number;
}

export interface ScheduleGateResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  contracts: ScheduleContractOption[];
}

// ── EP-SCD-02 · the schedule ─────────────────────────────────────────────

export interface ScheduleRow {
  /** `wbs` — a container, never assignable · `act` — a leaf. */
  kind: string;
  id: string;
  nameAr: string;
  nameEn: string;
  /** Dotted WBS path. A subtree is hidden by matching this. */
  path: string;
  level: number;
  status: string;
  progress: number;
  baselineStart: string | null;
  baselineFinish: string | null;
  actualStart: string | null;
  actualFinish: string | null;
  forecastFinish: string | null;
  originalDuration: number;
  remainingDuration: number;
  totalFloat: number | null;
  /** A PATH property — a 2px ring, never a colour (04 §5). */
  isCritical: boolean;
  isMilestone: boolean;
  /** BR-02 — share of the PARENT WBS node. */
  relativeWeight: number;
  /** BR-02 — share of the CONTRACT (see P-50). */
  absoluteWeight: number;
  budgetedCost: number;
  calendar: string;
  predecessors: string;
  /** Forecast − baseline in days. SIGNED: negative is early. */
  slipDays: number | null;
  /**
   * `04 §6` — the amendment badge, or null when no approved order has touched
   * this activity. Always null on a WBS node: an order extends an ACTIVITY.
   */
  amendment: ScheduleAmendmentMark | null;
  /** ملحق الشكل 21 — BR-04's achieved amount on this activity. */
  earnedValue: number;
  /** «المتبقي المالي» — cost less earned. */
  remainingValue: number;
  /** «الأثر المالي» — D-15 on this activity; null unless it has slipped. */
  delayCost: number | null;
}

export interface ScheduleAmendmentSource {
  no: string;
  isApplied: boolean;
}

/** The schedule half of ROADMAP 4.5. An activity moves DAYS, not quantities. */
export interface ScheduleAmendmentMark {
  count: number;
  appliedCount: number;
  pendingCount: number;
  /** applied · pending · mixed. */
  state: string;
  originalRemaining: number;
  /** Effective − original remaining. SETTLED — already inside the row's dates. */
  deltaDays: number;
  /** What the approved-unapplied orders would add. Null when none awaits application. */
  pendingDeltaDays: number | null;
  sources: ScheduleAmendmentSource[];
}

// ── EP-SCD-03 · the drawer behind the badge ──────────────────────────────

export interface ScheduleAmendmentStep {
  no: string;
  at: string | null;
  isApplied: boolean;
  remainingFrom: number;
  remainingTo: number;
  finishFrom: string | null;
  finishTo: string | null;
}

export interface ScheduleAmendmentDetail {
  activityId: string;
  nameAr: string;
  nameEn: string;
  count: number;
  appliedCount: number;
  pendingCount: number;
  state: string;
  originalRemaining: number;
  effectiveRemaining: number;
  pendingRemaining: number | null;
  originalFinish: string | null;
  effectiveFinish: string | null;
  pendingFinish: string | null;
  chain: ScheduleAmendmentStep[];
}

export interface ScheduleTimeline {
  origin: string;
  end: string;
  /** The project data date — where the `--viz-base` line goes (D-06). */
  dataDate: string;
  months: string[];
}

export interface ScheduleSummary {
  activities: number;
  milestones: number;
  critical: number;
  delayed: number;
  /** Weight-rolled-up, not the mean of the activity percentages. */
  averageProgress: number;
  basis: string;
  manHoursAvailable: boolean;
  /** ملحق الشكل 21's headline — «الإنجاز المخطط (خط الأساس)». */
  baselineFinish: string | null;
  /** «الإنجاز المتوقع». */
  forecastFinish: string | null;
  /** «التأخر», SIGNED — ahead of baseline is negative. */
  delayDays: number | null;
  /** «أدنى عوم كلي» — Z10's third stat. */
  minFloat: number | null;
}

export interface ScheduleResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  contractId: string;
  contractNameAr: string;
  contractNameEn: string;
  rows: ScheduleRow[];
  timeline: ScheduleTimeline;
  summary: ScheduleSummary;
  countByStatus: Record<string, number>;
  /** الشكل 23's third view. Empty when nothing has slipped. */
  impact: ScheduleImpactRow[];
  impactSummary: ScheduleImpactSummary;
  /** الشكل 23's «مرشح إصدار خط الأساس». */
  baselines: ScheduleBaselineOption[];
}

/**
 * الشكل 23 — one affected activity, baseline beside current. The pair is what
 * makes a 26-day slip inside 26 days of float read differently from the same
 * slip inside none.
 */
export interface ScheduleImpactRow {
  activityId: string;
  nameAr: string;
  nameEn: string;
  status: string;
  isCritical: boolean;
  baselineStart: string | null;
  baselineFinish: string | null;
  currentStart: string | null;
  currentFinish: string | null;
  durationBefore: number;
  durationAfter: number;
  floatBefore: number;
  floatAfter: number;
  slipDays: number;
  cost: number;
  dailyRate: number;
  dailyOverhead: number;
  /** `Domain/ScheduleImpact` — an ESTIMATE, and the screen says so. */
  costImpact: number;
}

export interface ScheduleImpactSummary {
  affectedCount: number;
  nowCriticalCount: number;
  totalCostImpact: number;
  /** D-15 — sent so the explainer states the rule the figures came from. */
  overheadPct: number;
  /** ملحق الشكل 23's «مضافة» — activities the baseline does not contain. */
  addedCount: number;
}

export interface ScheduleBaselineOption {
  id: string;
  labelAr: string;
  labelEn: string;
  takenAt: string;
  isCurrent: boolean;
}
