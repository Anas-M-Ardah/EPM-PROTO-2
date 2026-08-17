import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import {
  BoqImportPreviewResponse, BoqImportRow, BoqImportVersionDto,
} from './boq-import.types';

/**
 * المسار 3 · الشكل 13 — the import wizard's three calls.
 *
 * THE FILE NEVER CROSSES THE WIRE. What is posted is the ROWS the wizard parsed
 * and the user mapped — «مطابقة الأعمدة» is a user step (المسار 3 step 3أ), so a
 * spreadsheet is not business data until someone has said which column is which.
 * The file's name and size ride along as metadata for the version record, and
 * nothing is stored anywhere (CLAUDE.md §4).
 */
@Injectable({ providedIn: 'root' })
export class BoqImportApi {
  private api = inject(Api);

  private base(projectId: string, contractId: string) {
    return `/api/projects/${encodeURIComponent(projectId)}`
      + `/boq/${encodeURIComponent(contractId)}/import`;
  }

  // [EP-BOQ-09] POST …/import/preview → api/Features/Boq/BoqImportEndpoints.cs
  // Validation (المسار 3 step 5) and comparison (step 4) in one answer: the
  // wizard shows them on two steps, but they are one question about one file.
  preview(projectId: string, contractId: string, sheetType: string, rows: BoqImportRow[]) {
    return this.api.post<BoqImportPreviewResponse>(
      `${this.base(projectId, contractId)}/preview`, { sheetType, rows });
  }

  // [EP-BOQ-10] POST …/import/submit → same file
  // «تقديم النسخة للاعتماد — لا استبدال للإصدار السابق». Writes a version and
  // touches no part of the live bill.
  submit(
    projectId: string, contractId: string,
    body: { sheetType: string; fileName: string; fileSizeBytes: number; rows: BoqImportRow[] },
  ) {
    return this.api.post<BoqImportVersionDto>(
      `${this.base(projectId, contractId)}/submit`, body);
  }

  // [EP-BOQ-13] POST …/import/versions/{no}/approve → same file
  // المسار 3 steps 7–8. This is the one call that MOVES the bill: the approved
  // sheet becomes the contract's lines. Every previous version survives.
  approve(projectId: string, contractId: string, no: number) {
    return this.api.post<BoqImportVersionDto>(
      `${this.base(projectId, contractId)}/versions/${no}/approve`, {});
  }

  // [EP-BOQ-11] GET …/import/versions → same file
  versions(projectId: string, contractId: string) {
    return this.api.get<BoqImportVersionDto[]>(`${this.base(projectId, contractId)}/versions`);
  }
}
