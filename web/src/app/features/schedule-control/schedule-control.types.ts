/**
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/ScheduleControl/ScheduleControlDto.cs, so
 * `grep -rn "delayDrivenBy" api web` finds both ends (CLAUDE.md §2).
 */

export interface ScheduleRow {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  workspaceCode: string;
  workspaceNameAr: string;
  workspaceNameEn: string;
  branch: string;
  status: string;
  contractCount: number;
  /** The EFFECTIVE contractual finish in force (BR-09). Null when no contract. */
  baselineFinish: string | null;
  /** The original finish, shown as "was …" when an applied amendment moved it. */
  originalFinish: string | null;
  /** Latest RECORDED forecast. Null is "not recorded", which is not "on time". */
  forecastFinish: string | null;
  /** Worst per-contract delay (BR-10). Null when no forecast is recorded. */
  delayDays: number | null;
  /** The contract that delayDays came from — makes the figure traceable. */
  delayDrivenBy: string | null;
  /** Always null until Phase 4.3 registers Activities. */
  criticalActivities: number | null;
  scheduleImported: boolean;
}

export interface ScheduleCounts {
  total: number;
  delayed: number;
  onTrack: number;
  /** Neither delayed nor on track — delayed + onTrack + noSchedule = total. */
  noSchedule: number;
  /** Mean across the delayed projects only. */
  avgDelayDays: number;
}

export interface ScheduleUnavailable {
  key: string;
  needsAr: string;
  needsEn: string;
}

export interface ScheduleResponse {
  rows: ScheduleRow[];
  total: number;
  counts: ScheduleCounts;
  unavailable: ScheduleUnavailable[];
}
