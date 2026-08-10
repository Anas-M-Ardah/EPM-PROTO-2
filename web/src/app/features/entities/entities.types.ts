/**
 * MIRRORS api/Epm.Api/Features/Entities/EntitiesDto.cs — member for member.
 *
 * Column set ported from DSpaces (v1.1), desktop-views.jsx:375.
 */

export interface EntityRow {
  code: string;
  nameAr: string;
  nameEn: string;
  /** university · institute · directorate · other. */
  kind: string;
  active: boolean;
  projectCount: number;
  /** Projects still running — ongoing or delayed (06 §1). */
  activeCount: number;
  /** DERIVED: Σ effective contract values under this entity (BR-00 → BR-09). */
  value: number;
  /** null until BOQ progress exists (BR-04) — renders an em dash, never 0. */
  completionPct: number | null;
}

export interface EntitiesResponse {
  rows: EntityRow[];
  total: number;
  countByKind: Record<string, number>;
}
