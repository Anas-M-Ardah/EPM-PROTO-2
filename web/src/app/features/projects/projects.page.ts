import { Component, inject, signal, computed, effect, untracked, ViewEncapsulation } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { PageHeadComponent, Crumb } from '../../shared/page-head.component';
import { PagerComponent } from '../../shared/pager.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { WorkspacesService } from '../../core/workspaces';
import { PersonaService, canDefineProjects } from '../../core/persona';
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { ProjectsApi } from './projects.api';
import { ProjectRow } from './projects.types';

/**
 * SCR-E2 — Projects, the cross-portfolio list (04 §2).
 *
 * ── STYLING ───────────────────────────────────────────────────────────────
 * Every class here comes from src/styles/desktop.css, copied verbatim from the
 * reference prototype. There is NO component CSS. encapsulation: None so the
 * global sheet applies. Do not invent classes — look in desktop.css first.
 *
 * ── NO ARITHMETIC ─────────────────────────────────────────────────────────
 * `value` arrives computed from Domain/ProjectValue.cs. This component formats
 * and filters; it never calculates a business figure.
 *
 * ── STATES (04 §9) ────────────────────────────────────────────────────────
 * loading · error · empty-because-no-data · empty-because-filtered are four
 * DIFFERENT states with four different messages. The database starts empty, so
 * the empty state is load-bearing, not decoration.
 */
