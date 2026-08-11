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
  periodStart: string | null;
  periodFinish: string | null;
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
}

export interface CostLine {
  key: string;
  amount: number;
  /** Always null — spend is recorded against the contract, not its lines. */
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
}

export interface ContractMoney {
  disbursed: number;
  certified: number;
  retention: number;
  advanceRecovery: number;
  remaining: number;
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
}
