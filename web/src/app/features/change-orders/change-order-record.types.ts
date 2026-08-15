/**
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/ChangeOrders/ChangeOrderRecordDto.cs (CLAUDE.md §2).
 *
 * SCR-W8's RECORD — `03 §9` and ملحق الأشكال 30–34. Six tabs, one response.
 * Every figure here arrives DERIVED from Domain/ChangeOrderRecord; nothing in
 * this feature multiplies a quantity by a rate.
 */

export interface RecordColumn {
  /** Null when this party has not proposed — «بانتظار القرار», never 0. */
  qtyAfter: number | null;
  /** الشكل 31's «سعر الزائد» — the rate beyond 20%, and only that. */
  rateShown: number | null;
  amountAfter: number | null;
  impact: number | null;
  atRateQty: number;
  excessQty: number;
  tripsThreshold: boolean;
  weight: number | null;
}

export interface RecordLine {
  code: string;
  descriptionAr: string;
  descriptionEn: string;
  unit: string;
  changeType: string;
  contractedQty: number;
  beforeQty: number;
  beforeRate: number;
  beforeAmount: number;
  beforeWeight: number;
  /** 20% of the ORIGINAL quantity (D-01) — the plate's «حد 20% = …». */
  threshold: number;
  applyStatus: string;
  contractor: RecordColumn;
  reDept: RecordColumn;
  approved: RecordColumn;
  applied: RecordColumn;
}

export interface RecordWeightRow {
  code: string;
  descriptionAr: string;
  descriptionEn: string;
  before: number;
  proposed: number | null;
  approvedWeight: number | null;
  applied: number | null;
  delta: number;
}

export interface RecordWeightImpact {
  sumBefore: number;
  sumAfter: number;
  valid: boolean;
  lastRecalculated: string | null;
  state: string;
  rows: RecordWeightRow[];
}

export interface RecordRedistribution {
  sourceCode: string;
  sourceDescriptionAr: string;
  sourceDescriptionEn: string;
  targetCode: string | null;
  targetDescriptionAr: string | null;
  targetDescriptionEn: string | null;
  drawn: number;
  distributed: number;
  difference: number;
  money: number;
  applyStatus: string;
}

export interface RecordActivity {
  activityId: string;
  nameAr: string;
  nameEn: string;
  changeType: string;
  progressPct: number;
  remainingBefore: number;
  requestedDeltaDays: number | null;
  analysisDays: number | null;
  approvedDeltaDays: number | null;
  remainingApproved: number | null;
  startBefore: string | null;
  finishBefore: string | null;
  finishApproved: string | null;
  isCritical: boolean;
  applyStatus: string;
}

export interface RecordTimeImpact {
  affectedActivities: number;
  requestedDays: number;
  analysisDays: number | null;
  approvedDays: number | null;
  finishBefore: string | null;
  finishForecast: string | null;
  finishApproved: string | null;
  affectsCriticalPath: boolean;
  affectsFinish: boolean;
  activities: RecordActivity[];
}

export interface RecordExternalParty {
  /** The row id — EP-WFL-02 records against it. */
  id: number;
  partyAr: string;
  partyEn: string;
  /** wait · in · back · na (`03 §3`). */
  state: string;
  canCancel: boolean;
  letterNo: string | null;
  letterDate: string | null;
  /** The delegate who wrote it down — never the decider (`03 §4`). */
  recordedBy: string | null;
  note: string | null;
}

export interface RecordStage {
  stageNo: number;
  nameAr: string;
  nameEn: string;
  ownerParty: string;
  /** A LABEL for an English reader — nothing matches on it (BR-14 uses the Arabic). */
  ownerPartyEn: string;
  status: string;
  /** False ⇒ skipped, and `skipReason` says why (`03 §2`). */
  applicable: boolean;
  skipReason: string | null;
  sentAt: string | null;
  actionedAt: string | null;
  elapsedDays: number;
  slaDays: number;
  breached: boolean;
  decision: string | null;
  decisionNote: string | null;
  noteAr: string;
  noteEn: string;
  externalReceived: number;
  externalRequired: number;
  external: RecordExternalParty[];
}

export interface RecordTransaction {
  referredOn: string | null;
  daysElapsed: number;
  breached: boolean;
  leadTimeDays: number;
  stalledAtAr: string | null;
  stalledAtEn: string | null;
}

