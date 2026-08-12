import { Component, inject } from '@angular/core';
import { LangService } from '../core/lang';
import { PersonaService } from '../core/persona';

/**
 * «العرض بصفة» — the capacity switcher. ONE control, in the SHELL.
 *
 * ── IT BELONGS TO THE PARENT ──────────────────────────────────────────────
 * Capacity is global state: it rides on every request as X-Epm-User and the
 * server answers everything in terms of it. So it sits in the topbar beside the
 * workspace crumb, which is the other global scope control, and every page
 * simply REACTS to it. An earlier pass put a copy of this on each page that
 * cared; that duplicated a global control into its children and scattered the
 * policy of which capacities to offer across them. A screen does not own who
 * you are.
 *
 * ── WHAT A PAGE DOES INSTEAD ──────────────────────────────────────────────
 * Reads `persona` and re-gates itself, or re-fetches. The server decides per
 * capacity, so rows fetched for one are stale for the next — see the effect in
 * projects.page.ts, which is the same one change-orders.page.ts already used
 * for BR-14.
 *
 * ── EVERY CAPACITY, BECAUSE THE SHELL IS GLOBAL ───────────────────────────
 * A per-view control could hide capacities that behave identically on that
 * view. This one cannot: it is on every screen at once, and a capacity that
 * changes nothing here changes something one click away. Filtering by the
 * current route would make the list flicker as you navigate, which is worse
 * than a list that is simply always the same eight.
 *
 * There is ONE user (Personas.MasterNameAr). These are capacities that person
 * acts in, so options are labelled with the ROLE and never with a name.
 */
@Component({
  selector: 'epm-role-switch',
  standalone: true,
  template: `
    <label class="epm-roleswitch">
      <span class="lbl">{{ lang.t('persona') }}</span>
      <select class="epm-role-select"
              [attr.aria-label]="lang.t('persona')"
              (change)="pick($any($event.target).value)">
        <!--
          The selection is carried on each OPTION, never on the select's own
          [value] — P-39, measured: options rendered by @for land after the
          select's bindings are applied, so [value] binds against an empty list
          and the control silently contradicts the screen.
        -->
        @for (r of persona.all(); track r.id) {
          <option [value]="r.id" [selected]="persona.currentId() === r.id">
            {{ lang.pick(r.roleAr, r.roleEn) }}
          </option>
        }
      </select>
    </label>
  `,
})
export class RoleSwitchComponent {
  lang = inject(LangService);
  persona = inject(PersonaService);

  pick(id: string) {
    if (id && id !== this.persona.currentId()) this.persona.select(id);
  }
}
