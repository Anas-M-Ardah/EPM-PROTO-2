import { Injectable, signal } from '@angular/core';

/**
 * SCR-W8's «وضع الإنجاز» (Focus mode) — `04 §8`: *"Register and record —
 * fully specified in `03` §9–§10. Focus mode (split queue + work pane) for
 * the awaiting-me set."* `vo-record.jsx:519,800-803` holds the same queue in
 * a `useState` on the record component — in-memory, not persisted. This is
 * the Angular equivalent for a queue that has to survive a ROUTE change (the
 * register and the record are different routes, unlike the reference's one
 * component), so it lives here as a tiny root-provided service — the same
 * shape as `PersonaService` (`core/persona.ts`), not a new architecture.
 *
 * The register fills it from the rows it already has (`relation.canAct` —
 * BR-14, resolved server-side); the record page only reads it to render
 * prev/next + a counter and to offer a docked queue list. Neither page
 * recomputes who is "awaiting" — the queue is just the order of `no`s.
 */
@Injectable({ providedIn: 'root' })
export class ChangeOrderFocusQueue {
  readonly active = signal(false);
  readonly orderNos = signal<string[]>([]);
  readonly titles = signal<Record<string, { ar: string; en: string }>>({});

  start(items: { no: string; titleAr: string; titleEn: string }[]) {
    this.orderNos.set(items.map(i => i.no));
    this.titles.set(Object.fromEntries(items.map(i => [i.no, { ar: i.titleAr, en: i.titleEn }])));
    this.active.set(items.length > 0);
  }

  stop() {
    this.active.set(false);
    this.orderNos.set([]);
    this.titles.set({});
  }

  index(no: string): number {
    return this.orderNos().indexOf(no);
  }

  /** `no` is in the active queue — used to auto-drop a stale queue on a direct link. */
  contains(no: string): boolean {
    return this.orderNos().includes(no);
  }
}
