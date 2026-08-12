/**
 * MIRRORS api/Epm.Api/Features/Entities/EntitiesDto.cs — member for member.
 *
 * Column set ported from DSpaces (v1.1), desktop-views.jsx:375.
 */

export interface EntityRow {
  code: string;
  /** The emblem text — "UOB", not "ub". See Workspace.DisplayCode. */
  displayCode: string;
  /** The emblem background. An identity colour, never a status one. */
  color: string;
  nameAr: string;
  nameEn: string;
  /**
   * A `workspace-kind` lookup code (ملحق الشكل 1's four): state-university ·
   * technical-university · central-unit · supply-directorate.
   */
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
  /** Only the workspaces assigned to the current persona (BR-15). */
  rows: EntityRow[];
  total: number;
  countByKind: Record<string, number>;
  /**
   * Workspaces ministry-wide, before the assignment filter. Lets the screen
   * tell "database not loaded" apart from "you are assigned to none".
   */
  ministryTotal: number;
}
