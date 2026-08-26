import { Component, inject, signal, computed, ViewEncapsulation, effect, untracked } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { PageHeadComponent, Crumb } from '../../shared/page-head.component';
import { PagerComponent } from '../../shared/pager.component';
import { LangService } from '../../core/lang';
import { WorkspacesService } from '../../core/workspaces';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import { DrawerComponent } from '../../shared/drawer.component';
import { PersonaService, canDefineProjects } from '../../core/persona';
import { PersonaSwitcherComponent } from '../../shared/persona-switcher.component';
import { ProjectsApi } from '../projects/projects.api';
import { ProjectRow } from '../projects/projects.types';
import * as fmt from '../../core/format';
import { ContractsApi } from './contracts.api';
import { ContractRow } from './contracts.types';

/**
 * SCR-E3 — Contracts, the cross-portfolio list (04 §2).
 *
 * PORTED from DContractsAll (v1.1) —
 * docs/spec/reference/app/enterprise-areas.jsx:299.
 *
 * ── NO ARITHMETIC ─────────────────────────────────────────────────────────
 * `effectiveValue` and `projectedValue` arrive computed from Domain/Amendments.cs
 * (BR-09). This component formats and filters; it never derives a figure.
 *
 * ── THE ONE THING THIS SCREEN MUST NOT GET WRONG ──────────────────────────
 * The value column shows the EFFECTIVE value — original plus APPLIED
 * amendments. Approved-but-unapplied orders are a projection (02 §9) and are
 * shown as a separate, labelled note on the row, never added into the figure.
 * Conflating them overstates what the ministry is committed to, which is the
 * single most consequential error this system exists to prevent.
 */
