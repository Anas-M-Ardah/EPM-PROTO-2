/**
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/ContractTab/ContractDto.cs, so
 * `grep -rn "projectionValue" api web` finds both ends (CLAUDE.md §2).
 *
 * The FEATURE is `contract-tab`, not `contract`, on both sides: a .NET
 * namespace `Epm.Api.Features.Contract` shadows the `Contract` ENTITY for every
 * file under `Epm.Api.Features.*`, and `Fixture.cs` stopped compiling. See P-43.
 */

export interface ContractRow {
  id: string;
  nameAr: string;
  nameEn: string;
  status: string;
  /** The awarded value. NEVER overwritten. */
  originalValue: number;
  /** Original + Σ APPLIED deltas (BR-09). */
  effectiveValue: number;
  start: string;
  originalFinish: string;
  effectiveFinish: string;
  /** Applied amendments — the ones in force. */
  addenda: number;
  /** Approved but NOT applied. Never folded in. */
  pending: number;
  /** Σ net of PAID payments. */
  disbursed: number;
  contractor: string;
  /** المكوّن — الشكل 6's card prints it under the contractor. */
  component: string;
  /** BR-04, from this contract's own bill. Null when there is none to roll up. */
  physicalPct: number | null;
  /**
   * Disbursed ÷ **كلفة العقد الكلية** (إحالة+احتياط+إشراف), NOT ÷ effective —
   * الشكل 7 fixes that denominator: «22 % من كلفة العقد الكلية». The PROJECT bar
   * in `ContractRegisterTotals.spentPct` uses the effective value instead,
   * because الشكل 6 labels that one «الصرف من القيمة النافذة». Two bars, two
   * questions, and each names its own denominator on screen.
   */
  spentPct: number | null;
}

export interface ContractRegisterTotals {
  contractCount: number;
  originalValue: number;
  /** Signed — a decrease keeps its minus. */
  addendaImpact: number;
  effectiveValue: number;
  projectionValue: number;
  addenda: number;
  pending: number;
  disbursed: number;
  certified: number;
  /** القيمة النافذة − المصروف — الشكل 6 prints it beside المصروف. */
  remaining: number;
  /** «الصرف من القيمة النافذة» — disbursed ÷ EFFECTIVE value. */
  spentPct: number | null;
  /** «الإنجاز المادي المرجّح بقيمة كل عقد». Null when nothing is measurable. */
  weightedPhysicalPct: number | null;
  periodStart: string | null;
  periodFinish: string | null;
  /** The project's data date (D-06) — الشكل 6's footer «البيانات حتى». */
  dataDate: string | null;
}

export interface ContractRegisterResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  rows: ContractRow[];
  totals: ContractRegisterTotals;
  countByStatus: Record<string, number>;
}

export interface AmendmentVersion {
  no: number;
  /** original · superseded · effective · pending · partial (06 §8). */
  state: string;
  sourceChangeOrderId: string | null;
  date: string | null;
  deltaValue: number;
  deltaDays: number;
  /** The running contract value AFTER this link. */
  value: number;
  finish: string;
  durationDays: number;
  applied: boolean;
}

export interface PenaltyImpact {
  daysBefore: number;
  amountBefore: number;
  capBefore: number;
  daysAfter: number;
  amountAfter: number;
  capAfter: number;
  /** What the applied amendments bought. */
  waived: number;
  /** الغرامة اليومية before and after — BR-10 computed it all along (الشكل 10). */
  perDayBefore: number;
  perDayAfter: number;
  perDayPct: number;
  capPct: number;
  /** True when no forecast finish is recorded — nothing is known about lateness. */
  unavailable: boolean;
}

export interface ContractPayment {
  no: number;
  kind: string;
  financeLetterNo: string;
  financeLetterDate: string | null;
  grossAmount: number;
  retentionAmount: number;
  advanceRecovery: number;
  netAmount: number;
  certifiedDate: string | null;
  paidDate: string | null;
  status: string;
  note: string;
  /** تفصيل الدفعة لهذا العقد — الشكل 9. `spent` is null: the portion IS the spend. */
  portions: CostLine[];
  /** المرفقات — the finance letter and, on a مستخلص, the measurement sheet. */
  files: PaymentFile[];
}

/** One attachment behind a payment (الشكل 9). Metadata only — nothing is stored. */
export interface PaymentFile {
  titleAr: string;
  titleEn: string;
  fileName: string;
  sizeBytes: number;
}

export interface CostLine {
  key: string;
  amount: number;
  /** Σ of the matching payment portion over the PAID payments, or null on a portion row. */
  spent: number | null;
}

