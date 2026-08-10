import { Component, Input, ViewEncapsulation } from '@angular/core';
import { IconComponent } from '../core/icon.component';

export interface Field {
  label: string;
  /** Already formatted by core/format.ts — this component does no arithmetic. */
  value: string | null;
  /** Tabular numerals, for IDs, money, dates and quantities. */
  mono?: boolean;
  /** Adds the * marker (06 required field). */
  required?: boolean;
  /** 06 — a value the client proposed but has not confirmed. */
  proposed?: boolean;
  /** System-derived and not editable — 01 §3 forbids storing these. */
  auto?: boolean;
  unit?: string;
}

/**
 * <epm-field-grid [fields]="fields" />
 *
 * Ported from DField / DFieldGrid —
 * docs/spec/reference/app/project-modules.jsx:11 and :32.
 *
 * ── TWO COLUMNS, FROM THE REFERENCE ───────────────────────────────────────
 * `.d-form-grid` is `repeat(2, 1fr)` and its cell borders depend on that:
 * `.d-form-i:nth-child(2n)` drops the inline-end border and
 * `:nth-last-child(2):nth-child(2n+1)` drops the last row's bottom border.
 * Switching to auto-fill breaks both, and the reference never renders more
 * than two columns. ROADMAP 1.3 asked for auto-fill minmax(240px,1fr); that
 * has no backing in 05 and is recorded as a divergence (P-18).
 * At ≤900px the stylesheet already collapses it to one column.
 *
 * ── DISPLAY ONLY ──────────────────────────────────────────────────────────
 * `value` arrives as a formatted string. Angular computes nothing.
 */
@Component({
  selector: 'epm-field-grid',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent],
  template: `
    <div class="d-form-grid">
      @for (f of fields; track f.label) {
        <div class="d-form-i">
          <label class="k">
            {{ f.label }}
            @if (f.required) { <span class="req">*</span> }
            @if (f.proposed) { <span class="d-proposed">{{ proposedLabel }}</span> }
            @if (f.auto) {
              <span class="d-proposed epm-auto" [title]="autoTitle">
                <epm-icon name="lock" [size]="10" />{{ autoLabel }}
              </span>
            }
          </label>
          <!-- 05 §5.2 — every value is bidi-isolated. A field grid is mostly
               numbers, dates and reference strings, which is exactly what
               breaks without <bdi> in an RTL paragraph. -->
          <span class="v" [class.mono]="f.mono">
            <bdi>{{ f.value ?? '—' }}{{ f.unit ? ' ' + f.unit : '' }}</bdi>
          </span>
        </div>
      }
    </div>
  `,
})
export class FieldGridComponent {
  @Input({ required: true }) fields: Field[] = [];

  /** Passed in so this component holds no strings of its own (see core/lang.ts). */
  @Input() proposedLabel = 'مقترح';
  @Input() autoLabel = 'آلي';
  @Input() autoTitle = 'يُحسب تلقائياً ولا يقبل التعديل';
}
