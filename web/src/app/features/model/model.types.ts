/**
 * SCR-W10 — النموذج ثلاثي الأبعاد · ملحق الشكل 44.
 *
 * Member names are IDENTICAL to api/Epm.Api/Features/Model/ModelDto.cs
 * (CLAUDE.md §2).
 */

export interface ModelElementRow {
  code: string;
  nameAr: string;
  nameEn: string;
  discipline: string;
  status: string;
  /** A RING, never a colour — the colour channel belongs to status. */
  isCritical: boolean;
  building: string;
  level: string;
  zone: string;
  qty: number;
  unit: string;
  progressPct: number;
  revision: string;
  contractId: string;
  boqCode: string;
  /** Null when the element points at a line that is not there. */
  boqDescriptionAr: string | null;
  boqDescriptionEn: string | null;
  activityCode: string;
  activityNameAr: string | null;
  activityNameEn: string | null;
}

export interface ModelLevel {
  level: string;
  elements: ModelElementRow[];
}

export interface ModelBuilding {
  building: string;
  elementCount: number;
  levels: ModelLevel[];
}

export interface ModelVersionRow {
  code: string;
  labelAr: string;
  labelEn: string;
  issuedOn: string | null;
  by: string;
  isCurrent: boolean;
}

export interface ModelChip {
  code: string;
  count: number;
}

export interface ModelResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  dataDate: string | null;
  elementCount: number;
  criticalCount: number;
  versions: ModelVersionRow[];
  disciplines: ModelChip[];
  statuses: ModelChip[];
  tree: ModelBuilding[];
  elements: ModelElementRow[];
}
