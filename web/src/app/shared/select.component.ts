import {
  Component, ElementRef, EventEmitter, Input, Output, ViewChild,
  ViewEncapsulation, booleanAttribute, signal,
} from '@angular/core';
import { IconComponent } from '../core/icon.component';
import { PopoverComponent } from './popover.component';

export interface SelectOption {
  code: string;
  label: string;
  /**
   * OFFERED AND REFUSED. An option the data cannot support stays in the list,
   * greyed and unpickable, carrying <see cref="why"/> as its title — CLAUDE.md
   * §6 asks that a cap be explained rather than the control be hidden, and a
   * vocabulary that shrinks with the data leaves a reader unable to tell what
   * the system can do from what this record happens to allow.
   *
   * SCR-W6's «مرجع المقارنة» is the first caller: a project logged twice has
   * no last quarter (P-198).
   */
  disabled?: boolean;
  /** The reason, shown on the row and as its tooltip. */
  why?: string;
}

/**
 * <epm-select [options]="opts" [value]="code" [placeholder]="…" (changed)="…" />
 *
 * THE APP'S ONE DROPDOWN. A native `<select>` renders its list with the
 * OPERATING SYSTEM: our font, our spacing, our RTL and our dark theme all stop
 * at the popup's edge, and on Windows it arrives as a grey system list in the
 * middle of an Arabic form. Everything above the popup was already themed,
 * which is what made the mismatch obvious.
 *
 * So the list is ours: a trigger that looks exactly like `.d-form-input`, and
 * `<epm-popover>` — the component the topbar switcher and the account menu
 * already use — holding `.d-pop-row` options. Both were in the stylesheet; the
 * only new CSS is the trigger's own row and the check mark.
 *
 * ── IT IS A CONTROL, NOT A MENU ───────────────────────────────────────────
 * `combobox` + `listbox` + `option`, `aria-activedescendant` on the trigger,
 * and the roving index moves with ↑/↓ without committing — Enter commits, Esc
 * abandons. A menu that changed the value as you arrowed past it would make
 * keyboard browsing a series of edits.
 *
 * ── TYPE-AHEAD, NOT A SEARCH BOX ──────────────────────────────────────────
 * The longest list here is twelve (execution stages), so typing a letter jumps
 * to the next match the way a native select does. A filter field would be more
 * chrome than the list it filters.
 *
 * ── REUSABLE BY EVERY MODULE ──────────────────────────────────────────────
 * It knows nothing about projects: options in, code out. الشكل 5's six lookups,
 * the contract card's, and any register filter can all take it.
 */
@Component({
  selector: 'epm-select',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent, PopoverComponent],
  template: `
    <button #trigger type="button"
            class="epm-select"
            [class.d-form-input]="!bare"
            [class.bare]="bare"
            [class.epm-invalid]="invalid"
            [class.on]="open()"
            [disabled]="disabled"
            role="combobox"
            [attr.aria-expanded]="open()"
            [attr.aria-haspopup]="'listbox'"
            [attr.aria-label]="label || null"
            [attr.aria-activedescendant]="open() ? id + '-o' + active() : null"
            (click)="toggle()"
            (keydown)="onKey($event)">
      <span class="epm-select-v" [class.ph]="!selected()">
        {{ selected()?.label ?? placeholder }}
      </span>
      <epm-icon name="expand_more" [size]="16" class="epm-select-chev" />
    </button>

    @if (open()) {
      <epm-popover [anchor]="trigger"
                   [width]="width()"
                   [label]="label"
                   (closed)="close()">
        <div class="epm-select-list" role="listbox" [attr.aria-label]="label || null">
          @if (placeholder && allowEmpty) {
            <button type="button" class="d-pop-row epm-select-opt"
                    role="option"
                    [attr.aria-selected]="!value"
                    [class.on]="!value"
                    [class.act]="active() === -1"
                    [attr.id]="id + '-o-1'"
                    (click)="pick('')">
              <span class="epm-select-opt-l ph">{{ placeholder }}</span>
              @if (!value) { <epm-icon name="check" [size]="14" class="epm-select-tick" /> }
            </button>
          }
          @for (o of options; track o.code; let i = $index) {
            <button type="button" class="d-pop-row epm-select-opt"
                    role="option"
                    [attr.aria-selected]="o.code === value"
                    [attr.aria-disabled]="o.disabled ? 'true' : null"
                    [disabled]="!!o.disabled"
                    [attr.title]="o.why || null"
                    [class.on]="o.code === value"
                    [class.act]="active() === i"
                    [class.off]="o.disabled"
                    [attr.id]="id + '-o' + i"
                    (click)="pick(o.code)">
              <!-- LABEL FIRST. The tick is trailing so every option's text
                   starts at the same inline inset as the trigger's value —
                   opening the list must not make the current value appear to
                   jump sideways. -->
              <span class="epm-select-opt-l">{{ o.label }}</span>
              <!-- BEFORE the reason, so it stays on the label's line when the
                   row wraps rather than dropping to a line of its own. -->
              @if (o.code === value) { <epm-icon name="check" [size]="14" class="epm-select-tick" /> }
              <!-- The reason travels WITH the row. A disabled option whose
                   explanation is only a tooltip is a dead end on a touch
                   screen and silent to a reader. -->
              @if (o.disabled && o.why) { <span class="epm-select-opt-why">{{ o.why }}</span> }
            </button>
          }
        </div>
      </epm-popover>
    }
  `,
})
export class SelectComponent {
  @Input() options: SelectOption[] = [];
  /** The selected CODE, or '' for none. */
  @Input() value: string | null = '';
  @Input() placeholder = '';
  @Input() label = '';
  @Input() invalid = false;
  @Input() disabled = false;
  /** Offers the placeholder as a real option — how a value is cleared. */
  @Input() allowEmpty = true;

