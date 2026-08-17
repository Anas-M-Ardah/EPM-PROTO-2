import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import {
  BoqAllocationSave, BoqAssignmentResponse, BoqDistributionResponse, BoqDistributionSave,
  BoqGateResponse, BoqItemCreate, BoqItemEdit, BoqRegisterResponse,
} from './boq.types';

/**
 * Every call SCR-W4 makes. One method per endpoint, carrying its anchor.
 *
 * EVERY ROUTE CARRIES BOTH THE PROJECT AND THE CONTRACT. Not because the API
 * needs the project to find the contract — it does not — but because that pair
 * is what BoqEndpoints checks: a contract of another project 404s rather than
 * returning someone else's bill of quantities (01 §1, P-01).
 *
 * The three writes return the RECOMPUTED view rather than the row they touched.
 * An edit moves an amount, and an amount moves every weight in the contract
 * (BR-01's denominator is the whole bill), so a response of one row would leave
 * a weight column on screen that no longer adds to 100.00.
 */
@Injectable({ providedIn: 'root' })
export class BoqApi {
  private api = inject(Api);

  private base(projectId: string, contractId?: string) {
    const p = `/api/projects/${encodeURIComponent(projectId)}/boq`;
    return contractId ? `${p}/${encodeURIComponent(contractId)}` : p;
  }

  private item(projectId: string, contractId: string, code: string) {
    return `${this.base(projectId, contractId)}/items/${encodeURIComponent(code)}`;
  }

  // [EP-BOQ-01] GET /api/projects/{id}/boq → api/Features/Boq/BoqEndpoints.cs
  gate(projectId: string) {
    return this.api.get<BoqGateResponse>(this.base(projectId));
  }

  // [EP-BOQ-02] GET /api/projects/{id}/boq/{contractId} → same file
  register(projectId: string, contractId: string) {
    return this.api.get<BoqRegisterResponse>(this.base(projectId, contractId));
  }

  // [EP-BOQ-03] PUT /api/projects/{id}/boq/{contractId}/items/{code} → same file
  saveItem(projectId: string, contractId: string, code: string, body: BoqItemEdit) {
    return this.api.put<BoqRegisterResponse>(this.item(projectId, contractId, code), body);
  }

  // [EP-BOQ-12] POST /api/projects/{id}/boq/{contractId}/items → same file
  // «الإدخال اليدوي» — المسار 3 step 3ب. Returns the recomputed register for the
  // same reason the edit does: a new line moves every weight in the contract.
  addItem(projectId: string, contractId: string, body: BoqItemCreate) {
    return this.api.post<BoqRegisterResponse>(`${this.base(projectId, contractId)}/items`, body);
  }

  // [EP-BOQ-04] DELETE /api/projects/{id}/boq/{contractId}/items/{code} → same file
  deleteItem(projectId: string, contractId: string, code: string) {
    return this.api.delete<BoqRegisterResponse>(this.item(projectId, contractId, code));
  }

  // [EP-BOQ-05] GET …/items/{code}/distribution → same file
  distribution(projectId: string, contractId: string, code: string) {
    return this.api.get<BoqDistributionResponse>(
      `${this.item(projectId, contractId, code)}/distribution`);
  }

  // [EP-BOQ-06] PUT …/items/{code}/distribution → same file
  saveDistribution(projectId: string, contractId: string, code: string, body: BoqDistributionSave) {
    return this.api.put<BoqDistributionResponse>(
      `${this.item(projectId, contractId, code)}/distribution`, body);
  }

  // [EP-BOQ-07] GET /api/projects/{id}/boq/{contractId}/assignment → same file
  assignment(projectId: string, contractId: string, basis: string) {
    return this.api.get<BoqAssignmentResponse>(
      `${this.base(projectId, contractId)}/assignment`, { basis });
  }

  // [EP-BOQ-08] PUT …/items/{code}/allocation → same file
  saveAllocation(projectId: string, contractId: string, code: string, body: BoqAllocationSave) {
    return this.api.put<BoqAssignmentResponse>(
      `${this.item(projectId, contractId, code)}/allocation`, body);
  }
}
