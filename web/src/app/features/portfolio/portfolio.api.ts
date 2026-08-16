import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { PortfolioResponse } from './portfolio.types';

/** Every call the Portfolio page makes. One method per endpoint. */
@Injectable({ providedIn: 'root' })
export class PortfolioApi {
  private api = inject(Api);

  /**
   * [EP-PRT-01] GET /api/portfolio → api/Features/Portfolio/PortfolioEndpoints.cs
   *
   * `status` and `kind` are the toolbar's two filters. They go to the SERVER
   * because they narrow the scope every figure is derived over: a headline
   * computed on the whole portfolio above a table filtered to part of it would
   * be two different portfolios on one screen.
   */
  get(filters: { workspace?: string; status?: string; kind?: string } = {}) {
    return this.api.get<PortfolioResponse>('/api/portfolio', filters);
  }
}
