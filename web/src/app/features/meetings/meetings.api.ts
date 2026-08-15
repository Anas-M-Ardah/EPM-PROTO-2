import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { MeetingsResponse } from './meetings.types';

/** Every call SCR-W11 makes — one, and it reads. */
@Injectable({ providedIn: 'root' })
export class MeetingsApi {
  private api = inject(Api);

  // [EP-MTG-01] GET /api/projects/{id}/meetings
  //   → api/Features/Meetings/MeetingsEndpoints.cs
  //
  // «متأخر» arrives derived: it is a due date measured against the project's
  // data date, not a state anybody stored (D-06).
  list(projectId: string) {
    return this.api.get<MeetingsResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/meetings`);
  }
}
