/**
 * SCR-W15 — سجل التدقيق.
 *
 * Member names are IDENTICAL to api/Epm.Api/Features/Audit/AuditDto.cs
 * (CLAUDE.md §2).
 */

export interface AuditRow {
  /** project · contract · changeorder — the TABLE the row came out of. */
  source: string;
  /** PRJ-0279 · CNT-0279 · VO-03 — the record it happened to. */
  sourceRef: string;
  action: string;
  at: string;
  /** «النظام · حدث آلي» — told apart from a row a person wrote (P-83). */
  isSystem: boolean;
  /** As recorded at the time, not resolved now. Null when isSystem. */
  actorName: string | null;
  actorRole: string | null;
  actorParty: string | null;
  /** Null on a non-edit: an approval moves a lifecycle, not a field. */
  field: string | null;
  before: string | null;
  after: string | null;
  note: string | null;
}

export interface AuditChip {
  code: string;
  count: number;
}

export interface AuditResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  dataDate: string | null;
  total: number;
  systemCount: number;
  sources: AuditChip[];
  rows: AuditRow[];
}
