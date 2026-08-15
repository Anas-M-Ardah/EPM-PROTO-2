import { Component, HostListener, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { IconComponent } from '../core/icon.component';
import { LangService, StrKey } from '../core/lang';
import { LookupsService } from '../core/lookups';
import { PersonaService } from '../core/persona';
import { ThemeService } from '../core/theme';
import { AuthService } from '../core/auth';
import { WorkspacesService } from '../core/workspaces';
import { ProjectScopeService } from '../core/project-scope';
import { StatusPillComponent } from '../shared/status-pill.component';
import { ToastService } from '../shared/toast.service';
import { ToastComponent } from '../shared/toast.component';
import { PopoverComponent } from '../shared/popover.component';
import { CommandPaletteComponent, CommandAction } from '../shared/command-palette.component';
import { RoleSwitchComponent } from '../shared/role-switch.component';
import { AppFooterComponent } from './app-footer.component';

interface NavItem {
  path: string;
  icon: string;
  key: StrKey;
  /** Renders the `.d-nav-count` badge when it resolves to a number. */
  count?: () => number | null;
}

/** `?ws=` out of a URL, without needing an ActivatedRoute snapshot. */
function read(url: string): string {
  const q = url.indexOf('?');
  if (q < 0) return '';
  return new URLSearchParams(url.slice(q + 1)).get('ws') ?? '';
}

/**
 * The project id out of `/projects/:id[/:module]`, or '' anywhere else.
 * `/projects` alone is the enterprise register and has no project in scope.
 */
function readProject(url: string): string {
  const path = url.split('?')[0];
  const m = /^\/projects\/([^/]+)/.exec(path);
  if (!m) return '';

  // `/projects/...` is not automatically the project WORKSPACE. `/projects/new`
  // is the المسار 1 CREATE form and is an ordinary enterprise page: it belongs
  // inside `.d-canvas`, which is the only scrolling container in the frame, and
  // it has no project to put in the topbar picker.
  //
  // Measured before this guard existed: the six-section form was CLIPPED at the
  // fold with no way to reach الجهة or الاستشاري, and the picker offered a
  // project called "new".
  //
  // EDITING an existing project is the opposite case and no longer excluded:
  // الشكل 5 puts it at «مساحة المشروع › معلومات المشروع › تعديل», so
  // `/projects/:id/information/edit` IS the workspace and keeps the rail, the
  // identity bar and the picker.
  const id = decodeURIComponent(m[1]);
  if (id === 'new') return '';

  return id;
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
    RouterOutlet, RouterLink, RouterLinkActive, IconComponent, StatusPillComponent,
    ToastComponent, PopoverComponent, CommandPaletteComponent, AppFooterComponent,
    RoleSwitchComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './shell.component.html',
})
export class ShellComponent {
  lang = inject(LangService);
  lookups = inject(LookupsService);
  persona = inject(PersonaService);
  theme = inject(ThemeService);
  private auth = inject(AuthService);
  workspaces = inject(WorkspacesService);
  projects = inject(ProjectScopeService);
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

  /**
   * The open project's id, off `/projects/:id`, or '' outside the workspace.
   * Same principle as `wsCode`: the URL is the state, the chrome reacts.
   */
  projectId = signal<string>(readProject(this.router.url));

  /**
   * True on a route that renders its own full-height layout. The workspace is
   * `.d-detail-layout` — a rail beside a scrolling pane — and cannot live
   * inside `.d-canvas`, which pads and centres its content. The reference
   * makes the same split: DWorkspace returns `.d-main > .d-three` with no
   * canvas at all, while every enterprise screen returns `.d-canvas`.
   */
  bare = signal(false);

  /** The project picker menu in the topbar (v1.1 `.d-projpick`). */
  pickerOpen = signal(false);
  pickerQuery = signal('');

  /** The switcher's own search box (v1.1 DWorkspacePop, desktop-shell.jsx:411). */
  switcherQuery = signal('');

  /** Workspaces the switcher offers, filtered by its search box. */
  switcherRows = computed(() => {
    const q = this.switcherQuery().trim().toLowerCase();
    return this.workspaces.list().filter(w => !q
      || w.code.toLowerCase().includes(q)
      || w.nameAr.toLowerCase().includes(q)
      || w.nameEn.toLowerCase().includes(q));
  });

