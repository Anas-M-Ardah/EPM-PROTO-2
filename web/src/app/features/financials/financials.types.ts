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
}

export interface FinancialsComponent {
  key: string;
  labelAr: string;
  labelEn: string;
  original: number;
  /** An applied change moves the AWARD only — never reserve or supervision. */
  chg: number;
  revised: number;
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
}
