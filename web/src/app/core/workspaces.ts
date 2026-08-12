import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, map, of, shareReplay, tap } from 'rxjs';
import { Api } from './api';
import { EntitiesResponse, EntityRow } from '../features/entities/entities.types';

/**
 * The workspaces THIS USER may enter, and which one is in scope.
 *
 * ── SCOPE IS THE URL, NOT A SERVICE FIELD ─────────────────────────────────
 * Every enterprise endpoint already accepts `?workspace=`, and every page
 * already reads `?ws=` off the route. So the switcher does not hold state: it
 * navigates, and the pages react. That keeps a scoped view shareable as a
 * link and survivable across a reload, which a service field would not be.
 *
 * ── ONE LIST OF "MY WORKSPACES" (BR-15) ───────────────────────────────────
 * Loads once from EP-ENT-01 — the same request the register renders. The
 * SERVER decides what is in it, from the persona's assignments, so the
 * switcher and the register cannot disagree and neither can be widened by
 * anything the client does. الشكل 1 gives the switcher the caption
 * «مساحات العمل المتاحة لك»; this is what makes that caption true.
 *
 * The client-side `has()` below is a NAVIGATION convenience — it lets the
 * shell correct a bad `?ws=` before firing six requests that would each 403.
 * It is not the enforcement; the enforcement is Features/Workspaces/WorkspaceScope.
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

  /**
   * Is this code one the user may enter? Empty is the enterprise scope and is
   * always allowed. Only meaningful once `loaded()` — before that the answer
   * is "not yet known", and the shell waits rather than guessing.
   */
  has(code: string | null | undefined): boolean {
    if (!code) return true;
    return this.rows().some(w => w.code === code);
  }

  /** Refetch after POST /api/dev/load-fixture or /api/dev/reset. */
  reload(): Observable<void> {
    this.loaded.set(false);
    this.inFlight = undefined;
    return this.ensureLoaded();
  }
}
