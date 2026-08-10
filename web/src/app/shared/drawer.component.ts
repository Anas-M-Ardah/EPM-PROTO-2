import { Component, EventEmitter, HostListener, Input, Output, ViewEncapsulation } from '@angular/core';
import { IconComponent } from '../core/icon.component';

/**
 * <epm-drawer title="توزيع الكميات" sub="BQ-003" (closed)="open = false">
 *   …body…
 *   <ng-container footer><button class="d-btn primary">حفظ</button></ng-container>
 * </epm-drawer>
 *
 * Ported from DDrawer — docs/spec/reference/app/desktop-admin.jsx:18.
 *
 * ── SECONDARY DETAIL GOES IN A DRAWER, NOT AN EXPANDER (04 §3) ────────────
 * An in-place expander pushes the rest of the register down and loses the row
 * you were comparing against. The drawer keeps the table still. This is the
 * rule behind DBoqDistDrawer and DAmdPanel, so both land on this component.
 *
 * Escape closes, the scrim closes, and the panel is role="dialog" aria-modal.
 * The caller owns the open/closed state — this renders only when it is mounted,
 * so wrap it in @if.
 */
@Component({
  selector: 'epm-drawer',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent],
  template: `
    <div class="d-drawer-scrim" (click)="closed.emit()"></div>
    <div class="d-drawer" [class.wide]="wide" role="dialog" aria-modal="true" [attr.aria-label]="title">
      <div class="d-drawer-head">
        <div class="tx">
          <b>{{ title }}</b>
          <!-- 05 §5.2 — the subtitle is nearly always an ID or a figure. -->
          @if (sub) { <span><bdi>{{ sub }}</bdi></span> }
        </div>
        <button type="button" class="d-icon-btn" (click)="closed.emit()" [attr.aria-label]="closeLabel">
          <epm-icon name="close" [size]="18" />
        </button>
      </div>
      <div class="d-drawer-body"><ng-content /></div>
      @if (hasFooter) {
        <div class="d-drawer-foot"><ng-content select="[footer]" /></div>
      }
    </div>
  `,
})
export class DrawerComponent {
  @Input({ required: true }) title = '';
  @Input() sub = '';
  /** The 760px panel — for a comparison table that needs the room. */
  @Input() wide = false;
  /** Set when projecting [footer]; the foot has a top border and must not render empty. */
  @Input() hasFooter = false;
  @Input() closeLabel = 'إغلاق';

  @Output() closed = new EventEmitter<void>();

  @HostListener('document:keydown.escape')
  onEscape() { this.closed.emit(); }
}
