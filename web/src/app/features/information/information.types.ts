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
  /** text · date */
  kind: string;
}

export interface InfoGroup {
  /** identity · location · funding · parties — labelled from `inf_group_<id>`. */
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
