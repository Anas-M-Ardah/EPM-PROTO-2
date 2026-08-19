import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import {
  SupplyItemDetailResponse, SupplyItemRow, SupplyRegisterResponse, SupplyReceiptInput,
} from './supply.types';

/**
 * Every call الفقرات التجهيزية makes — ملحق الأشكال 50–56.
 *
 * Every route carries the project AND the contract, for the same reason SCR-W4's
 * do: a فقرة belongs to exactly one contract (01 §1), and asking for another
 * project's is a 404 rather than a filtered empty list.
 */
@Injectable({ providedIn: 'root' })
export class SupplyApi {
  private api = inject(Api);

  private base(projectId: string, contractId: string) {
    return `/api/projects/${encodeURIComponent(projectId)}/supply/${encodeURIComponent(contractId)}`;
  }

  // [EP-SUP-01] GET /api/projects/{id}/supply/{contractId} → api/Features/Supply/SupplyEndpoints.cs
  /** الشكل 50 · الشكل 55 — the items AND the receipts, one read for two tabs. */
  register(projectId: string, contractId: string) {
    return this.api.get<SupplyRegisterResponse>(this.base(projectId, contractId));
  }

  // [EP-SUP-02] GET …/items/{code} → same file
  /** الشكل 51 · الشكل 52 — the five-tab detail panel. */
  item(projectId: string, contractId: string, code: string) {
    return this.api.get<SupplyItemDetailResponse>(
      `${this.base(projectId, contractId)}/items/${encodeURIComponent(code)}`);
  }

  // [EP-SUP-03] GET …/inquiry?q= → same file
  /** الشكل 56 — one field, four ways in: تسلسل · رمز · جهاز · رقم تسلسلي. */
  inquiry(projectId: string, contractId: string, q: string) {
    return this.api.get<SupplyItemRow[]>(`${this.base(projectId, contractId)}/inquiry`, { q });
  }

  // [EP-SUP-04] POST …/items/{code}/receipts → same file
  /**
   * الشكل 53 · الشكل 54 — the only way a received quantity moves. Returns the
   * WHOLE register: one receipt moves the item, its status chip, the
   * beneficiary's column, the totals strip and the receipts tab's count.
   */
  recordReceipt(projectId: string, contractId: string, code: string, body: SupplyReceiptInput) {
    return this.api.post<SupplyRegisterResponse>(
      `${this.base(projectId, contractId)}/items/${encodeURIComponent(code)}/receipts`, body);
  }
}
