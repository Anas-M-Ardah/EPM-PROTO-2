import {
  Component, ElementRef, HostListener, Input, ViewEncapsulation, computed, inject, signal,
} from '@angular/core';
import { IconComponent } from '../core/icon.component';
import { SelectComponent, SelectOption } from './select.component';
import { LangService } from '../core/lang';
import { PersonaService } from '../core/persona';

/**
 * `<epm-persona-switcher />` — «العرض بصفة».
 *
 * ── IT BELONGS TO TWO SCREENS, NOT TO THE APP ─────────────────────────────
 * The appendix names «مبدّل «العرض بصفة»» exactly three times and every one is a
 * change-order screen: الشكل 29's filter bar, الشكل 30's header, and الشكل 37
 * describing the register BEHIND the wizard. `03 §7` says why — the switcher
 * exists to review the change-order permission model, which is the one place
 * in this system where the same record shows a different face to a different
 * capacity (BR-14).
 *
 * It used to live in the shell's account menu, where it read as a global
 * identity control. It is not one: it is a **filter on a screen**, and the
 * plates draw it beside the other filters (P-126).
 *
 * ── ONE USER, MANY CAPACITIES ─────────────────────────────────────────────
 * Every row carries the same person's name and differs only in صفة and party,
 * so the button shows the ROLE and the list leads with it. «العرض بصفة» means
 * *viewing as*; the name never changes.
 *
 * ── WHAT IT ACTUALLY CHANGES ──────────────────────────────────────────────
 * `X-Epm-User` on every subsequent request. The viewer relation, the action
 * gates and BR-15's workspace scope are all resolved SERVER-side from it — this
 * control sends a header and re-reads, and decides nothing itself.
 */
@Component({
  selector: 'epm-persona-switcher',
  standalone: true,
  imports: [IconComponent, SelectComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
    <!-- INLINE — for a host that is already a menu (the account card), where a
         chip of our own would be a second trigger inside an open popover. -->
    @if (inline) {
      <!-- ONE ROW, NOT TEN. Ten capacities listed flat turned the account card
           into a wall and pushed المظهر · اللغة · الخروج out of the box. This is
           epm-select, the app's one dropdown, so the menu shows the capacity in
           effect and opens the list only when asked. -->
      <div class="epm-persona-pick">
        <epm-select [options]="personaOptions()"
                    [value]="persona.currentId()"
                    [label]="lang.t('persona')"
                    (changed)="choose($event)" />
      </div>
      <div class="epm-persona-note">{{ lang.t('persona_note') }}</div>
    } @else {
      <div class="epm-persona-switch" [class.on]="open()">
        <button type="button" class="d-fchip" [class.on]="open()"
                [attr.aria-expanded]="open()" aria-haspopup="listbox"
                (click)="open.set(!open())">
          <epm-icon name="badge" [size]="13" />
          <span class="lbl">{{ lang.t('persona') }}</span>
          <b>{{ roleName() }}</b>
          <epm-icon [name]="open() ? 'expand_less' : 'expand_more'" [size]="14" />
        </button>

        @if (open()) {
          <div class="d-pop epm-persona-pop" role="listbox">
            <div class="d-pop-lbl">{{ lang.t('persona') }}</div>

            @for (p of persona.all(); track p.id) {
              <button type="button" class="d-pop-row" role="option"
                      [class.on]="persona.currentId() === p.id"
                      [attr.aria-selected]="persona.currentId() === p.id"
                      (click)="choose(p.id)">
                <span class="d-pop-row-tx">
                  <b>{{ lang.pick(p.roleAr, p.roleEn) }}</b>
                  <span>{{ p.party }}</span>
                </span>
                @if (persona.currentId() === p.id) { <epm-icon name="check" [size]="18" /> }
              </button>
            }

            <!-- What switching does, said once. A reader who does not know that
                 the relation is resolved server-side reads this control as a
                 view filter over rows it has already been sent. -->
            <div class="epm-persona-note">{{ lang.t('persona_note') }}</div>
          </div>
        }
      </div>
    }
  `,
})
export class PersonaSwitcherComponent {
  private host = inject(ElementRef<HTMLElement>);
  lang = inject(LangService);
  persona = inject(PersonaService);

  /**
   * Render as a plain `<epm-select>` rather than a chip of our own — for the
   * account card, which is already an open menu.
   *
   * P-126 moved this control out of that menu because sitting beside the
   * workspace crumb it read as «who am I», and it is not that: there is one
   * user and every row is a صفة they act in. The reading was the problem, not
   * the location — so the menu keeps the «العرض بصفة» heading and shows the
   * ROLE, never a second name, and the plate-mandated chips on الشكل 29 · 30
   * stay exactly where the appendix draws them (P-233).
   */
  @Input() inline = false;

  open = signal(false);

  constructor() {
    // The shell loads the list too, but this control has to work whatever
    // mounted first — on a deep link straight to a change-order record the
    // switcher can paint before the shell's own load has answered, and it then
    // shows an em dash where the capacity should be. `load()` is idempotent
    // and the list is nine rows.
    if (this.persona.all().length === 0) this.persona.load();
  }

  roleName = computed(() => {
    const p = this.persona.current();
    return p ? this.lang.pick(p.roleAr, p.roleEn) : '—';
  });

  /**
   * The capacities as `<epm-select>` wants them — the ROLE alone.
   *
   * A first pass appended the party, on the reasoning that it is what decides
   * which desk a release belongs to. Measured in the account card, which is
   * 320px wide: «المستخدم المختص في الجامعة · الجامعة / التشكيل» truncated in the
   * trigger AND in the list, so the party cost legibility and bought nothing —
   * the roles are already distinct from one another. The party still shows
   * under the role in the chip's own list, where there is room for two lines.
   */
  personaOptions = computed<SelectOption[]>(() => this.persona.all().map(p => ({
    code: p.id,
    label: this.lang.pick(p.roleAr, p.roleEn),
  })));

  choose(id: string) {
    this.persona.select(id);
    this.open.set(false);
    // A full reload is the honest way to re-read EVERY request under the new
    // capacity: the relation, the gates and the workspace scope are all
    // server-resolved, and patching one page's signal would leave the rest of
    // the app answering as the previous صفة.
    location.reload();
  }

  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent) {
    if (this.open() && !this.host.nativeElement.contains(e.target as Node)) this.open.set(false);
  }

  @HostListener('document:keydown.escape')
  onEsc() { this.open.set(false); }
}
