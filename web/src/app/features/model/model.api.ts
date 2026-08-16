import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { ModelResponse } from './model.types';

/** SCR-W10's one call. The viewer is stubbed (07 §8); the data is not. */
@Injectable({ providedIn: 'root' })
export class ModelApi {
  private api = inject(Api);

  // [EP-MDL-01] GET /api/projects/{id}/model
  //   → api/Features/Model/ModelEndpoints.cs
  //
  // The tree, the elements and their resolved BOQ and activity links arrive
  // together: the panel opens on an element already in the tree, and the link
  // text is a join the server did — a client holding only «BQ-007» would show
  // a bare code or go fetch the bill to decorate it.
  get(projectId: string) {
    return this.api.get<ModelResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/model`);
  }
}
