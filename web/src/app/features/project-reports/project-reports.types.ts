/**
 * SCR-W14 — التقارير والتحليلات (project tab).
 *
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/ProjectReports/ProjectReportsDto.cs (CLAUDE.md §2).
 */

export interface ReportSource {
  table: string;
  nameAr: string;
  nameEn: string;
  /** How many rows THIS project has. 0 is why a report is unavailable here. */
  rows: number;
}

export interface ProjectReportRow {
  id: string;
  category: string;
  frequency: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  formats: string[];
  sources: ReportSource[];
  /** Producible for THIS project: every source it reads has rows here. */
  available: boolean;
  missingAr: string | null;
  missingEn: string | null;
}

export interface ReportChip {
  code: string;
  count: number;
}

export interface ReportCategory {
  code: string;
  nameAr: string;
  nameEn: string;
}

export interface ProjectReportsResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  dataDate: string | null;
  total: number;
  availableCount: number;
  categories: ReportCategory[];
  chips: ReportChip[];
  rows: ProjectReportRow[];
}
