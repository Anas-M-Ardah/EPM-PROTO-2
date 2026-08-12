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
  /** null until BR-04 can roll BOQ progress up across these projects. */
  completionPct: number | null;
  statusDistribution: WorkspaceStatusSlice[];
  watchlist: WorkspaceProjectRow[];
  recent: WorkspaceProjectRow[];
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
