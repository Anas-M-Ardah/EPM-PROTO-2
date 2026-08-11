import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { ChangeOrdersResponse } from './change-orders.types';

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
}
