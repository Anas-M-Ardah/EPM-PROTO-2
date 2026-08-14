import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { ChangeOrdersResponse } from './change-orders.types';
import { ChangeOrderRecordResponse } from './change-order-record.types';

/**
 * Every call SCR-W8's register makes — one, and it reads.
 *
 * The viewer is NOT a parameter. `core/api.ts` attaches `X-Epm-User` on every
 * request and the endpoint resolves BR-14 from it, so the relation on each row
 * belongs to whoever is actually asking. Passing a persona in the query string
 * would make the authorisation model a client-supplied value (`03 §7`).
 */
@Injectable({ providedIn: 'root' })
export class ChangeOrdersApi {
  private api = inject(Api);

  // [EP-CHG-01] GET /api/projects/{id}/change-orders
  //   → api/Features/ChangeOrders/ChangeOrdersEndpoints.cs
  list(projectId: string) {
    return this.api.get<ChangeOrdersResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/change-orders`);
  }

  // [EP-CHG-02] GET /api/projects/{id}/change-orders/{no}
  //   → api/Features/ChangeOrders/ChangeOrdersEndpoints.cs
  //
  // ONE call for all six tabs (`03 §9`). The page is a document about a
  // decision somebody is being asked to take, and a tab that arrives late is a
  // tab that gets skipped.
  record(projectId: string, no: string) {
    return this.api.get<ChangeOrderRecordResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/change-orders/${encodeURIComponent(no)}`);
  }
}
