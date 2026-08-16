/**
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/Documents/DocumentsDto.cs (CLAUDE.md §2).
 *
 * SCR-W12 — الوثائق والمخططات · **ملحق الشكل 46**.
 */

export interface RevisionRow {
  no: number;
  issuedOn: string | null;
  issuer: string;
  descriptionAr: string;
  descriptionEn: string;
  transmittalNo: string;
  fileName: string;
  status: string;
  /** ملغاة — kept in the register, never removed. */
  superseded: boolean;
}

export interface DocumentRow {
  code: string;
  titleAr: string;
  titleEn: string;
  discipline: string;
  issuer: string;
  /** The highest revision number — derived, never a stored flag. */
  currentRevisionNo: number | null;
  currentIssuedOn: string | null;
  currentTransmittalNo: string | null;
  /** «حالة الإصدار» of the CURRENT revision. */
  status: string;
  revisionCount: number;
  revisions: RevisionRow[];
}

export interface DisciplineFolder {
  code: string;
  count: number;
}

export interface DocumentsResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  dataDate: string | null;
  documentCount: number;
  revisionCount: number;
  /** Documents whose CURRENT revision is a draft. */
  underReview: number;
  folders: DisciplineFolder[];
  statuses: DisciplineFolder[];
  rows: DocumentRow[];
}
