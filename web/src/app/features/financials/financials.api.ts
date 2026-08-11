import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { FinancialsResponse } from './financials.types';

/**
 * Every call SCR-W7 makes — one, and it reads.
 *
 * Registering a payment is a WRITE this phase does not build: a certificate is
 * raised against works measured on site, and the wizard that does it
 * (`DPaymentWizard`, project-modules.jsx:825) needs a measurement source this
 * data model does not have yet. The register shows what the finance department
 * recorded; it does not pretend to originate it.
 */
@Injectable({ providedIn: 'root' })
export class FinancialsApi {
  private api = inject(Api);

  // [EP-FIN-01] GET /api/projects/{id}/financials → api/Features/Financials/FinancialsEndpoints.cs
  get(projectId: string) {
    return this.api.get<FinancialsResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/financials`);
  }
}
