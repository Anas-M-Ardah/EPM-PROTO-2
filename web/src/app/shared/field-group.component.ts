import { Component, Input, ViewEncapsulation, booleanAttribute, signal } from '@angular/core';
import { IconComponent } from '../core/icon.component';

/**
 * <epm-field-group title="هوية المشروع" sub="البيانات التعريفية الأساسية">
 *   …fields…
 * </epm-field-group>
 *
 * `.d-fgroup` — the collapsible RECORD CARD (design standards L11/L12), ported
 * from `DFGroup` in the live prototype's project-modules.jsx. الشكل 5's six
 * sections are these, and so are every other record-detail screen's.
 *
 * ── IT IS NOT `<epm-section>` ─────────────────────────────────────────────
 * `.d-sec` is the label + hairline + space treatment a REGISTER uses — a table
 * with a heading over it. `.d-fgroup` is a bordered card with a title, a
 * caption and a chevron, and its `.d-form-grid` is a container-query grid
 * (1 / 2 / 3 columns by the CARD's width, not the viewport's). الشكل 5 draws
 * cards, so this is the primitive it gets. Both already exist in the
 * stylesheet, copied verbatim from the reference; neither is new CSS.
 *
 * ── THE HEADER IS THE TOGGLE ──────────────────────────────────────────────
 * Open by default and collapsible always — «طي الأقسام وفتحها» is one of
 * الشكل 5's four listed user actions, not an option. The `closed` class is what
 * rotates the chevron and hides the body, exactly as `.d-fgroup.closed` expects.
 */
@Component({
  selector: 'epm-field-group',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent],
  template: `
    <section class="d-fgroup" [class.closed]="!open()" [attr.id]="id">
      <header class="gh"
              role="button"
              [attr.tabindex]="0"
              [attr.aria-expanded]="open()"
              (click)="toggle()"
              (keydown.enter)="toggle()"
              (keydown.space)="toggle()">
        <span class="ttl">{{ title }}</span>
        @if (sub) { <span class="sub">{{ sub }}</span> }
        <span class="sp"></span>
        <epm-icon name="expand_more" [size]="16" class="chev" />
      </header>
      @if (open()) {
        <div class="gb" [class.flush]="flush"><ng-content /></div>
      }
    </section>
  `,
})
export class FieldGroupComponent {
  @Input({ required: true }) title = '';
  /** The caption beside the title — الشكل 5 gives every section one. */
  @Input() sub = '';
  /** Anchor, so a section can be linked to. */
  @Input() id: string | null = null;

  /**
   * `DFGroup`'s own `flush` prop — the body drops its padding and gap so a
   * toolbar and a table meet the card's edges and each other on a hairline.
   * الشكل 50's register is drawn this way: title row, toolbar row, table, with
   * nothing inset. Without it a table inside a card reads as a box in a box.
   */
  @Input({ transform: booleanAttribute }) flush = false;

  open = signal(true);

  toggle() { this.open.set(!this.open()); }
}
