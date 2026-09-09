import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { ProgressEvidence, ProgressResponse } from './progress.types';

/**
 * Every call SCR-W6 makes. One method per endpoint, carrying its anchor.
 *
 * Both routes are PROJECT-scoped, not contract-scoped. `02 §4` ends "project
 * physical % rolls up by weight", across every contract — gating this screen
 * on a contract the way SCR-W4 and SCR-W5 are would put the project's own
 * headline figure behind a picker (P-55).
 */
@Injectable({ providedIn: 'root' })
export class ProgressApi {
  private api = inject(Api);

  // [EP-PRG-01] GET /api/projects/{id}/progress → api/Features/Progress/ProgressEndpoints.cs
  get(projectId: string) {
    return this.api.get<ProgressResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/progress`);
  }

  /**
   * [EP-PRG-02] PUT /api/projects/{id}/progress/activities/{activityId} → same file
   *
   * SUBMITS a reading; it does not move the activity. المسار 6 ends its first
   * stage at «حفظ التحديث وإرساله للمراجعة», so nothing derived changes until
   * `approveReading` is called — which is exactly what the screen has to be
   * able to show.
   *
   * ONE WRITE PATH, TWO ENTRY POINTS (P-192): SCR-W5's ملحق الشكل 21 panel and
   * SCR-W6's editor both call THIS method, so the two screens cannot submit a
   * reading on different terms. `grep EP-PRG-02` still returns one client
   * method.
   *
   * Returns the WHOLE model, not the row that changed — the same reason every
   * other write on this screen does.
   */
  submitReading(
    projectId: string, activityId: string, progressPct: number,
    note: string, evidence: ProgressEvidence[]) {
    return this.api.put<ProgressResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/progress/activities/${encodeURIComponent(activityId)}`,
      { progressPct, note, evidence });
  }

  /**
   * [EP-PRG-03] POST /api/projects/{id}/progress/readings/{id}/approve → same file
   *
   * The one call in the client that moves a percentage. Everything derived —
   * every BOQ line the activity feeds, the contract roll-ups above those, the
   * project's physical % and with it EV, SPI and CPI — moves with it, which is
   * why the whole model comes back.
   */
  approveReading(projectId: string, readingId: number) {
    return this.api.post<ProgressResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/progress/readings/${readingId}/approve`, {});
  }

  /**
   * [EP-PRG-04] POST /api/projects/{id}/progress/readings/{id}/return → same file
   *
   * «إعادة بملاحظات — القراءة السابقة محفوظة». The note is REQUIRED: a return
   * with no reason sends the file back saying nothing, and the endpoint
   * refuses one.
   */
  returnReading(projectId: string, readingId: number, note: string) {
    return this.api.post<ProgressResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/progress/readings/${readingId}/return`,
      { note });
  }
}
