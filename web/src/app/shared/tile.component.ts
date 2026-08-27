import {
  Component, EventEmitter, Input, Output, ViewEncapsulation,
  booleanAttribute, inject, numberAttribute,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { IconComponent } from '../core/icon.component';
import { LangService } from '../core/lang';

/** ok · warn · bad · none — the four `DTile` accepts, and the only four. */
export type TileState = 'ok' | 'warn' | 'bad' | 'none';

/** The arrow beside a delta. `flat` draws a dash and carries no colour. */
export type TileDir = 'up' | 'down' | 'flat';

/**
 * <epm-tile span="3" label="الإنجاز المادي" value="35" unit="%" state="warn"
 *           delta="+7 نقطة" dir="up" cmpLabel="مخطط" cmpValue="31%"
 *           note="مقارنة مع القراءة السابقة"
 *           toLabel="الجدول الزمني" [toLink]="['../schedule']" />
 *
 * `.d-tile` — the KPI card of design archetype **L04**, ported from `DTile` in
 * the live prototype's `desktop-shell.jsx:887`. الأشكال 25–28 are built out of
 * these and nothing else: four, three, six and four of them respectively, each
 * over a `.d-l04` twelve-column grid.
 *
 * ── IT IS NOT A SUMMARY STRIP ─────────────────────────────────────────────
 * `<epm-summary-strip>` is a band of bare label/figure pairs. A tile is a
 * bordered card that carries four more things the strip has nowhere to put,
 * and every one of them is named in the plates:
 *
 *   * a **comparison** — «مخطط 31%», «الهدف 1.00», «الكلفة المقررة …»
 *   * a **delta** against the selected period — «+7 نقاط»
 *   * a **note**, which is where a plate's governing sentence goes
 *   * a **drill-through** — «التفصيل في…», which all four plates list under
 *     «الإجراءات المتاحة للمستخدم» as «الانتقال إلى الوحدة المصدر لكل مؤشر»
 *
 * The stylesheet has carried the whole vocabulary since Phase 1
 * (`styles/desktop.css:3395–3480`) and no screen in this build had ever used
 * it. This is the same substitution P-186 found on SCR-W7 (P-199).
 *
 * ── THE THRESHOLD IS NEVER ONLY A COLOUR ──────────────────────────────────
 * `state` paints a 2px edge on the tile's inline-start — never the number,
 * which would read as a different metric. `DTile` pairs it with a screen-reader
 * phrase and so does this: «ضمن الحد» · «قرب الحد» · «تجاوز الحد». The colour
 * is the visual half of the statement, not the whole of it (`04 §5`).
 *
 * A tile whose figure is a MAGNITUDE takes `state="none"`. Colouring a
 * magnitude by threshold is the defect CLAUDE.md §6 names outright.
 *
 * ── THE DRILL-THROUGH IS A LINK ───────────────────────────────────────────
 * The reference calls `goTab`, because its module frame owns the tab state.
 * Here every target is a real sibling route under `projects/:id`, so it is an
 * `<a routerLink>` — it opens in a new tab on a middle click, and it reaches
 * the browser's back button. `toFn` is there for the one target that is
 * another TAB of this same screen rather than another module.
 */
@Component({
  selector: 'epm-tile',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent, RouterLink],
  template: `
    <section class="d-tile" role="group" [attr.aria-labelledby]="tid"
             [class.s3]="span === 3" [class.s6]="span === 6" [class.s12]="span === 12"
             [class.ok]="state === 'ok'" [class.warn]="state === 'warn'"
             [class.bad]="state === 'bad'" [class.flush]="flush">

      <header class="th">
        <span class="lbl" [id]="tid">{{ label }}
          @if (stateText()) { <span class="sr"> — {{ stateText() }}</span> }
        </span>
      </header>

      @if (value !== null && value !== '') {
        <div class="tv">
          <b><bdi>{{ value }}</bdi></b>
          @if (unit) { <i>{{ unit }}</i> }
        </div>
      }

      @if (delta || cmpLabel) {
        <div class="tc">
          @if (delta) {
            <span class="dl" [class.up]="dir === 'up'" [class.down]="dir === 'down'"
                  [class.flat]="dir === 'flat'">
              <epm-icon [name]="arrow()" [size]="13" />
              <bdi>{{ delta }}</bdi>
            </span>
          }
          @if (cmpLabel) {
            <span class="cm">{{ cmpLabel }} <b><bdi>{{ cmpValue }}</bdi></b></span>
          }
        </div>
      }

      <ng-content />

      @if (note) { <div class="tn">{{ note }}</div> }

      @if (toLink) {
        <a class="tt" [routerLink]="toLink" [attr.aria-label]="toAria()">
          {{ lang.t('tile_detail_in') }} {{ toLabel }}
          <epm-icon name="chevron_right" [size]="14" />
        </a>
      } @else if (toLabel) {
        <button type="button" class="tt" [attr.aria-label]="toAria()" (click)="toClick.emit()">
          {{ lang.t('tile_detail_in') }} {{ toLabel }}
          <epm-icon name="chevron_right" [size]="14" />
        </button>
      }
    </section>
  `,
})
export class TileComponent {
  lang = inject(LangService);

