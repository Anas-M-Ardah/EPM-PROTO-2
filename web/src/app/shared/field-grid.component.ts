import { Component, EventEmitter, Input, Output, ViewEncapsulation } from '@angular/core';
import { IconComponent } from '../core/icon.component';
import { SelectComponent, SelectOption } from './select.component';

/** One option of a lookup-backed field. The dropdown's own shape, reused. */
export type FieldOption = SelectOption;

export interface Field {
  /** The entity property name — the grep anchor, and the change identity. */
  key: string;
  label: string;
  /** Already formatted by core/format.ts — this component does no arithmetic. */
  value: string | null;
  /**
   * What an <input>/<select> binds to while editing: the RAW stored value,
   * never the formatted one. A select needs the code, not the Arabic label,
   * and a number input needs digits, not thousands separators.
   */
  raw?: string | null;
  /** Tabular numerals, for IDs, money, dates and quantities. */
  mono?: boolean;
  /** Adds the * marker — الشكل 5's «نجمة على الحقول الإلزامية». */
  required?: boolean;
  /** الشكل 5's «مقترح» — a value the system proposed rather than one typed. */
  proposed?: boolean;
  /**
   * A paragraph, not a cell: spans the whole card and renders label-less
   * (`.d-fwide`), becoming a <textarea> when editing. الشكل 5's «الوصف».
   */
  long?: boolean;
  /** Present ⇒ the field is a lookup and edits through a <select>. */
  options?: FieldOption[];
  /** Digits only — سنة الإدراج. */
  numeric?: boolean;
  /**
   * Keeps its VALUE while the rest of the card is editing. For a figure that is
   * derived rather than entered — الشكل 8's «المصروف» section is Σ of the
   * payment portions, and the contract code is the record's own key. A field
   * with nothing to type into must not render an input the save would ignore.
   */
  readonly?: boolean;
  /** A 422 message from Domain/ProjectDefinition, or null. */
  error?: string | null;
  unit?: string;
}

/**
 * <epm-field-grid [fields]="fields" [editing]="true" (changed)="set($event)" />
 *
 * Ported from `DField` / `DFieldGrid` in the live prototype's
 * project-modules.jsx. `.d-form-grid` inside a `.d-fgroup` is a CONTAINER-query
 * grid — 1 / 2 / 3 columns by the card's own width — so this component never
 * pins a column count.
 *
 * ── READ AND EDIT ARE ONE COMPONENT, AS IN THE PROTOTYPE ──────────────────
 * `editMode` there swaps the `<span class="v">` for a control in the same cell,
 * keeping the label, the star and the «مقترح» tag exactly where they were. Two
 * components would let the read view and the edit view drift into showing
 * different fields — which is the failure this screen exists to prevent.
 *
 * ── DISPLAY ONLY ──────────────────────────────────────────────────────────
 * `value` arrives formatted and `raw` arrives stored. Angular computes nothing;
 * it emits what the user typed and the server decides whether it is valid.
 */
@Component({
  selector: 'epm-field-grid',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent, SelectComponent],
  template: `
    <div class="d-form-grid">
      @for (f of fields; track f.key) {
        @if (f.long) {
          <!-- الشكل 5 prints the scope as a paragraph across the card, with no
               label beside it. .d-fwide is the reference's own full-span cell. -->
          <div class="d-fwide">
            @if (editing) {
              <textarea class="d-form-input" rows="3"
                        [attr.aria-label]="f.label"
                        [value]="f.raw ?? ''"
                        (input)="emit(f, $any($event.target).value)"></textarea>
            } @else {
              <p>{{ f.value ?? '—' }}</p>
            }
          </div>
        } @else {
          <div class="d-form-i" [class.editing]="editing && !f.readonly">
            <label class="k">
              {{ f.label }}
              @if (f.required) { <span class="req">*</span> }
              @if (f.proposed) {
                <span class="d-proposed" [title]="proposedHint">{{ proposedLabel }}</span>
              }
            </label>

            @if (editing && !f.readonly) {
              @if (f.options) {
                <!-- Not a native <select>: its popup is drawn by the OS and
                     ignores the app's font, RTL and theme. <epm-select> renders
                     the list with the same .d-pop-row the switcher uses. -->
                <epm-select
                  [options]="f.options"
                  [value]="f.raw ?? ''"
                  [label]="f.label"
                  [invalid]="!!f.error"
                  [placeholder]="unsetLabel"
                  (changed)="emit(f, $event)" />
              } @else {
                <input class="d-form-input" [class.mono]="f.mono"
                       [class.epm-invalid]="f.error"
                       [attr.type]="f.numeric ? 'number' : 'text'"
                       [attr.dir]="f.mono || f.numeric ? 'ltr' : null"
                       [attr.aria-label]="f.label"
                       [value]="f.raw ?? ''"
                       (input)="emit(f, $any($event.target).value)" />
              }
              @if (f.error) { <small class="epm-f-err">{{ f.error }}</small> }
            } @else {
              <!-- 05 §5.2 — every value is bidi-isolated. A field grid is mostly
                   numbers, dates and reference strings, which is exactly what
                   breaks without <bdi> in an RTL paragraph. -->
              <span class="v" [class.mono]="f.mono">
                <bdi>{{ f.value ?? '—' }}{{ f.unit ? ' ' + f.unit : '' }}</bdi>
              </span>
            }
          </div>
        }
      }
    </div>
  `,
})
export class FieldGridComponent {
  @Input({ required: true }) fields: Field[] = [];

  /** Swaps every cell to a control in place. الشكل 5's «تعديل». */
  @Input() editing = false;

  /** Passed in so this component holds no strings of its own (see core/lang.ts). */
  @Input() proposedLabel = 'مقترح';
  @Input() proposedHint = '';
  /** What an unset lookup reads as, and the row that clears one. */
  @Input() unsetLabel = '—';

  /** `{ key, value }` — the raw string the user typed or selected. */
  @Output() changed = new EventEmitter<{ key: string; value: string }>();

  emit(f: Field, value: string) {
    this.changed.emit({ key: f.key, value });
  }
}
