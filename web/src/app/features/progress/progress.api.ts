import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { ProgressResponse } from './progress.types';

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
   * Returns the WHOLE model, not the row that changed: one activity's progress
   * moves every BOQ line it feeds, the contract roll-ups above those, the
   * project's physical % and with it EV, SPI and CPI. Patching one row into a
   * cached model would leave five figures on screen that no longer agree.
   */
  saveProgress(projectId: string, activityId: string, progressPct: number) {
    return this.api.put<ProgressResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/progress/activities/${encodeURIComponent(activityId)}`,
      { progressPct });
  }
}