export interface RecordApplyStep {
  no: number;
  /** Its number in `03 §6`'s seven, or null for the two الشكل 30 adds. */
  specStep: number | null;
  nameAr: string;
  nameEn: string;
  status: string;
  message: string | null;
  completedAt: string | null;
}

export interface RecordPreInput {
  partyAr: string;
  partyEn: string;
  actAr: string;
  actEn: string;
  letterNo: string;
  letterDate: string | null;
  state: string;
}

export interface RecordAttachment {
  fileName: string;
  category: string;
  version: number;
  uploadedAt: string | null;
  uploadedByAr: string;
  uploadedByEn: string;
  stageNo: number | null;
  stageNameAr: string | null;
  stageNameEn: string | null;
}

export interface RecordAuditEntry {
  at: string;
  actorAr: string;
  actorEn: string;
  action: string;
  stageNo: number | null;
  stageNameAr: string | null;
  stageNameEn: string | null;
  field: string | null;
  previousValue: string | null;
  newValue: string | null;
  note: string | null;
  version: number;
}

export interface RecordImpactSummary {
  contractorValue: number | null;
  reDeptValue: number | null;
  approvedValue: number | null;
  linesOverTier: number;
  /** fixed · awaiting · na. */
  excessRateState: string;
  requestedDays: number;
  approvedDays: number | null;
  affectedLines: number;
  affectedActivities: number;
}

export interface RecordContractImpact {
  valueBefore: number;
  orderValue: number | null;
  valueAfter: number | null;
  /** issued · pending · none — `02 §9`'s whole point. */
  amendmentState: string;
  amendmentNo: number | null;
  finishAfter: string | null;
  /** recalculated · unchanged. */
  penaltyState: string;
}

export interface RecordDecision {
  contractorValue: number | null;
  contractorDays: number | null;
  reDeptValue: number | null;
  reDeptDays: number | null;
  approvedValue: number | null;
  approvedDays: number | null;
  differenceValue: number | null;
  differenceDays: number | null;
  reason: string | null;
  decisionDate: string | null;
  authority: string | null;
  excessRateAuthority: string | null;
}

export interface RecordCard {
  lifecycle: string;
  stageNameAr: string | null;
  stageNameEn: string | null;
  ageDays: number;
  requestedValue: number | null;
  approvedValue: number | null;
  differenceValue: number | null;
  contractValueAfter: number | null;
  requestedDays: number;
  approvedDays: number | null;
  contractualFinish: string | null;
}

export interface ChangeOrderRecordResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  dataDate: string | null;
  viewerId: string;
  viewerParty: string;
  viewerIsDelegate: boolean;

  no: string;
  contractId: string;
  contractNameAr: string;
  contractNameEn: string;
  titleAr: string;
  titleEn: string;
  type: string;
  lifecycle: string;
  justification: string;
  responsibleParty: string;
  incomingNo: string;
  incomingDate: string | null;

  relation: { key: string; canAct: boolean; stageNameAr: string | null; stageNameEn: string | null };
  exceptions: { code: string; labelAr: string; labelEn: string }[];
  card: RecordCard;

  preInputs: RecordPreInput[];
  impact: RecordImpactSummary;
  contract: RecordContractImpact;
  decision: RecordDecision;
  applySteps: RecordApplyStep[];

  lines: RecordLine[];
  netContractor: number | null;
  netReDept: number | null;
  netApproved: number | null;
  weights: RecordWeightImpact;
  redistribution: RecordRedistribution[];

  time: RecordTimeImpact;

  stages: RecordStage[];
  transaction: RecordTransaction;

  attachments: RecordAttachment[];
  audit: RecordAuditEntry[];
  /** الشكل 30's «منتقي الأمر». */
  siblings: RecordSibling[];
}

/**
 * What EP-WFL-01…03 answer with. Identical to
 * ChangeOrderWorkflowEndpoints.WorkflowResult (CLAUDE.md §2).
 */
export interface WorkflowResult {
  no: string;
  lifecycle: string;
  currentStageNo: number | null;
  /** Arabic, and written by the endpoint — the toast says what actually happened. */
  message: string;
}

/** الشكل 30's «منتقي الأمر» — one of the project's other orders. */
export interface RecordSibling {
  no: string;
  titleAr: string;
  titleEn: string;
  lifecycle: string;
  isCurrent: boolean;
}
