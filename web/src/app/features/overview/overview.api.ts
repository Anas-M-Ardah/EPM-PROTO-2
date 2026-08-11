import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { OverviewResponse } from './overview.types';

/** Every call SCR-W1 makes. One method per endpoint, carrying its anchor. */
@Injectable({ providedIn: 'root' })
export class OverviewApi {
  private api = inject(Api);

  // [EP-OVW-01] GET /api/projects/{id}/overview → api/Features/Overview/OverviewEndpoints.cs
  get(projectId: string) {
    return this.api.get<OverviewResponse>(`/api/projects/${encodeURIComponent(projectId)}/overview`);
  }
}
