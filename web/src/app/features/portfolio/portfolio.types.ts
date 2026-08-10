/** MIRRORS api/Epm.Api/Features/Portfolio/PortfolioDto.cs — member for member. */

export interface StatusSlice {
  /** 06 §1 status code — the UI resolves the label from Lookups. */
  code: string;
  count: number;
}

export interface EntityValue {
  code: string;
  nameAr: string;
  nameEn: string;
  value: number;
  projectCount: number;
}

/**
 * A headline figure the system cannot yet derive, with the reason.
 * Rendered in place of the figure — never as a 0 (design language §States).
 */
export interface Unavailable {
  /** physical · financial · spi · cpi */
  key: string;
  needsAr: string;
  needsEn: string;
}

export interface PortfolioResponse {
  projectCount: number;
  activeCount: number;
  delayedCount: number;
  contractCount: number;
  entityCount: number;
  /** Σ EFFECTIVE contract values (BR-00 → BR-09). */
  effectiveValue: number;
  /** Σ approved-but-UNAPPLIED deltas. A projection (02 §9) — never added in. */
  pendingValue: number;
  pendingAmendmentCount: number;
  appliedAmendmentCount: number;

  statusDistribution: StatusSlice[];
  valueByEntity: EntityValue[];
  unavailable: Unavailable[];
}
