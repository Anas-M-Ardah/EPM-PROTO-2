import { Component, Input, ViewEncapsulation, signal } from '@angular/core';
import { IconComponent } from '../core/icon.component';

/**
 * <epm-section icon="list_alt" title="بنود الكميات" [n]="12">
 *   <button type="button" actions class="d-btn">…</button>
 *   …body…
 * </epm-section>
 *
 * Ported from DSec — docs/spec/reference/app/project-modules.jsx:101.
 * Used by every project tab, which is why it is a primitive and not a
 * per-tab wrapper.
 *
 * ── LABEL + SPACE, NOT A NESTED BOX (04 §3) ───────────────────────────────
 * The header is a hairline-underlined label; the body is a single plane. A
 * section inside a section inside a card is the failure mode this replaces.
 * `flush` drops the body padding so a table can sit edge to edge.
 *
 * ── `boxed` — opt-in, change-orders only ──────────────────────────────────
 * The change-order screens (wizard + record page) were re-compared against
 * the client reference (docs/spec/reference/app/vo-*.jsx, the live build at
 * infinite-azaiton.github.io/epm) and, unlike every other tab, the reference
 * wraps each block in a bordered card rather than a flat label+space band.
 * `[boxed]="true"` restores that card treatment (desktop.css §3b) for those
 * two templates only — every other `<epm-section>` call site is unaffected
 * because the default stays `false`. See DECISIONS.md and the approved plan
 * for the full reasoning; this is a deliberate, scoped exception to §3's
 * flat rule, not a reversal of it.
 */
@Component({
  selector: 'epm-section',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent],
  template: `
    <div class="d-sec" [class.collapsible]="collapsible" [class.boxed]="boxed" [attr.id]="id">
      <div class="d-sec-h"
           [attr.role]="collapsible ? 'button' : null"
           [attr.tabindex]="collapsible ? 0 : null"
           [attr.aria-expanded]="collapsible ? open() : null"
           (click)="collapsible && toggle()"
           (keydown.enter)="collapsible && toggle()"
           (keydown.space)="collapsible && toggle()">
        @if (icon) {
          <span class="ico"><epm-icon [name]="icon" [size]="15" /></span>
        }
        <span class="ttl">{{ title }}</span>
        @if (sub) { <span class="sub">{{ sub }}</span> }
        <!-- 05 §5.2 — a count is a number, so it is bidi-isolated -->
        @if (n !== null && n !== undefined) { <span class="n"><bdi>{{ n }}</bdi></span> }
        <span class="sp"></span>
        <!-- Actions must not toggle the section they sit in. -->
        <span class="acts" (click)="$event.stopPropagation()"><ng-content select="[actions]" /></span>
        @if (collapsible) {
          <epm-icon [name]="open() ? 'expand_less' : 'expand_more'" [size]="16" />
        }
      </div>
      @if (open()) {
        <div class="d-sec-b" [class.flush]="flush"><ng-content /></div>
      }
    </div>
  `,
})
export class SectionComponent {
  @Input() icon = '';
  @Input({ required: true }) title = '';
  @Input() sub = '';
  /** Row count etc. Rendered in the header's .n chip. */
  @Input() n: number | null = null;
  /** Drops the body padding — for a table that should reach the edges. */
  @Input() flush = false;
  @Input() collapsible = false;
  /** Bordered-card presentation — change-order screens only, see header comment. */
  @Input() boxed = false;
  /** Anchor for <epm-sec-nav>. */
  @Input() id: string | null = null;

  @Input() set defaultOpen(v: boolean) { this.open.set(v); }

  open = signal(true);

  toggle() { this.open.set(!this.open()); }
}
