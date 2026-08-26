/**
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/Financials/FinancialsDto.cs, so
 * `grep -rn "advanceOutstanding" api web` finds both ends (CLAUDE.md §2).
 */

export interface FinancialsTotals {
  /** Σ ORIGINAL contract values — the cost as awarded (BR-00). */
  approved: number;
  /** Σ APPLIED amendment deltas (BR-09). */
  approvedChanges: number;
  /** Approved-but-unapplied. A PROJECTION — in none of the totals (02 §9). */
  pendingChanges: number;
  revised: number;
  /** Σ net of PAID certificates. Never merely certified (P-26). */
  disbursed: number;
  /** Σ net of certificates certified and NOT yet paid — money owed, not moved. */
  certified: number;
  /** Withheld from PAID certificates. A liability the ministry still owes. */
  retentionHeld: number;
  /** Advances paid, less what PAID certificates recovered. Owed BY the contractor. */
  advanceOutstanding: number;
  /** budgetRevised − disbursed — «المتبقي», the equation’s last term. */
  balance: number;
  /** disbursed ÷ budgetRevised (§23-1). Null on a zero basis, never 0. */
  spendPct: number | null;
  /**
   * «الكلفة المقررة» — the RECORDED budget, and الشكل 14’s first term. NOT
   * `approved`: the plate runs its equation on the budget while its own table
   * footer totals the commitments.
   */
  budgetApproved: number;
  budgetChanges: number;
  /** «الكلفة المعدلة» — what الإنجاز المالي is a percentage OF (§23-1, P-44). */
  budgetRevised: number;
  /** recorded · commitments — which basis the four figures above are on. */
  budgetSource: string;
  /** مصروف السنة — the filtered year only, across every contract. */
  spentYear: number;
  /**
   * «أساسا القياس» — الشكل 14 sets the RECORDED budget against what the
   * contracts commit, and the gap is the point.
   */
  contractCommitments: number;
  /** budgetRevised − contractCommitments. Null on the commitments basis. */
  budgetGap: number | null;
}

export interface FinancialsComponent {
  key: string;
  labelAr: string;
  labelEn: string;
  original: number;
  /** An applied change moves the AWARD only — never reserve or supervision. */
  chg: number;
  revised: number;
  spentYear: number;
  spentToDate: number;
  /**
   * NULL on a component, always: BR-11 forecasts from a CPI and an expense
   * item has no earned value of its own to form one (P-90).
   */
  forecast: number | null;
  variance: number | null;
}

export interface FinancialsContract {
  id: string;
  nameAr: string;
  nameEn: string;
  status: string;
  original: number;
  chg: number;
  revised: number;
  disbursed: number;
  certified: number;
  retentionHeld: number;
  advanceOutstanding: number;
  balance: number;
  paymentCount: number;
  spentYear: number;
  /** عند الإنجاز — BR-11’s EAC on this contract. Null until it has spent. */
  forecast: number | null;
  /** Revised − forecast. Negative means the forecast overruns the budget. */
  variance: number | null;
  components: FinancialsComponent[];
}

export interface FinancialsPayment {
  id: number;
  contractId: string;
  contractNameAr: string;
  contractNameEn: string;
  no: number;
  kind: string;
  status: string;
  financeLetterNo: string;
  financeLetterDate: string | null;
  grossAmount: number;
  retentionAmount: number;
  advanceRecovery: number;
  netAmount: number;
  certifiedDate: string | null;
  /** Null is the certified-but-unpaid state, not an error and not "today". */
  paidDate: string | null;
  /** «سجّلتها …» — الشكل 16's attribution, copied onto the row at registration. */
  recordedByName: string;
  recordedByRole: string;
  recordedByParty: string;
  note: string;
}

/**
 * One fiscal year on الشكل 15. The ALLOCATION is recorded; the spend, the
 * remainder and the consumption are derived from it and from the payments
 * whose money moved in that year.
 */
