import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import {
  ContractDefinitionInput,
  ContractDefinitionResponse,
  ContractDetailResponse,
  ContractRegisterResponse,
} from './contract.types';

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

  // [EP-CON-03] POST /api/projects/{id}/contracts → same file
  create(projectId: string, body: ContractDefinitionInput) {
    return this.api.post<{ id: string }>(
      `/api/projects/${encodeURIComponent(projectId)}/contracts`, body);
  }

  // [EP-CON-04] PUT /api/projects/{id}/contracts/{contractId} → same file
  save(projectId: string, contractId: string, body: ContractDefinitionInput) {
    return this.api.put<{ id: string }>(
      `/api/projects/${encodeURIComponent(projectId)}/contracts/${encodeURIComponent(contractId)}`,
      body);
  }

  // [EP-CON-05] GET /api/projects/{id}/contracts/{contractId}/definition → same file
  definition(projectId: string, contractId: string) {
    return this.api.get<ContractDefinitionResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/contracts/${encodeURIComponent(contractId)}/definition`);
  }
}
