/**
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/Information/InformationDto.cs (CLAUDE.md §2).
 */

export interface InfoField {
  /** The entity property name in camelCase — the grep anchor across stacks. */
  key: string;
  /** Raw stored value, or null. Null renders an em dash, never a blank cell. */
  value: string | null;
  /** The `06` value list this code belongs to, or null for free text. */
  lookupKind: string | null;
  /** text · date · money */
  kind: string;
  /** الشكل 5's «مقترح» tag — a value the system derived, not one that was typed. */
  proposed: boolean;
}

export interface InfoGroup {
  /**
   * الشكل 5's six: identity · location · funding · description · entity ·
   * consultant — labelled from `inf_group_<id>`. Same six the project form
   * writes; they are one card seen twice.
   */
  id: string;
  fields: InfoField[];
}

export interface InfoProject {
  id: string;
  nameAr: string;
  nameEn: string;
  status: string;
  workspaceCode: string;
  workspaceNameAr: string;
  workspaceNameEn: string;
  updatedAt: string | null;
}

export interface InformationResponse {
  project: InfoProject;
  groups: InfoGroup[];
}
