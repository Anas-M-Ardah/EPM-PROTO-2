import { Component, Input, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { IconComponent } from '../core/icon.component';
import { LookupsService } from '../core/lookups';

/**
 * <epm-sev-dot severity="critical" />
 *
 * Ported from v1.1 DSevDot — ../epm@design/system-revamp app/alerts-module.jsx:17.
 *
 * ── SHAPE + COLOUR + LABEL, NEVER COLOUR ALONE (05 §7.6, binding) ─────────
 * Each severity gets a DIFFERENT glyph, not the same dot in three colours, so
 * the marker survives greyscale and colour-blindness. The reference's own
 * comment says this in as many words. The accessible name comes from the
 * `alert-severity` lookup, so it is the same string the visible label uses and
 * the two can never drift.
 *
 * The severity cell in the table also prints the label in text beside this, per
 * the reference. The dot alone is never the only carrier of the meaning.
 */
@Component({
  selector: 'epm-sev-dot',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent],
  template: `
    <span class="d-sev-dot" role="img"
          [style.color]="tone()"
          [attr.aria-label]="label()"
          [title]="label()">
      <epm-icon [name]="glyph()" [size]="size" />
    </span>
  `,
})
export class SevDotComponent {
  private lookups = inject(LookupsService);

  /** critical · warning · info — the `alert-severity` codes. */
  @Input({ required: true }) set severity(v: string) { this.sevSig.set(v); }
  @Input() size = 15;

  private sevSig = signal('info');

  label = computed(() => this.lookups.label('alert-severity', this.sevSig()));

  /**
   * Verbatim from the reference's ALERT_SEV map: red → warning triangle,
   * amber → error circle, green → info circle. Our codes are the entity's
   * (critical/warning/info); the glyphs and tones are unchanged.
   */
  glyph = computed(() => GLYPH[this.sevSig()] ?? GLYPH['info']);

  /**
   * Status tokens, not `--error` as a decorative accent: severity here IS a
   * status, which is the one thing 05 §1 lets these hues encode.
   */
  tone = computed(() => TONE[this.sevSig()] ?? TONE['info']);
}

const GLYPH: Record<string, string> = {
  critical: 'warning',
  warning: 'error',
  info: 'info',
};

const TONE: Record<string, string> = {
  critical: 'var(--error)',
  warning: 'var(--status-suspended-tx)',
  info: 'var(--status-completed-tx)',
};
