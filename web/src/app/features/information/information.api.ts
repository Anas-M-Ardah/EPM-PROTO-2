import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { InformationResponse, ProjectDefinitionInput, ProjectDefinitionResponse } from './information.types';

/**
 * Every call SCR-W2 makes. One method per endpoint, carrying its anchor.
 *
 * ── TWO OF THE THREE ARE THE PROJECTS FEATURE'S ──────────────────────────
 * الشكل 5's «تحرير البيانات» edits in place, so this screen loads and saves the
 * project definition — through the SAME `EP-PRJ-04` / `EP-PRJ-03` the create
 * form uses. They are called from here rather than duplicated: there is one
 * project update endpoint in the system and this is a second caller of it, not
 * a second one of it.
 */
@Injectable({ providedIn: 'root' })
export class InformationApi {
  private api = inject(Api);

  // [EP-INF-01] GET /api/projects/{id}/information → api/Features/Information/InformationEndpoints.cs
  get(projectId: string) {
    return this.api.get<InformationResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/information`);
  }

  // [EP-PRJ-04] GET /api/projects/{id}/definition → api/Features/Projects/ProjectsEndpoints.cs
  // The EDITABLE shape: raw codes where the card shows resolved labels.
  definition(projectId: string) {
    return this.api.get<ProjectDefinitionResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/definition`);
  }

  // [EP-PRJ-03] PUT /api/projects/{id} → api/Features/Projects/ProjectsEndpoints.cs
  save(projectId: string, definition: ProjectDefinitionInput) {
    return this.api.put<{ id: string }>(
      `/api/projects/${encodeURIComponent(projectId)}`, definition);
  }
}
