import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, of, shareReplay, tap } from 'rxjs';
import { Api } from './api';
import { EntitiesResponse, EntityRow } from '../features/entities/entities.types';

/**
 * The workspaces the sidebar switcher offers, and which one is in scope.
 *
 * ── SCOPE IS THE URL, NOT A SERVICE FIELD ─────────────────────────────────
 * Every enterprise endpoint already accepts `?workspace=`, and every page
 * already reads `?ws=` off the route. So the switcher does not hold state: it
 * navigates, and the pages react. That keeps a scoped view shareable as a
 * link and survivable across a reload, which a service field would not be.
 *
 * Loads once from EP-ENT-01, the same list the Entities register renders —
 * there is no second source of truth for what a workspace is.
 */
@Injectable({ providedIn: 'root' })
export class WorkspacesService {
  private api = inject(Api);

  private rows = signal<EntityRow[]>([]);
  readonly loaded = signal(false);

  private inFlight?: Observable<void>;

  /** Every workspace, in the order EP-ENT-01 returns them. */
  list = computed(() => this.rows());
  count = computed(() => this.rows().length);

  // [EP-ENT-01] GET /api/entities → api/Features/Entities/EntitiesEndpoints.cs
  ensureLoaded(): Observable<void> {
    if (this.loaded()) return of(undefined);
    this.inFlight ??= this.api.get<EntitiesResponse>('/api/entities').pipe(
      tap(r => {
        this.rows.set(r.rows ?? []);
        this.loaded.set(true);
      }),
      map(() => undefined),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.inFlight;
  }

  byCode(code: string | null | undefined): EntityRow | undefined {
    if (!code) return undefined;
    return this.rows().find(w => w.code === code);
  }

  /** Refetch after POST /api/dev/load-fixture or /api/dev/reset. */
  reload(): Observable<void> {
    this.loaded.set(false);
    this.inFlight = undefined;
    return this.ensureLoaded();
  }
}
