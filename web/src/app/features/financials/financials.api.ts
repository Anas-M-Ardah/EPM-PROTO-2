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
  /**
   * الشكل 14 — «مرشح السنة». The year filters «مصروف السنة» SERVER-side, because
   * which certificates fall in a year is a question about paid dates and the
   * client does not hold them all.
   */
  get(projectId: string, year?: number | null) {
    return this.api.get<FinancialsResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/financials`,
      year ? { year } : undefined);
  }
}
