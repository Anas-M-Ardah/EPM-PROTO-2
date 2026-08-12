import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { WorkspaceOverviewResponse } from './workspaces.types';

/** Every call the workspace overview makes. One method per endpoint. */
@Injectable({ providedIn: 'root' })
export class WorkspacesApi {
  private api = inject(Api);

  // [EP-WSP-01] GET /api/workspaces/{code}/overview → api/Features/Workspaces/WorkspacesEndpoints.cs
  overview(code: string) {
    return this.api.get<WorkspaceOverviewResponse>(`/api/workspaces/${encodeURIComponent(code)}/overview`);
  }
}
