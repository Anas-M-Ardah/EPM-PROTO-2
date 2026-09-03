import {
  Component, ElementRef, EventEmitter, Input, Output, ViewChild,
  ViewEncapsulation, booleanAttribute, computed, inject, signal,
} from '@angular/core';
import { IconComponent } from '../core/icon.component';
import { LangService } from '../core/lang';
import { PopoverComponent } from './popover.component';

/**
 * `<epm-date [value]="iso" (changed)="…" />` — THE APP'S ONE DATE FIELD.
 *
 * ── WHY NOT `<input type="date">` ─────────────────────────────────────────
 * The same reason `<epm-select>` exists (P-197): a native control draws its
 * panel with the OPERATING SYSTEM, so our font, spacing, RTL and dark theme all
 * stop at the popup's edge. A date input is worse than a select about it —
 * Chrome prints the EMPTY field as «mm/dd/yyyy», a US order in Latin digits, on
 * a right-to-left Arabic form, and there is no way to restyle it. The calendar
 * it opens is likewise the browser's, in the browser's language.
 *
 * It is also hostile to type into: the segments only accept bare digits in the
 * browser's own order, so «2026-01-01» has to be entered as `01012026` and a
 * typed dash silently does nothing.
 *
 * ── THE VALUE IS AN ISO STRING, IN AND OUT ────────────────────────────────
 * `yyyy-MM-dd` — what every form here already binds and what `DateOnly` takes
 * on the wire. No Date objects cross this boundary: a Date carries a timezone,
 * and a contract's start date has none. Parsing is done on the parts rather
 * than with `new Date(s)`, which reads a bare ISO date as UTC midnight and can
 * land on the previous day west of Greenwich.
 *
 * ── AND IT DISPLAYS THE SAME STRING ───────────────────────────────────────
 * The trigger shows `yyyy-MM-dd`, not «٣ أيلول ٢٠٢٦». `core/format.ts` already
 * settled this for every date the app prints: "deliberately not localised: it
 * is a record, not prose". A contract date is a legal fact that gets read back
 * against a paper letter, so it reads the same in both languages. The month
 * NAME appears in the calendar's header, where it is helping you navigate
 * rather than stating the record.
 */
@Component({
  selector: 'epm-date',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent, PopoverComponent],
  template: `
    <button #trigger type="button"
            class="epm-date"
            [class.d-form-input]="!bare"
            [class.bare]="bare"
            [class.epm-invalid]="invalid"
            [class.on]="open()"
            [disabled]="disabled"
            [attr.aria-haspopup]="'dialog'"
            [attr.aria-expanded]="open()"
            [attr.aria-label]="label || null"
            (click)="toggle()"
            (keydown)="onTriggerKey($event)">
      <epm-icon name="calendar_today" [size]="15" class="epm-date-ico" />
      <span class="epm-date-v" [class.ph]="!value">{{ value || placeholder || lang.t('date_none') }}</span>
    </button>

    @if (open()) {
      <!-- 380 so the weekday row can carry «الثلاثاء» and «الأربعاء» written out
           rather than clipped to a fragment nobody recognises. -->
      <epm-popover [anchor]="trigger" [width]="380" [label]="label || lang.t('date_pick')"
                   (closed)="close()">
        <div class="epm-cal" (keydown)="onGridKey($event)">

          <div class="epm-cal-head">
            <button type="button" class="d-icon-btn sm" [attr.aria-label]="lang.t('date_prev')"
                    (click)="shiftMonth(-1)"><epm-icon name="chevron_right" [size]="16" /></button>
            <b>{{ monthName() }} <bdi>{{ viewYear() }}</bdi></b>
            <button type="button" class="d-icon-btn sm" [attr.aria-label]="lang.t('date_next')"
                    (click)="shiftMonth(1)"><epm-icon name="chevron_left" [size]="16" /></button>
          </div>

          <div class="epm-cal-dows" aria-hidden="true">
            @for (d of dowNames(); track d) { <span>{{ d }}</span> }
          </div>

          <div class="epm-cal-grid" role="grid" [attr.aria-label]="monthName() + ' ' + viewYear()">
            @for (c of cells(); track c.iso) {
              <button type="button" role="gridcell"
                      class="epm-cal-d"
                      [class.out]="!c.inMonth"
                      [class.on]="c.iso === value"
                      [class.today]="c.iso === todayIso"
                      [class.act]="c.iso === cursor()"
                      [disabled]="c.blocked"
                      [attr.title]="c.blocked ? blockedWhy(c.iso) : null"
                      [attr.aria-selected]="c.iso === value"
                      [attr.tabindex]="c.iso === cursor() ? 0 : -1"
                      (click)="pick(c.iso)">{{ c.day }}</button>
            }
          </div>

          <div class="epm-cal-foot">
            <button type="button" class="d-btn sm" [disabled]="todayBlocked()"
                    (click)="pick(todayIso)">{{ lang.t('date_today') }}</button>
            <span class="sp"></span>
            @if (value && allowEmpty) {
              <button type="button" class="d-btn sm" (click)="pick('')">{{ lang.t('date_clear') }}</button>
            }
          </div>
        </div>
      </epm-popover>
    }
  `,
})
export class DateComponent {
  lang = inject(LangService);

