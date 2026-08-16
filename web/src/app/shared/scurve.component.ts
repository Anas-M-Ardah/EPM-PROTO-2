import { Component, Input, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { LangService } from '../core/lang';

export interface CurvePeriod {
  label: string;
  /** Cumulative planned %, 0–100. Always known: it is derived. */
  planCum: number;
  /** Cumulative actual %. **Null before the first recorded measurement.** */
  actCum: number | null;
  planPeriod: number;
  actPeriod: number;
}

/**
 * `<epm-scurve />` — ported from the live prototype's `DSCurve`
 * (`desktop-charts.jsx:8875`), geometry, gradient and legend intact.
 *
 * الشكل 4's «مخططان بمفاتيح سلاسل»: period bars under a cumulative planned line
 * and a cumulative actual line, with the four-entry legend the prototype draws.
 *
 * ── WHAT WAS *NOT* PORTED ─────────────────────────────────────────────────
 * The prototype builds its own data with `f => f * f * (3 - 2 * f)` over twelve
 * invented months — a smoothstep shape, not a measurement. This component takes
 * the periods as an input and `Domain/ProgressSeries.Monthly` supplies them from
 * what was actually recorded. Same picture; the numbers are real.
 *
 * A null `actCum` breaks the actual line rather than being drawn as zero, so a
 * project whose progress was first logged in month four has a line that starts
 * in month four.
 *
 * ── THE SVG IS ALWAYS LTR ─────────────────────────────────────────────────
 * A time axis is a number line, not a sentence. The prototype sets
 * `direction: ltr` on the `<svg>` for the same reason; the labels around it
 * follow the page.
 */
@Component({
  selector: 'epm-scurve',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="d-chart-card">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" width="100%" role="img"
           [attr.aria-label]="ariaLabel()"
           style="display:block; height:auto; direction:ltr">
        <defs>
          <linearGradient [attr.id]="uid" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" [attr.stop-color]="color" stop-opacity="0.18" />
            <stop offset="100%" [attr.stop-color]="color" stop-opacity="0" />
          </linearGradient>
        </defs>

        @for (g of grid; track g) {
          <line [attr.x1]="padL" [attr.y1]="yCum(g)" [attr.x2]="W - padR" [attr.y2]="yCum(g)"
                stroke="var(--outline-variant)" stroke-width="1"
                [attr.stroke-dasharray]="g === 0 ? '0' : '2 4'"
                [attr.opacity]="g === 0 ? 1 : 0.7" />
          <text [attr.x]="padL - 8" [attr.y]="yCum(g) + 3.5" text-anchor="end"
                font-size="10" fill="var(--on-surface-variant)">{{ g }}%</text>
        }

        @for (d of data; track $index; let i = $index) {
          <rect [attr.x]="cx(i) - barW() - gap / 2" [attr.y]="base - yBar(d.planPeriod)"
                [attr.width]="barW()" [attr.height]="yBar(d.planPeriod)" rx="3"
                fill="var(--viz-track)" stroke="var(--viz-base)" stroke-width="1" />
          <rect [attr.x]="cx(i) + gap / 2" [attr.y]="base - yBar(d.actPeriod)"
                [attr.width]="barW()" [attr.height]="yBar(d.actPeriod)" rx="3" [attr.fill]="color" />
        }

        @if (actArea(); as a) { <path [attr.d]="a" [attr.fill]="'url(#' + uid + ')'" /> }

        <path [attr.d]="planLine()" fill="none" stroke="var(--viz-base)" stroke-width="2"
              stroke-dasharray="5 4" stroke-linecap="round" stroke-linejoin="round" />
        @if (actLine(); as l) {
          <path [attr.d]="l" fill="none" [attr.stroke]="color" stroke-width="2.75"
                stroke-linecap="round" stroke-linejoin="round" />
        }

        @for (p of planPts(); track $index) {
          <circle [attr.cx]="p.x" [attr.cy]="p.y" r="3" fill="var(--surface)"
                  stroke="var(--viz-base)" stroke-width="1.5" />
        }
        @for (p of actPts(); track $index) {
          <circle [attr.cx]="p.x" [attr.cy]="p.y" r="4" fill="var(--surface)"
                  [attr.stroke]="color" stroke-width="2.5" />
        }

        @for (d of data; track $index; let i = $index) {
          <text [attr.x]="cx(i)" [attr.y]="H - 12" text-anchor="middle"
                font-size="10" fill="var(--on-surface-variant)">{{ d.label }}</text>
        }
      </svg>

      <!-- «مفاتيح سلاسل» — the prototype's own four entries. -->
      <div class="d-chart-legend">
        <span class="li">
          <svg width="14" height="16" style="flex:none" aria-hidden="true">
            <rect x="0" y="3" width="12" height="10" rx="2"
                  fill="var(--surface-container-highest)" stroke="var(--outline)" stroke-width="1" />
          </svg>{{ lang.t('crv_plan_period') }}
        </span>
        <span class="li">
          <svg width="14" height="16" style="flex:none" aria-hidden="true">
            <rect x="0" y="3" width="12" height="10" rx="2" [attr.fill]="color" />
          </svg>{{ lang.t('crv_act_period') }}
        </span>
        <span class="li">
          <svg width="14" height="16" style="flex:none" aria-hidden="true">
            <line x1="0" y1="8" x2="14" y2="8" stroke="var(--viz-base)" stroke-width="2" stroke-dasharray="4 3" />
          </svg>{{ lang.t('crv_plan_cum') }}
        </span>
        <span class="li">
          <svg width="14" height="16" style="flex:none" aria-hidden="true">
            <line x1="0" y1="8" x2="14" y2="8" [attr.stroke]="color" stroke-width="2.5" stroke-linecap="round" />
          </svg>{{ lang.t('crv_act_cum') }}
        </span>
      </div>
    </div>
  `,
})
export class SCurveComponent {
  lang = inject(LangService);

  private _data = signal<CurvePeriod[]>([]);
  @Input({ required: true }) set data(v: CurvePeriod[]) { this._data.set(v ?? []); }
  get data(): CurvePeriod[] { return this._data(); }

  /** `--viz-1` for progress, `--success` for cost — the prototype's own pair. */
  @Input() color = 'var(--viz-1)';
  @Input() caption = '';

  /** The gradient needs an id unique to the instance; two curves share a page. */
  readonly uid = 'sc' + Math.random().toString(36).slice(2, 7);

  readonly W = 760;
  readonly H = 322;
  readonly padL = 40;
  readonly padR = 18;
  readonly padT = 16;
  readonly padB = 34;
  readonly gap = 5;
  readonly grid = [0, 25, 50, 75, 100];

  private iw = this.W - this.padL - this.padR;
  private ih = this.H - this.padT - this.padB;
  get base(): number { return this.padT + this.ih; }

  private slot = computed(() => this.iw / Math.max(1, this._data().length));
  barW = computed(() => Math.min(26, this.slot() * 0.24));

  private maxPeriod = computed(() =>
    Math.max(...this._data().map(d => Math.max(d.planPeriod, d.actPeriod)), 1));

  cx(i: number): number { return this.padL + this.slot() * i + this.slot() / 2; }
  yCum(v: number): number { return this.padT + this.ih - (Math.max(0, Math.min(100, v)) / 100) * this.ih; }
  yBar(v: number): number { return (Math.max(0, v) / this.maxPeriod()) * (this.ih * 0.62); }

  planPts = computed(() =>
    this._data().map((d, i) => ({ x: this.cx(i), y: this.yCum(d.planCum) })));

  /** Only the periods that HAVE a measurement — the line starts where the log does. */
  actPts = computed(() =>
    this._data()
      .map((d, i) => (d.actCum === null || d.actCum === undefined
        ? null
        : { x: this.cx(i), y: this.yCum(d.actCum) }))
      .filter((p): p is { x: number; y: number } => p !== null));

  private path(pts: { x: number; y: number }[]): string {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }

  planLine = computed(() => this.path(this.planPts()));

  actLine = computed(() => {
    const p = this.actPts();
    return p.length > 1 ? this.path(p) : null;
  });

  actArea = computed(() => {
    const p = this.actPts();
    if (p.length < 2) return null;
    return `${this.path(p)} L${p[p.length - 1].x.toFixed(1)},${this.base} L${p[0].x.toFixed(1)},${this.base} Z`;
  });

  ariaLabel = computed(() => {
    const rows = this._data()
      .map(d => `${d.label}: ${this.lang.t('crv_plan_cum')} ${d.planCum}%, ${this.lang.t('crv_act_cum')} ${d.actCum ?? '—'}%`);
    return [this.caption, ...rows].filter(Boolean).join(' — ');
  });
}
