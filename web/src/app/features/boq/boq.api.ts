import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import {
  BoqAllocationSave, BoqAmendmentDetail, BoqAssignmentResponse, BoqDistributionResponse,
  BoqDistributionSave, BoqGateResponse, BoqItemCreate, BoqItemEdit, BoqRegisterResponse,
  BoqSavedView, BoqSavedViewInput, ProjectBeneficiaryRow,
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

  // [EP-BOQ-17] GET /api/projects/{id}/boq/{contractId}/items/{code}/amendments → same file
  // The drawer behind the row badge (04 §6 · ROADMAP 4.5). Fetched on open
  // rather than sent with every row: the register needs the COUNT and the two
  // deltas, and the chain is only ever read one line at a time.
  amendments(projectId: string, contractId: string, code: string) {
    return this.api.get<BoqAmendmentDetail>(`${this.item(projectId, contractId, code)}/amendments`);
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

  // ── «العروض» — saved views (ملحق الشكل 12) ─────────────────────────────
  //
  // THE ONLY CALLS HERE THAT CARRY NEITHER PROJECT NOR CONTRACT. A view holds
  // no bill data, so it is not scoped to one; the server scopes it to the
  // persona instead. See BoqSavedView for why this is a table and not
  // localStorage, which is where the reference keeps it.

  // [EP-BOQ-14] GET /api/boq/views → api/Features/Boq/BoqEndpoints.cs
  views() {
    return this.api.get<BoqSavedView[]>('/api/boq/views');
  }

  // [EP-BOQ-15] POST /api/boq/views → same file
  // Posting a name that already exists UPDATES that view — that is how one is
  // edited, and it is the reference's own behaviour.
  saveView(body: BoqSavedViewInput) {
    return this.api.post<BoqSavedView>('/api/boq/views', body);
  }

  // [EP-BOQ-16] DELETE /api/boq/views/{id} → same file
  deleteView(id: number) {
    return this.api.delete<void>(`/api/boq/views/${id}`);
  }

  // ── «الجهات المستفيدة» (ملحق الشكل 12) ─────────────────────────────────
  //
  // IN THE PROJECTS FEATURE, NOT THIS ONE. The drawer opens from the BOQ
  // toolbar, but the tick writes `Projects.BeneficiaryCodes` (01 §2.1) — the
  // same column EP-PRJ-03 writes and the same activity log audits. Called from
  // here because this is the screen that opens it; that split is why both
  // anchors below name a `Features/Projects` file.

  // [EP-PRJ-05] GET /api/projects/{id}/beneficiaries → api/Features/Projects/ProjectsEndpoints.cs
  beneficiaries(projectId: string) {
    return this.api.get<ProjectBeneficiaryRow[]>(
      `/api/projects/${encodeURIComponent(projectId)}/beneficiaries`);
  }

  // [EP-PRJ-06] PUT /api/projects/{id}/beneficiaries → same file
  // The WHOLE ticked set, not one toggle — a half-applied assignment is worse
  // than a rejected one.
  saveBeneficiaries(projectId: string, codes: string[]) {
    return this.api.put<{ id: string; count: number }>(
      `/api/projects/${encodeURIComponent(projectId)}/beneficiaries`, { codes });
  }
}
