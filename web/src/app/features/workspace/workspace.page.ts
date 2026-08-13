import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { ProjectScopeService } from '../../core/project-scope';
import { ToastService } from '../../shared/toast.service';
import { MODULE_GROUPS, OVERVIEW_MODULE, ProjectModule, moduleById } from './project-modules';

/**
 * The project workspace shell (`04 §3`).
 *
 * PORTED from DWorkspace + DProjectDetail (v1.1) —
 * ../epm@design/system-revamp app/desktop-workspace.jsx:12 and :126.
 *
 * ── IT IS NOT THREE PANES ─────────────────────────────────────────────────
 * `04 §3` and ROADMAP Phase 3 both describe queue · detail · context. v1.1
 * collapsed that: the queue became the topbar project picker, the detail pane
 * grew a grouped module rail, and `DProjectContext` — the third pane — is still
 * exported by the reference and rendered by nothing. Its own markup says so:
 *
 *     <div className="d-three" data-ctx="off">
 *       {/* DETAIL — actions now live in the page header, no side pane *​/}
 *
 * The per-module actions that used to fill it moved into Z6, beside the view
 * they act on. See P-40.
 *
 * ── THE RAIL SHOWS ALL FIFTEEN MODULES ────────────────────────────────────
 * Two of them exist. The other thirteen render disabled and say which phase
 * builds them — `project-modules.ts` holds that list and the reasoning. What
 * never happens is a link to a blank pane: an unbuilt module is not routable,
 * and the route table has no entry for it either.
 *
 * ── NO READINESS DOTS ─────────────────────────────────────────────────────
 * The reference puts a coloured readiness dot on eight rail entries. It comes
 * from `rng(p.id.charCodeAt(6) * 13 + 5)` — a character of the project id
 * through a seeded generator. There is no review state stored anywhere in this
 * system, so the dots are omitted rather than invented (P-09, and the same call
 * SCR-E5 made about critical activities).
 */
@Component({
  selector: 'epm-workspace-page',
  standalone: true,
  imports: [RouterOutlet, IconComponent, StatusPillComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './workspace.page.html',
})
export class WorkspacePage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  scope = inject(ProjectScopeService);
  toast = inject(ToastService);

  readonly overview = OVERVIEW_MODULE;
  readonly groups = MODULE_GROUPS;

  projectId = signal('');
  /** The active module id, off the URL's third segment. */
  moduleId = signal('overview');
  workspace = signal('');

  loading = signal(true);

  project = computed(() => this.scope.byId(this.projectId()));

  /**
   * The title. Falls back to the id while the list is in flight, so the header
   * never renders an empty <h2> and then reflows — the id is a real answer, and
   * it is the one thing this shell knows before any request returns.
   */
  projectName = computed(() => {
    const p = this.project();
    return p ? this.lang.pick(p.nameAr, p.nameEn) : this.projectId();
  });

  /**
   * الشكل 5's first crumb — «جامعة بغداد». Read off the PROJECT's own record
   * (EP-PRJ-01 carries the workspace name), not off `?ws=`: a pasted or
   * bookmarked module URL has no query string, and a project belongs to exactly
   * one تشكيل either way. Empty while the list is in flight, which is why the
   * crumb is conditional rather than showing a code that turns into a name.
   */
  workspaceName = computed(() => {
    const p = this.project();
    return p ? this.lang.pick(p.workspaceNameAr, p.workspaceNameEn) : '';
  });

  activeModule = computed<ProjectModule | undefined>(() => moduleById(this.moduleId()));

  constructor() {
    this.route.paramMap.subscribe(p => {
      this.projectId.set(p.get('id') ?? '');
      this.syncModule();
    });
    this.route.queryParamMap.subscribe(p => this.workspace.set(p.get('ws') ?? ''));

    // The module is a CHILD route segment, so paramMap on this route does not
    // change when only the module does.
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe(() => this.syncModule());

    // The rail's labels and the Z2 pill both resolve through the lookups, and
    // the project list is what gives this shell a name to show.
    this.lookups.ensureLoaded().subscribe();
    this.scope.ensureLoaded().subscribe({
      next: () => this.loading.set(false),
      error: () => this.loading.set(false),
    });
  }

  private syncModule() {
    const seg = this.router.url.split('?')[0].split('/')[3];
    this.moduleId.set(seg || 'overview');
  }

  /** Query params carried on every rail link so `?ws=` survives a module change. */
  private qp() {
    const ws = this.workspace();
    return ws ? { ws } : {};
  }

  open(m: ProjectModule) {
    if (!m.built) return;
    this.router.navigate(['/projects', this.projectId(), m.id], { queryParams: this.qp() });
  }

  /**
   * Why a rail entry is disabled. Stated on the entry itself rather than only
   * in a tooltip — a tooltip is not reachable by touch and not announced.
   */
  notBuilt(m: ProjectModule): string {
    return this.lang.isAr()
      ? `المرحلة ${m.phase}`
      : `Phase ${m.phase}`;
  }

  moduleTitle(m: ProjectModule | undefined): string {
    return m ? this.lang.t(m.key) : this.lang.t('mod_overview');
  }

  backToProjects() {
    this.router.navigate(['/projects'], { queryParams: this.qp() });
  }

  /**
   * The workspace crumb. SCR-E8 is `/workspace?ws=` — the one scope mechanism
   * (P-64) — so the project's own workspace code is what it is entered with,
   * whether or not the current URL happened to carry it.
   */
  openWorkspace() {
    const code = this.project()?.workspaceCode ?? this.workspace();
    if (!code) return;
    this.router.navigate(['/workspace'], { queryParams: { ws: code } });
  }

  copyId() {
    const id = this.projectId();
    navigator.clipboard?.writeText(id);
    this.toast.show(this.lang.isAr() ? 'نُسخ رقم المشروع' : 'Project number copied');
  }
}
