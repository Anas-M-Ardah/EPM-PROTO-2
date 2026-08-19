import { Component, Input, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import * as fmt from '../core/format';
import { LangService } from '../core/lang';

/**
 * <epm-amd-delta [delta]="row.amendment.deltaQty" [unit]="row.unit" />
 * <epm-amd-delta [delta]="row.amendment.pendingDeltaAmount" pending money />
 *
 * Ported from DAmdDelta — `app/contract-amendments.jsx:202`. `.d-amd-delta`
 * and `.d-amd-delta.pend` are already in `web/src/styles/desktop.css:2069`.
 *
 * ── THE EFFECTIVE FIGURE STAYS THE FIGURE (04 §6) ─────────────────────────
 * This renders BENEATH the cell's own number as a compact signed delta. It is
 * NOT a strikethrough over the original: the original is not wrong, it is
 * superseded, and striking it through says the opposite. The register prints
 * what is in force and this says how it got there.
 *
 * ── COLOUR FOLLOWS SETTLED VS PENDING, NEVER GOOD VS BAD ─────────────────
 * `pend` is the amber of «بانتظار التطبيق», not a warning about the sign. An
 * increase and a decrease are the same colour, because CLAUDE.md §6 forbids
 * colouring a magnitude by threshold — the fact being coloured here is whether
 * the contract amendment has issued.
 */
@Component({
  selector: 'epm-amd-delta',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    @if (shown()) {
      <span class="d-amd-delta" [class.pend]="pending">
        <bdi>{{ text() }}</bdi>@if (pending) { <em>{{ lang.t('amd_pending_short') }}</em> }
      </span>
    }
  `,
})
export class AmendmentDeltaComponent {
  lang = inject(LangService);

  /** Signed. Null or zero renders nothing — a delta of nought is not news. */
  @Input() set delta(v: number | null | undefined) { this.d.set(v ?? 0); }
  @Input() unit = '';
  /** Formats as money rather than a quantity, and drops the unit. */
  @Input() money = false;
  /** The approved-but-unapplied projection rather than the settled move. */
  @Input() pending = false;

  private d = signal(0);

  shown = computed(() => this.d() !== 0);

  text = computed(() => {
    const v = this.d();
    const sign = v > 0 ? '+' : '';
    return this.money
      ? sign + fmt.money(v)
      : sign + fmt.qty(v) + (this.unit ? ' ' + this.unit : '');
  });
}
