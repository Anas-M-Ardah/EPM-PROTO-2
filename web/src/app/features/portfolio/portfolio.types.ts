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

/** One period of the two S-curves. Same shape `<epm-scurve>` consumes. */
export interface PortfolioCurvePeriod {
  at: string;
  planCum: number;
  /** Null before the first recorded measurement — a gap, not a zero. */
  actCum: number | null;
  planPeriod: number;
  actPeriod: number;
}

/** One project on «قائمة المتابعة — مشاريع خارج المسار». */
export interface WatchlistRow {
  projectId: string;
  nameAr: string;
  nameEn: string;
  workspaceCode: string;
  workspaceNameAr: string;
  workspaceNameEn: string;
  status: string;
  /** red · amber · green — `Domain/ExecutiveSignal`. */
  signal: string;
  physical: number | null;
  /** Physical minus planned, in points. Null when either side is missing. */
  variance: number | null;
  value: number;
  forecastFinish: string | null;
}

export interface SignalBand {
  signal: string;
  count: number;
  /** Whole percent of the portfolio. */
  share: number;
}

export interface PortfolioCost {
  approved: number;
  revised: number;
  spent: number;
}

export interface SpendYear {
  year: number;
  value: number;
}

export interface UpcomingMilestone {
  projectId: string;
  nameAr: string;
  nameEn: string;
  workspaceNameAr: string;
  workspaceNameEn: string;
  physical: number | null;
  plannedFinish: string;
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

  /** D-06 — the data date every figure below is stated as of. */
  asOf: string;
  /** `workspace-kind` codes present in scope, for the toolbar's select. */
  entityKinds: string[];

  physical: number | null;
  planned: number | null;
  financial: number | null;
  spi: number | null;
  cpi: number | null;
  acceptableIndex: number;
  earnedValue: number;
  actualCost: number;

  progressCurve: PortfolioCurvePeriod[];
  costCurve: PortfolioCurvePeriod[];
  signals: SignalBand[];
  watchlist: WatchlistRow[];
  cost: PortfolioCost;
  annualSpend: SpendYear[];
  milestones: UpcomingMilestone[];

  statusDistribution: StatusSlice[];
  valueByEntity: EntityValue[];
  unavailable: Unavailable[];
}
