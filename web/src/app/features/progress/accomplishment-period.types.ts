/**
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/Progress/AccomplishmentPeriodEndpoints.cs (CLAUDE.md §2).
 *
 * المسار 7 — إغلاق فترة الإنجاز.
 */

export interface AccomplishmentPeriodRow {
  id: number;
  periodNo: number;
  openedOn: string;
  closedOn: string | null;
  status: string;
  physicalPct: number | null;
  financialPct: number | null;
  cpi: number | null;
  spi: number | null;
  eac: number | null;
  vac: number | null;
  closedByParty: string;
}

export interface AccomplishmentPeriodsResponse {
  projectId: string;
  dataDate: string | null;
  canClose: boolean;
  periods: AccomplishmentPeriodRow[];
}

export interface ClosePeriodResult {
  id: number;
  periodNo: number;
  newDataDate: string;
}
