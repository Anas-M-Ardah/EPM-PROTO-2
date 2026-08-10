/**
 * MIRRORS api/Epm.Api/Features/Contracts/ContractsDto.cs — member for member,
 * name for name. That identity is what lets one grep cross both stacks.
 *
 * Column set ported from DContractsAll (v1.1),
 * docs/spec/reference/app/enterprise-areas.jsx:299.
 */

export interface ContractRow {
  id: string;
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  nameAr: string;
  nameEn: string;
  contractor: string;
  status: string;

  start: string | null;
  /** The contractual finish. NEVER overwritten. */
  originalFinish: string | null;
  /** DERIVED (BR-09): originalFinish + Σ APPLIED amendment days. */
  effectiveFinish: string | null;

  /** The awarded value. NEVER overwritten. */
  originalValue: number;
  /** DERIVED (BR-09): original + Σ APPLIED deltas. This is the contract's value. */
  effectiveValue: number;
  /**
   * DERIVED: effective + approved-but-UNAPPLIED deltas.
   * A PROJECTION (02 §9) — must always be labelled as such and never presented
   * as the contract's value. Equals effectiveValue when nothing is pending.
   */
  projectedValue: number;

  /** Applied amendments only — the current version number. */
  amendmentCount: number;
  /** Approved and awaiting application. Drives the projection note. */
  pendingCount: number;

  /** Needs payments (not yet registered) — null renders an em dash, never 0. */
  financialPct: number | null;
}

export interface ContractsResponse {
  rows: ContractRow[];
  total: number;
  countByStatus: Record<string, number>;
}
