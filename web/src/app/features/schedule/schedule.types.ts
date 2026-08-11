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
}
