import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { ProjectAlertsResponse } from './project-alerts.types';

/** SCR-W13's calls: one read, one rule switch, and the Alerts Centre's ack. */
@Injectable({ providedIn: 'root' })
export class ProjectAlertsApi {
  private api = inject(Api);

  // [EP-PAL-01] GET /api/projects/{id}/alerts
  //   → api/Features/ProjectAlerts/ProjectAlertsEndpoints.cs
  //
  // The inbox and the rules arrive together: a rule switch changes what the
  // inbox contains, so two reads could show a count and a switch that
  // disagree about each other.
  list(projectId: string) {
    return this.api.get<ProjectAlertsResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/alerts`);
  }

  // [EP-PAL-02] POST /api/projects/{id}/alert-rules/{code}/enabled
  //   → api/Features/ProjectAlerts/ProjectAlertsEndpoints.cs
  //
  // Writes ONE bool. Everything that then happens to the inbox is EP-PAL-01
  // re-reading Domain/AlertInbox.Live.
  setRuleEnabled(projectId: string, code: string, enabled: boolean) {
    return this.api.post<{ code: string; enabled: boolean }>(
      `/api/projects/${encodeURIComponent(projectId)}/alert-rules/${encodeURIComponent(code)}/enabled`,
      { enabled });
  }

  // [EP-ALR-02] POST /api/alerts/{id}/ack → api/Features/Alerts/AlertsEndpoints.cs
  //
  // The Alerts Centre's write, reused. One acknowledgement path means one
  // place the persona is recorded (P-05).
  acknowledge(id: number, acknowledged: boolean) {
    return this.api.post<{ id: number; status: string }>(
      `/api/alerts/${id}/ack`, { acknowledged });
  }
}