@Component({
  selector: 'epm-contracts-page',
  standalone: true,
  imports: [
    IconComponent, StatusPillComponent, TableSkeletonComponent,
    PageHeadComponent, PagerComponent, DrawerComponent, PersonaSwitcherComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './contracts.page.html',
})
export class ContractsPage {
  private api = inject(ContractsApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private projectsApi = inject(ProjectsApi);
  persona = inject(PersonaService);
  lang = inject(LangService);
  workspaces = inject(WorkspacesService);
  lookups = inject(LookupsService);
  /** The page-head actions are demo stubs and say so — ToastService.demo(). */
  toast = inject(ToastService);
  fmt = fmt;

  rows = signal<ContractRow[]>([]);
  countByStatus = signal<Record<string, number>>({});
  /**
   * ── «عقد جديد» FROM THE CROSS-PORTFOLIO REGISTER ────────────────────────
   * A contract belongs to exactly one project (المسار 2, «انتماء العقد إلى
   * مشروع واحد») and this screen spans every project in scope, so unlike SCR-W3
   * it has no project to inherit. The button therefore ASKS which one, then
   * hands off to the real form at /projects/:id/contract/new.
   *
   * The list comes from EP-PRJ-01, NOT from the contract rows on screen: a
   * project with no contracts has no row here, and that is precisely the
   * project most likely to need its first one.
   */
  pickerOpen = signal(false);
  pickerLoading = signal(false);
  projects = signal<ProjectRow[]>([]);
  chosenProject = signal('');

  /** §23 — contract entry belongs to «المستخدم المختص». */
  canDefine = computed(() => canDefineProjects(this.persona.current()));

  openPicker() {
    this.chosenProject.set('');
    this.pickerOpen.set(true);
    this.pickerLoading.set(true);
    this.projectsApi.list({ workspace: this.workspace() }).subscribe({
      next: res => {
        this.projects.set(res.rows);
        // One project in scope is not a choice — preselect it so the drawer
        // reads as a confirmation rather than a quiz with one answer.
        if (res.rows.length === 1) this.chosenProject.set(res.rows[0].id);
        this.pickerLoading.set(false);
      },
      error: () => this.pickerLoading.set(false),
    });
  }

  closePicker() { this.pickerOpen.set(false); }

  /** Hand off to the project-scoped form — the one المسار 2 actually describes. */
  goToNewContract() {
    const id = this.chosenProject();
    if (!id) return;
    const ws = this.workspace();
    this.pickerOpen.set(false);
    this.router.navigate(['/projects', id, 'contract', 'new'],
      { queryParams: ws ? { ws } : {} });
  }

  loading = signal(true);
  error = signal<string | null>(null);

  q = signal('');
  status = signal('');
  workspace = signal('');

  page = signal(1);
  pageSize = signal(15);

  /**
   * 06 §4 — the EXTENDED nine-value contract list, not the five-state project
   * set. A contract can be «لم يباشر به» or «تسوية حسابات»; a project cannot.
   * Asking for the right kind is the point of having two (see lookups.md §7).
   */
  statuses = computed(() => this.lookups.list('contract-status'));

  /**
   * Z2 breadcrumb. الشكلان 48، 49 breadcrumb this screen «جامعة بغداد › …»
   * when it is scoped, not «الوزارة › …» — a filtered register that still
   * calls itself ministry-wide is the one thing a reader cannot recover from.
   * The workspace crumb links back to its overview.
   */
  crumbs = computed<Crumb[]>(() => {
    const ws = this.workspace();
    if (!ws) {
      return [
        { label: this.lang.t('ministry_short') },
        { label: this.lang.t('nav_contracts_all') },
      ];
    }
    return [
      { label: this.lang.t('ministry_short') },
      { label: this.scopeName(), link: ['/workspace'], query: { ws } },
      { label: this.lang.t('nav_contracts_all') },
    ];
  });

  /**
   * The identity line. Scoped, it is the ENTITY — the reference does exactly
   * this (enterprise-areas.jsx:33, :85, :130, :183), and it is what stops a
   * filtered register from reading as the whole ministry.
   */
  scopeSub = computed(() => this.workspace() ? this.scopeName() : this.lang.t('contracts_sub'));

  /** The scoped workspace's name, from the list the switcher already loaded. */
  scopeName = computed(() => {
    const ws = this.workspaces.byCode(this.workspace());
    return ws ? this.lang.pick(ws.nameAr, ws.nameEn) : this.workspace();
  });

  isUnfiltered = computed(() => !this.q() && !this.status());

  totalCount = computed(() =>
    Object.values(this.countByStatus()).reduce((a, b) => a + b, 0));

  count(code: string): number {
    return this.countByStatus()[code] ?? 0;
  }

  /** Chips for statuses that actually occur, plus any that are selected. */
  activeStatuses = computed(() =>
    this.statuses().filter(s => this.count(s.code) > 0 || this.status() === s.code));

  pageRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.rows().slice(start, start + this.pageSize());
  });

  resultLabel = computed(() => {
    const n = this.rows().length;
    return this.lang.isAr() ? `${n} نتيجة` : `${n} result${n === 1 ? '' : 's'}`;
  });

  /** Column count for the loading skeleton — must match the real table. */
  readonly colCount = 8;

  constructor() {
    this.route.queryParamMap.subscribe(p => {
      this.workspace.set(p.get('ws') ?? '');
      this.load();
    });

    // SWITCHING صفة IS A RE-READ. `EP-CNT-01` is workspace-guarded (BR-15) and
    // the scope is resolved on the SERVER from the persona, so rows fetched for
    // one capacity are the wrong set for the next. Without this the register
    // kept another صفة's contracts on screen while the header claimed the new
    // one. Same shape as projects.page.ts, for the same reason.
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
    forkJoin({
      lookups: this.lookups.ensureLoaded(),
      res: this.api.list({ q: this.q(), status: this.status(), workspace: this.workspace() }),
    }).subscribe({
      next: ({ res }) => {
        this.rows.set(res.rows);
        this.countByStatus.set(res.countByStatus);
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

  setPageSize(n: number) {
    this.pageSize.set(n);
    this.page.set(1);
  }

  /**
   * The signed delta between the awarded value and the value in force.
   * Null when nothing has been applied — an unamended contract shows no delta
   * rather than a "+0", which would imply an amendment happened.
   */
  amendedBy(r: ContractRow): number | null {
    return r.amendmentCount === 0 ? null : r.effectiveValue - r.originalValue;
  }

  /** The projection note (02 §9) — only when something is approved and unapplied. */
  pendingDelta(r: ContractRow): number | null {
    return r.pendingCount === 0 ? null : r.projectedValue - r.effectiveValue;
  }
}
