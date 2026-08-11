import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { InformationResponse } from './information.types';

/** Every call SCR-W2 makes. One method per endpoint, carrying its anchor. */
@Injectable({ providedIn: 'root' })
export class InformationApi {
  private api = inject(Api);

  // [EP-INF-01] GET /api/projects/{id}/information → api/Features/Information/InformationEndpoints.cs
  get(projectId: string) {
    return this.api.get<InformationResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/information`);
  }
}
