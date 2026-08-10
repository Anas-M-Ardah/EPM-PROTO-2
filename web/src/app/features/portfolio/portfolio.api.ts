import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { PortfolioResponse } from './portfolio.types';

/** Every call the Portfolio page makes. One method per endpoint. */
@Injectable({ providedIn: 'root' })
export class PortfolioApi {
  private api = inject(Api);

  // [EP-PRT-01] GET /api/portfolio → api/Features/Portfolio/PortfolioEndpoints.cs
  get(filters: { workspace?: string } = {}) {
    return this.api.get<PortfolioResponse>('/api/portfolio', filters);
  }
}
