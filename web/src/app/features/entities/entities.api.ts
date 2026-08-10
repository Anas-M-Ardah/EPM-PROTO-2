import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { EntitiesResponse } from './entities.types';

/** Every call the Entities page makes. One method per endpoint. */
@Injectable({ providedIn: 'root' })
export class EntitiesApi {
  private api = inject(Api);

  // [EP-ENT-01] GET /api/entities → api/Features/Entities/EntitiesEndpoints.cs
  list(filters: { q?: string; kind?: string } = {}) {
    return this.api.get<EntitiesResponse>('/api/entities', filters);
  }
}