  @Input({ required: true }) label = '';

  /**
   * Already FORMATTED. A tile takes a string, never a number: money reaches it
   * through `fmt.money` and its currency word arrives as `unit`, which is
   * exactly how الشكل 27 draws «570,341,101 د.ع». Formatting is the one thing
   * §3.1 lets the browser do, and doing it in the caller keeps this component
   * from needing to know what kind of figure it is holding.
   */
  @Input() value: string | null = null;

  /** «%» · «يوم» · «د.ع» · «/6» — the small word after the figure. */
  @Input() unit = '';

  @Input() state: TileState = 'none';

  /** «+7 نقطة» — signed by the caller, because the sign is part of the text. */
  @Input() delta = '';
  @Input() dir: TileDir = 'flat';

  /** «مخطط» / «31%» — the second half of the tile's contract. */
  @Input() cmpLabel = '';
  @Input() cmpValue = '';

  @Input() note = '';

  /** «الجدول الزمني», the module the figure comes from. */
  @Input() toLabel = '';
  @Input() toLink: unknown[] | string | null = null;

  @Input({ transform: numberAttribute }) span = 3;
  @Input({ transform: booleanAttribute }) flush = false;

  /**
   * For the one drill-through that switches THIS screen's tab rather than
   * leaving it: الشكل 25's SPI/CPI tile points at «الأثر والكلفة», which is a
   * tab of the same module. Set `toLabel` and leave `toLink` null.
   */
  @Output() toClick = new EventEmitter<void>();

  /**
   * The threshold, in words. A 2px edge cannot be read aloud, printed in
   * greyscale, or heard — `DTile`'s own reasoning, and `05 §7` makes it a
   * contract rather than advice.
   */
  stateText(): string {
    if (this.state === 'ok') return this.lang.t('tile_within');
    if (this.state === 'warn') return this.lang.t('tile_near');
    if (this.state === 'bad') return this.lang.t('tile_past');
    return '';
  }

  arrow(): string {
    return this.dir === 'up' ? 'arrow_upward' : this.dir === 'down' ? 'arrow_downward' : 'remove';
  }

  toAria(): string {
    return `${this.lang.t('tile_detail_in')} ${this.toLabel} — ${this.label}`;
  }

  /**
   * `aria-labelledby` needs an id, and a tile's label is the only thing that
   * distinguishes it. Arabic survives the strip — `\w` would delete the whole
   * label and leave every tile on the page sharing one id.
   */
  get tid(): string {
    return 'tile-' + this.label.replace(/[^\w؀-ۿ]/g, '').slice(0, 24) + this.span;
  }
}
