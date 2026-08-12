import { Directive, ElementRef, NgZone, OnDestroy, inject } from '@angular/core';

/**
 * <div class="lp-scene" epmHeroScene>…</div>
 *
 * PORTED VERBATIM from the design-revamp prototype's `HeroScene`
 * (screens-public.jsx:25) — the quiet pointer parallax on the blueprint
 * behind the hero. The first port left it out as "decoration"; it is not.
 * The drawing moving under the pointer is what the screen does.
 *
 * The numbers are the reference's, unchanged: ±12px horizontally over the
 * full viewport width, ±8px vertically over its height, both INVERTED so the
 * scene drifts against the pointer, and applied on a rAF so a mousemove burst
 * costs one transform per frame.
 *
 * Both of the reference's opt-outs are kept, and they are the reason this is
 * a directive rather than a CSS hover:
 *   · `prefers-reduced-motion: reduce` — no listener at all.
 *   · `pointer: fine` — a touch device has no hovering pointer to track.
 *
 * The listener runs OUTSIDE Angular. It touches one element's `transform` and
 * no application state, so waking change detection sixty times a second for
 * it would be pure cost.
 */
@Directive({
  selector: '[epmHeroScene]',
  standalone: true,
})
export class HeroSceneDirective implements OnDestroy {
  private el = inject(ElementRef<HTMLElement>).nativeElement as HTMLElement;
  private zone = inject(NgZone);

  private raf = 0;
  private tx = 0;
  private ty = 0;
  private onMove?: (e: MouseEvent) => void;

  constructor() {
    if (typeof window === 'undefined') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(pointer: fine)').matches) return;

    const apply = () => {
      this.raf = 0;
      this.el.style.transform =
        'translate3d(' + this.tx.toFixed(1) + 'px,' + this.ty.toFixed(1) + 'px,0)';
    };

    this.onMove = (e: MouseEvent) => {
      this.tx = (e.clientX / window.innerWidth - 0.5) * -12;
      this.ty = (e.clientY / window.innerHeight - 0.5) * -8;
      if (!this.raf) this.raf = requestAnimationFrame(apply);
    };

    this.zone.runOutsideAngular(() => {
      window.addEventListener('mousemove', this.onMove!);
    });
  }

  ngOnDestroy() {
    if (this.onMove) window.removeEventListener('mousemove', this.onMove);
    if (this.raf) cancelAnimationFrame(this.raf);
  }
}