@Component({
  selector: 'epm-projects-page',
  standalone: true,
  imports: [
    IconComponent, StatusPillComponent, TableSkeletonComponent,
    PageHeadComponent, PagerComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './projects.page.html',
})
export class ProjectsPage {
  private api = inject(ProjectsApi);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  workspaces = inject(WorkspacesService);
  persona = inject(PersonaService);
  /** Export is still a demo stub and says so — ToastService.demo(). */
  toast = inject(ToastService);
  fmt = fmt;

  rows = signal<ProjectRow[]>([]);
  countByStatus = signal<Record<string, number>>({});
  loading = signal(true);
  error = signal<string | null>(null);

  q = signal('');
  status = signal('');

  /**
   * SCOPE. Null/empty = the enterprise view (every workspace). A workspace code
   * = that workspace only, reached as /projects?ws=ub.
   *
   * The reference calls this `scopeWs` and THREE things depend on it
   * (enterprise-areas.jsx:130, :141, :145):
   *   1. the heading — نص "كل المشاريع" vs "المشاريع"
   *   2. the subtitle — the workspace's name vs the cross-portfolio line
   *   3. the مساحة العمل column, which is HIDDEN when scoped because every row
   *      would repeat the same value
   */
  workspace = signal('');

  /** Enterprise view only. Reference: `{!scopeWs && <th>…}` */
  showWorkspaceCol = computed(() => !this.workspace());

  /**
   * Column count for the loading skeleton. الشكل 3's seven — الرمز · المشروع ·
   * الفرع · الحالة · الإنجاز · الكلفة · آخر تحديث — plus مساحة العمل when the
   * register is not workspace-scoped. Nothing else: the row IS the open action.
   */
  colCount = computed(() => (this.showWorkspaceCol() ? 8 : 7));

  /**
   * Workspace → project (الشكل 3 → الشكل 4). `?ws=` rides along so the chrome,
   * the rail and the breadcrumb stay inside the entity you came from.
   */
  open(id: string) {
    const ws = this.workspace();
    this.router.navigate(['/projects', id, 'overview'], { queryParams: ws ? { ws } : {} });
  }

  /**
   * المسار 1 — «فتح مساحة عمل الجهة وإنشاء سجل مشروع». The workspace rides
   * along as `?ws=`, which is how the form knows which تشكيل the project
   * belongs to; the enterprise view has none, and the form says so rather than
   * guessing one.
   */
  newProject() {
    const ws = this.workspace();
    this.router.navigate(['/projects/new'], { queryParams: ws ? { ws } : {} });
  }

  /**
   * §23 — project definition belongs to «المستخدم المختص», so a resident
   * engineer never sees «مشروع جديد». Re-evaluates on its own when the shell's
   * capacity switcher moves, because it reads the persona signal.
   */
  canDefine = computed(() => canDefineProjects(this.persona.current()));

  /** Enter on a focused row does what clicking it does (05 §7.7). */
  onRowKey(e: KeyboardEvent, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.open(id);
    }
  }

  /**
   * The workspace's own name when scoped. Read off the loaded list rather than
   * off the first row: an entity with no projects has no rows to read it from,
   * and falling back to the raw code there put `spd` in the breadcrumb of the
   * very screen that most needs to say which workspace is empty.
   */
  scopeName = computed(() => {
    const ws = this.workspaces.byCode(this.workspace());
    if (ws) return this.lang.pick(ws.nameAr, ws.nameEn);
    const first = this.rows()[0];
    return first ? this.lang.pick(first.workspaceNameAr, first.workspaceNameEn) : this.workspace();
  });

  /** Back up one level, to the workspace this register is scoped to. */
  backToWorkspace() {
    this.router.navigate(['/workspace'], { queryParams: { ws: this.workspace() } });
  }

  /** True only when the database itself is empty, not when a filter excluded everything. */
  isUnfiltered = computed(() => !this.q() && !this.status());

  /**
   * Z2 breadcrumb. The last crumb is the current page and is never a link.
   * Enterprise scope reads الوزارة › كل المشاريع; a workspace scope names the
   * entity AND links back to its overview, so the trail is walkable in both
   * directions (الشكل 2 ⇄ الشكل 3).
   */
  crumbs = computed<Crumb[]>(() => {
    const ws = this.workspace();
    if (!ws) {
      return [
        { label: this.lang.t('ministry_short') },
        { label: this.lang.t('nav_projects_all') },
      ];
    }
    return [
      { label: this.lang.t('ministry_short') },
      { label: this.scopeName(), link: ['/workspace'], query: { ws } },
      { label: this.lang.t('nav_projects') },
    ];
  });

  // ── Paging (v1.1 data-grid standard) ────────────────────────────────────
  // The API returns the filtered set; the pager slices it client-side. That is
  // honest at this scale — the fixture is 5 rows — and the slice moves to the
  // endpoint the moment a real portfolio makes it worth a round trip.
  page = signal(1);
  pageSize = signal(15);

  pageRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.rows().slice(start, start + this.pageSize());
  });

  setPageSize(n: number) {
    this.pageSize.set(n);
    this.page.set(1);
  }

  /** v1.1 requires the result count to be visible at all times. */
  resultLabel = computed(() => {
    const n = this.rows().length;
    return this.lang.isAr() ? `${n} نتيجة` : `${n} result${n === 1 ? '' : 's'}`;
  });

  /** The "الكل / All" chip's count — every status added up. */
  totalCount = computed(() =>
    Object.values(this.countByStatus()).reduce((a, b) => a + b, 0));

  /** Chip count for one status. 0 when the API reported none. */
  count(code: string): number {
    return this.countByStatus()[code] ?? 0;
  }

  /**
   * 06 §1 — the five-state canonical set, from the Lookups table (EP-LKP-01).
   * These labels are business-maintained data, so they are NOT hard-coded here
   * and NOT in core/lang.ts, which is UI chrome only. Empty until the fixture
   * has been loaded, which is also when there are no projects to filter.
   */
  statuses = computed(() => this.lookups.list('project-status'));

  constructor() {
    // /projects?ws=ub scopes the page to one workspace.
    this.route.queryParamMap.subscribe(p => {
      this.workspace.set(p.get('ws') ?? '');
      this.load();
    });

    // The shell owns the capacity switcher, so this page REACTS to it. A
    // re-read, not a client-side re-filter: BR-15 is resolved on the server
    // from the persona, so rows fetched for one capacity are the wrong set for
    // the next — unscoped, مدير عام sees seven projects where المستخدم المختص
    // sees five. Same pattern as change-orders.page.ts, for the same reason.
    //
    // `untracked` keeps `load()`'s own signal writes out of the dependency set,
    // which would otherwise re-enter this effect.
    let first = true;
    effect(() => {
      this.persona.currentId();
      // The queryParamMap subscription above already fires the initial load.
      if (first) { first = false; return; }
      untracked(() => this.load());
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    // Both requests fly in parallel; lookups is cached after the first page
    // load and completes immediately thereafter. Waiting for it means the
    // status chips carry their labels on first paint instead of appearing
    // as raw codes for a frame.
    forkJoin({
      lookups: this.lookups.ensureLoaded(),
      res: this.api.list({ q: this.q(), status: this.status(), workspace: this.workspace() }),
    }).subscribe({
      next: ({ res }) => {
        this.rows.set(res.rows);
        this.countByStatus.set(res.countByStatus);
        // v1.1: any filter or query change resets to page 1, otherwise a
        // narrowed result set can leave the pager on a page that no longer exists.
        this.page.set(1);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.message ?? 'request failed');
        this.loading.set(false);
      },
    });
  }

  onSearch(v: string) { this.q.set(v); this.load(); }
  setStatus(v: string) { this.status.set(v); this.load(); }
  clearFilters() { this.q.set(''); this.status.set(''); this.load(); }

  /**
   * Loads the demo fixture. Prototype affordance only — see Fixture.cs.
   * The fixture also inserts the Lookups rows, so the cached lookup set is
   * stale afterwards and has to be refetched before the chips can be labelled.
   */
  loadFixture() {
    this.loading.set(true);
    this.http.post('/api/dev/load-fixture', {}).subscribe({
      next: () => this.lookups.reload().subscribe(() => this.load()),
      error: () => this.load(),
    });
  }
}
