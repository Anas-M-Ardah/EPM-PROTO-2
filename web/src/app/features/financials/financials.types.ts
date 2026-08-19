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
  balance: number;
  spendPct: number;
  /** مصروف السنة — the filtered year only, across every contract. */
  spentYear: number;
  /**
   * «أساسا القياس» — الشكل 14 sets the project’s APPROVED BUDGET against what
   * its contracts commit, and the gap is the point. Null when المسار 1
   * recorded no cost: no budget is a state, not a gap of zero.
   */
  projectBudget: number | null;
  contractCommitments: number;
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
  note: string;
}

/** BR-11 — DIAGNOSTICS. Identical inputs to SCR-W6's, from one Domain call. */
export interface FinancialsEvm {
  budget: number;
  pv: number;
  ev: number;
  ac: number;
  cpi: number | null;
  spi: number | null;
  eac: number | null;
  vac: number | null;
}

export interface FinancialsUnavailable {
  key: string;
  needsAr: string;
  needsEn: string;
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
 * grouping is derived from ; nothing new is stored.
 */
export interface FinancialsLetter {
  letterNo: string;
  letterDate: string | null;
  contractCount: number;
  net: number;
  /** Distinct statuses inside the letter — two means paid on one contract only. */
  statuses: string[];
  shares: FinancialsLetterShare[];
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
}

/**
 * مهلة تدقيق السلفة الجارية — ONE certificate: the one certified and not yet
 * paid. A paid one has no lead time left to watch.
 */
export interface FinancialsAuditSla {
  contractId: string;
  contractNameAr: string;
  contractNameEn: string;
  paymentNo: number;
  letterNo: string;
  /** within · overdue. */
  overallState: string;
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
  evm: FinancialsEvm;
  contracts: FinancialsContract[];
  payments: FinancialsPayment[];
  unavailable: FinancialsUnavailable[];
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
