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

/* ── [EP-PRP-02] THE REPORT BODY ──────────────────────────────────────────
   Members identical to api/Features/ProjectReports/ProjectReportsDto.cs
   (CLAUDE.md §2). `DModReports` project-modules.jsx:2805 renders each report
   inline, and all six of its bodies are the same three things in the same
   order — figures, an optional comparison, a table — so the body is typed
   that way and the view needs no branch per report. */

/** `tone`: null neutral · `bad` · `good`. Never a magnitude by threshold. */
export interface ReportFigure {
  labelAr: string;
  labelEn: string;
  value: string;
  tone: string | null;
}

export interface ReportBar {
  labelAr: string;
  labelEn: string;
  value: number;
  display: string;
}

export interface ReportColumn {
  nameAr: string;
  nameEn: string;
  numeric: boolean;
}

/** Row-major and already formatted — the API owns the figure. */
export interface ReportTable {
  columns: ReportColumn[];
  cells: string[][];
}

export interface ProjectReportBody {
  id: string;
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  formats: string[];
  available: boolean;
  missingAr: string | null;
  missingEn: string | null;
  /** Producible, but this build draws no inline body for it. Not the same
      absence as `available: false`, and the view must not conflate them. */
  rendered: boolean;
  figures: ReportFigure[];
  chartTitleAr: string | null;
  chartTitleEn: string | null;
  bars: ReportBar[];
  table: ReportTable | null;
}
