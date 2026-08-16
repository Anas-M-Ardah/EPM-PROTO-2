/**
 * SCR-W13 — التنبيهات · ملحق الشكل 47.
 *
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/ProjectAlerts/ProjectAlertsDto.cs (CLAUDE.md §2).
 */

export interface ProjectAlertRow {
  id: number;
  /** The rule that produced it. Null for an event the system raised on itself. */
  ruleCode: string | null;
  severity: string;
  kind: string;
  titleAr: string;
  titleEn: string;
  targetRef: string | null;
  raisedAt: string;
  dueOn: string | null;
  /** Negative once the date has passed. Null when there is no deadline. */
  daysToDue: number | null;
  /** overdue · today · week · later — Domain/AlertInbox, never recomputed here. */
  bucket: string;
  status: string;
  acknowledgedByUserId: string | null;
}

export interface AlertRuleRow {
  code: string;
  nameAr: string;
  nameEn: string;
  triggerAr: string;
  triggerEn: string;
  severity: string;
  channelInApp: boolean;
  channelEmail: boolean;
  channelSms: boolean;
  recurrence: string;
  /** Null is «بلا تصعيد». The unit shown is display formatting. */
  escalateAfterHours: number | null;
  enabled: boolean;
}

export interface AlertChip {
  code: string;
  count: number;
}

export interface ProjectAlertsResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  dataDate: string | null;
  alertCount: number;
  needsAction: number;
  ruleCount: number;
  enabledRuleCount: number;
  severities: AlertChip[];
  buckets: AlertChip[];
  rows: ProjectAlertRow[];
  rules: AlertRuleRow[];
}
