import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { RisksResponse } from './risks.types';

/** Every call SCR-W9 makes — one, and it reads. */
@Injectable({ providedIn: 'root' })
export class RisksApi {
  private api = inject(Api);

  // [EP-RSK-01] GET /api/projects/{id}/risks
  //   → api/Features/Risks/RisksEndpoints.cs
  //
  // Severity arrives DERIVED. The screen prints «الخطورة = الاحتمالية ×
  // التأثير» beside its own title, so computing it here would be a second
  // implementation of a rule the page is displaying (CLAUDE.md §3.1).
  list(projectId: string) {
    return this.api.get<RisksResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/risks`);
  }
}
