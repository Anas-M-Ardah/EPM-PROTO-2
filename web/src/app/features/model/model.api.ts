import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { ModelResponse, ViewerToken } from './model.types';

/** SCR-W10 data plus its server-mediated APS viewer token. */
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

  // [EP-MDL-02] GET /api/model-viewer/token
  //   → api/Features/Model/ApsViewerEndpoints.cs
  getViewerToken() {
    return this.api.get<ViewerToken>('/api/model-viewer/token');
  }
}
