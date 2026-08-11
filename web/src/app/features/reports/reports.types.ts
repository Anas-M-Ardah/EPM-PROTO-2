/**
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/Reports/ReportsDto.cs, so
 * `grep -rn "needsAr" api web` finds both ends (CLAUDE.md §2).
 */

export interface ReportRow {
  /** RPT-01 … RPT-12. What a future ReportRuns row would store. */
  id: string;
  /** fin · sched · prog · cont · comp — labelled from `categories`. */
  category: string;
  /** project · portfolio — labelled from `scopes`. */
  scope: string;
  /** weekly · monthly · on-demand — labelled from `frequencies`. Never null. */
  frequency: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  formats: string[];
  /** Always null — no report has ever been run. Renders as an em dash (P-09). */
  lastRunAt: string | null;
  /** Whether every table this report reads is registered in EpmDb. */
  available: boolean;
  /** Why not, naming the source and the phase. Null when `available`. */
  needsAr: string | null;
  needsEn: string | null;
}

export interface ReportCategory {
  code: string;
  nameAr: string;
  nameEn: string;
  /** Over the scoped catalog, before the search and the chips. */
  count: number;
}

/** Code + two labels — the same shape `EP-LKP-01` sends. */
export interface ReportLabel {
  code: string;
  nameAr: string;
  nameEn: string;
}

export interface ReportProject {
  id: string;
  nameAr: string;
  nameEn: string;
}

export interface ReportCounts {
  total: number;
  /** Frequency other than on-demand. */
  scheduled: number;
  /** How many the system can actually produce today. */
  available: number;
}

export interface ReportsResponse {
  rows: ReportRow[];
  total: number;
  counts: ReportCounts;
  categories: ReportCategory[];
  scopes: ReportLabel[];
  frequencies: ReportLabel[];
  /** Projects in `?ws=` scope, for the toolbar dropdown. */
  projects: ReportProject[];
}
