import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import {
  ScheduleImportPreviewRequest, ScheduleImportPreviewResponse, ScheduleImportVersion,
} from './schedule-import.types';

/**
 * ملحق الشكل 24 · المسار 4 — the four calls the schedule importer makes.
 *
 * Every route carries the project AND the contract, for the same reason SCR-W4's
 * do: an activity belongs to exactly one contract (01 §1), and a schedule for a
 * contract of another project is a 404 rather than a filtered empty list.
 */
@Injectable({ providedIn: 'root' })
export class ScheduleImportApi {
  private api = inject(Api);

  private base(projectId: string, contractId: string) {
    return `/api/projects/${encodeURIComponent(projectId)}`
      + `/schedule/${encodeURIComponent(contractId)}/import`;
  }

  // [EP-SCD-04] POST …/import/preview → api/Features/Schedule/ScheduleImportEndpoints.cs
  /** Validation and impact. Writes nothing — asking a question must not move a baseline. */
  preview(projectId: string, contractId: string, body: ScheduleImportPreviewRequest) {
    return this.api.post<ScheduleImportPreviewResponse>(
      `${this.base(projectId, contractId)}/preview`, body);
  }

  // [EP-SCD-05] POST …/import/versions → same file
  /** Writes a VERSION and never `Activities`. Returns the whole version list. */
  submit(projectId: string, contractId: string, body: ScheduleImportPreviewRequest) {
    return this.api.post<ScheduleImportVersion[]>(
      `${this.base(projectId, contractId)}/versions`, body);
  }

  // [EP-SCD-06] POST …/import/versions/{no}/approve → same file
  /** The only route that moves a baseline, and the submitter may not call it. */
  approve(projectId: string, contractId: string, no: number) {
    return this.api.post<ScheduleImportVersion[]>(
      `${this.base(projectId, contractId)}/versions/${no}/approve`, {});
  }

  // [EP-SCD-07] GET …/import/versions → same file
  versions(projectId: string, contractId: string) {
    return this.api.get<ScheduleImportVersion[]>(`${this.base(projectId, contractId)}/versions`);
  }
}
