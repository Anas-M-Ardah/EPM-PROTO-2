/**
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/ChangeOrders/ChangeOrderWizardDto.cs (CLAUDE.md §2).
 *
 * المسار 9's creation wizard — `03 §8` and ملحق الأشكال 37–42.
 *
 * The wizard holds the DRAFT and nothing else. Every figure it prints — the
 * 20% split, the revised quantity, the impact, the weights, the expected
 * approval path — arrives from EP-WIZ-02, computed by the same domain code the
 * record page reads.
 */

export interface WizardBoqLine {
  code: string;
  descriptionAr: string;
  descriptionEn: string;
  unit: string;
  division: string;
  divisionName: string;
  /** D-01 — the ORIGINAL quantity, which is the 20% basis. */
  contractedQty: number;
  executedQty: number;
  unitRate: number;
  amount: number;
  /** BR-01, fetched and never entered (`03 §8`). */
  weight: number;
  status: string;
}

export interface WizardActivity {
  activityId: string;
  nameAr: string;
  nameEn: string;
  wbsNames: string;
  start: string | null;
  finish: string | null;
  progressPct: number;
  remainingDuration: number;
  isCritical: boolean;
  status: string;
}

export interface WizardContract {
  id: string;
  nameAr: string;
  nameEn: string;
  status: string;
  /** BR-09 — the value IN FORCE: original plus APPLIED amendments only. */
  currentValue: number;
  finish: string | null;
  durationDays: number;
  lines: WizardBoqLine[];
  activities: WizardActivity[];
}

export interface WizardSourceResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  dataDate: string | null;
  viewerId: string;
  viewerParty: string;
  parties: string[];
  contracts: WizardContract[];
}

// ── what the wizard sends ────────────────────────────────────────────────

export interface WizardLineInput {
  code: string;
  changeType: string;
  contractorDeltaQty: number | null;
  contractorNewRate: number | null;
  contractorExcessRate: number | null;
  reDeptDeltaQty: number | null;
  reDeptNewRate: number | null;
  reDeptExcessRate: number | null;
  targetCode: string | null;
  drawnQty: number | null;
  distributedQty: number | null;
}

export interface WizardActivityInput {
  activityId: string;
  changeType: string;
  requestedDeltaDays: number | null;
  requestedStart: string | null;
  requestedFinish: string | null;
}

export interface WizardAttachmentInput {
  fileName: string;
  category: string;
  sizeBytes: number;
}

export interface WizardDraft {
  contractId: string;
  type: string;
  justification: string;
  responsibleParty: string;
  incomingNo: string;
  incomingDate: string | null;
  lines: WizardLineInput[];
  activities: WizardActivityInput[];
  attachments: WizardAttachmentInput[];
}

// ── what the preview returns ─────────────────────────────────────────────

export interface PreviewParty {
  qtyAfter: number | null;
  rateApplied: number | null;
  amountAfter: number | null;
  impact: number | null;
  /** الشكل 39's «ضمن 20%» half, as quantity AND money. */
  atRateQty: number;
  atRateCost: number;
  /** Its «أكثر من 20%» half. */
  excessQty: number;
  excessCost: number;
  tripsThreshold: boolean;
}

export interface PreviewLine {
  code: string;
  descriptionAr: string;
  descriptionEn: string;
  unit: string;
  changeType: string;
  contractedQty: number;
  unitRate: number;
  amountBefore: number;
  threshold: number;
  /** What a decrease may not exceed (BR-07). */
  remaining: number;
  weight: number;
  contractor: PreviewParty;
  reDept: PreviewParty;
  diverges: boolean;
}

export interface PreviewWeights {
  sumBefore: number;
  sumAfter: number;
  weightDelta: number;
  valid: boolean;
}

export interface PreviewSummary {
  selectedLines: number;
  selectedActivities: number;
  contractValue: number;
  contractorNet: number | null;
  reDeptNet: number | null;
  revisedValueContractor: number | null;
  revisedValueReDept: number | null;
  /** Always true — تقديرية until the pricing committee rules (D-08). */
  revisedValueIsIndicative: boolean;
  linesOverTier: number;
  excessRateState: string;
  requestedDays: number;
  approvedValueState: string;
}

export interface PreviewIssue {
  gate: string;
  ref: string | null;
  messageAr: string;
  messageEn: string;
  blocking: boolean;
}

export interface PreviewStage {
  stageNo: number;
  nameAr: string;
  nameEn: string;
  ownerParty: string;
  ownerPartyEn: string;
  applicable: boolean;
  skipReasonAr: string | null;
  skipReasonEn: string | null;
}

export interface WizardPreviewResponse {
  lines: PreviewLine[];
  summary: PreviewSummary;
  weights: PreviewWeights;
  /** Rendered from the ACTUAL conditions (`03 §8` step 5). */
  expectedPath: PreviewStage[];
  issues: PreviewIssue[];
  canSubmit: boolean;
}

export interface WizardCreateResponse {
  no: string;
  lifecycle: string;
  id: number;
}
