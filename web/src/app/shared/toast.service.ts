import { Injectable, inject, signal } from '@angular/core';
import { LangService } from '../core/lang';

export interface Toast {
  /** Monotonic. The template tracks by this so a new toast is a NEW DOM node. */
  id: number;
  text: string;
}

/**
 * The one-line confirmation at the bottom-inline-end of the screen.
 *
 * Ported from the reference's `showToast`. It exists mainly to be HONEST about
 * demo actions: the reference's Export / Import P6 / Alert rules buttons all
 * say "— تجريبي / — demo" rather than pretending to work, and so do ours. A
 * button that silently does nothing is worse than one that says it is a stub.
 *
 * ── WHY A LIST OF AT MOST ONE ─────────────────────────────────────────────
 * `.d-toast` animates itself in and out (desktop.css:1113). A CSS animation
 * only replays when the element is recreated, so holding the toast in a
 * tracked list — rather than swapping the text on a persistent node — is what
 * makes a second toast animate at all. Emptying and refilling a plain signal
 * across a microtask would do it too, but the refill lands outside Angular's
 * change detection and never renders.
 *
 * The 2.6s timer must match the animation, and it is what actually removes
 * the toast: under prefers-reduced-motion the animation is disabled entirely
 * (desktop.css:1119), so without the timer a reduced-motion user would get a
 * toast that never leaves.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private lang = inject(LangService);

  /** Zero or one. A queue would stack notices nobody asked to re-read. */
  readonly items = signal<Toast[]>([]);

  private seq = 0;
  private timer?: ReturnType<typeof setTimeout>;

  show(text: string) {
    clearTimeout(this.timer);
    const id = ++this.seq;
    this.items.set([{ id, text }]);
    this.timer = setTimeout(() => {
      // Only clear if nothing newer arrived in the meantime.
      if (this.items()[0]?.id === id) this.items.set([]);
    }, 2600);
  }

  /**
   * A page-head action that is not built yet. Says so, in the reference's own
   * wording («— تجريبي» / "— demo"), so the screen never implies a capability
   * the system does not have. One method rather than one per page: five
   * screens carry these buttons and they must all phrase it the same way.
   */
  demo(labelAr: string, labelEn: string) {
    this.show(this.lang.isAr() ? `${labelAr} — تجريبي` : `${labelEn} — demo`);
  }
}
