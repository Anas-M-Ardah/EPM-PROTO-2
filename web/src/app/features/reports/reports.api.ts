import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { ReportsResponse } from './reports.types';

/**
 * Every call the Reports register makes. One method per endpoint, named after
 * the endpoint, carrying its [EP-…] anchor so a single grep finds both ends.
 *
 * There is exactly one: report RENDERING is in no phase of this build, so
 * nothing here posts. The Run button says so in the reference's own wording.
 */
@Injectable({ providedIn: 'root' })
export class ReportsApi {
  private api = inject(Api);

  // [EP-RPT-01] GET /api/reports → api/Features/Reports/ReportsEndpoints.cs
  list(filters: { q?: string; category?: string; projectId?: string; workspace?: string } = {}) {
    return this.api.get<ReportsResponse>('/api/reports', filters);
  }
}
