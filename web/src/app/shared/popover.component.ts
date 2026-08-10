import {
  AfterViewInit, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy,
  Output, ViewChild, ViewEncapsulation, signal,
} from '@angular/core';

/**
 * <epm-popover [anchor]="el" (closed)="…"><ng-content /></epm-popover>
 *
 * Ported from v1.1 DPopover — ../epm@design/system-revamp app/desktop-shell.jsx:41.
 *
 * ── RTL IS NOT A TRANSFORM ────────────────────────────────────────────────
 * The reference computes the inline edge from `document.documentElement.dir`
 * and so does this. A popover mirrored with `scaleX(-1)` would mirror its text
 * too, and one positioned by `left` alone opens off-screen in Arabic.
 *
 * ── IT FLIPS RATHER THAN OVERFLOWS ────────────────────────────────────────
 * Measured after the first paint: if it would run past the bottom of the
 * viewport it opens upward instead. Rendered hidden for that one frame so the
 * measurement never flashes — the sidebar account button sits at the bottom of
 * the screen, so this is the normal case, not the edge case.
 */
@Component({
  selector: 'epm-popover',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  template: `
    <div class="d-pop-scrim" (click)="close()"></div>
    <div #pop class="d-pop"
         role="dialog"
         [attr.aria-label]="label"
         [style.inline-size.px]="width"
         [style.left.px]="left()"
         [style.top.px]="top()"
         [style.visibility]="placed() ? 'visible' : 'hidden'">
      <ng-content />
    </div>
  `,
})
export class PopoverComponent implements AfterViewInit, OnDestroy {
  /** The element the popover hangs off. */
  @Input({ required: true }) anchor!: HTMLElement;
  @Input() width = 280;
  /** 'start' aligns with the anchor's inline start, 'end' with its inline end. */
  @Input() align: 'start' | 'end' = 'start';
  @Input() label = '';

  @Output() closed = new EventEmitter<void>();

  @ViewChild('pop') pop?: ElementRef<HTMLElement>;

  left = signal(0);
  top = signal(0);
  placed = signal(false);

  private onScroll = () => this.close();

  ngAfterViewInit() {
    this.position();
    // Anchored to a rect, so any scroll invalidates it. Closing is the
    // reference's behaviour and the honest one — a popover that drifts away
    // from its trigger has lost the thing it was explaining.
    window.addEventListener('scroll', this.onScroll, true);
    window.addEventListener('resize', this.onScroll);
  }

  ngOnDestroy() {
    window.removeEventListener('scroll', this.onScroll, true);
    window.removeEventListener('resize', this.onScroll);
  }

  @HostListener('document:keydown.escape')
  close() { this.closed.emit(); }

  private position() {
    const rtl = document.documentElement.dir === 'rtl';
    const r = this.anchor.getBoundingClientRect();
    const w = this.width;

    let left = this.align === 'end' ? r.right - w : r.left;
    if (rtl) left = this.align === 'end' ? r.left : r.right - w;
    left = Math.max(8, Math.min(left, window.innerWidth - w - 8));
    this.left.set(left);

    // Provisional: below the anchor. Corrected once we can measure the height.
    this.top.set(r.bottom + 6);

    requestAnimationFrame(() => {
      const h = this.pop?.nativeElement.offsetHeight ?? 0;
      const below = r.bottom + 6;
      const fits = below + h <= window.innerHeight - 8;
      this.top.set(fits ? below : Math.max(8, r.top - h - 6));
      this.placed.set(true);
    });
  }
}
