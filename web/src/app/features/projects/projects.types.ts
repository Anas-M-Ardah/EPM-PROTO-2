/**
 * MIRRORS api/Epm.Api/Features/Projects/ProjectsDto.cs — member for member,
 * name for name. Keep them identical: that is what lets one grep cross the
 * language boundary.
 *
 * Column set is ported from DProjectsAll in the reference prototype
 * (docs/spec/reference/app/enterprise-areas.jsx:112), not invented.
 */

export interface ProjectRow {
  id: string;
  nameAr: string;
  nameEn: string;
  workspaceCode: string;
  workspaceNameAr: string;
  workspaceNameEn: string;
  branch: string;
  status: string;
  /** الإنجاز — null until the BOQ page can derive it (BR-04). Render "—", not 0%. */
  physicalPct: number | null;
  /** الكلفة — DERIVED: Σ contract values (Domain/ProjectValue.cs). */
  cost: number;
  /** آخر تحديث — ISO date string, or null. */
  updatedAt: string | null;
}

export interface ProjectsResponse {
  rows: ProjectRow[];
  total: number;
  countByStatus: Record<string, number>;
}

// ───────────────────────────────────────────────────────────────────────────
// المسار 1 — تعريف المشروع وربطه بالجامعة
// ───────────────────────────────────────────────────────────────────────────

/**
 * الشكل 5's definition card — six sections, in its order:
 * هوية المشروع · الموقع · التمويل والموازنة · الوصف · الجهة · الاستشاري.
 *
 * Members are nullable because the FORM holds them before they are filled.
 * Completeness is the server's judgement (Domain/ProjectDefinition), not a
 * shape constraint here — one rule, one place.
 */
export interface ProjectDefinitionInput {
  // هوية المشروع
  nameAr: string | null;
  nameEn: string | null;
  code: string | null;
  type: string | null;
  registrationYear: number | null;
  executionStage: string | null;
  status: string | null;
  // الموقع
  coordinates: string | null;
  region: string | null;
  // التمويل والموازنة
  fundingType: string | null;
  priority: string | null;
  expenditureCategory: string | null;
  budgetApprovalNumber: string | null;
  plannedCost: number | null;
  // الوصف
  description: string | null;
  // الجهة
  formation: string | null;
  beneficiaryCodes: string | null;
  orgStructure: string | null;
  branch: string | null;
  // الاستشاري
  consultantParty: string | null;
  designerParty: string | null;
  executor: string | null;
}

export interface CreateProjectRequest {
  workspaceCode: string;
  definition: ProjectDefinitionInput;
}

/** One failed clause of المسار 1 step 3. `field` matches a member of ProjectDefinitionInput. */
export interface ProjectViolation {
  field: string;
  messageAr: string;
  messageEn: string;
}

/** The body a 422 carries. The form puts each message on the control that caused it. */
export interface ProjectViolationResponse {
  messageAr: string;
  messageEn: string;
  violations: ProjectViolation[];
}

/** الشكل 5's «مقترح» tag — a value the SYSTEM put there, not the user. */
export interface ProjectSuggestion {
  field: string;
  value: string;
}

/** سجل النشاط — one row of الشكل 5's second tab. */
export interface ProjectEvent {
  id: number;
  action: string;
  actorName: string;
  actorRole: string;
  actorParty: string;
  at: string;
}

/** Resolved server-side. The form renders its Edit affordance from this. */
export interface ProjectPermissions {
  edit: boolean;
}

export interface ProjectDefinitionResponse {
  id: string;
  workspaceCode: string;
  workspaceNameAr: string;
  workspaceNameEn: string;
  definition: ProjectDefinitionInput;
  suggestions: ProjectSuggestion[];
  events: ProjectEvent[];
  can: ProjectPermissions;
}
