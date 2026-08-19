import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { FinancialsResponse, PaymentRegisterInput, PaymentRegisterResult } from './financials.types';

/**
 * Every call SCR-W7 makes.
 *
 * REGISTERING A PAYMENT IS NOW A WRITE (ملحق الشكل 20 · P-96, closed). This
 * file used to say the wizard needed a measurement source the model did not
 * have; it does not — the plate makes the ذرعة an ATTACHMENT, and requiring one
 * is what «يجعل الصرف مستنداً إلى إنجاز موثّق» means. What the wizard registers
 * is a `pending` certificate and its audit route; certifying and disbursing it
 * are المسار 8 steps 2–4 and belong to no screen yet.
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

  // [EP-FIN-02] POST /api/projects/{id}/financials/payments → same file
  /**
   * الشكل 20. Returns the new certificate's IDENTITY rather than the whole
   * model — the endpoint's own comment says why — so the caller re-reads.
   */
  registerPayment(projectId: string, body: PaymentRegisterInput) {
    return this.api.post<PaymentRegisterResult>(
      `/api/projects/${encodeURIComponent(projectId)}/financials/payments`, body);
  }
}
