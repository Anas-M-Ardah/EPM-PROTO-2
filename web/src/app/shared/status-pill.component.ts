import { Component, Input, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { LookupsService } from '../core/lookups';

/**
 * <epm-status-pill kind="project-status" code="ongoing" />
 *
 * Ported from DPill — docs/spec/reference/app/desktop-shell.jsx:22.
 *
 * ── ALWAYS CARRIES A LABEL (05 §7.6, binding) ─────────────────────────────
 * "Status is never colour-only — pair every colour with a label or icon."
 * The label is not optional and there is no input to suppress it. A bare
 * coloured dot is a defect, not a compact variant.
 *
 * The label comes from the Lookups table (EP-LKP-01) so one pill renders any
 * of the 06 enumerations — project status, contract status, lifecycle,
 * amendment state, coverage — without a per-screen label map.
 */
@Component({
  selector: 'epm-status-pill',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `<span class="d-pill {{ cls() }}">{{ text() }}</span>`,
})
export class StatusPillComponent {
  private lookups = inject(LookupsService);

  /** A 06 lookup kind, e.g. 'project-status' · 'co-lifecycle'. */
  @Input({ required: true }) set kind(v: string) { this.kindSig.set(v); }
  @Input({ required: true }) set code(v: string) { this.codeSig.set(v); }

  /** Overrides the looked-up label. For codes that are not in a lookup kind. */
  @Input() set label(v: string | null) { this.labelSig.set(v); }

  private kindSig = signal('');
  private codeSig = signal('');
  private labelSig = signal<string | null>(null);

  text = computed(() => this.labelSig() ?? this.lookups.label(this.kindSig(), this.codeSig()));

  /**
   * The API speaks the CANONICAL keys of 06 §1 (delayed, cancelled). The
   * copied stylesheet was written against the reference prototype's older
   * internal keys and only defines .d-pill.stalled / .d-pill.withdrawn.
   *
   * Map here rather than renaming either side: the spec keys are correct and
   * must not be bent to the CSS, and editing the verbatim stylesheet would
   * break the "copied, not re-derived" guarantee (P-08).
   *
   * Codes with no pill class of their own fall through to the neutral pill —
   * still labelled, so 05 §7.6 holds for every enumeration.
   */
  cls = computed(() => {
    const code = this.codeSig();
    const mapped = CANONICAL_TO_CSS[code] ?? code;
    return PILL_CLASSES.has(mapped) ? mapped : 'withdrawn';
  });
}

/** 06 §1 canonical key → the class name the verbatim stylesheet defines. */
const CANONICAL_TO_CSS: Record<string, string> = {
  delayed: 'stalled',
  cancelled: 'withdrawn',
};

/** Every .d-pill.<x> that exists in src/styles/desktop.css:688-692. */
const PILL_CLASSES = new Set(['ongoing', 'completed', 'stalled', 'suspended', 'withdrawn']);
