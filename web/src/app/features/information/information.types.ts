/**
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/Information/InformationDto.cs (CLAUDE.md §2).
 */

import {
  ProjectDefinitionInput,
  ProjectDefinitionResponse,
  ProjectEvent,
  ProjectPermissions,
  ProjectViolation,
} from '../projects/projects.types';

/**
 * REUSED, NOT REDECLARED. الشكل 5's «سجل النشاط» tab and `EP-PRJ-04` show the
 * same `ProjectActivityEvents` rows; its «زر تعديل» is gated on the same
 * capacity `EP-PRJ-03` checks; and the edit it opens sends the same
 * `ProjectDefinitionInput` the create form sends. One shape each, mirroring the
 * C# records `InformationDto.cs` imports from `Features/Projects`.
 */
export type {
  ProjectDefinitionInput,
  ProjectDefinitionResponse,
  ProjectEvent,
  ProjectPermissions,
  ProjectViolation,
};

export interface InfoField {
  /** The entity property name in camelCase — the grep anchor across stacks. */
  key: string;
  /** Raw stored value, or null. Null renders an em dash, never a blank cell. */
  value: string | null;
  /** The `06` value list this code belongs to, or null for free text. */
  lookupKind: string | null;
  /** text · date · money · coords · long */
  kind: string;
  /** الشكل 5's «مقترح» tag — a value the system derived, not one that was typed. */
  proposed: boolean;
  /** الشكل 5's «نجمة على الحقول الإلزامية» — from ProjectDefinition.RequiredFields. */
  required: boolean;
}

export interface InfoGroup {
  /**
   * الشكل 5's six: identity · location · funding · description · entity ·
   * consultant — titled from `inf_group_<id>` and captioned from
   * `inf_group_<id>_sub`. Same six the project form writes; they are one card
   * seen twice.
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
  /** سجل النشاط, newest first. The same rows EP-PRJ-02/03 write. */
  events: ProjectEvent[];
  /** Resolved server-side. الشكل 5's «زر تعديل» renders from this. */
  can: ProjectPermissions;
}
