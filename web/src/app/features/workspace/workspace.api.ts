import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { ModulesResponse } from './workspace.types';

/** Every call the project shell makes. One method per endpoint, with its anchor. */
@Injectable({ providedIn: 'root' })
export class WorkspaceApi {
  private api = inject(Api);

  // [EP-OVW-02] GET /api/projects/{id}/modules → api/Features/Overview/OverviewEndpoints.cs
  getModules(projectId: string) {
    return this.api.get<ModulesResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/modules`);
  }
}
