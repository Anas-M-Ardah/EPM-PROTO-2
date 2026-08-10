import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { AcknowledgeResponse, AlertsResponse } from './alerts.types';

/**
 * Every call the Alerts Center makes. One method per endpoint, named after the
 * endpoint, carrying its [EP-…] anchor so a single grep finds both ends.
 */
@Injectable({ providedIn: 'root' })
export class AlertsApi {
  private api = inject(Api);

  // [EP-ALR-01] GET /api/alerts → api/Features/Alerts/AlertsEndpoints.cs
  list(filters: { q?: string; severity?: string; status?: string; workspace?: string; projectId?: string } = {}) {
    return this.api.get<AlertsResponse>('/api/alerts', filters);
  }

  // [EP-ALR-02] POST /api/alerts/{id}/ack → api/Features/Alerts/AlertsEndpoints.cs
  acknowledge(id: number, acknowledged: boolean) {
    return this.api.post<AcknowledgeResponse>(`/api/alerts/${id}/ack`, { acknowledged });
  }
}
