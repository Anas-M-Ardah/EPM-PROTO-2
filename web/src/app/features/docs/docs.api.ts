import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { RulesResponse } from './docs.types';

/** The rules reference's one call. It reads no table — the rules are code. */
@Injectable({ providedIn: 'root' })
export class DocsApi {
  private api = inject(Api);

  // [EP-DOCS-01] GET /api/docs/rules → api/Features/Docs/DocsEndpoints.cs
  //
  // Every worked example is EXECUTED on the request, through the same Domain
  // function the endpoints call. That is the guarantee this page exists for:
  // if a rule changes and its spec text does not, the two disagree here, in
  // public, on every load.
  list() {
    return this.api.get<RulesResponse>('/api/docs/rules');
  }
}
