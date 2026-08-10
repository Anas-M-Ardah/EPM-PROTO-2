import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, of, shareReplay, tap } from 'rxjs';
import { Api } from './api';
import { LangService } from './lang';

/**
 * Member names mirror api/Epm.Api/Features/Lookups/LookupsDto.cs exactly, so
 * `grep -rn "nameAr" api web` finds both ends (CLAUDE.md §2).
 */
export interface LookupItem {
  code: string;
  nameAr: string;
  nameEn: string;
}

export interface LookupsResponse {
  kinds: Record<string, LookupItem[]>;
}

/**
 * EVERY ENUM LABEL IN THE APP (06 §1–§11).
 *
 * Enum labels are business-maintained data, so they come from the Lookups
 * table — not from core/lang.ts, which is UI chrome only. A page that shows a
 * status, a stage, a change type or a coverage state asks this service.
 *
 * ── LOADS ONCE ────────────────────────────────────────────────────────────
 * `ensureLoaded()` is shared and replayed: the first caller triggers the HTTP
 * request, every later caller gets the cached response and completes at once,
 * so a page can forkJoin it with its own data without a second round trip.
 *
 * ── FALLS BACK TO THE CODE ────────────────────────────────────────────────
 * The database starts empty (P-03), so before the fixture is loaded there is
 * genuinely nothing to translate. `label()` then returns the raw code rather
 * than an em dash or a blank: the code is the truth we have.
 */
@Injectable({ providedIn: 'root' })
export class LookupsService {
  private api = inject(Api);
  private lang = inject(LangService);

  /** kind → rows, in the order 06 lists them (the API sorts by Sort). */
  private kinds = signal<Record<string, LookupItem[]>>({});

  /** True once the fetch has come back — empty result included. */
  readonly loaded = signal(false);

  private inFlight?: Observable<void>;

  /**
   * [EP-LKP-01] GET /api/lookups → api/Features/Lookups/LookupsEndpoints.cs
   *
   * Call it from a page's load(); forkJoin it with the page's own request so
   * both fly in parallel and the labels are present on first paint.
   */
  ensureLoaded(): Observable<void> {
    if (this.loaded()) return of(undefined);
    this.inFlight ??= this.api.get<LookupsResponse>('/api/lookups').pipe(
      tap(r => {
        this.kinds.set(r.kinds ?? {});
        this.loaded.set(true);
      }),
      map(() => undefined),
      shareReplay({ bufferSize: 1, refCount: false }),
    );
    return this.inFlight;
  }

  /** Every row of one kind, in spec order. Empty before the first load. */
  list(kind: string): LookupItem[] {
    return this.kinds()[kind] ?? [];
  }

  /** The AR or EN label for one code. Returns the code when unknown. */
  label(kind: string, code: string | null | undefined): string {
    if (!code) return '—';
    const row = this.list(kind).find(x => x.code === code);
    return row ? this.lang.pick(row.nameAr, row.nameEn) : code;
  }

  /** Refetch after POST /api/dev/load-fixture or /api/dev/reset. */
  reload(): Observable<void> {
    this.loaded.set(false);
    this.inFlight = undefined;
    return this.ensureLoaded();
  }
}
