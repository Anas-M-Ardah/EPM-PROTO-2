import {
  Component, ElementRef, HostListener, ViewEncapsulation, computed, inject, signal,
} from '@angular/core';
import { IconComponent } from '../core/icon.component';
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
  imports: [IconComponent],
  encapsulation: ViewEncapsulation.None,
  template: `
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
  `,
})
export class PersonaSwitcherComponent {
  private host = inject(ElementRef<HTMLElement>);
  lang = inject(LangService);
  persona = inject(PersonaService);

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
