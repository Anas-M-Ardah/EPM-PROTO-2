/**
 * Member names are IDENTICAL to api/Epm.Api/Features/Alerts/AlertsDto.cs, so
 * `grep -rn "openBySeverity" api web` finds both ends (CLAUDE.md §2).
 */

export interface AlertRow {
  id: number;
  /** Null on an enterprise-wide alert — it belongs to the portfolio, not a project. */
  projectId: string | null;
  projectNameAr: string | null;
  projectNameEn: string | null;
  /** critical · warning · info — lookup kind `alert-severity`. */
  severity: string;
  /** Rendered as the Source column — lookup kind `alert-kind`. */
  kind: string;
  titleAr: string;
  titleEn: string;
  targetRef: string | null;
  /** yyyy-MM-dd, at the data date it was raised (D-06). */
  raisedAt: string;
  /** open · acknowledged — lookup kind `alert-status`, derived from the bool. */
  status: string;
  acknowledgedByUserId: string | null;
}

/** Counts over the SCOPED set, before the severity and status filters. */
export interface AlertCounts {
  total: number;
  open: number;
  acknowledged: number;
  bySeverity: Record<string, number>;
  openBySeverity: Record<string, number>;
}

export interface AlertsResponse {
  rows: AlertRow[];
  total: number;
  counts: AlertCounts;
}

export interface AcknowledgeResponse {
  id: number;
  status: string;
  acknowledgedByUserId: string | null;
}