  /**
   * ── THE NAV IS SCOPE-DEPENDENT (ملحق الشكلان 48، 49) ────────────────────
   * The reference keeps two lists, `entNav` and `wsNav` (desktop-shell.jsx:162
   * and :172), and swaps them when you enter a workspace. The addendum shows
   * the same thing: figures 48 and 49 render a university-level rail —
   * «نظرة عامة · المشاريع ٥ · العقود · ضبط الجداول الزمنية · مركز التنبيهات ·
   * التقارير» — with no «مساحات العمل» entry, because you are inside one.
   *
   * Two differences from the ministry list are load-bearing, not cosmetic:
   *   1. the first item is the WORKSPACE overview, not the ministry portfolio;
   *   2. «مساحات العمل» disappears and المشاريع carries the entity's own count.
   * Together they are how the rail answers "where am I" without a banner.
   */
  private readonly enterpriseNav: NavItem[] = [
    { path: '/portfolio', icon: 'dashboard', key: 'nav_home' },
    // The reference badges this one with the workspace count and nothing else.
    // It is now the count of workspaces ASSIGNED to the viewer (BR-15).
    { path: '/entities', icon: 'apartment', key: 'nav_entities', count: () => this.workspaces.count() || null },
    { path: '/projects', icon: 'projects', key: 'nav_projects_all' },
    { path: '/contracts', icon: 'description', key: 'nav_contracts_all' },
    { path: '/schedule-control', icon: 'calendar_month', key: 'nav_schedule' },
    { path: '/alerts', icon: 'notifications', key: 'nav_alerts' },
    { path: '/reports', icon: 'insights', key: 'nav_reports' },
  ];

  private readonly workspaceNav: NavItem[] = [
    { path: '/workspace', icon: 'dashboard', key: 'ws_overview' },
    { path: '/projects', icon: 'projects', key: 'nav_projects', count: () => this.currentWs()?.projectCount ?? null },
    { path: '/contracts', icon: 'description', key: 'nav_contracts_all' },
    { path: '/schedule-control', icon: 'calendar_month', key: 'nav_schedule' },
    { path: '/alerts', icon: 'notifications', key: 'nav_alerts' },
    { path: '/reports', icon: 'insights', key: 'nav_reports' },
  ];

  /**
   * FLAT, like the reference's (desktop-shell.jsx:247). It used to be a list of
   * groups with a single «العمليات» heading over everything, which is a heading
   * the reference never prints: its only `.d-nav-grp` is «الحوكمة», and that
   * one sits above the ADMIN entry — a screen this app does not have, so
   * neither the entry nor its heading belongs here (a nav item whose page does
   * not exist is exactly the dead link the module list exists to prevent).
   */
  nav = computed<NavItem[]>(() => this.currentWs() ? this.workspaceNav : this.enterpriseNav);

  /** The workspace in scope, or undefined for the ministry-wide view. */
  currentWs = computed(() => this.workspaces.byCode(this.wsCode()));

  scopeTitle = computed(() => {
    const ws = this.currentWs();
    return ws ? this.lang.pick(ws.nameAr, ws.nameEn) : this.lang.t('all_workspaces');
  });

  /**
   * The line under the workspace name in the switcher BUTTON. The reference is
   * one expression (desktop-shell.jsx:241):
   *
   *     {scope === 'workspace' ? ws.kind[lang] : t('enterprise_ctx')}
   *
   * — the kind on its own inside a workspace, «الوزارة» outside one. Both
   * branches here used to say something else: «N مساحة مسندة إليك» at ministry
   * scope, which is a figure the reference never puts in this slot, and
   * `kind · N نشط` inside a workspace, which is the POPOVER ROW's format
   * (`wsSub` below) borrowed into the button.
   *
   * The kind is a lookup label, not a chrome string — the same `workspace-kind` list the register
   * filters by, so the two can never drift.
   */
  scopeSub = computed(() => {
    const ws = this.currentWs();
    return ws
      ? this.lookups.label('workspace-kind', ws.kind)
      : this.lang.t('enterprise_ctx');
  });

  /** The switcher rows' own subtitle — same shape, per workspace. */
  wsSub(ws: { kind: string; activeCount: number }) {
    return `${this.lookups.label('workspace-kind', ws.kind)} · ${ws.activeCount} ${this.lang.t('ws_active_short')}`;
  }

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

    const pages: CommandAction[] = this.nav().map(it => ({
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
    this.projects.ensureLoaded().subscribe();
    // The switcher labels its rows with the `workspace-kind` list.
    this.lookups.ensureLoaded().subscribe();

    // The workspace list decides what the switcher offers AND whether the
    // `?ws=` already in the URL is one this persona may open, so the guard
    // below cannot run until it has arrived.
    this.workspaces.ensureLoaded().subscribe(() => this.guardScope());

    this.syncChrome(this.router.url);

    // Keep `?ws=` in sync on every navigation, including back/forward.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(e => {
        this.wsCode.set(read(e.urlAfterRedirects));
        this.syncChrome(e.urlAfterRedirects);
        this.guardScope();
      });
  }

