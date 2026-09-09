import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { AccomplishmentPeriodsResponse, ClosePeriodResult } from './accomplishment-period.types';

/** المسار 7 — إغلاق فترة الإنجاز. Every call SCR-W6's period panel makes. */
@Injectable({ providedIn: 'root' })
export class AccomplishmentPeriodApi {
  private api = inject(Api);

  // [EP-ACP-01] GET /api/projects/{id}/periods → api/Features/Progress/AccomplishmentPeriodEndpoints.cs
  list(projectId: string) {
    return this.api.get<AccomplishmentPeriodsResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/periods`);
  }

  // [EP-ACP-02] POST /api/projects/{id}/periods/{periodId}/close → same file
  close(projectId: string, periodId: number, newDataDate: string) {
    return this.api.post<ClosePeriodResult>(
      `/api/projects/${encodeURIComponent(projectId)}/periods/${periodId}/close`,
      { newDataDate });
  }
}
