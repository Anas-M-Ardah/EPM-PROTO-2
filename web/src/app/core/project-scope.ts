import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, of, shareReplay, tap } from 'rxjs';
import { Api } from './api';
import { ProjectRow, ProjectsResponse } from '../features/projects/projects.types';

/**
 * The projects the workspace picker offers.
 *
 * ── THE SAME SHAPE AS workspaces.ts, FOR THE SAME REASON ──────────────────
 * Which project is open is the URL (`/projects/:id`), not a field here. This
 * service holds only the LIST the picker renders, loaded once from the register
 * every other screen reads (`EP-PRJ-01`) so there is no second answer to "what
 * projects exist".
 *
 * ── WHY IT LIVES IN core/ AND NOT IN THE WORKSPACE FEATURE ────────────────
 * The picker is topbar chrome — `desktop.css:138` styles `.d-topbar
 * .d-projpick-btn` specifically — so the shell renders it, and the shell may
 * not depend on a feature. Identical to `workspaces.ts`, which calls
 * `EP-ENT-01` for the sidebar switcher.
 */
@Injectable({ providedIn: 'root' })
export class ProjectScopeService {
  private api = inject(Api);

  private rows = signal<ProjectRow[]>([]);
  readonly loaded = signal(false);

  private inFlight?: Observable<void>;

  /** Every project, in the order EP-PRJ-01 returns them. */
  list = computed(() => this.rows());

  // [EP-PRJ-01] GET /api/projects → api/Features/Projects/ProjectsEndpoints.cs
  ensureLoaded(): Observable<void> {
    if (this.loaded()) return of(undefined);
    this.inFlight ??= this.api.get<ProjectsResponse>('/api/projects').pipe(
      tap(r => {
        this.rows.set(r.rows ?? []);
        this.loaded.set(true);
      }),
      map(() => undefined),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.inFlight;
  }

  byId(id: string | null): ProjectRow | undefined {
    if (!id) return undefined;
    return this.rows().find(p => p.id === id);
  }
}