  /**
   * Drops the trigger's own border, height and plane so it can sit INSIDE a
   * control that already has them — `.d-ctxsel`, the toolbar pill SCR-W5 uses
   * for its four Z6 dropdowns, where a `.d-form-input` would be a box in a box
   * (§6: «sections are label + space, never nested boxes»). The POPUP is
   * unchanged; this is the trigger only, which is the whole reason to reach for
   * it here — the list stops being the operating system's. See P-197.
   */
  @Input({ transform: booleanAttribute }) bare = false;

  @Output() changed = new EventEmitter<string>();

  @ViewChild('trigger', { static: true }) trigger!: ElementRef<HTMLButtonElement>;

  open = signal(false);
  /** Roving focus while open. -1 is the placeholder row. */
  active = signal(0);

  /** Unique per instance, so `aria-activedescendant` points at THIS list. */
  readonly id = 'sel' + Math.random().toString(36).slice(2, 8);

  /**
   * A GETTER, not a `computed()`. `value` and `options` are plain `@Input`s, and
   * a computed can only track signals — it would memoise the first selection and
   * then never change, so picking a new option left the old label on the trigger
   * while the form underneath had already moved. Measured.
   */
  selected(): SelectOption | undefined {
    return this.options.find(o => o.code === this.value);
  }

  /** The panel matches the control, so the list never looks detached from it. */
  width = () => Math.max(200, Math.round(this.trigger.nativeElement.getBoundingClientRect().width));

  private typed = '';
  private typedAt = 0;

  toggle() {
    if (this.disabled) return;
    if (this.open()) return this.close();
    this.active.set(this.options.findIndex(o => o.code === this.value));
    this.open.set(true);
  }

  close() {
    this.open.set(false);
    // Focus goes back where it came from — a closed popover must not strand
    // the tab order at the end of the document.
    this.trigger.nativeElement.focus();
  }

  pick(code: string) {
    // Checked here as well as through the `disabled` attribute: the keyboard
    // path reaches `pick` directly, and a rule enforced only by the DOM is not
    // enforced (the same reasoning EP-PRG-02 uses about its own range check).
    if (this.options.find(o => o.code === code)?.disabled) return;
    this.open.set(false);
    this.trigger.nativeElement.focus();
    if (code !== (this.value ?? '')) this.changed.emit(code);
  }

  onKey(e: KeyboardEvent) {
    const lo = this.allowEmpty && this.placeholder ? -1 : 0;
    const hi = this.options.length - 1;

    if (!this.open()) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.toggle();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown': e.preventDefault(); this.active.set(Math.min(hi, this.active() + 1)); break;
      case 'ArrowUp': e.preventDefault(); this.active.set(Math.max(lo, this.active() - 1)); break;
      case 'Home': e.preventDefault(); this.active.set(lo); break;
      case 'End': e.preventDefault(); this.active.set(hi); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this.pick(this.active() < 0 ? '' : (this.options[this.active()]?.code ?? ''));
        break;
      case 'Tab':
        // Tabbing away abandons, like a native select losing focus.
        this.open.set(false);
        break;
      default:
        if (e.key.length === 1) this.typeAhead(e.key);
    }
  }

  /** Native-select behaviour: letters within a second accumulate into a prefix. */
  private typeAhead(ch: string) {
    const now = Date.now();
    this.typed = now - this.typedAt > 1000 ? ch : this.typed + ch;
    this.typedAt = now;
    const i = this.options.findIndex(o => o.label.toLowerCase().startsWith(this.typed.toLowerCase()));
    if (i >= 0) this.active.set(i);
  }
}
