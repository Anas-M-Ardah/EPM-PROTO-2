import { Component, inject, ViewEncapsulation } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { IconComponent } from '../core/icon.component';
import { LangService } from '../core/lang';
import { PersonaService } from '../core/persona';

/**
 * The desktop shell (04 §1): charcoal command bar + module nav + content sheet.
 *
 * ── NAV IS APPEND-ONLY ────────────────────────────────────────────────────
 * `nav` below lists only the pages that EXIST. When you build a page, add its
 * entry here and its route in app.routes.ts. Do not add a nav item that leads
 * to a blank pane — an empty state must say what to do (04 §9), and a dead
 * link says nothing.
 *
 * Module nav sits inline-start in LTR and inline-end in RTL automatically:
 * .d-app is a CSS grid and the stylesheet uses logical properties (05 §5.1).
 */
@Component({
  selector: 'epm-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, IconComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  lang = inject(LangService);
  persona = inject(PersonaService);

  /** Group label is --on-surface-variant, never --outline (04 §1). */
  readonly nav = [
    {
      group: 'nav_group_ops' as const,
      items: [
        // Order follows the reference enterprise nav (desktop-shell.jsx:162):
        // dashboard → spaces → projects → contracts → schedule → alerts →
        // reports. Reports is not built yet — the ORDER is preserved, the gap
        // is not filled with a dead link.
        { path: '/portfolio', icon: 'dashboard', key: 'nav_portfolio' as const },
        { path: '/entities', icon: 'apartment', key: 'nav_entities' as const },
        { path: '/projects', icon: 'projects', key: 'nav_projects' as const },
        // `description` is the icon the reference shell uses for this item
        // (desktop-shell.jsx:166) — not an invented one.
        { path: '/contracts', icon: 'description', key: 'nav_contracts_all' as const },
        { path: '/schedule-control', icon: 'calendar_month', key: 'nav_schedule' as const },
        { path: '/alerts', icon: 'notifications', key: 'nav_alerts' as const },
      ],
    },
  ];

  constructor() {
    this.persona.load();
  }

  onPersona(id: string) {
    this.persona.select(id);
    // Every request carries X-Epm-User, so a persona change means the current
    // page's data may now differ. Reload rather than trying to invalidate
    // per-feature caches — this is a prototype and correctness beats subtlety.
    location.reload();
  }
}
