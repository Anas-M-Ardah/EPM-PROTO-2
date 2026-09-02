import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { ProjectReportBody, ProjectReportsResponse } from './project-reports.types';

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

  // [EP-PRP-02] GET /api/projects/{id}/reports/{reportId}
  //   → api/Features/ProjectReports/ProjectReportsEndpoints.cs
  //
  // ONE report, rendered. EP-PRP-01 says which can be produced; this is the
  // one you picked. The availability answer travels WITH the body, so an
  // unproducible report states what is missing instead of drawing an empty
  // table (P-213).
  body(projectId: string, reportId: string) {
    return this.api.get<ProjectReportBody>(
      `/api/projects/${encodeURIComponent(projectId)}/reports/${encodeURIComponent(reportId)}`);
  }
}
