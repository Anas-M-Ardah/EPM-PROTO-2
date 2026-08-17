/**
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/Workspaces/WorkspacesDto.cs — that is what lets one grep
 * cross the language boundary (CLAUDE.md §2).
 *
 * `features/workspaces/` (plural) is the ENTERPRISE workspace — a university or
 * ministry unit. `features/workspace/` (singular) is the PROJECT workspace, the
 * module rail inside one project. Two different screens, two different things.
 */
export interface WorkspaceStatusSlice {
  status: string;
  count: number;
}

export interface WorkspaceProjectRow {
  id: string;
  nameAr: string;
  nameEn: string;
  branch: string;
  status: string;
  value: number;
  updatedAt: string | null;
  /** Why the row is on the watchlist — a `project-status` code, or null. */
  reason: string | null;
}

/** One period of the two S-curves. Same shape `<epm-scurve>` consumes. */
export interface WorkspaceCurvePeriod {
  at: string;
  planCum: number;
  /** Null before the first recorded measurement — a gap, not a zero. */
  actCum: number | null;
  planPeriod: number;
  actPeriod: number;
}

/** One project on «قائمة المتابعة — مشاريع خارج المسار» (الشكل 2). */
export interface WorkspaceWatchRow {
  id: string;
  nameAr: string;
  nameEn: string;
  branch: string;
  status: string;
  /** red · amber · green — `Domain/ExecutiveSignal`. */
  signal: string;
  physical: number | null;
  /** Physical minus planned, in points. Null when either side is missing. */
  variance: number | null;
  value: number;
  forecastFinish: string | null;
}

export interface WorkspaceSignalBand {
  signal: string;
  count: number;
  /** Whole percent of the projects in scope. */
  share: number;
}

export interface WorkspaceCost {
  approved: number;
  revised: number;
  spent: number;
}

export interface WorkspaceMilestone {
  id: string;
  nameAr: string;
  nameEn: string;
  branch: string;
  status: string;
  physical: number | null;
  plannedFinish: string;
}

/** A figure with no input, and the reason. Never rendered as 0 (P-09). */
export interface WorkspaceUnavailable {
  /** physical · financial · spi · cpi */
  key: string;
  needsAr: string;
  needsEn: string;
}

export interface WorkspaceOverviewResponse {
  code: string;
  /** The emblem text — "UOB", not "ub". See Workspace.DisplayCode. */
  displayCode: string;
  /** The emblem background. An identity colour, never a status one. */
  color: string;
  nameAr: string;
  nameEn: string;
  kind: string;
  active: boolean;
  projectCount: number;
  activeCount: number;
  delayedCount: number;
  contractCount: number;
  effectiveValue: number;
  pendingValue: number;
  pendingAmendmentCount: number;
  openAlertCount: number;
  criticalAlertCount: number;
  /** Weight-rolled BOQ progress across this workspace's contracts (BR-04). */
  completionPct: number | null;

  /** D-06 — the data date every figure below is stated as of. */
  asOf: string;
  /** Branches present in this workspace, for the toolbar's select. */
  branches: string[];
  /** Count per status BEFORE the filters, so a chip never hides itself. */
  statusCounts: WorkspaceStatusSlice[];

  planned: number | null;
  financial: number | null;
  spi: number | null;
  cpi: number | null;
  acceptableIndex: number;
  earnedValue: number;
  actualCost: number;

  progressCurve: WorkspaceCurvePeriod[];
  costCurve: WorkspaceCurvePeriod[];
  signals: WorkspaceSignalBand[];
  watchlist: WorkspaceWatchRow[];
  cost: WorkspaceCost;
  milestones: WorkspaceMilestone[];

  statusDistribution: WorkspaceStatusSlice[];
  recent: WorkspaceProjectRow[];
  unavailable: WorkspaceUnavailable[];
}

/** MIRRORS CreateWorkspaceRequest in WorkspacesDto.cs. */
export interface CreateWorkspaceRequest {
  code: string;
  displayCode: string;
  nameAr: string;
  nameEn: string;
  kind: string;
  color: string;
}
