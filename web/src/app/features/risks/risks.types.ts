/**
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/Risks/RisksDto.cs (CLAUDE.md §2).
 *
 * SCR-W9 — سجل المخاطر · **ملحق الشكل 43**.
 */

export interface RiskRow {
  code: string;
  titleAr: string;
  titleEn: string;
  /** `risk-category` — الشكل 43's seven. */
  category: string;
  /** 1 منخفض · 2 متوسط · 3 عالي. */
  probability: number;
  impact: number;
  /** DERIVED — «الخطورة = الاحتمالية × التأثير», computed server-side. */
  severity: string;
  owner: string;
  /** SPI · CPI · EAC · VAC. */
  indicator: string;
  status: string;
  raisedDate: string | null;
}

export interface RiskBand {
  band: string;
  count: number;
}

export interface RisksResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  dataDate: string | null;
  /** Every band, even at zero — a tab that vanishes looks like a changed set. */
  bands: RiskBand[];
  rows: RiskRow[];
}
