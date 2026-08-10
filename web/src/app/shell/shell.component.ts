import { Component, HostListener, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { IconComponent } from '../core/icon.component';
import { LangService, StrKey } from '../core/lang';
import { PersonaService } from '../core/persona';
import { ThemeService } from '../core/theme';
import { WorkspacesService } from '../core/workspaces';
import { ToastService } from '../shared/toast.service';
import { ToastComponent } from '../shared/toast.component';
import { PopoverComponent } from '../shared/popover.component';
import { CommandPaletteComponent, CommandAction } from '../shared/command-palette.component';
import { AppFooterComponent } from './app-footer.component';

interface NavItem {
  path: string;
  icon: string;
  key: StrKey;
  /** Renders the `.d-nav-count` badge when it resolves to a number. */
  count?: () => number | null;
}

/**
 * The desktop shell (04 §1). Ported from v1.1 DSidebar / DTopbar / DAppFooter —
 * ../epm@design/system-revamp app/desktop-shell.jsx:155, :448, :716.
 *
 * ── NAV IS APPEND-ONLY ────────────────────────────────────────────────────
 * `nav` lists only pages that EXIST. When you build a page, add its entry here
 * and its route in app.routes.ts. A nav item leading to a blank pane is worse
 * than a missing one — an empty state must say what to do (04 §9), and a dead
 * link says nothing. The command palette is built from this same list, so it
 * inherits the guarantee.
 *
 * ── SCOPE LIVES IN THE URL ────────────────────────────────────────────────
 * The workspace switcher navigates with `?ws=<code>`; every page already reads
 * it and every endpoint already accepts `?workspace=`. Nothing here holds the
 * scope, so a scoped view is a shareable link and survives a reload.
 *
 * ── RTL ───────────────────────────────────────────────────────────────────
 * `.d-app` is a CSS grid and the sheet uses logical properties (05 §5.1), so
 * the nav moves to the inline end in Arabic without a transform.
 */
@Component({
  selector: 'epm-shell',
  standalone: true,
  imports: [
    RouterOutlet, RouterLink, RouterLinkActive, IconComponent,
    ToastComponent, PopoverComponent, CommandPaletteComponent, AppFooterComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  lang = inject(LangService);
  persona = inject(PersonaService);
  theme = inject(ThemeService);
  workspaces = inject(WorkspacesService);
  toast = inject(ToastService);
  private router = inject(Router);

  /** Persisted so a collapsed sidebar stays collapsed across a reload. */
  collapsed = signal(localStorage.getItem('epm_side') === 'collapsed');

  /** The open overlay, if any. One at a time by construction. */
  switcherAnchor = signal<HTMLElement | null>(null);
  accountAnchor = signal<HTMLElement | null>(null);
  paletteOpen = signal(false);

  /** `?ws=` off the current URL — the single source of truth for scope. */
  wsCode = signal<string>(read(this.router.url));

  readonly nav: { group: StrKey; items: NavItem[] }[] = [
    {
      // Order follows the reference enterprise nav (desktop-shell.jsx:162):
      // dashboard → spaces → projects → contracts → schedule → alerts →
      // reports. Reports is not built yet; the gap is not filled with a dead link.
      group: 'nav_group_ops',
      items: [
        { path: '/portfolio', icon: 'dashboard', key: 'nav_portfolio' },
        // The reference badges this one with the workspace count and nothing else.
        { path: '/entities', icon: 'apartment', key: 'nav_entities', count: () => this.workspaces.count() || null },
        { path: '/projects', icon: 'projects', key: 'nav_projects' },
        { path: '/contracts', icon: 'description', key: 'nav_contracts_all' },
        { path: '/schedule-control', icon: 'calendar_month', key: 'nav_schedule' },
        { path: '/alerts', icon: 'notifications', key: 'nav_alerts' },
      ],
    },
  ];

  /** The workspace in scope, or undefined for the ministry-wide view. */
  currentWs = computed(() => this.workspaces.byCode(this.wsCode()));

  scopeTitle = computed(() => {
    const ws = this.currentWs();
    return ws ? this.lang.pick(ws.nameAr, ws.nameEn) : this.lang.t('all_workspaces');
  });

  scopeSub = computed(() => {
    const ws = this.currentWs();
    if (!ws) return this.lang.t('enterprise_ctx');
    return this.lang.t(('ws_kind_' + ws.kind) as StrKey);
  });

  /** Two initials, from whichever language is showing. */
  initials = computed(() => {
    const p = this.persona.current();
    if (!p) return '—';
    return this.lang.pick(p.nameAr, p.nameEn)
      .replace(/^[أا]\.\s*|^م\.\s*|^د\.\s*|^(Dr|Eng)\.\s*/i, '')
      .split(/\s+/).slice(0, 2).map(w => w[0]).join('');
  });

  personaName = computed(() => {
    const p = this.persona.current();
    return p ? this.lang.pick(p.nameAr, p.nameEn) : '';
  });

  personaRole = computed(() => {
    const p = this.persona.current();
    return p ? this.lang.pick(p.roleAr, p.roleEn) : '';
  });

  collapseLabel = computed(() =>
    this.collapsed()
      ? (this.lang.isAr() ? 'توسيع القائمة' : 'Expand sidebar')
      : (this.lang.isAr() ? 'طي القائمة' : 'Collapse sidebar'));

  /**
   * Everything ⌘K can do. Built from `nav` and the loaded workspaces, so it
   * can only ever offer a destination that exists.
   */
  actions = computed<CommandAction[]>(() => {
    const goto = this.lang.isAr() ? 'تنقّل' : 'Navigate';
    const scope = this.lang.isAr() ? 'مساحة العمل' : 'Workspace';
    const app = this.lang.isAr() ? 'التطبيق' : 'Application';

    const pages: CommandAction[] = this.nav.flatMap(g => g.items).map(it => ({
      id: 'nav' + it.path,
      group: goto,
      icon: it.icon,
      label: this.lang.t(it.key),
      meta: it.path,
      run: () => this.go(it.path),
    }));

    const scopes: CommandAction[] = [
      {
        id: 'ws-all',
        group: scope,
        icon: 'apartment',
        label: this.lang.t('all_workspaces'),
        sub: this.lang.t('enterprise_ctx'),
        run: () => this.setWorkspace(null),
      },
      ...this.workspaces.list().map(w => ({
        id: 'ws-' + w.code,
        group: scope,
        icon: 'apartment',
        label: this.lang.pick(w.nameAr, w.nameEn),
        meta: w.code,
        run: () => this.setWorkspace(w.code),
      })),
    ];

    const prefs: CommandAction[] = [
      {
        id: 'theme',
        group: app,
        icon: this.theme.isDark() ? 'light_mode' : 'dark_mode',
        label: this.lang.isAr() ? 'المظهر' : 'Appearance',
        sub: this.theme.isDark()
          ? (this.lang.isAr() ? 'داكن' : 'Dark')
          : (this.lang.isAr() ? 'فاتح' : 'Light'),
        run: () => this.theme.toggle(),
      },
      {
        id: 'lang',
        group: app,
        icon: 'translate',
        label: this.lang.t('language'),
        run: () => this.lang.toggle(),
      },
    ];

    return [...pages, ...scopes, ...prefs];
  });

  constructor() {
    this.persona.load();
    this.workspaces.ensureLoaded().subscribe();

    // Keep `?ws=` in sync on every navigation, including back/forward.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => this.wsCode.set(read(e.urlAfterRedirects)));
  }

  /** ⌘K / Ctrl-K anywhere. */
  @HostListener('document:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      this.closeOverlays();
      this.paletteOpen.set(true);
    }
  }

  toggleSide() {
    this.collapsed.update(v => !v);
    localStorage.setItem('epm_side', this.collapsed() ? 'collapsed' : 'expanded');
  }

  openSwitcher(el: HTMLElement) { this.closeOverlays(); this.switcherAnchor.set(el); }
  openAccount(el: HTMLElement) { this.closeOverlays(); this.accountAnchor.set(el); }

  closeOverlays() {
    this.switcherAnchor.set(null);
    this.accountAnchor.set(null);
    this.paletteOpen.set(false);
  }

  /**
   * Re-scope. Stays on the current page and changes only `?ws=`, so switching
   * workspace from the Contracts screen leaves you on Contracts — the reference
   * behaviour, and the one that does not lose your place.
   */
  setWorkspace(code: string | null) {
    this.closeOverlays();
    this.router.navigate([], {
      queryParams: { ws: code || null },
      queryParamsHandling: 'merge',
    });
  }

  private go(path: string) {
    const ws = this.wsCode();
    this.router.navigate([path], { queryParams: ws ? { ws } : {} });
  }

  onPersona(id: string) {
    this.closeOverlays();
    this.persona.select(id);
    // Every request carries X-Epm-User, so a persona change means the current
    // page's data may now differ. Reload rather than invalidating per-feature
    // caches — this is a prototype and correctness beats subtlety.
    location.reload();
  }

}

/** `?ws=` out of a URL, without needing an ActivatedRoute snapshot. */
function read(url: string): string {
  const q = url.indexOf('?');
  if (q < 0) return '';
  return new URLSearchParams(url.slice(q + 1)).get('ws') ?? '';
}
