import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { ChangeOrdersResponse } from './change-orders.types';
import { ChangeOrderRecordResponse } from './change-order-record.types';
import {
  WizardCreateResponse, WizardDraft, WizardPreviewResponse, WizardSourceResponse,
} from './change-order-wizard.types';

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

  // [EP-WIZ-01] GET /api/projects/{id}/change-orders/new
  //   → api/Features/ChangeOrders/ChangeOrderWizardEndpoints.cs
  //
  // The contracts of the project, each with ITS OWN lines and activities. The
  // wizard is never handed a flat list, so it cannot assemble an order that
  // spans two contracts (`03 §8`, non-negotiable #1).
  wizardSource(projectId: string) {
    return this.api.get<WizardSourceResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/change-orders/new`);
  }

  // [EP-WIZ-02] POST /api/projects/{id}/change-orders/preview
  //   → api/Features/ChangeOrders/ChangeOrderWizardEndpoints.cs
  //
  // WRITES NOTHING. Every figure الشكل 39 and الشكل 40 print comes from here,
  // through the same Domain/ChangeOrderRecord the record page reads — which is
  // why what a user saw when they submitted is what the record shows.
  preview(projectId: string, draft: WizardDraft) {
    return this.api.post<WizardPreviewResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/change-orders/preview`, draft);
  }

  // [EP-WIZ-03] POST /api/projects/{id}/change-orders?kind=draft|submit
  //   → api/Features/ChangeOrders/ChangeOrderWizardEndpoints.cs
  //
  // `03 §8` step 5's two buttons, and nothing else. A submit that trips a BR-07
  // gate comes back 422 with the offending lines named.
  create(projectId: string, draft: WizardDraft, kind: 'draft' | 'submit') {
    return this.api.post<WizardCreateResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/change-orders?kind=${kind}`, draft);
  }
}
