import { Component, EventEmitter, Input, Output, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { IconComponent } from '../core/icon.component';
import { LangService } from '../core/lang';

/**
 * <epm-pager [page]="page()" [total]="total()" [pageSize]="size()"
 *            (pageChange)="…" (pageSizeChange)="…" />
 *
 * Ported from v1.1 DPager — docs/spec/reference/app/desktop-shell.jsx.
 *
 * The standard bottom strip of a grid card: "from–to of total", a windowed set
 * of page buttons with ellipses, previous/next, and a page-size selector.
 *
 * ── RTL ───────────────────────────────────────────────────────────────────
 * Previous/next swap glyphs by direction — in Arabic, "previous" points right.
 * The reference does this explicitly rather than relying on a transform, and
 * so does this: chevrons are directional, and 05 §5.3 lists them as icons that
 * must flip.
 *
 * ── 05 §5.2 ───────────────────────────────────────────────────────────────
 * The range and the total are figures inside Arabic text, so they are
 * bidi-isolated. Without it "1–15 من 19" reorders visibly.
 */
@Component({
  selector: 'epm-pager',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent],
  template: `
    @if (pageCount() > 1 || showPageSize) {
      <div class="d-pager">
        <span><bdi>{{ rangeLabel() }}</bdi></span>
        <span class="sp"></span>

        @if (showPageSize) {
          <select class="psize" [value]="pageSize"
                  (change)="pageSizeChange.emit(+$any($event.target).value)"
                  [attr.aria-label]="lang.isAr() ? 'عدد الصفوف' : 'Rows per page'">
            @for (n of sizes; track n) {
              <option [value]="n">{{ n }} / {{ lang.isAr() ? 'صفحة' : 'page' }}</option>
            }
          </select>
        }

        <button type="button" class="pg" [disabled]="page <= 1"
                (click)="pageChange.emit(page - 1)"
                [attr.aria-label]="lang.isAr() ? 'السابق' : 'Previous'">
          <epm-icon [name]="lang.isAr() ? 'chevron_right' : 'chevron_left'" [size]="15" />
        </button>

        @for (n of windowed(); track $index) {
          @if (n === null) {
            <span class="epm-pg-gap">…</span>
          } @else {
            <button type="button" class="pg" [class.on]="n === page" (click)="pageChange.emit(n)"
                    [attr.aria-current]="n === page ? 'page' : null">
              <bdi>{{ n }}</bdi>
            </button>
          }
        }

        <button type="button" class="pg" [disabled]="page >= pageCount()"
                (click)="pageChange.emit(page + 1)"
                [attr.aria-label]="lang.isAr() ? 'التالي' : 'Next'">
          <epm-icon [name]="lang.isAr() ? 'chevron_left' : 'chevron_right'" [size]="15" />
        </button>
      </div>
    }
  `,
})
export class PagerComponent {
  lang = inject(LangService);

  @Input({ required: true }) set page(v: number) { this.pageSig.set(v); }
  get page() { return this.pageSig(); }
  @Input({ required: true }) set total(v: number) { this.totalSig.set(v); }
  @Input() set pageSize(v: number) { this.sizeSig.set(v); }
  get pageSize() { return this.sizeSig(); }
  @Input() showPageSize = true;

  @Output() pageChange = new EventEmitter<number>();
  @Output() pageSizeChange = new EventEmitter<number>();

  readonly sizes = [15, 30, 60];

  private pageSig = signal(1);
  private totalSig = signal(0);
  private sizeSig = signal(15);

  pageCount = computed(() => Math.max(1, Math.ceil(this.totalSig() / this.sizeSig())));

  rangeLabel = computed(() => {
    const total = this.totalSig();
    const from = total === 0 ? 0 : (this.pageSig() - 1) * this.sizeSig() + 1;
    const to = Math.min(this.pageSig() * this.sizeSig(), total);
    return this.lang.isAr() ? `${from}–${to} من ${total}` : `${from}–${to} of ${total}`;
  });

  /** Page numbers with `null` standing in for an ellipsis. */
  windowed = computed<(number | null)[]>(() => {
    const count = this.pageCount();
    const page = this.pageSig();
    const out: (number | null)[] = [];

    for (let i = 1; i <= count; i++) {
      if (i === 1 || i === count || (i >= page - 1 && i <= page + 1)) out.push(i);
      else if (out[out.length - 1] !== null) out.push(null);
    }
    return out;
  });
}
