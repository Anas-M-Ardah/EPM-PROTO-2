import { Component, Input, ViewEncapsulation, signal } from '@angular/core';
import { IconComponent } from '../core/icon.component';

export interface SecNavItem {
  /** Must match an <epm-section id="…">. */
  id: string;
  label: string;
  icon?: string;
}

/**
 * <epm-sec-nav [items]="sections" />
 *
 * Ported from DSecNav — docs/spec/reference/app/project-modules.jsx:119.
 * The sticky chip row at the top of a long tab that jumps to its sections.
 *
 * The reference scrolls the nearest .d-detail-body rather than the window,
 * because inside the 3-pane workspace the detail pane is what scrolls, not
 * the page. That behaviour is kept exactly.
 */
@Component({
  selector: 'epm-sec-nav',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent],
  template: `
    <div class="d-secnav">
      @for (i of items; track i.id) {
        <!-- .d-secnav button already carries :focus-visible via `all: unset`
             plus the stylesheet's own rules (05 §7.7). -->
        <button type="button" [class.on]="active() === i.id" (click)="go(i.id)">
          @if (i.icon) { <epm-icon [name]="i.icon" [size]="13" /> }
          {{ i.label }}
        </button>
      }
    </div>
  `,
})
export class SecNavComponent {
  @Input({ required: true }) set items(v: SecNavItem[]) {
    this.itemsSig = v;
    if (v.length && !this.active()) this.active.set(v[0].id);
  }
  get items() { return this.itemsSig; }
  private itemsSig: SecNavItem[] = [];

  active = signal('');

  go(id: string) {
    this.active.set(id);

    const el = document.getElementById(id);
    const box = el?.closest('.d-detail-body');
    if (!el) return;

    // 52px clears the sticky nav itself.
    if (box instanceof HTMLElement) {
      box.scrollTo({ top: el.offsetTop - box.offsetTop - 52, behavior: 'smooth' });
    } else {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}