  /**
   * ── A `?ws=` THE USER MAY NOT OPEN IS CORRECTED, NOT RENDERED (BR-15) ────
   * Typed, pasted, bookmarked from another account, or left over after a
   * persona switch. The API refuses it — every scoped endpoint 403s — but six
   * pages each rendering their own error is not an answer to "you are not
   * assigned to this workspace". So the shell resets the scope once, says why,
   * and lands on the register, which is the screen that lists what you MAY open.
   *
   * This is convenience, not enforcement: `WorkspaceScope.Deny` on the server
   * is what actually withholds the data, and it does not care what the client
   * decided to render.
   */
  private guardScope() {
    const code = this.wsCode();
    if (!code || !this.workspaces.loaded() || this.workspaces.has(code)) return;

    this.toast.show(
      this.lang.isAr()
        ? `${this.lang.t('ws_denied_t')} — ${this.lang.t('ws_denied_b')}`
        : `${this.lang.t('ws_denied_t')} — ${this.lang.t('ws_denied_b')}`,
    );
    this.router.navigate(['/entities'], { replaceUrl: true });
  }

  /**
   * The project in scope, and whether the content area gives up its canvas.
   * Both come off the URL — there is no navigation the chrome can miss, and a
   * pasted link lands in the same state as a click.
   */
  private syncChrome(url: string) {
    const id = readProject(url);
    this.projectId.set(id);
    this.bare.set(!!id);
    this.pickerOpen.set(false);
    this.pickerQuery.set('');
  }

  /** The open project's row, for the picker button. */
  currentProject = computed(() => this.projects.byId(this.projectId() || null));

  /** Projects the picker offers, filtered by its own search box. */
  pickerRows = computed(() => {
    const q = this.pickerQuery().trim().toLowerCase();
    const ws = this.wsCode();
    return this.projects.list()
      .filter(p => !ws || p.workspaceCode === ws)
      .filter(p => !q
        || p.id.toLowerCase().includes(q)
        || p.nameAr.toLowerCase().includes(q)
        || p.nameEn.toLowerCase().includes(q));
  });

  togglePicker() {
    const open = !this.pickerOpen();
    this.closeOverlays();
    this.pickerOpen.set(open);
    if (!open) this.pickerQuery.set('');
  }

  /**
   * Switching project keeps the module you were reading. A user comparing the
   * Information of two projects should not be thrown back to Overview between
   * them — and the module exists for every project, so it cannot 404.
   */
  pickProject(id: string) {
    const mod = this.router.url.split('?')[0].split('/')[3] ?? 'overview';
    this.pickerOpen.set(false);
    this.pickerQuery.set('');
    const ws = this.wsCode();
    this.router.navigate(['/projects', id, mod], { queryParams: ws ? { ws } : {} });
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

  openSwitcher(el: HTMLElement) {
    this.closeOverlays();
    this.switcherQuery.set('');
    this.switcherAnchor.set(el);
  }
  openAccount(el: HTMLElement) { this.closeOverlays(); this.accountAnchor.set(el); }

  closeOverlays() {
    this.switcherAnchor.set(null);
    this.accountAnchor.set(null);
    this.paletteOpen.set(false);
  }

  /**
   * ENTER a workspace, or return to the ministry.
   *
   * The reference does exactly this: its switcher rows call `openWorkspace(w)`,
   * which sets `view='overview'` (desktop-shell.jsx:302, :422), and its "all
   * workspaces" row calls `goEnterprise()`, which lands on the dashboard (:303,
   * :415). الشكل 1 → الشكل 2 documents the same transition.
   *
   * An earlier version merged `?ws=` onto whatever page you were standing on.
   * That is what let a user sit inside a project of workspace A with a
   * breadcrumb reading workspace B: the scope moved and nothing landed.
   * Entering a workspace now always arrives somewhere that is ABOUT it.
   */
  setWorkspace(code: string | null) {
    this.closeOverlays();
    if (!code) {
      this.router.navigate(['/portfolio']);
      return;
    }
    this.router.navigate(['/workspace'], { queryParams: { ws: code } });
  }

  private go(path: string) {
    const ws = this.wsCode();
    this.router.navigate([path], { queryParams: ws ? { ws } : {} });
  }

  /**
   * The reference's `onSignout` is `() => setRoute('landing')` — every one of
   * them (main.jsx:60, :65, :100). It returns to the FRONT DOOR, not to the
   * sign-in form. This used to send you to `/login`, which was the only place
   * it could go when there was no landing page; there is one now.
   */
  signOut() {
    this.closeOverlays();
    this.auth.signOut();
    this.router.navigate(['/']);
  }

  //  moved to <epm-persona-switcher /> with the control itself
  // (P-126). The shell still INJECTS PersonaService — it names the capacity in
  // the account menu and the sidebar, and the workspace guard reads its scope.

}