  /** `yyyy-MM-dd`, or '' for none. */
  @Input() value: string | null = '';
  @Input() placeholder = '';
  @Input() label = '';
  @Input() invalid = false;
  @Input() disabled = false;
  @Input({ transform: booleanAttribute }) allowEmpty = true;

  /**
   * INCLUSIVE bounds, `yyyy-MM-dd`. §6 asks that an invalid value be PREVENTED
   * and the cap explained rather than flagged after submit, so an out-of-range
   * day stays in the grid, unpickable, carrying its reason as a title — the
   * same treatment `SelectOption.disabled` gets. A finish date that cannot
   * precede its start says so by being visibly out of reach.
   */
  @Input() min: string | null = null;
  @Input() max: string | null = null;

  @Input({ transform: booleanAttribute }) bare = false;

  @Output() changed = new EventEmitter<string>();

  @ViewChild('trigger', { static: true }) trigger!: ElementRef<HTMLButtonElement>;

  open = signal(false);

  /** The month on screen, and the day the keyboard is on. */
  private view = signal<{ y: number; m: number }>(DateComponent.partsOf(DateComponent.today()));
  cursor = signal('');

  readonly todayIso = DateComponent.today();

  viewYear = computed(() => this.view().y);
  monthName = computed(() => this.lang.months()[this.view().m]);
  dowNames = computed(() => this.lang.dows());

