import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { ContractDetailResponse, ContractRegisterResponse } from './contract.types';

/** Every call SCR-W3 makes. One method per endpoint, carrying its anchor. */
@Injectable({ providedIn: 'root' })
export class ContractTabApi {
  private api = inject(Api);

  // [EP-CON-01] GET /api/projects/{id}/contracts → api/Features/ContractTab/ContractEndpoints.cs
  register(projectId: string) {
    return this.api.get<ContractRegisterResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/contracts`);
  }

  // [EP-CON-02] GET /api/projects/{id}/contracts/{contractId} → same file
  detail(projectId: string, contractId: string) {
    return this.api.get<ContractDetailResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/contracts/${encodeURIComponent(contractId)}`);
  }
}