export interface FinancialsAllocation {
  year: number;
  allocated: number;
  spent: number;
  /** Allocated − spent. Negative means the year overspent its release. */
  remaining: number;
  /** Null when nothing was released: no consumption to report is not 0%. */
  consumptionPct: number | null;
  /** «سجلّ مقفل» — a closed year moves only by an approved transfer. */
  closed: boolean;
  actorName: string;
  actorRole: string;
  actorParty: string;
  at: string | null;
}

/** One contract's share of a funding letter, split across the three items. */
export interface FinancialsLetterShare {
  contractId: string;
  contractNameAr: string;
  contractNameEn: string;
  status: string;
  award: number;
  reserve: number;
  supervision: number;
  net: number;
}

/**
 * الشكل 16 — one FUNDING LETTER, which can cover more than one contract. The
 * grouping is derived from `Payment.FinanceLetterNo`; nothing new is stored.
 */
export interface FinancialsLetter {
  letterNo: string;
  letterDate: string | null;
  contractCount: number;
  net: number;
  /** Distinct statuses inside the letter — two means paid on one contract only. */
  statuses: string[];
  shares: FinancialsLetterShare[];
  /** «سجّلتها …» — empty where none was recorded, and the panel then says nothing. */
  recordedByName: string;
  recordedByRole: string;
  recordedByParty: string;
}

/** One desk on a certificate’s route — الشكل 17’s stage card. */
export interface FinancialsAuditStage {
  no: number;
  stageKey: string;
  partyAr: string;
  partyEn: string;
  capDays: number;
  startedAt: string | null;
  finishedAt: string | null;
  /** Days at this desk. Null before it received the file. */
  elapsedDays: number | null;
  /** done · current · overdue · waiting — BR-12 against the data date. */
  state: string;
  /** Whether THIS viewer may release the file from THIS desk (EP-FIN-03). */
  canRelease: boolean;
}

/**
 * مهلة تدقيق السلفة الجارية — ONE certificate: the one with an OPEN DESK.
 * A paid one has no lead time left to watch. Certified before pending (P-99).
 */
export interface FinancialsAuditSla {
  /** EP-FIN-03's target. */
  paymentId: number;
  contractId: string;
  contractNameAr: string;
  contractNameEn: string;
  paymentNo: number;
  /** pending · certified — what the route has made of it so far. */
  status: string;
  letterNo: string;
  /** within · overdue. */
  overallState: string;
  /** مسار 8 step 6 — derived from an overdue desk, never recorded. */
  escalated: boolean;
  legalDueDate: string | null;
  /** Due − data date. Negative once the date has passed. */
  daysToDue: number | null;
  currentStageAr: string | null;
  currentStageEn: string | null;
  stages: FinancialsAuditStage[];
}

export interface FinancialsResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  dataDate: string | null;
  totals: FinancialsTotals;
  contracts: FinancialsContract[];
  payments: FinancialsPayment[];
  /** التخصيص السنوي — one row per fiscal year, newest first (الشكل 15). */
  allocations: FinancialsAllocation[];
  /** سجل الدفعات — one row per funding letter, newest first (الشكل 16). */
  letters: FinancialsLetter[];
  /** مهل التدقيق — the certificate in flight, or null (الشكل 17). */
  auditSla: FinancialsAuditSla | null;
  /** Years carrying a paid certificate, newest first — the filter’s options. */
  years: number[];
  /** The year in force, or null for «كل السنوات». */
  year: number | null;
  /** البيانات المالية المسجّلة — الشكل 18's card. */
  records: FinancialsRecords;
  /** سجل التغييرات المالية — الشكل 19's timeline, newest first. */
  changes: FinancialsChange[];
}

/**
 * الشكل 18. Member names match `FinancialsRecordsDto` in
 * api/Epm.Api/Features/Financials/FinancialsDto.cs.
 *
 * FOUR OF THE EIGHT ARE STORED and the other four are derived — spend is
 * Σ payments (P-92), retention is paid-only (P-26), planned % is P-53's curve.
 * `editable` names the four the save will accept, and the form renders the rest
 * read-only rather than offering a control the save would ignore.
 */