  // ── date maths on the PARTS, never through a Date's timezone ────────────
  static today(): string {
    const d = new Date();
    return DateComponent.iso(d.getFullYear(), d.getMonth(), d.getDate());
  }
  static iso(y: number, m: number, d: number): string {
    return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  static partsOf(s: string): { y: number; m: number } {
    const [y, m] = s.split('-').map(Number);
    return { y: y || new Date().getFullYear(), m: (m || 1) - 1 };
  }

  /** ISO strings sort lexicographically, which is the whole point of the format. */
  private outOfRange(iso: string): boolean {
    if (this.min && iso < this.min) return true;
    if (this.max && iso > this.max) return true;
    return false;
  }

  blockedWhy(iso: string): string {
    if (this.min && iso < this.min) return this.lang.t('date_min_why') + ' ' + this.min;
    return this.lang.t('date_max_why') + ' ' + this.max;
  }

  todayBlocked = () => this.outOfRange(this.todayIso);

  /**
   * Six weeks, always. A month that needs five rows and one that needs six
   * would otherwise change the panel's height as you page through it, and the
   * footer would walk up and down under the pointer.
   */
  cells = computed(() => {
    const { y, m } = this.view();
    const first = new Date(y, m, 1);
    // Sunday-first: the working week here runs الأحد → الخميس.
    const lead = first.getDay();
    const out: { iso: string; day: number; inMonth: boolean; blocked: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(y, m, 1 - lead + i);
      const iso = DateComponent.iso(d.getFullYear(), d.getMonth(), d.getDate());
      out.push({ iso, day: d.getDate(), inMonth: d.getMonth() === m, blocked: this.outOfRange(iso) });
    }
    return out;
  });

  toggle() {
    if (this.disabled) return;
    if (this.open()) return this.close();
    const start = this.value || this.todayIso;
    this.view.set(DateComponent.partsOf(start));
    this.cursor.set(start);
    this.open.set(true);
    // FOCUS HAS TO ENTER THE GRID, or the arrows keep arriving at the trigger —
    // whose ArrowDown is «open» — and the panel re-toggles instead of moving the
    // cursor. Measured: open by keyboard, press ArrowDown, and the day under the
    // cursor vanished while Enter committed nothing.
    this.focusCursor();
  }

  /**
   * The cell does not exist in this tick — the popover renders it on the next
   * change detection — and for a moment after that it is still
   * `visibility: hidden`, which `<epm-popover>` clears only once it has measured
   * where to sit. **A hidden element cannot take focus**, so a single timeout
   * lands too early and silently does nothing: the arrows then keep arriving at
   * the trigger, whose ArrowDown means «open», and the panel re-toggles instead
   * of moving the cursor. Measured — open by keyboard, press ArrowDown, and the
   * cursor vanished while Enter committed nothing.
   *
   * So it retries briefly rather than guessing one delay, and stops as soon as
   * the focus takes. Deliberately not `requestAnimationFrame`: that never fires
   * in a tab which is not compositing, and a control unreachable by keyboard
   * there is exactly the §7 failure nobody notices.
   */
  private focusCursor(tries = 12) {
    setTimeout(() => {
      const el = document.querySelector('.epm-cal-d.act') as HTMLElement | null;
      el?.focus();
      if (document.activeElement !== el && tries > 0) this.focusCursor(tries - 1);
    }, 16);
  }

  close() {
    this.open.set(false);
    this.trigger.nativeElement.focus();
  }

  shiftMonth(by: number) {
    const { y, m } = this.view();
    const d = new Date(y, m + by, 1);
    this.view.set({ y: d.getFullYear(), m: d.getMonth() });
  }

  pick(iso: string) {
    if (iso && this.outOfRange(iso)) return;
    this.value = iso;
    this.changed.emit(iso);
    this.close();
  }

  onTriggerKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.toggle();
    }
  }

  /**
   * Arrows walk days, PageUp/PageDown walk months, Home/End the week. The grid
   * follows the cursor across a month boundary, so paging never needs the mouse
   * — §7 asks for a keyboard path through every control, and a calendar that
   * can only be clicked is the one place that is easiest to forget.
   */
  onGridKey(e: KeyboardEvent) {
    const step = (days: number) => {
      const { y, m } = DateComponent.partsOf(this.cursor());
      const day = Number(this.cursor().slice(8, 10));
      const d = new Date(y, m, day + days);
      const iso = DateComponent.iso(d.getFullYear(), d.getMonth(), d.getDate());
      this.cursor.set(iso);
      this.view.set({ y: d.getFullYear(), m: d.getMonth() });
      e.preventDefault();
      this.focusCursor();
    };

    switch (e.key) {
      // RTL: «left» on screen is the NEXT day, so the arrows follow the grid
      // rather than the number line.
      case 'ArrowLeft':  return step(this.lang.isAr() ? 1 : -1);
      case 'ArrowRight': return step(this.lang.isAr() ? -1 : 1);
      case 'ArrowUp':    return step(-7);
      case 'ArrowDown':  return step(7);
      case 'PageUp':     return step(-28);
      case 'PageDown':   return step(28);
      case 'Enter':
      case ' ':
        e.preventDefault();
        return this.pick(this.cursor());
      case 'Escape':
        e.preventDefault();
        return this.close();
    }
  }
}