export interface ContractDetail {
  id: string;
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  nameAr: string;
  nameEn: string;
  status: string;
  contractor: string;
  consultant: string;
  start: string;
  originalFinish: string;
  effectiveFinish: string;
  forecastFinish: string | null;
  delayDays: number | null;
  originalDurationDays: number;
  effectiveDurationDays: number;
  originalValue: number;
  effectiveValue: number;
  projectionValue: number;
  incomingNo: string;
  incomingDate: string | null;
  component: string;
  executingParty: string;
  contactInfo: string;
  awardAmount: number;
  reserveAmount: number;
  supervisionAmount: number;
  monitoringAmount: number;
}

/**
 * الشكل 7's middle card. Every figure here shares ONE denominator — كلفة العقد
 * الكلية — and the card names it on screen: «22 % من كلفة العقد الكلية».
 */
export interface ContractMoney {
  /** Σ net of PAID payments. */
  disbursed: number;
  /** كلفة العقد الكلية — الإحالة + الاحتياط + الإشراف. */
  totalCost: number;
  /** كلفة العقد الكلية − المصروف: 520,200,000 − 112,841,143 = 407,358,857. */
  remaining: number;
  /** المصروف ÷ كلفة العقد الكلية — the headline AND «الإنجاز المالي», one figure. */
  spentPct: number | null;
  /** الإنجاز المادي — BR-04 over this contract's bill. Null when there is none. */
  physicalPct: number | null;
  costLines: CostLine[];
}

export interface ContractUnavailable {
  key: string;
  needsAr: string;
  needsEn: string;
}

export interface ContractDetailResponse {
  contract: ContractDetail;
  money: ContractMoney;
  /** The chain in force: row 0 is the original contract. */
  versions: AmendmentVersion[];
  /** Approved but not applied — a projection, never chained into `versions`. */
  pending: AmendmentVersion[];
  penalty: PenaltyImpact;
  payments: ContractPayment[];
  unavailable: ContractUnavailable[];
  /** سجل النشاط — الشكل 11, newest first. The same rows EP-CON-03/04 write. */
  events: ContractEvent[];
  /** Resolved server-side. الشكل 8's «زر تعديل» renders from this. */
  can: ContractPermissions;
}

// ───────────────────────────────────────────────────────────────────────────
// المسار 2 — إنشاء العقود وربطها بالمشروع
// Mirrors api/Epm.Api/Features/ContractTab/ContractDto.cs, member for member.
// ───────────────────────────────────────────────────────────────────────────

/**
 * المسار 2 steps 2–4: هوية العقد والمكوّن وحالته · المبالغ · التواريخ وبيانات
 * المقاول.
 *
 * Dates are ISO strings, not Date objects — they cross the wire as strings, the
 * <input type="date"> reads and writes strings, and converting twice in the
 * middle only creates somewhere for a timezone to be applied by accident.
 *
 * No `originalDurationDays`: it is derived from the two dates on the server
 * (ContractDefinition.DurationDays). A third number would be a third chance to
 * contradict the two it comes from.
 */
export interface ContractDefinitionInput {
  id: string | null;
  nameAr: string | null;
  nameEn: string | null;
  component: string | null;
  status: string | null;
  awardAmount: number | null;
  reserveAmount: number | null;
  supervisionAmount: number | null;
  monitoringAmount: number | null;
  start: string | null;
  finish: string | null;
  contractor: string | null;
  executingParty: string | null;
  consultant: string | null;
  contactInfo: string | null;
  incomingNo: string | null;
  incomingDate: string | null;
}

/** One failed clause of المسار 2 step 5. `field` matches a member above. */
export interface ContractViolation {
  field: string;
  messageAr: string;
  messageEn: string;
}

/**
 * سجل النشاط — one row of الشكل 11, newest first.
 *
 * «عرض التغيير بصيغة القيمة السابقة مشطوبة ← القيمة الجديدة»: an edit row
 * names the field and carries both values, so the line states what moved.
 */
export interface ContractEvent {
  id: number;
  /** created · updated · change-order · progress. */
  action: string;
  /** user · system — «تمييز أحداث النظام الآلية عن أحداث المستخدمين». */
  source: string;
  /** The definition member that moved. Null on anything but an edit. */
  field: string | null;
  before: string | null;
  after: string | null;
  /** «VO-03» — the change order an automatic event came from. */
  refId: string | null;
  note: string | null;
  actorName: string;
  actorRole: string;
  actorParty: string;
  at: string;
}

export interface ContractPermissions {
  edit: boolean;
}

export interface ContractDefinitionResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  definition: ContractDefinitionInput;
  events: ContractEvent[];
  can: ContractPermissions;
}
