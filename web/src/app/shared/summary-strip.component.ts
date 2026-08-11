import {
  AfterViewInit, Component, ElementRef, Input, OnDestroy, ViewEncapsulation, inject,
} from '@angular/core';
import * as fmt from '../core/format';

export interface Stat {
  label: string;
  value: number;
  /** Unit or qualifier, e.g. '%' or 'يوم'. */
  suffix?: string;
  /**
   * Decimal places. Omitted, the figure is a whole number — which is right for
   * money (D-11) and for a percentage on a KPI band. Set it for a performance
   * INDEX: SPI 0.49 rounded to a whole number is 0, and a tile reading "0"
   * where the index is 0.49 is not a rounding artefact, it is a different
   * claim (BR-11).
   */
  dp?: number;
  /** Pre-formatted signed change, e.g. '−22 نقطة'. Display only. */
  delta?: string;
  deltaDir?: 'up' | 'down' | 'flat';
  /** 0–100. Renders the progress rail under the figure. */
  bar?: number;
  /** One line of context under the tile, e.g. 'المخطط حتى تاريخه 73%'. */
  foot?: string;
  /**
   * The REASON this figure cannot be derived yet. When set, the tile renders
   * "unavailable + reason" instead of `value`, and `foot` is ignored.
   *
   * The design language is explicit: never render 0 or 100% for a missing
   * input. A KPI band where one figure is genuinely underivable still has to
   * be a band — dropping the tile silently makes the gap invisible, and
   * showing a zero makes it a lie. SCR-E1 renders these in a separate panel
   * because four of its figures are missing; SCR-E5 has one, so it belongs in
   * the band beside the three that work.
   */
  unavailable?: string;
}

/**
 * <epm-summary-strip [stats]="stats" />
 *
 * Ported from v1.1 DStat — docs/spec/reference/app/desktop-views.jsx.
 *
 * ── WHAT v1.1 CHANGED ─────────────────────────────────────────────────────
 * The icon tile and the rotated watermark are RETIRED — `.d-stat-wm` is
 * `display:none` in the stylesheet now. Procore de-congestion: a KPI tile
 * carries a figure, not decoration. The order is label → value → optional
 * delta → optional bar → optional foot, and the tile is a quiet bordered card.
 *
 * ── GRID auto-fit, NEVER A PINNED COLUMN COUNT (05 §8, binding) ───────────
 * v1.1 still pins `.d-grid.stats` to `repeat(4, 1fr)`, so the `.fit` override
 * in src/styles.css is STILL required (P-17). Measured: five tiles lay out
 * 2+2+1 under the pinned rule and as five equal tracks under `.fit`.
 *
 * ── COUNT-UP SEEDS THE SETTLED VALUE (05 §6) ──────────────────────────────
 * The template renders the real number; only the animated path overwrites it
 * with '0', and hiding the document settles immediately. requestAnimationFrame
 * is throttled to zero ticks while a document is hidden — background tab,
 * unfocused preview, and every screenshot / PDF export path — so a strip that
 * merely *ends* on the right number still exports as zeroes.
 */
