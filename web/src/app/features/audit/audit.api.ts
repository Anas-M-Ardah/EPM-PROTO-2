import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { AuditResponse } from './audit.types';

/** SCR-W15's one call. It reads three trails and writes none. */
@Injectable({ providedIn: 'root' })
export class AuditApi {
  private api = inject(Api);

  // [EP-AUD-01] GET /api/projects/{id}/audit
  //   → api/Features/Audit/AuditEndpoints.cs
  //
  // The union of the project, contract and change-order logs. There is no
  // audit TABLE — a fourth store copying the three would be a second answer
  // to who changed what (P-122).
  list(projectId: string) {
    return this.api.get<AuditResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/audit`);
  }
}
