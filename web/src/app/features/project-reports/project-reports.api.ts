import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { ProjectReportsResponse } from './project-reports.types';

/** SCR-W14's one call. Rendering a report is not built; the button says so. */
@Injectable({ providedIn: 'root' })
export class ProjectReportsApi {
  private api = inject(Api);

  // [EP-PRP-01] GET /api/projects/{id}/reports
  //   → api/Features/ProjectReports/ProjectReportsEndpoints.cs
  //
  // The SAME ReportCatalog SCR-E7 reads, asked a sharper question: not «does
  // this table exist» but «does THIS project have rows in it».
  list(projectId: string) {
    return this.api.get<ProjectReportsResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/reports`);
  }
}
