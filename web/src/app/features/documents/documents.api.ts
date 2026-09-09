import { Injectable, inject } from '@angular/core';
import { Api } from '../../core/api';
import { DocumentsResponse, RevisionInput } from './documents.types';

/** Every call SCR-W12 makes — one, and it carries the revisions with it. */
@Injectable({ providedIn: 'root' })
export class DocumentsApi {
  private api = inject(Api);

  // [EP-DOC-01] GET /api/projects/{id}/documents
  //   → api/Features/Documents/DocumentsEndpoints.cs
  //
  // The detail panel opens on a row already in the table, so its revision
  // history arrives with it — a second request would give the panel its own
  // chance to disagree with the row it opened from (P-84).
  list(projectId: string) {
    return this.api.get<DocumentsResponse>(
      `/api/projects/${encodeURIComponent(projectId)}/documents`);
  }

  // [EP-DOC-02] POST /api/projects/{id}/documents/{code}/revisions
  //   → api/Features/Documents/DocumentsEndpoints.cs
  //
  // P-253 — «رفع مراجعة». A new file is always a NEW revision — there is no
  // "replace this one" call, and there must not be one (ملحق الشكل 46).
  uploadRevision(projectId: string, code: string, body: RevisionInput) {
    return this.api.post<{ documentCode: string; revisionNo: number }>(
      `/api/projects/${encodeURIComponent(projectId)}/documents/${encodeURIComponent(code)}/revisions`,
      body);
  }
}