@Component({
  selector: 'epm-summary-strip',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="d-grid stats fit">
      @for (s of stats; track s.label) {
        @if (s.unavailable) {
          <!-- The "in" class is required: .d-grid.stats .d-stat starts at
               opacity 0 and is revealed by the class the count-up adds. This
               tile carries no animated figure, so it is born settled. -->
          <div class="d-stat epm-stat-na in">
            <span class="d-stat-lbl">{{ s.label }}</span>
            <span class="d-stat-val"><span class="epm-na">{{ unavailableLabel }}</span></span>
            <span class="d-stat-foot">{{ s.unavailable }}</span>
          </div>
        } @else {
          <div class="d-stat">
            <span class="d-stat-lbl">{{ s.label }}</span>
            <!-- 05 §5.2 — the figure is bidi-isolated. -->
            <span class="d-stat-val">
              <bdi class="d-stat-num">{{ figureText(s) }}</bdi>@if (s.suffix) { <small>{{ s.suffix }}</small> }
            </span>
            @if (s.delta) {
              <span class="d-stat-delta {{ s.deltaDir || 'flat' }}"><bdi>{{ s.delta }}</bdi></span>
            }
            @if (s.bar !== undefined && s.bar !== null) {
              <div class="d-stat-bar"><i [style.width.%]="clamp(s.bar)"></i></div>
            }
            @if (s.foot) { <span class="d-stat-foot">{{ s.foot }}</span> }
          </div>
        }
      }
    </div>
  `,
})
export class SummaryStripComponent implements AfterViewInit, OnDestroy {
  @Input({ required: true }) stats: Stat[] = [];

  /**
   * The word shown in place of an underivable figure — pass `lang.t('unavailable')`.
   * An input rather than an injected string so this primitive stays free of
   * the language service, like every other component in shared/.
   */
  @Input() unavailableLabel = 'غير متوفر';

  // inject<T>(Token) — NOT inject(ElementRef<HTMLElement>), which puts type
  // arguments on a value expression and does not compile.
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  fmt = fmt;

  private frames: number[] = [];
  private timers: ReturnType<typeof setTimeout>[] = [];
  private onVisibility = () => { if (document.hidden) this.settleAll(); };

  clamp(v: number) { return Math.max(0, Math.min(100, v)); }

  /** The settled figure. `dp` picks decimals over grouped whole numbers. */
  figureText(s: Stat) { return this.render(s, s.value); }

  private render(s: Stat, v: number) {
    return s.dp === undefined ? fmt.money(v) : fmt.index(v, s.dp);
  }

  ngAfterViewInit() {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.addEventListener('visibilitychange', this.onVisibility);

    // Settled is the DEFAULT state — the template already rendered the real
    // number. Nothing to do but reveal the tiles.
    if (reduce || document.hidden) {
      this.tiles().forEach(el => el.classList.add('in'));
      return;
    }

    this.tiles().forEach((el, i) => {
      const num = this.figure(el);
      const stat = this.stats[i];
      const target = stat?.value ?? 0;

      this.timers.push(setTimeout(() => el.classList.add('in'), 120 + i * 100));

      if (!num || !stat) return;
      num.nodeValue = this.render(stat, 0);   // animated path only

      this.timers.push(setTimeout(() => {
        let start = 0;
        const tick = (ts: number) => {
          if (!start) start = ts;
          const p = Math.min(1, (ts - start) / 1150);
          num.nodeValue = this.render(stat, target * (1 - Math.pow(1 - p, 3)));
          if (p < 1) this.frames.push(requestAnimationFrame(tick));
          else num.nodeValue = this.render(stat, target);
        };
        this.frames.push(requestAnimationFrame(tick));
      }, 120 + i * 100));
    });
  }

  /**
   * THE TEXT NODE ANGULAR OWNS, never the `<bdi>` around it.
   *
   * Setting `element.textContent` DESTROYS the element's existing child text
   * node and inserts a fresh one. Angular's interpolation holds a reference to
   * the original node, so after one imperative write every later binding update
   * lands on an orphan and the figure on screen is frozen forever.
   *
   * Measured on SCR-W6, the first screen whose strip figures change after load:
   * reporting A5 at 100% moved physical completion from 49.28% to 50.94% in the
   * component's own `stats` input while the tile still read 49. Writing
   * `nodeValue` on the node itself mutates it in place and leaves the binding
   * intact — which is also how Angular's own `textInterpolate` writes.
   */
  private figure(tile: HTMLElement): Text | null {
    const bdi = tile.querySelector<HTMLElement>('.d-stat-num');
    const first = bdi?.firstChild;
    return first instanceof Text ? first : null;
  }

  ngOnDestroy() {
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.frames.forEach(cancelAnimationFrame);
    this.timers.forEach(clearTimeout);
  }

  private tiles() {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('.d-stat'));
  }

  /** Jump straight to the real figures — the state the page must be capturable in. */
  private settleAll() {
    this.frames.forEach(cancelAnimationFrame);
    this.frames = [];
    this.tiles().forEach((el, i) => {
      el.classList.add('in');
      const num = this.figure(el);
      const stat = this.stats[i];
      if (num && stat) num.nodeValue = this.render(stat, stat.value);
    });
  }
}
