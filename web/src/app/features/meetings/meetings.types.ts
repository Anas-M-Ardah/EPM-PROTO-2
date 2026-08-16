/**
 * Member names are IDENTICAL to
 * api/Epm.Api/Features/Meetings/MeetingsDto.cs (CLAUDE.md §2).
 *
 * SCR-W11 — محاضر الاجتماعات وسجل الإجراءات · **ملحق الشكل 45**.
 */

export interface MeetingRow {
  id: number;
  titleAr: string;
  titleEn: string;
  heldOn: string | null;
  /** «سطر القرار» — the one decision the timeline prints under each title. */
  decisionAr: string;
  decisionEn: string;
  fileName: string | null;
  /** «محضر اجتماع · PDF» — the card's second line. */
  fileKind: string | null;
}

export interface ActionRow {
  code: string;
  titleAr: string;
  titleEn: string;
  owner: string;
  dueDate: string | null;
  priority: string;
  status: string;
  meetingId: number;
}

export interface MeetingsResponse {
  projectId: string;
  projectNameAr: string;
  projectNameEn: string;
  dataDate: string | null;
  meetingCount: number;
  actionCount: number;
  meetings: MeetingRow[];
  actions: ActionRow[];
}