export interface FinancialsRecords {
  /** «كلفة المشروع المقررة» — the RECORDED budget. Null until one is recorded. */
  approvedCost: number | null;
  /** «كلفة المشروع المعدلة» — الشكل 14's equation ends on this. */
  revisedCost: number | null;
  annualAllocation: number | null;
  spentYear: number | null;
  spentToDate: number;
  retentionHeld: number;
  /** «حالة المناقلة» — lookup `transfer-state`. Null means none recorded. */
  transferState: string | null;
  /** «نسبة الإنجاز المخطط» — P-53's curve. Null before a schedule exists. */
  plannedProgressPct: number | null;
  /** Keys wearing الشكل 18's «مقترح» tag. */
  suggested: string[];
  /** Which fiscal year `annualAllocation` belongs to. */
  year: number | null;
  /** The keys EP-FIN-04 accepts. */
  editable: string[];
  /** Whether THIS viewer holds `CanEditFinancialRecords` (الدائرة المالية). */
  canEdit: boolean;
  /** «سجل مقفل» — the year in view moves only by an approved transfer. */
  yearLocked: boolean;
}

/**
 * One financial event — الشكل 19. `kind` is payment · amendment · allocation ·
 * record, and all four of the plate's kinds are now real.
 *
 * `before`/`after` carry a money pair; `beforeText`/`afterText` carry a lookup
 * code, because money must render as money.
 */
export interface FinancialsChange {
  kind: string;
  ref: string;
  at: string;
  titleAr: string;
  titleEn: string;
  amount: number | null;
  before: number | null;
  after: number | null;
  actorName: string;
  actorRole: string;
  actorParty: string;
  beforeText: string | null;
  afterText: string | null;
}

// ── EP-FIN-02 · ملحق الشكل 20 — «تسجيل دفعة» ─────────────────────────────

/** One document behind a certificate. Metadata only; no bytes are stored. */
export interface PaymentAttachmentInput {
  titleAr: string;
  titleEn: string;
  fileName: string;
  sizeBytes: number;
}

/**
 * الشكل 20's five steps as one payload. THE NET IS NOT SENT — it is
 * `gross − retention − advanceRecovery` and the server computes it, because a
 * client-sent net can disagree with its own components.
 */
export interface PaymentRegisterInput {
  contractId: string;
  kind: string;
  grossAmount: number;
  retentionAmount: number;
  advanceRecovery: number;
  /** الشكل 9's split across the three expense items. Σ must equal the net. */
  awardPortion: number;
  reservePortion: number;
  supervisionPortion: number;
  financeLetterNo: string;
  financeLetterDate: string;
  note: string;
  attachments: PaymentAttachmentInput[];
}

export interface PaymentRegisterResult {
  id: number;
  /** «دفعة N» — sequential on the contract, NOT an official code (P-79). */
  no: number;
  contractId: string;
  netAmount: number;
}

// ── EP-FIN-03 · ملحق الشكل 17 — «إطلاق المعاملة» ─────────────────────────

/**
 * المسار 8 steps 5–9. The desk holding the file lets it go; what that MEANS —
 * advance, certify or disburse — is the server's answer, not this payload's.
 */
export interface PaymentReleaseInput {
  stageNo: number;
  note: string;
}

export interface PaymentReleaseResult {
  id: number;
  no: number;
  contractId: string;
  /** pending · certified · paid — AFTER the release. */
  status: string;
  certified: boolean;
  disbursed: boolean;
  nextStageKey: string | null;
}

// ── EP-FIN-04 · ملحق الشكل 18 — «تعديل» ──────────────────────────────────

/**
 * «مدخل التحرير الوحيد للبيانات المالية للمشروع».
 *
 * OMITTED IS NOT NULL. A key left off the payload is untouched; a key present
 * with a null value CLEARS the recorded figure, and the log records the two
 * differently. Hence the `{ value }` wrapper on each.
 */
export interface FinancialRecordsInput {
  approvedCost?: { value: number | null };
  revisedCost?: { value: number | null };
  annualAllocation?: { value: number | null };
  transferState?: { value: string | null };
  /** Required whenever `annualAllocation` is sent. */
  year?: number | null;
}

export interface FinancialRecordsResult {
  projectId: string;
  /** The field keys that actually moved — one `FinancialEdits` row each. */
  changed: string[];
}
