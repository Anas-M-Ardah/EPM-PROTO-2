/**
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/ChangeOrders/ChangeOrdersDto.cs (CLAUDE.md §2).
 */

export interface ViewerRelation {
  /** `awaiting` · `recorder` · `acted` · `upcoming` · `none` — exactly one (BR-14). */
  key: string;
  /** `03 §7`'s gating rule, decided on the SERVER. Never recomputed here. */
  canAct: boolean;
  stageNameAr: string | null;
  stageNameEn: string | null;
}

export interface ExceptionChip {
  /** `overdue` · `sla-breached` · `apply-failed` · `awaiting-rate-fixing`. */
  code: string;
  labelAr: string;
  labelEn: string;
}

export interface ChangeOrderRow {
  id: number;
  no: string;
  contractId: string;
  titleAr: string;
  titleEn: string;
  type: string;
  lifecycle: string;
  justification: string;
  responsibleParty: string;
  incomingNo: string;
  incomingDate: string | null;
  /** The figure that GOVERNS — approved once there is one, RE dept until then (02 §6). */
  value: number;
  valueIsApproved: boolean;
  days: number;
  /** BR-12, measured from the project DATA DATE (D-06). */
  leadDays: number;
  currentStageNo: number | null;
  currentStageNameAr: string | null;
  currentStageNameEn: string | null;
  currentOwner: string | null;
  lastActionDate: string | null;
  attachments: number;
  relation: ViewerRelation;
  exceptions: ExceptionChip[];
}

export interface ChangeOrderGroup { key: string; count: number; }

/** `03 §10`: five compact indicators only — no large cards, no charts. */
export interface ChangeOrderIndicators {
  netApproved: number;
  pending: number;
  needsAction: number;
  overdue: number;
  /** Null when nothing has closed — an average of nothing is not zero (P-09). */
  avgCycleDays: number | null;
}

export interface ChangeOrdersResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  dataDate: string | null;
  viewerId: string;
  viewerParty: string;
  viewerIsDelegate: boolean;
  /** The «بانتظار إجرائي» count — depends on who is looking. */
  awaitingMe: number;
  indicators: ChangeOrderIndicators;
  groups: ChangeOrderGroup[];
  rows: ChangeOrderRow[];
}
