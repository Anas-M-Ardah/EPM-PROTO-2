import { Component, Input, ViewEncapsulation, computed, signal } from '@angular/core';

/** One point on the trend: a year and the amount recorded against it. */
export interface TrendPoint {
  /** The x label — a year, printed as-is. */
  label: string;
  value: number;
}

/** Unique per instance, so two charts on one page cannot share a gradient. */
let uid = 0;

/**
 * `<epm-line-trend />` — ported from the reference's `DLineTrend`
 * (`docs/spec/reference/app/desktop-charts.jsx:84`), which is the only thing
 * that draws `.d-line-chart` (`desktop.css:717`).
 *
 * SCR-E1's «الصرف السنوي» panel. A single series over time: gridline ticks with
 * the same B / M / K axis abbreviation `<epm-bar-compare>` already uses, a
 * gradient area under the line, and a dot on every recorded point.
 *
 * ── WHAT THIS PORTS, AND WHAT IT DELIBERATELY DOES NOT ────────────────────
 * The MARK is the reference's. The DATA is not, and must not be: the reference
 * feeds this panel `spendWeights = [0.14, 0.17, 0.20, 0.23, 0.26]` times the
 * portfolio total over hard-coded years 2022–2026 (`desktop-views.jsx:64`).
 * That is a shape, not a figure — the same kind of invented series P-200
 * records for its curves — and `PortfolioEndpoints` already says so in as many
 * words: «Real years from real payment dates — never a weight table».
 *
 * So this draws the port's own `annualSpend`, grouped from actual payment
 * dates, and the panel keeps its own sub-line. It is NOT relabelled «تراكمي»
 * the way the reference's is: that series only looks cumulative because its
 * weights ascend, and this one is per-year disbursement. The cumulative
 * financial position is a different panel on this screen and already exists.
 *
 * A one-point series is centred rather than drawn as a zero-length line — the
 * reference's own handling, and this port's fixture years are few enough that
 * it is reachable.
 */
@Component({
  selector: 'epm-line-trend',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="d-line-chart">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" width="100%" role="img"
           [attr.aria-label]="ariaLabel()"
           style="display:block; height:auto; direction:ltr">
        <defs>
          <linearGradient [attr.id]="gid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" [attr.stop-color]="color" stop-opacity="0.20" />
            <stop offset="100%" [attr.stop-color]="color" stop-opacity="0" />
          </linearGradient>
        </defs>

        @for (t of ticks; track t) {
          <line [attr.x1]="padL" [attr.y1]="tickY(t)" [attr.x2]="W - padR" [attr.y2]="tickY(t)"
                stroke="var(--outline-variant)" stroke-width="1"
                [attr.stroke-dasharray]="t === 0 ? '0' : '2 4'"
                [attr.opacity]="t === 0 ? 1 : 0.7" />
          <text [attr.x]="padL - 8" [attr.y]="tickY(t) + 3.5" text-anchor="end"
                font-size="10" fill="var(--on-surface-variant)">{{ tickLabel(t) }}</text>
        }

        @if (points.length > 0) {
          <path [attr.d]="area()" [attr.fill]="'url(#' + gid + ')'" />
          <path [attr.d]="line()" fill="none" [attr.stroke]="color" stroke-width="2.2"
                stroke-linecap="round" stroke-linejoin="round" />

          @for (p of points; track $index; let i = $index) {
            <circle [attr.cx]="x(i)" [attr.cy]="y(p.value)" r="3.2"
                    fill="var(--surface-container-lowest)" [attr.stroke]="color" stroke-width="2" />
            <text [attr.x]="x(i)" [attr.y]="H - 10" text-anchor="middle"
                  font-size="10" fill="var(--on-surface-variant)">{{ p.label }}</text>
          }
        }
      </svg>
    </div>
  `,
})
export class LineTrendComponent {
  private _points = signal<TrendPoint[]>([]);
  @Input({ required: true }) set points(v: TrendPoint[]) { this._points.set(v ?? []); }
  get points(): TrendPoint[] { return this._points(); }

  /** A `--viz-*` token. The series identity, never a verdict on its size. */
  @Input() color = 'var(--viz-1)';

  /** Read out to a screen reader, since the line itself is not text. */
  @Input() caption = '';

  readonly gid = 'epm-lt-' + (++uid);

  readonly W = 620;
  readonly H = 210;
  readonly padL = 56;
  readonly padR = 14;
  readonly padT = 14;
  readonly padB = 30;
  readonly ticks = [0, 0.25, 0.5, 0.75, 1];

  private iw = this.W - this.padL - this.padR;
  private ih = this.H - this.padT - this.padB;

  /** The axis top, rounded up to a readable power of ten (the reference's). */
  private nice = computed(() => {
    const max = Math.max(...this._points().map(p => p.value), 1);
    const pow = Math.pow(10, Math.floor(Math.log10(max)));
    return pow * Math.ceil(max / pow);
  });

  x(i: number): number {
    const n = this._points().length;
    if (n <= 1) return this.padL + this.iw / 2;
    return this.padL + (i / (n - 1)) * this.iw;
  }

  y(v: number): number {
    return this.padT + this.ih - (v / this.nice()) * this.ih;
  }

  tickY(t: number): number { return this.padT + this.ih - t * this.ih; }

  /** The reference's own axis abbreviation — B / M / K. */
  tickLabel(t: number): string {
    const v = this.nice() * t;
    return v >= 1e9 ? (v / 1e9).toFixed(1) + 'B'
      : v >= 1e6 ? Math.round(v / 1e6) + 'M'
      : v >= 1e3 ? Math.round(v / 1e3) + 'K'
      : String(Math.round(v));
  }

  line = computed(() => this._points()
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${this.x(i).toFixed(1)},${this.y(p.value).toFixed(1)}`)
    .join(' '));

  /** The line, closed down to the baseline — the fill under the trend. */
  area = computed(() => {
    const n = this._points().length;
    if (n === 0) return '';
    const floor = this.padT + this.ih;
    return `${this.line()} L${this.x(n - 1).toFixed(1)},${floor} L${this.x(0).toFixed(1)},${floor} Z`;
  });

  ariaLabel = computed(() =>
    [this.caption, ...this._points().map(p => `${p.label}: ${Math.round(p.value)}`)]
      .filter(Boolean).join(' — '));
}
