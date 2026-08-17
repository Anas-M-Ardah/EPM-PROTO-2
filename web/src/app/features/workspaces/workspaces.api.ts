import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { WorkspaceOverviewResponse, CreateWorkspaceRequest } from './workspaces.types';

/** Every call the workspace overview makes. One method per endpoint. */
@Injectable({ providedIn: 'root' })
export class WorkspacesApi {
  private api = inject(Api);

  /**
   * [EP-WSP-01] GET /api/workspaces/{code}/overview → api/Features/Workspaces/WorkspacesEndpoints.cs
   *
   * `status` and `branch` are the toolbar's two filters and they go to the
   * SERVER, which re-derives the whole band over what survives them. A headline
   * computed on the whole workspace above a table filtered to part of it would
   * be two workspaces on one screen.
   */
  overview(code: string, filters: { status?: string; branch?: string } = {}) {
    return this.api.get<WorkspaceOverviewResponse>(
      `/api/workspaces/${encodeURIComponent(code)}/overview`, filters);
  }

  // [EP-WSP-02] POST /api/workspaces → api/Features/Workspaces/WorkspacesEndpoints.cs
  create(body: CreateWorkspaceRequest) {
    return this.api.post<{ code: string }>('/api/workspaces', body);
  }
}
