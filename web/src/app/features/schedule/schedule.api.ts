import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { ScheduleAmendmentDetail, ScheduleGateResponse, ScheduleResponse } from './schedule.types';

/**
 * Every call SCR-W5 makes. One method per endpoint, carrying its anchor.
 *
 * Both routes carry the project AND the contract so the pair can be checked:
 * an activity belongs to exactly one contract (01 §1), and a schedule for a
 * contract of another project is a 404, not a filtered empty list.
 *
 * The basis is a QUERY PARAMETER on a GET, not a body: switching between cost
 * and man-hours re-reads the same schedule through a different denominator —
 * it changes nothing, so it is a read. (The basis is NOT in the page's own URL;
 * unlike the contract, it is a view of one schedule rather than a different
 * one, and `02 §2` puts the binding choice at import — see P-48.)
 */
@Injectable({ providedIn: 'root' })
export class ScheduleApi {
  private api = inject(Api);

  // [EP-SCD-01] GET /api/projects/{id}/schedule → api/Features/Schedule/ScheduleEndpoints.cs
  gate(projectId: string) {
    return this.api.get<ScheduleGateResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/schedule`);
  }

  // [EP-SCD-02] GET /api/projects/{id}/schedule/{contractId} → same file
  get(projectId: string, contractId: string, basis: string) {
    return this.api.get<ScheduleResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/schedule/${encodeURIComponent(contractId)}`,
      { basis });
  }

  // [EP-SCD-03] GET …/schedule/{contractId}/activities/{activityId}/amendments → same file
  // The drawer behind the row badge (04 §6 · ROADMAP 4.5), the same one
  // EP-BOQ-17 fills for a BOQ line. Fetched on open, not sent with every row.
  amendments(projectId: string, contractId: string, activityId: string) {
    return this.api.get<ScheduleAmendmentDetail>(
      `/api/projects/${encodeURIComponent(projectId)}/schedule/${encodeURIComponent(contractId)}`
      + `/activities/${encodeURIComponent(activityId)}/amendments`);
  }
}
