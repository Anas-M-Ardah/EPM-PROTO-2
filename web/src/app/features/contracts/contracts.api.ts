import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { ContractsResponse } from './contracts.types';

/**
 * Every call the Contracts page makes. One method per endpoint, named after the
 * endpoint, carrying its [EP-…] anchor so a single grep finds both ends.
 */
@Injectable({ providedIn: 'root' })
export class ContractsApi {
  private api = inject(Api);

  // [EP-CNT-01] GET /api/contracts → api/Features/Contracts/ContractsEndpoints.cs
  list(filters: { q?: string; status?: string; workspace?: string; projectId?: string } = {}) {
    return this.api.get<ContractsResponse>('/api/contracts', filters);
  }
}
