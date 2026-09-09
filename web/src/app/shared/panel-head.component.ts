import { Component, Input, ViewEncapsulation } from '@angular/core';

/**
 * The right-pane record header — «رأس بطاقة السجل».
 *
 * <div epmPanelHead [code]="a.id" [title]="name(a)">
 *   <span badge class="d-crit-dot"></span>
 *   <span sub>{{ statusLabel(a.status) }}</span>
 *   <div class="acts"><button …>×</button></div>
 * </div>
 *
 * ── WHY IT IS AN ATTRIBUTE AND NOT AN ELEMENT (P-248) ─────────────────────
 * `desktop.css` styles this header through DIRECT-CHILD selectors —
 * `.d-rpane > .rp-h`, `.d-rpane > .rp-h > .tx`, and `20d`'s
 * `.d-rpane > .rp-h > .tx > .sub`. An `<epm-panel-head>` element would sit
 * BETWEEN `.d-rpane` and `.rp-h` and break every one of them, and the header
 * would lose its layout entirely. So the selector is `[epmPanelHead]` and the
 * host element IS the `.rp-h` div: the DOM is unchanged, and not one line of
 * CSS had to move to accommodate the refactor.
 *
 * ── WHAT IS AN INPUT AND WHAT IS PROJECTED ────────────────────────────────
 * `code` and `title` are plain strings — every one of the seven call sites
 * passed a plain string for both. Everything else is PROJECTED, because the
 * seven disagree about it in ways an input cannot express:
 *
 *   [badge]  one `.d-pill`, one `<epm-status-pill>`, a `@for` over several of
 *            them, or an `@if`-guarded criticality ring
 *   [sub]    carries `<bdi>` on the sites whose subtitle is a date, a letter
 *            number or a day count — `05 §5.2` requires that isolation, and a
 *            string input would have silently dropped it
 *   default  the `.acts` cluster, which is two buttons, one button, or absent
 *
 * `.r1` renders only when there is a `code`, which is what SCR-W4's add panel
 * needs — it has a title and a subtitle and no identifier to show.
 */
@Component({
  selector: '[epmPanelHead]',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'rp-h' },
  template: `
    <div class="tx">
      @if (code) {
        <div class="r1">
          <!-- 05 §5.2 — the code is an identifier, so it is bidi-isolated. -->
          <span class="code"><bdi>{{ code }}</bdi></span>
          <ng-content select="[badge]" />
        </div>
      }
      <b>{{ title }}</b>
      <span class="sub"><ng-content select="[sub]" /></span>
    </div>
    <ng-content />
  `,
})
export class PanelHeadComponent {
  /** The record's identifier. Omit it and the `.r1` row is not drawn at all. */
  @Input() code = '';

  @Input({ required: true }) title = '';
}
