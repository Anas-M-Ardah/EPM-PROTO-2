/**
 * MIRRORS api/Epm.Api/Features/Projects/ProjectsDto.cs — member for member,
 * name for name. Keep them identical: that is what lets one grep cross the
 * language boundary.
 *
 * Column set is ported from DProjectsAll in the reference prototype
 * (docs/spec/reference/app/enterprise-areas.jsx:112), not invented.
 */

export interface ProjectRow {
  id: string;
  nameAr: string;
  nameEn: string;
  workspaceCode: string;
  workspaceNameAr: string;
  workspaceNameEn: string;
  branch: string;
  status: string;
  /** الإنجاز — null until the BOQ page can derive it (BR-04). Render "—", not 0%. */
  physicalPct: number | null;
  /** الكلفة — DERIVED: Σ contract values (Domain/ProjectValue.cs). */
  cost: number;
  /** آخر تحديث — ISO date string, or null. */
  updatedAt: string | null;
}

export interface ProjectsResponse {
  rows: ProjectRow[];
  total: number;
  countByStatus: Record<string, number>;
}
