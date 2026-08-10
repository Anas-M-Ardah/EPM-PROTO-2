import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { ProjectsResponse } from './projects.types';

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
}
