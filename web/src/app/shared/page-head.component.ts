import { Component, Input, ViewEncapsulation, inject } from '@angular/core';
import { IconComponent } from '../core/icon.component';
import { LangService } from '../core/lang';

export interface Crumb {
  label: string;
  /** Omit on the last crumb — the current page is not a link. */
  link?: unknown[];
}

/**
 * <epm-page-head [crumbs]="crumbs" [title]="…" [sub]="…">
 *   <button actions class="d-btn primary">…</button>
 * </epm-page-head>
 *
 * Ported from v1.1 DPageHead — docs/spec/reference/app/desktop-shell.jsx.
 *
 * ── ZONE Z2, THE IDENTITY BAR ─────────────────────────────────────────────
 * Every page carries one: breadcrumb → title (+ optional status pill) →
 * action cluster. Two rules from the v1.1 design language:
 *
 *   1. Page actions live HERE, not in the dark global bar. The global bar is
 *      workspace context, search and notifications — never page actions.
 *   2. The cluster is at most three secondary actions plus ONE primary. A
 *      stack of four buttons means the page is doing too much.
 *
 * The bar is a header band with a bottom hairline separating it from content —
 * that separation is part of the contract, not decoration.
 */
@Component({
  selector: 'epm-page-head',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent],
  template: `
    <div class="d-page-head">
      <div class="idtx">
        @if (crumbs.length) {
          <nav class="d-crumbs" [attr.aria-label]="lang.isAr() ? 'مسار التنقل' : 'Breadcrumb'">
            @for (c of crumbs; track c.label; let i = $index; let last = $last) {
              @if (i > 0) {
                <epm-icon class="sepr" [name]="lang.isAr() ? 'chevron_left' : 'chevron_right'" [size]="13" />
              }
              @if (last) {
                <span class="cur" aria-current="page">{{ c.label }}</span>
              } @else {
                <span>{{ c.label }}</span>
              }
            }
          </nav>
        }
        <div class="epm-title-row">
          <h1>{{ title }}</h1>
          <ng-content select="[status]" />
        </div>
        @if (sub) { <p>{{ sub }}</p> }
      </div>
      <div class="d-pacts"><ng-content select="[actions]" /></div>
    </div>
  `,
})
export class PageHeadComponent {
  lang = inject(LangService);

  @Input() crumbs: Crumb[] = [];
  @Input({ required: true }) title = '';
  /** One line of context under the title. Not a paragraph. */
  @Input() sub = '';
}
