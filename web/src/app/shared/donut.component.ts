import { Component, Input, ViewEncapsulation, computed, signal } from '@angular/core';

export interface DonutSegment {
  /** CSS colour — a var(--status-*) reference, never a literal. */
  color: string;
  value: number;
  label: string;
}

/**
 * <epm-donut [segments]="segments" [centerLabel]="…" />
 *
 * Ported from DDonutMulti — docs/spec/reference/app/desktop-charts.jsx:8.
 *
 * ── THE ONE PLACE STATUS COLOUR ENCODES DATA (05 §1) ──────────────────────
 * "The dashboard status donut is the single exception — it IS status
 * distribution, so it uses the status namespace." Everywhere else status
 * colour means status and nothing else. Do not reuse this component for a
 * non-status breakdown; use the --viz-* ramp for those.
 *
 * ── NOT COLOUR-ONLY (05 §7.6) ─────────────────────────────────────────────
 * The donut is never the whole story: the caller MUST render a legend with the
 * label and count beside it. The SVG itself is aria-hidden and the accessible
 * description lives in that legend, because a ring of colours conveys nothing
 * to a screen reader.
 *
 * The SVG is forced to LTR: arc maths is direction-independent, and letting it
 * inherit RTL mirrors the segment order against the legend.
 */
@Component({
  selector: 'epm-donut',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="d-donut" [style.width.px]="size" [style.height.px]="size">
      <svg [attr.width]="size" [attr.height]="size" [attr.viewBox]="'0 0 ' + size + ' ' + size"
           style="direction:ltr" aria-hidden="true">
        <circle [attr.cx]="size/2" [attr.cy]="size/2" [attr.r]="radius()"
                fill="none" stroke="var(--viz-track)" [attr.stroke-width]="stroke" />
        @for (a of arcs(); track a.label) {
          <circle [attr.cx]="size/2" [attr.cy]="size/2" [attr.r]="radius()"
                  fill="none" [attr.stroke]="a.color" [attr.stroke-width]="stroke" stroke-linecap="butt"
                  [attr.stroke-dasharray]="a.dash + ' ' + (circumference() - a.dash)"
                  [attr.transform]="'rotate(' + a.rotate + ' ' + size/2 + ' ' + size/2 + ')'" />
        }
      </svg>
      <div class="c">
        <b class="num"><bdi>{{ total() }}</bdi></b>
        @if (centerLabel) { <span>{{ centerLabel }}</span> }
      </div>
    </div>
  `,
})
export class DonutComponent {
  @Input({ required: true }) set segments(v: DonutSegment[]) { this.segs.set(v); }
  @Input() size = 150;
  @Input() stroke = 16;
  @Input() centerLabel = '';

  private segs = signal<DonutSegment[]>([]);

  radius = computed(() => (this.size - this.stroke) / 2);
  circumference = computed(() => 2 * Math.PI * this.radius());
  total = computed(() => this.segs().reduce((a, s) => a + s.value, 0));

  /** 1.5px of track shows between segments, as in the reference. */
  private readonly gap = 1.5;

  arcs = computed(() => {
    const total = this.total() || 1;
    const c = this.circumference();
    let acc = 0;

    return this.segs().filter(s => s.value > 0).map(s => {
      const frac = s.value / total;
      const arc = { color: s.color, label: s.label, dash: Math.max(0, frac * c - this.gap), rotate: -90 + acc * 360 };
      acc += frac;
      return arc;
    });
  });
}
