import { Component, Input, ViewEncapsulation, computed, signal } from '@angular/core';

export interface BarItem {
  label: string;
  value: number;
  /** What to print above the bar — already formatted (money, percent, …). */
  display: string;
  /** A `--viz-*` token. Never a literal (CLAUDE.md §3.7). */
  color: string;
}

/**
 * `<epm-bar-compare />` — ported from the reference's `DBarCompare`
 * (`desktop-charts.jsx:32`), geometry and all.
 *
 * الشكل 4's second chart: «المقررة 1,374 م والمعدلة 1,500 م (▲126 م)» read
 * against «المصروف 510 م». Three bars, one legend, one axis.
 *
 * ── THE SVG IS ALWAYS LTR ─────────────────────────────────────────────────
 * A chart's x-axis is a number line, not a sentence: mirroring it under RTL
 * would put the larger tick on the left and read as a decreasing scale. The
 * reference sets `direction: ltr` on the `<svg>` for the same reason, and the
 * LABELS around it stay in the page's direction.
 *
 * ── NO THRESHOLD COLOURING ────────────────────────────────────────────────
 * Each bar's colour is given by the caller and identifies the SERIES, never a
 * verdict on its size (`05 §7.9`). The legend is what makes a colour mean
 * something, which is why الشكل 4 asks for «مفاتيح سلاسل» and not just charts.
 */
@Component({
  selector: 'epm-bar-compare',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="d-chart-card">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" width="100%" role="img"
           [attr.aria-label]="ariaLabel()"
           style="display:block; height:auto; direction:ltr">
        @for (t of ticks; track t) {
          <line [attr.x1]="padL" [attr.y1]="tickY(t)" [attr.x2]="W - padR" [attr.y2]="tickY(t)"
                stroke="var(--outline-variant)" stroke-width="1"
                [attr.stroke-dasharray]="t === 0 ? '0' : '2 4'"
                [attr.opacity]="t === 0 ? 1 : 0.7" />
          <text [attr.x]="padL - 8" [attr.y]="tickY(t) + 3.5" text-anchor="end"
                font-size="10" fill="var(--on-surface-variant)">{{ tickLabel(t) }}</text>
        }

        @for (b of items; track b.label; let i = $index) {
          <rect [attr.x]="cx(i) - barW() / 2" [attr.y]="y(b.value)"
                [attr.width]="barW()" [attr.height]="barH(b.value)" rx="4" [attr.fill]="b.color" />
          <text [attr.x]="cx(i)" [attr.y]="y(b.value) - 8" text-anchor="middle"
                font-size="12" font-weight="600" fill="var(--on-surface)">{{ b.display }}</text>
          <text [attr.x]="cx(i)" [attr.y]="H - 16" text-anchor="middle"
                font-size="12" fill="var(--on-surface-variant)">{{ b.label }}</text>
        }
      </svg>

      <!-- «مفاتيح سلاسل» — the plate asks for the legend, not only the chart. -->
      <div class="d-chart-legend">
        @for (b of items; track b.label) {
          <span class="li"><i [style.background]="b.color"></i>{{ b.label }}</span>
        }
      </div>
    </div>
  `,
})
export class BarCompareComponent {
  private _items = signal<BarItem[]>([]);
  @Input({ required: true }) set items(v: BarItem[]) { this._items.set(v ?? []); }
  get items(): BarItem[] { return this._items(); }

  /** Read out to a screen reader, since the bars themselves are not text. */
  @Input() caption = '';

  readonly W = 620;
  readonly H = 260;
  readonly padL = 56;
  readonly padR = 16;
  readonly padT = 24;
  readonly padB = 46;
  readonly ticks = [0, 0.25, 0.5, 0.75, 1];

  private iw = this.W - this.padL - this.padR;
  private ih = this.H - this.padT - this.padB;

  /** The axis top, rounded up to a readable power of ten (the reference's). */
  private nice = computed(() => {
    const max = Math.max(...this._items().map(i => i.value), 1);
    const pow = Math.pow(10, Math.floor(Math.log10(max)));
    return pow * Math.ceil(max / pow);
  });

  private slot = computed(() => this.iw / Math.max(1, this._items().length));
  barW = computed(() => Math.min(72, this.slot() * 0.5));

  cx(i: number): number { return this.padL + this.slot() * i + this.slot() / 2; }
  y(v: number): number { return this.padT + this.ih - (v / this.nice()) * this.ih; }
  barH(v: number): number { return Math.max(2, (v / this.nice()) * this.ih); }
  tickY(t: number): number { return this.padT + this.ih - t * this.ih; }

  /** The reference's own axis abbreviation — B / M / K. */
  tickLabel(t: number): string {
    const v = this.nice() * t;
    return v >= 1e9 ? (v / 1e9).toFixed(1) + 'B'
      : v >= 1e6 ? Math.round(v / 1e6) + 'M'
      : v >= 1e3 ? Math.round(v / 1e3) + 'K'
      : String(Math.round(v));
  }

  ariaLabel = computed(() =>
    [this.caption, ...this._items().map(i => `${i.label}: ${i.display}`)].filter(Boolean).join(' — '));
}
