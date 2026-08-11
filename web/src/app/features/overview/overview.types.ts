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

export interface OverviewResponse {
  project: OverviewProject;
  totals: OverviewTotals;
  contracts: OverviewContract[];
  beneficiaries: OverviewBeneficiary[];
  alerts: OverviewAlerts;
  unavailable: OverviewUnavailable[];
}
