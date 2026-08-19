/**
 * ملحق الشكل 24 · المسار 4 — استيراد الجدول الزمني.
 *
 * Member names match `Features/Schedule/ScheduleImportDto.cs` exactly, so one
 * `grep` crosses the language boundary (CLAUDE.md §2).
 */

/** One activity as the WIZARD parsed it. Parsing is not business logic. */
export interface ScheduleImportRow {
  row: number;
  activityId: string;
  name: string;
  wbsPath: string;
  wbsNames: string;
  baselineStart: string | null;
  baselineFinish: string | null;
  budgetedCost: number;
  budgetedManHours: number | null;
  isMilestone: boolean;
  predecessors: string;
}

export interface ScheduleImportPreviewRequest {
  /** xer · p6xml · excel. */
  format: string;
  /** cost · manhours — BR-02's basis, chosen at import (02 §2). */
  basis: string;
  fileName: string;
  fileSizeBytes: number;
  rows: ScheduleImportRow[];
}

export interface ScheduleImportViolation {
  row: number;
  field: string;
  messageAr: string;
  messageEn: string;
}

export interface ScheduleImportChange {
  activityId: string;
  name: string;
  /** added · removed · moved. */
  kind: string;
  beforeFinish: string | null;
  afterFinish: string | null;
  slipDays: number;
}

export interface ScheduleImportImpact {
  added: number;
  removed: number;
  moved: number;
  unchanged: number;
  finishBefore: string | null;
  finishAfter: string | null;
  /** After − before. A programme that ends later is a claim on the contract. */
  contractFinishDelta: number;
  changes: ScheduleImportChange[];
}

export interface ScheduleImportPreviewResponse {
  contractId: string;
  format: string;
  basis: string;
  activityCount: number;
  totalCost: number;
  totalManHours: number;
  manHoursComplete: boolean;
  violations: ScheduleImportViolation[];
  impact: ScheduleImportImpact;
  /** The SERVER's answer, not the wizard's. */
  canSubmit: boolean;
}

export interface ScheduleImportVersion {
  id: number;
  no: number;
  /** submitted · approved · superseded. */
  state: string;
  format: string;
  basis: string;
  fileName: string;
  fileSizeBytes: number;
  activityCount: number;
  totalCost: number;
  finishBefore: string | null;
  finishAfter: string | null;
  contractFinishDelta: number;
  added: number;
  removed: number;
  moved: number;
  at: string;
  actorName: string;
  actorParty: string;
  approvedAt: string | null;
  approverName: string;
  approverParty: string;
}
