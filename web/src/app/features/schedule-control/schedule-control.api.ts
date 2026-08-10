import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { ScheduleResponse } from './schedule-control.types';

/**
 * Every call the Schedule Control screen makes. One method per endpoint, named
 * after the endpoint, carrying its [EP-…] anchor so a single grep finds both ends.
 */
@Injectable({ providedIn: 'root' })
export class ScheduleControlApi {
  private api = inject(Api);

  // [EP-SCT-01] GET /api/schedule-control → api/Features/ScheduleControl/ScheduleControlEndpoints.cs
  list(filters: { q?: string; state?: string; workspace?: string } = {}) {
    return this.api.get<ScheduleResponse>('/api/schedule-control', filters);
  }
}
