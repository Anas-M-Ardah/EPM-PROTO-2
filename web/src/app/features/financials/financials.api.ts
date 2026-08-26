import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import {
  FinancialRecordsInput, FinancialRecordsResult,
  FinancialsResponse,
  PaymentRegisterInput, PaymentRegisterResult,
  PaymentReleaseInput, PaymentReleaseResult,
} from './financials.types';

/**
 * Every call SCR-W7 makes — one read and three writes.
 *
 * THE WHOLE OF المسار 8 IS HERE. `registerPayment` is steps 1–4 (ملحق الشكل 20),
 * `releaseDesk` is steps 5–9 (ملحق الشكل 17), and `saveRecords` is ملحق الشكل 18's
 * «مدخل التحرير الوحيد للبيانات المالية للمشروع».
 *
 * EVERY WRITE RETURNS AN IDENTITY, NOT THE MODEL, and the page re-reads. The
 * reason is in `FinancialsEndpoints.cs`: `EP-FIN-01` is a long inline
 * projection over ten tables, and extracting it to be re-run by three writers
 * would be a refactor of the read path in service of the writes.
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
  /** ملحق الشكل 20 — المسار 8 steps 1–4. Registers a `pending` certificate. */
  registerPayment(projectId: string, body: PaymentRegisterInput) {
    return this.api.post<PaymentRegisterResult>(
      `/api/projects/${encodeURIComponent(projectId)}/financials/payments`, body);
  }

  // [EP-FIN-03] POST /api/projects/{id}/financials/payments/{paymentId}/release → same file
  /**
   * ملحق الشكل 17 — المسار 8 steps 5–9. The desk holding the file releases it;
   * whether that certifies the works or moves the money is the server's answer.
   */
  releaseDesk(projectId: string, paymentId: number, body: PaymentReleaseInput) {
    return this.api.post<PaymentReleaseResult>(
      `/api/projects/${encodeURIComponent(projectId)}/financials/payments/${paymentId}/release`, body);
  }

  // [EP-FIN-04] PUT /api/projects/{id}/financials/records → same file
  /**
   * ملحق الشكل 18. Sends only the fields that MOVED — an omitted key is
   * untouched and a present-but-null key clears the figure, which the change
   * log records differently.
   */
  saveRecords(projectId: string, body: FinancialRecordsInput) {
    return this.api.put<FinancialRecordsResult>(
      `/api/projects/${encodeURIComponent(projectId)}/financials/records`, body);
  }
}
