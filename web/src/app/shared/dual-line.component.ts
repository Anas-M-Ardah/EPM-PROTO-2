import { Component, Input, ViewEncapsulation, computed, signal } from '@angular/core';

export interface LineSeries {
  label: string;
  /** A `--viz-*` token. */
  color: string;
  /** One value per x label. `null` leaves a gap rather than drawing a guess. */
  points: (number | null)[];
  /** Dashed for a DERIVED series, solid for a recorded one. */
  dashed?: boolean;
}

/**
 * `<epm-dual-line />` — ported from the reference's `DDualLine`
 * (`desktop-charts.jsx:138`), with two things the reference did not need.
 *
 * الشكل 4's first chart: «الإنجاز المادي 31% مقابل مخطط 39%» over time.
 *
 * ── A GAP IS A GAP ────────────────────────────────────────────────────────
 * A null point breaks the line instead of interpolating across it. The
 * reference never has one because its series come from a generator; here the
 * actual series is what somebody RECORDED (`Domain/ProgressSeries`), and
 * joining two recorded points through a date nobody measured would draw data
 * that does not exist.
 *
 * ── THE DERIVED SERIES IS DASHED ──────────────────────────────────────────
 * Planned progress is computed from the baselines; actual progress was
 * observed. Same chart, different kind of claim — so the line style says which
 * is which and the legend repeats it in words (`05 §7.6`: never colour alone).
 *
 * The plot is fixed 0–100 because both series are percentages; a chart of
 * percentages scaled to its own maximum makes 49% look like a full bar.
 */
@Component({
  selector: 'epm-dual-line',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="d-chart-card">
      <svg [attr.viewBox]="'0 0 ' + W + ' ' + H" width="100%" role="img"
           [attr.aria-label]="ariaLabel()"
           style="display:block; height:auto; direction:ltr">
        @for (g of grid; track g) {
          <line [attr.x1]="padL" [attr.y1]="y(g)" [attr.x2]="W - padR" [attr.y2]="y(g)"
                stroke="var(--outline-variant)" stroke-width="1"
                [attr.stroke-dasharray]="g === 0 ? '0' : '2 4'"
                [attr.opacity]="g === 0 ? 1 : 0.7" />
          <text [attr.x]="padL - 8" [attr.y]="y(g) + 3.5" text-anchor="end"
                font-size="10" fill="var(--on-surface-variant)">{{ g }}%</text>
        }

        @for (s of series; track s.label; let si = $index) {
          @for (seg of segments(si); track $index) {
            <path [attr.d]="seg" fill="none" [attr.stroke]="s.color" stroke-width="2"
                  [attr.stroke-dasharray]="s.dashed ? '5 4' : '0'"
                  stroke-linecap="round" stroke-linejoin="round" />
          }
          @for (pt of dots(si); track $index) {
            <circle [attr.cx]="pt.x" [attr.cy]="pt.y" r="3" [attr.fill]="s.color" />
          }
        }

        @for (l of xLabels; track $index; let i = $index) {
          <text [attr.x]="x(i)" [attr.y]="H - 10" text-anchor="middle"
                font-size="10" fill="var(--on-surface-variant)">{{ l }}</text>
        }
      </svg>

      <!-- «مفاتيح سلاسل». The dash is repeated in the swatch so the legend
           carries the same distinction the plot does. -->
      <div class="d-chart-legend">
        @for (s of series; track s.label) {
          <span class="li">
            <svg width="16" height="10" aria-hidden="true">
              <line x1="0" y1="5" x2="16" y2="5" [attr.stroke]="s.color" stroke-width="2"
                    [attr.stroke-dasharray]="s.dashed ? '4 3' : '0'" stroke-linecap="round" />
            </svg>
            {{ s.label }}
          </span>
        }
      </div>
    </div>
  `,
})
export class DualLineComponent {
  private _series = signal<LineSeries[]>([]);
  @Input({ required: true }) set series(v: LineSeries[]) { this._series.set(v ?? []); }
  get series(): LineSeries[] { return this._series(); }

  private _x = signal<string[]>([]);
  @Input({ required: true }) set xLabels(v: string[]) { this._x.set(v ?? []); }
  get xLabels(): string[] { return this._x(); }

  @Input() caption = '';

  readonly W = 620;
  readonly H = 230;
  readonly padL = 40;
  readonly padR = 16;
  readonly padT = 14;
  readonly padB = 34;
  /** Percentages, so the axis is 0–100 and not the data's own maximum. */
  readonly grid = [0, 25, 50, 75, 100];

  private iw = this.W - this.padL - this.padR;
  private ih = this.H - this.padT - this.padB;

  x(i: number): number {
    const n = Math.max(1, this._x().length - 1);
    return this.padL + (this.iw * i) / n;
  }

  y(pct: number): number {
    return this.padT + this.ih - (Math.max(0, Math.min(100, pct)) / 100) * this.ih;
  }

  /** Contiguous runs of non-null points — a gap breaks the path. */
  segments(si: number): string[] {
    const pts = this._series()[si]?.points ?? [];
    const out: string[] = [];
    let run: string[] = [];

    pts.forEach((v, i) => {
      if (v === null || v === undefined) {
        if (run.length > 1) out.push(run.join(' '));
        run = [];
        return;
      }
      run.push(`${run.length === 0 ? 'M' : 'L'}${this.x(i).toFixed(1)},${this.y(v).toFixed(1)}`);
    });
    if (run.length > 1) out.push(run.join(' '));
    return out;
  }

  dots(si: number): { x: number; y: number }[] {
    const pts = this._series()[si]?.points ?? [];
    return pts
      .map((v, i) => (v === null || v === undefined ? null : { x: this.x(i), y: this.y(v) }))
      .filter((p): p is { x: number; y: number } => p !== null);
  }

  ariaLabel = computed(() => {
    const labels = this._x();
    const parts = this._series().map(s =>
      `${s.label}: ` + s.points.map((v, i) => `${labels[i]} ${v ?? '—'}%`).join(', '));
    return [this.caption, ...parts].filter(Boolean).join(' — ');
  });
}
