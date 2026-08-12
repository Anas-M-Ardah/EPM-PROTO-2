import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import {
  CreateProjectRequest,
  ProjectDefinitionInput,
  ProjectDefinitionResponse,
  ProjectsResponse,
} from './projects.types';

/**
 * Every call the Projects page makes. One method per endpoint, named after the
 * endpoint, carrying its [EP-…] anchor so a single grep finds both ends.
 */
@Injectable({ providedIn: 'root' })
export class ProjectsApi {
  private api = inject(Api);

  // [EP-PRJ-01] GET /api/projects → api/Features/Projects/ProjectsEndpoints.cs
  list(filters: { q?: string; status?: string; workspace?: string } = {}) {
    return this.api.get<ProjectsResponse>('/api/projects', filters);
  }

  // [EP-PRJ-02] POST /api/projects → api/Features/Projects/ProjectsEndpoints.cs
  create(body: CreateProjectRequest) {
    return this.api.post<{ id: string }>('/api/projects', body);
  }

  // [EP-PRJ-03] PUT /api/projects/{id} → api/Features/Projects/ProjectsEndpoints.cs
  save(id: string, body: ProjectDefinitionInput) {
    return this.api.put<{ id: string }>(`/api/projects/${encodeURIComponent(id)}`, body);
  }

  // [EP-PRJ-04] GET /api/projects/{id}/definition → api/Features/Projects/ProjectsEndpoints.cs
  definition(id: string) {
    return this.api.get<ProjectDefinitionResponse>(
      `/api/projects/${encodeURIComponent(id)}/definition`);
  }
}
