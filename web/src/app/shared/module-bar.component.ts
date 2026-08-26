import { Component, Input, Output, EventEmitter, ViewEncapsulation } from '@angular/core';
import { IconComponent } from '../core/icon.component';

/**
 * <epm-module-bar [title]="lang.t('mod_boq')"
 *                 [backLabel]="lang.t('boq_change_contract')" (back)="backToGate()">
 *   <ng-container sub><bdi>{{ contract()?.id }}</bdi> · {{ contractLabel() }}</ng-container>
 *   <button type="button" actions class="d-btn sm">…</button>
 *   <ng-container tabs>…chips…</ng-container>
 * </epm-module-bar>
 *
 * ── ZONE Z6, THE MODULE BAR ───────────────────────────────────────────────
 * Every module inside مساحة المشروع opens with the same band: an optional back
 * control, the module's name with a subtitle naming the record in scope, a
 * spacer, and the module's actions. It sat inline in nineteen page templates
 * and **fifty-seven** times, because most modules draw it three times over —
 * once for loading, once for error, once for the loaded screen. That is the
 * duplication this replaces: three copies per page could drift from each other
 * without anything failing, and on several pages they already had.
 *
 * Z2 (`epm-page-head`) is the PROJECT's identity — breadcrumb, title, status.
 * Z6 is the MODULE's. They are different bars with different subjects, which is
 * why this is its own component and not a variant of that one.
 *
 * ── THE TABS ARE A SECOND ROW, AND THEY ARE UNDERLINE TABS ────────────────
 * الشكل 12 draws «السجل · الربط بالأنشطة» on their own line UNDER the title
 * bar, as tabs with a 2px underline on the active one — v1.1 §9, which is what
 * `.d-tabs`/`.d-tab` (desktop.css:885) already is. This component is what makes
 * that shape one definition rather than nine.
 *
 * They are NOT `.d-fchip`. CLAUDE.md §1's correction — PAGE-01 reached for
 * `.d-secnav` where `.d-fchip` belonged — is about FILTER CHIPS, a different
 * control on a different row. A filter chip is a toggle over a list; a tab
 * switches which screen you are on, and a filled pill does not say that.
 *
 * `tabs` is projected rather than an `@Input() items[]`: a tab carries a live
 * count, a conditional badge and its own click target per module, and a data
 * array would have had to grow a field for each of those.
 */
@Component({
  selector: 'epm-module-bar',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent],
  template: `
    <div class="d-pz6">
      <!-- The LABEL is the switch. A back control is icon-only, so it cannot
           exist without an accessible name (05 §7) — which makes "has a label"
           and "has a back control" the same condition, and lets a caller whose
           back depends on state write it as one expression. -->
      @if (backLabel) {
        <button type="button" class="d-btn sm ghost"
                [attr.aria-label]="backLabel" (click)="back.emit()">
          <epm-icon name="chevron_right" [size]="16" />
        </button>
      }

      <span class="z6-t">
        {{ title }}
        <!-- The <em> is always emitted: it is empty when nothing is projected,
             and an empty inline element takes no space. Wrapping it in @if
             would need a contentChild query for no visual difference. -->
        <em><ng-content select="[sub]" /></em>
      </span>

      <!-- BEFORE the spacer, so it sits against the title. الشكل 12 puts the
           record selector «العقد CNT-0137 — عقد الأعمال المدنية» next to the
           module name, not out with the actions: it names WHAT is on screen,
           which is part of the title, while the actions are what you can do
           to it. -->
      <ng-content select="[scope]" />

      <span class="sp"></span>
      <ng-content select="[actions]" />
    </div>

    <!-- UNDERLINE TABS (.d-tabs / .d-tab, desktop.css:885) — v1.1 §9's
         "rest muted·500, active accent·600 + 2px underline", which is what
         الشكل 12 draws. NOT .d-fchip: that is the filter-chip control, and a
         filled pill is not a tab. -->
    @if (tabs) {
      <div class="d-tabs z6-tabs" role="tablist"><ng-content select="[tabs]" /></div>
    }
  `,
})
export class ModuleBarComponent {
  /** The module's name — «جدول الكميات», «الموقف المالي». */
  @Input({ required: true }) title = '';

  /**
   * Set true when a `tabs` block is projected. An explicit flag rather than a
   * `@ContentChild`: the row must not render as an empty 34px band on the ten
   * modules that have no tabs, and a query resolves after first paint.
   */
  @Input() tabs = false;

  /**
   * `aria-label` for the back control, and the control's own switch — empty
   * means no back button. A module whose back depends on state passes the
   * condition here: `[backLabel]="single() ? '' : lang.t('boq_change_contract')"`.
   */
  @Input() backLabel = '';

  /** Bound only by modules that have a record to return to. */
  @Output() back = new EventEmitter<void>();
}
