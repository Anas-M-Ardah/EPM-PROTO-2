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
 * `<epm-scurve />` — plan-vs-actual cumulative comparison.
 *
 * ── P-255: THE BARS ARE GONE ───────────────────────────────────────────────
 * The original port (`DSCurve`, `desktop-charts.jsx:8875`) drew per-period bars
 * scaled against their own max, unrelated to the printed 0–100% axis the two
 * cumulative lines actually use — a bar at half height didn't mean 50% of
 * anything on the chart's own scale. Flagged as "ugly, hard to understand and
 * meaningless." The redesign keeps only what the axis can honestly show: the
 * actual line as the point (bold, solid, the series color), the planned line
 * as context (thin, gray, dashed), and the gap between them shaded so the
 * delta-to-plan reads at a glance instead of being computed by eye. A hover
 * crosshair + tooltip carries the per-period figures the bars used to draw.
 *
 * A null `actCum` breaks the actual line rather than being drawn as zero, so a
 * project whose progress was first logged in month four has a line that starts
 * in month four.
 *
 * ── THE SVG IS ALWAYS LTR ─────────────────────────────────────────────────
 * A time axis is a number line, not a sentence. The labels around it follow
 * the page.
 */
@Component({
  selector: 'epm-scurve',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="d-chart-card">
      <div class="d-chart-wrap">
        <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" width="100%" role="img"
             [attr.aria-label]="ariaLabel()"
             style="display:block; height:auto; direction:ltr">

          @for (g of grid; track g) {
            <line [attr.x1]="padL" [attr.y1]="yCum(g)" [attr.x2]="W - padR" [attr.y2]="yCum(g)"
                  stroke="var(--outline-variant)" stroke-width="1" />
            <text [attr.x]="padL - 8" [attr.y]="yCum(g) + 3.5" text-anchor="end"
                  font-size="10" fill="var(--on-surface-variant)">{{ g }}%</text>
          }

          @if (gapArea(); as a) { <path [attr.d]="a" [attr.fill]="color" opacity="0.09" /> }

          <path [attr.d]="planLine()" fill="none" stroke="var(--viz-base)" stroke-width="1.75"
                stroke-dasharray="4 4" stroke-linecap="round" stroke-linejoin="round" />
          @if (actLine(); as l) {
            <path [attr.d]="l" fill="none" [attr.stroke]="color" stroke-width="2.5"
                  stroke-linecap="round" stroke-linejoin="round" />
          }

          @for (p of planPts(); track $index) {
            <circle [attr.cx]="p.x" [attr.cy]="p.y" r="2.5" fill="var(--surface)"
                    stroke="var(--viz-base)" stroke-width="1.5" />
          }
          @for (p of actPts(); track $index) {
            <circle [attr.cx]="p.x" [attr.cy]="p.y" r="4" fill="var(--surface)"
                    [attr.stroke]="color" stroke-width="2.5" />
          }

          <!-- endpoint direct labels — value text always in a text token, never the series color -->
          @if (planPts().length) {
            <text [attr.x]="lastPlanPt()!.x - 6" [attr.y]="lastPlanPt()!.y - 8" text-anchor="end"
                  font-size="11" font-weight="600" fill="var(--on-surface-variant)">{{ lastPlanPt()!.v }}%</text>
          }
          @if (lastActPt(); as p) {
            <text [attr.x]="p.x - 6" [attr.y]="p.y + 17" text-anchor="end"
                  font-size="12" font-weight="700" fill="var(--on-surface)">{{ p.v }}%</text>
          }

          @for (d of data; track $index; let i = $index) {
            <text [attr.x]="cx(i)" [attr.y]="H - 12" text-anchor="middle"
                  font-size="10" fill="var(--on-surface-variant)">{{ d.label }}</text>
          }

          @if (hoverIndex() !== null) {
            <line [attr.x1]="hoverX()" [attr.y1]="padT" [attr.x2]="hoverX()" [attr.y2]="base"
                  stroke="var(--outline)" stroke-width="1" />
          }

          <!-- one hit column per period — hover AND keyboard focus both open the tooltip -->
          @for (d of data; track $index; let i = $index) {
            <rect class="d-chart-hit" [attr.x]="padL + slot() * i" [attr.y]="padT"
                  [attr.width]="slot()" [attr.height]="ih" tabindex="0" role="img"
                  [attr.aria-label]="periodAriaLabel(d)"
                  (mouseenter)="onHover(i)" (focus)="onHover(i)"
                  (mouseleave)="onLeave()" (blur)="onLeave()" />
          }
        </svg>

        @if (hoverData(); as d) {
          <div class="d-chart-tip" [style.left.%]="tipLeftPct()">
            <div class="hd"><bdi>{{ d.label }}</bdi></div>
            <div class="row"><span class="k">{{ lang.t('crv_plan_cum') }}</span><span class="v"><bdi>{{ d.planCum }}%</bdi></span></div>
            <div class="row"><span class="k">{{ lang.t('crv_act_cum') }}</span><span class="v"><bdi>{{ d.actCum ?? '—' }}{{ d.actCum === null ? '' : '%' }}</bdi></span></div>
            <div class="row"><span class="k">{{ lang.t('crv_plan_period') }}</span><span class="v"><bdi>{{ d.planPeriod }}%</bdi></span></div>
            <div class="row"><span class="k">{{ lang.t('crv_act_period') }}</span><span class="v"><bdi>{{ d.actCum === null ? '—' : d.actPeriod + '%' }}</bdi></span></div>
          </div>
        }
      </div>

      <div class="d-chart-legend">
        <span class="li">
          <svg width="14" height="16" style="flex:none" aria-hidden="true">
            <line x1="0" y1="8" x2="14" y2="8" stroke="var(--viz-base)" stroke-width="1.75" stroke-dasharray="4 3" />
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

  readonly W = 760;
  readonly H = 322;
  readonly padL = 40;
  readonly padR = 18;
  readonly padT = 16;
  readonly padB = 34;
  readonly grid = [0, 25, 50, 75, 100];

  private iw = this.W - this.padL - this.padR;
  readonly ih = this.H - this.padT - this.padB;
  get base(): number { return this.padT + this.ih; }

  slot = computed(() => this.iw / Math.max(1, this._data().length));

  cx(i: number): number { return this.padL + this.slot() * i + this.slot() / 2; }
  yCum(v: number): number { return this.padT + this.ih - (Math.max(0, Math.min(100, v)) / 100) * this.ih; }

  planPts = computed(() =>
    this._data().map((d, i) => ({ x: this.cx(i), y: this.yCum(d.planCum), v: d.planCum })));

  /** Only the periods that HAVE a measurement — the line starts where the log does. */
  actPts = computed(() =>
    this._data()
      .map((d, i) => (d.actCum === null || d.actCum === undefined
        ? null
        : { x: this.cx(i), y: this.yCum(d.actCum), v: d.actCum }))
      .filter((p): p is { x: number; y: number; v: number } => p !== null));

  lastPlanPt = computed(() => this.planPts().at(-1) ?? null);
  lastActPt = computed(() => this.actPts().at(-1) ?? null);

  private path(pts: { x: number; y: number }[]): string {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
  }

  planLine = computed(() => this.path(this.planPts()));

  actLine = computed(() => {
    const p = this.actPts();
    return p.length > 1 ? this.path(p) : null;
  });

  /** The shaded delta between the two lines, over the range actuals cover. */
  gapArea = computed(() => {
    const act = this.actPts();
    if (act.length < 2) return null;
    const startIdx = this._data().length - act.length;
    const planSlice = this.planPts().slice(startIdx);
    const top = this.path(act);
    const bottom = planSlice.slice().reverse().map(p => `L${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');
    return `${top} ${bottom} Z`;
  });

  // ── hover / keyboard-focus layer ──────────────────────────────────────────
  hoverIndex = signal<number | null>(null);
  onHover(i: number): void { this.hoverIndex.set(i); }
  onLeave(): void { this.hoverIndex.set(null); }

  hoverData = computed(() => {
    const i = this.hoverIndex();
    return i === null ? null : this._data()[i] ?? null;
  });
  hoverX = computed(() => {
    const i = this.hoverIndex();
    return i === null ? 0 : this.cx(i);
  });
  /** Clamped so the tooltip never runs past the card edge at the first/last period. */
  tipLeftPct = computed(() => Math.min(90, Math.max(10, (this.hoverX() / this.W) * 100)));

  periodAriaLabel(d: CurvePeriod): string {
    return `${d.label}: ${this.lang.t('crv_plan_cum')} ${d.planCum}%, ${this.lang.t('crv_act_cum')} ${d.actCum ?? '—'}%`;
  }

  ariaLabel = computed(() => {
    const rows = this._data().map(d => this.periodAriaLabel(d));
    return [this.caption, ...rows].filter(Boolean).join(' — ');
  });
}
