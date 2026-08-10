/**
 * MIRRORS api/Epm.Api/Features/Projects/ProjectsDto.cs — member for member,
 * name for name. Keep them identical: that is what lets one grep cross the
 * language boundary.
 */

export interface ProjectRow {
  id: string;
  nameAr: string;
  nameEn: string;
  status: string;
  type: string;
  executionStage: string;
  fundingType: string;
  region: string;
  branch: string;
  executor: string;
  /** DERIVED: Σ contract values. Computed by Domain/ProjectValue.cs — never stored. */
  value: number;
  /** DERIVED: how many contracts this project has. */
  contractCount: number;
}

export interface ProjectsResponse {
  rows: ProjectRow[];
  total: number;
  countByStatus: Record<string, number>;
}
