import {
  Component, ContentChildren, Directive, EventEmitter, Input, Output, QueryList,
  TemplateRef, ViewEncapsulation, computed, inject, signal,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { IconComponent } from '../core/icon.component';
import { FieldGroupComponent } from './field-group.component';
import { LangService } from '../core/lang';
import * as fmt from '../core/format';

/** How a cell's value is formatted. `custom` defers to a projected template. */
export type CellKind = 'text' | 'money' | 'qty' | 'pct' | 'int' | 'date' | 'mono' | 'custom';

/**
 * One column. `value` returns the cell's figure; `sub` an optional second line
 * beneath it, which is how this system prints a qualifier (the BOQ weight under
 * an amount, a manufacturer under a device name).
 */
export interface TableColumn<T = any> {
  key: string;
  /** ALREADY TRANSLATED. The column list lives in a page, which has `lang`. */
  label: string;
  kind?: CellKind;
  /** CSS width, e.g. '96px'. Omit for the one column that takes the slack. */
  width?: string;
  /** Right-aligned, tabular. Every money and quantity column is one. */
  numeric?: boolean;
  /** A currency chip in the header — «(د.ع)». */
  currency?: string;
  value?: (row: T) => unknown;
  sub?: (row: T) => string | null | undefined;
  /** Renders the cell in `--on-surface` weight-bold, for the row's name column. */
  strong?: boolean;
  /** The footer figure. Absent leaves the footer cell empty. */
  total?: (rows: T[]) => unknown;
  /** Footer text that is not a figure — «الإجمالي», «7 فقرة». */
  totalText?: (rows: T[]) => string;
}

/**
 * <ng-template epmCell="status" let-row> … </ng-template>
 *
 * The escape hatch, and the reason this grid can be config-driven at all: a
 * status pill, a progress cell and a link are not values, and a config that
 * tried to describe them would end up describing markup.
 */
@Directive({ selector: '[epmCell]', standalone: true })
export class CellTemplateDirective {
  @Input('epmCell') key = '';
  template = inject(TemplateRef<any>);
}

/**
 * <epm-data-table [columns]="…" [rows]="…" /> — ONE table for every register.
 *
 * ── WHY THIS EXISTS, AND WHAT IT COSTS ────────────────────────────────────
 * Every register in this build hand-wrote its own `<div class="d-tablewrap">
 * <table class="d-table">` with its own thead, its own four empty states and
 * its own footer. That is fifteen chances to get a convention slightly wrong,
 * and الفقرات التجهيزية proved it: its first cut printed the BOQ weight without
 * its label, the receipt cell without its percentage and a totals row that did
 * not match the plate — none of which were decisions, all of which were
 * omissions.
 *
 * **This goes against a standing rule and does so deliberately.** CLAUDE.md's
 * governing constraint is «readability and traceability, not architectural
 * correctness — where a best practice adds a hop, it is not wanted here», and a
 * column config IS a hop: a reader can no longer see a screen's columns as
 * markup in that screen's own template. The client chose consistency over that
 * hop; it is recorded in DECISIONS.md as D-16 rather than left as a silent
 * departure.
 *
 * ── WHAT IT DOES NOT DO ───────────────────────────────────────────────────
 * No sorting, no paging, no selection model, no virtual scroll. `.d-table` is
 * the verbatim reference stylesheet and this adds NO CSS: it emits exactly the
 * markup the registers already emitted, from a list instead of by hand.
 */
@Component({
  selector: 'epm-data-table',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [NgTemplateOutlet, IconComponent, FieldGroupComponent],
  template: `
    <!-- THE FRAME. DFGroup in the prototype (supply-items.jsx:545) wraps
         every register: a title row carrying «N من أصل M» and a chevron, then a
         flush toolbar, then the grid. Giving a page a title gets that frame;
         omitting it gets the bare grid, which is what a table nested in a
         drawer or a card body wants. -->
    @if (title) {
      <epm-field-group [title]="title" [sub]="sub" [id]="frameId" flush>
        <ng-content select="[epmTableToolbar]" />
        <ng-container *ngTemplateOutlet="grid" />
      </epm-field-group>
    } @else {
      <ng-content select="[epmTableToolbar]" />
      <ng-container *ngTemplateOutlet="grid" />
    }

    <ng-template #grid>
    <div class="d-tablewrap">
      <table class="d-table" [style.min-width]="minWidth || null">
        <thead>
          <tr>
            @for (c of columns; track c.key) {
              <th [class.r]="c.numeric" [style.width]="c.width || null">
                {{ c.label }}@if (c.currency) { <span class="cur">({{ c.currency }})</span> }
              </th>
            }
          </tr>
        </thead>

        <tbody>
          @for (row of rows; track rowKeyOf(row)) {
            <tr [class.sel]="selectedKey && rowKeyOf(row) === selectedKey">
              @for (c of columns; track c.key) {
                <td [class.r]="c.numeric" [class.mono]="isMono(c)"
                    [class.d-cell-strong]="c.strong" [class.d-cell-sub]="c.kind === 'text' && !c.strong">
                  @if (c.kind === 'custom') {
                    <ng-container
                      *ngTemplateOutlet="cellFor(c.key); context: { $implicit: row, row: row }" />
                  } @else {
                    <bdi>{{ format(c, row) }}</bdi>
                    @if (c.sub && c.sub(row)) {
                      <span class="d-cell-sub"><bdi>{{ c.sub(row) }}</bdi></span>
                    }
                  }
                </td>
              }
            </tr>
          } @empty {
            <!-- 04 §9 — «the filter hid everything» and «there is nothing» are
                 two states with two messages and two buttons. The grid asks the
                 page which one it is rather than guessing from a row count. -->
            <tr><td class="empty" [attr.colspan]="columns.length">
              <div class="d-empty">
                <span class="d-empty-ico"><epm-icon [name]="emptyIcon" [size]="30" /></span>
                @if (filtered) {
                  <b>{{ filteredTitle }}</b>
                  <span>{{ filteredBody }}</span>
                  <button type="button" class="d-btn primary" (click)="clear.emit()">
                    {{ lang.t('clear_filters') }}
                  </button>
                } @else {
                  <b>{{ emptyTitle }}</b>
                  <span>{{ emptyBody }}</span>
                }
              </div>
            </td></tr>
          }
        </tbody>

        @if (rows.length > 0 && hasFooter()) {
          <tfoot>
            <tr>
              @for (c of columns; track c.key) {
                <td [class.r]="c.numeric" [class.mono]="c.total"
                    [class.d-cell-strong]="!!c.totalText">
                  @if (c.totalText) {
                    {{ c.totalText(rows) }}
                  } @else if (c.total) {
                    <bdi>{{ formatValue(c, c.total(rows)) }}</bdi>
                  }
                </td>
              }
            </tr>
          </tfoot>
        }
      </table>
    </div>
    </ng-template>
  `,
})
export class DataTableComponent<T = any> {
  lang = inject(LangService);

  @Input({ required: true }) columns: TableColumn<T>[] = [];
  @Input({ required: true }) rows: T[] = [];

  /** The property that identifies a row — used for `track` and for selection. */
  @Input() rowKey: keyof T | ((row: T) => string) = 'id' as keyof T;
  @Input() selectedKey = '';

  @Input() minWidth = '';

  // ── the frame (optional) ────────────────────────────────────────────────
  /**
   * The register's heading. Setting it wraps the grid in `.d-fgroup` — title,
   * counter, collapse chevron — and lets a `[epmTableToolbar]` element sit
   * between the heading and the grid. Leave it empty for a bare grid.
   */
  @Input() title = '';
  /** «7 من أصل 7» — the shown-of-total counter the plates print. */
  @Input() sub = '';
  /** Anchor id for the frame, so a section can be linked to. */
  @Input() frameId: string | null = null;

  // ── the four states (04 §9) ─────────────────────────────────────────────
  @Input() emptyIcon = 'description';
  @Input() emptyTitle = '';
  @Input() emptyBody = '';
  /** True when a FILTER emptied the table — a different state, and it says so. */
  @Input() filtered = false;
  @Input() filteredTitle = '';
  @Input() filteredBody = '';

  @Output() clear = new EventEmitter<void>();

  @ContentChildren(CellTemplateDirective) cells!: QueryList<CellTemplateDirective>;

  rowKeyOf(row: T): string {
    const k = this.rowKey;
    return typeof k === 'function' ? k(row) : String(row[k]);
  }

  cellFor(key: string): TemplateRef<any> | null {
    return this.cells?.find(c => c.key === key)?.template ?? null;
  }

  hasFooter(): boolean {
    return this.columns.some(c => c.total || c.totalText);
  }

  isMono(c: TableColumn<T>): boolean {
    return c.kind === 'mono' || c.kind === 'money' || c.kind === 'qty'
      || c.kind === 'pct' || c.kind === 'int' || c.kind === 'date';
  }

  format(c: TableColumn<T>, row: T): string {
    return this.formatValue(c, c.value ? c.value(row) : (row as any)[c.key]);
  }

  /**
   * The ONE place a figure becomes text. `05 §5.2`'s `<bdi>` is in the template
   * above, so no page can forget it — which was half the point of doing this.
   */
  formatValue(c: TableColumn<T>, v: unknown): string {
    if (v === null || v === undefined || v === '') return '—';
    switch (c.kind) {
      case 'money': return fmt.money(Number(v));
      case 'qty': return fmt.qty(Number(v));
      case 'pct': return fmt.pct(Number(v), 2);
      case 'int': return String(v);
      case 'date': return fmt.date(String(v));
      default: return String(v);
    }
  }
}
