import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { PageHeadComponent, Crumb } from '../../shared/page-head.component';
import { SummaryStripComponent, Stat } from '../../shared/summary-strip.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { DonutComponent, DonutSegment } from '../../shared/donut.component';
import { BarCompareComponent, BarItem } from '../../shared/bar-compare.component';
import { SCurveComponent, CurvePeriod } from '../../shared/scurve.component';
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { WorkspacesApi } from './workspaces.api';
import {
  WorkspaceOverviewResponse, WorkspaceProjectRow, WorkspaceCurvePeriod,
  WorkspaceWatchRow, WorkspaceMilestone,
} from './workspaces.types';

/**
 * SCR-E8 — the workspace overview, «مساحة العمل › نظرة عامة» (ملحق الشكل 2).
 *
 * PORTED from the LIVE prototype's `DWorkspaceOverview`,
 * app/desktop-workspace.jsx:354.
 *
 * ── IT IS THE MINISTRY BOARD, SCOPED ──────────────────────────────────────
 * An earlier build of this screen was a stat band over a two-column row, on the
 * reading that a workspace overview is its own kind of screen. The prototype
 * says otherwise in its own comment — *"same model as the ministry board"* —
 * and draws SCR-E1 exactly: two `.d-dash` rows, «المؤشر التنفيذي», the
 * watchlist, «معالم قادمة». What changes is the scope and two controls: the
 * filter is by BRANCH, and the watchlist carries a code and a branch column.
 *
 * The band comes from `Domain/PortfolioBand` — the same rule SCR-E1 calls — so
 * the ministry total is always the sum of the workspaces underneath it (P-141).
 *
 * The summary strip stays above it. Those are counts and totals — what this
 * workspace HAS — and the board below is about how it is doing. Two questions,
 * two answers.
 *
 * ── IT IS THE LANDING PLACE, WHICH IS THE WHOLE POINT ─────────────────────
 * الشكل 1 → الشكل 2 is a documented transition. Before this screen existed,
 * selecting a workspace changed a query parameter and left you wherever you
 * happened to be standing — the scope moved but nothing landed. Entering a
 * workspace now arrives somewhere that is about that workspace.
 *
 * ── SCOPE IS STILL `?ws=`, NOT A PATH SEGMENT ─────────────────────────────
 * `/workspace?ws=ub`, not `/workspaces/ub`. The app has exactly one mechanism
 * for scope and a second one would be a second thing to keep in sync — the
 * switcher, the sidebar links and six endpoints all already speak `?ws=`.
 * Without it there is no workspace to show, so the page sends you to the
 * register rather than rendering an empty shell.
 */
@Component({
  selector: 'epm-workspaces-page',
  standalone: true,
  imports: [
    IconComponent, PageHeadComponent, SummaryStripComponent,
    StatusPillComponent, DonutComponent, BarCompareComponent, SCurveComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './workspaces.page.html',
})
export class WorkspacesPage {
  private api = inject(WorkspacesApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  toast = inject(ToastService);
  fmt = fmt;

  code = signal('');
  data = signal<WorkspaceOverviewResponse | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  /**
   * The toolbar's two filters. They live in the URL because a workspace
   * narrowed to «متعثّرة · فرع الكرخ» is a view somebody sends to somebody
   * else, and a filter that cannot be linked to has to be re-applied by hand
   * at the other end.
   */
  status = signal('');
  branch = signal('');

  filtered = computed(() => this.status() !== '' || this.branch() !== '');

  /** The chips, in the order 06 §1 lists them — from Lookups, never hardcoded. */
  statusCodes = computed(() => this.lookups.list('project-status').map(i => i.code));

  /** Counts from BEFORE the filters, so a chip never hides its own subject. */
  countOf(code: string) {
    return this.data()?.statusCounts.find(x => x.status === code)?.count ?? 0;
  }

  totalProjects = computed(() =>
    (this.data()?.statusCounts ?? []).reduce((a, x) => a + x.count, 0));

  name = computed(() => {
    const d = this.data();
    return d ? this.lang.pick(d.nameAr, d.nameEn) : this.code();
  });

  kindLabel = computed(() => {
    const d = this.data();
    return d ? this.lookups.label('workspace-kind', d.kind) : '';
  });

  /** الوزارة › مساحات العمل › <name>. The register crumb is the way back up. */
  crumbs = computed<Crumb[]>(() => [
    { label: this.lang.t('ministry_short') },
    { label: this.lang.t('nav_entities'), link: ['/entities'] },
    { label: this.name() },
  ]);

  sub = computed(() => {
    const kind = this.kindLabel();
    return kind ? `${kind} · ${this.lang.t('ws_overview_sub')}` : this.lang.t('ws_overview_sub');
  });

  /**
   * ── FOUR TILES, LIKE THE REFERENCE, AND FOR A REASON ──────────────────
   * DWorkspaceOverview leads with four (desktop-workspace.jsx:298-301) and so
   * does this. Two constraints made the count deliberate rather than inherited:
   *
   *   1. A nine-digit value tile needs a 180px track (see `needsWide` in
   *      SummaryStripComponent). Five of those wrap to 4+1 on every realistic
   *      canvas, and a lone orphan tile under a full row reads as a mistake.
   *   2. A «المتأخرة» tile would restate the watchlist immediately below it,
   *      which lists precisely the delayed and suspended projects — by name,
   *      with a way in. The count is the weaker of the two answers.
   *
   * The reference's fourth is completion. It needs weight-rolled BOQ progress
   * across every project (BR-04); a 0% would assert nothing has been built
   * (P-09), so its slot goes to open alerts — the figure on this screen that
   * actually asks for an action today.
   */
  stats = computed<Stat[]>(() => {
    const d = this.data();
    if (!d) return [];

    return [
      {
        label: this.lang.t('kpi_projects'),
        value: d.projectCount,
        foot: `${d.activeCount} ${this.lang.t('kpi_active_suffix')}`,
      },
      { label: this.lang.t('kpi_contracts'), value: d.contractCount },
      {
        label: this.lang.t('kpi_effective_value'),
        value: d.effectiveValue,
        foot: this.lang.t('kpi_effective_foot'),
      },
      {
        label: this.lang.t('ws_open_alerts'),
        value: d.openAlertCount,
        foot: `${d.criticalAlertCount} ${this.lang.t('ws_critical_short')}`,
      },
    ];
  });

  // ══ الشكل 4's «مخططان بمفاتيح سلاسل», at workspace scope ═══════════════

  /** «ش1» · «M1» — the period ordinal. A language call, so the client makes it. */
  private labelled(rows: WorkspaceCurvePeriod[]): CurvePeriod[] {
    return rows.map((r, i) => ({
      label: fmt.month(r.at, i === 0 ? null : rows[i - 1].at),
      planCum: r.planCum, actCum: r.actCum,
      planPeriod: r.planPeriod, actPeriod: r.actPeriod,
    }));
  }

  progressCurve = computed<CurvePeriod[]>(() => this.labelled(this.data()?.progressCurve ?? []));
  costCurve = computed<CurvePeriod[]>(() => this.labelled(this.data()?.costCurve ?? []));

  /** Physical minus planned, in points. Null when either side is missing. */
  physVariance = computed(() => {
    const d = this.data();
    if (!d || d.completionPct === null || d.planned === null) return null;
    return Math.round((d.completionPct - d.planned) * 10) / 10;
  });

  /**
   * Financial minus physical: is the money running ahead of the work? Positive
   * is the ADVERSE direction, which is why its tile inverts the arrow.
   */
  burnVariance = computed(() => {
    const d = this.data();
    if (!d || d.financial === null || d.completionPct === null) return null;
    return Math.round((d.financial - d.completionPct) * 10) / 10;
  });

  // ══ WHAT RENDERS AT ALL ════════════════════════════════════════════════
  //
  // CLIENT DECISION (P-144): a chart or a card with no data is HIDDEN, not
  // shown with an empty state and not shown as "unavailable + reason". The
  // reasons stay on the response for anyone reading the API.
  //
  // The consequence to keep in mind: two workspaces side by side can now show
  // different tile sets, and a reader cannot tell "we do not measure this"
  // from "this is fine". That is the trade the decision makes.

  /** The whole first row goes when neither its chart nor any of its tiles has data. */
  showProgressRow = computed(() => {
    const d = this.data();
    if (!d) return false;
    return this.progressCurve().length > 0
      || d.completionPct !== null || d.spi !== null || d.financial !== null;
  });

  /** «مقارنة الكلف» with three zero bars is a chart of nothing. */
  hasCost = computed(() => {
    const c = this.data()?.cost;
    return !!c && (c.approved > 0 || c.revised > 0 || c.spent > 0);
  });

  absVariance = computed(() => Math.abs(this.physVariance() ?? 0));
  absBurn = computed(() => Math.abs(this.burnVariance() ?? 0));

  /** The prototype's own bands: 5 points behind is the line between two tones. */
  variancePill(v: number | null) {
    if (v === null) return 'withdrawn';
    return v < -5 ? 'stalled' : v < 0 ? 'suspended' : 'completed';
  }

  deltaDir(v: number | null) { return v === null ? 'flat' : v < 0 ? 'down' : 'up'; }

  burnPill() {
    const b = this.burnVariance();
    if (b === null) return 'withdrawn';
    return b < -5 ? 'suspended' : b > 5 ? 'stalled' : 'completed';
  }

  burnLabel() {
    const b = this.burnVariance();
    if (b === null || b === 0) return this.lang.t('prt_burn_in_step');
    return this.lang.t(b > 0 ? 'prt_burn_ahead' : 'prt_burn_behind');
  }

  // ══ «المؤشر التنفيذي» ══════════════════════════════════════════════════
  // Each band carries an icon AND a label, so it is never read from colour
  // alone (05 §7.6).

  signalTone(s: string) { return s === 'red' ? 'over' : s === 'amber' ? 'risk' : 'ok'; }
  signalIcon(s: string) { return s === 'red' ? 'warning' : s === 'amber' ? 'error' : 'check_circle'; }
  signalLabel(s: string) {
    return this.lang.t(s === 'red' ? 'prt_sig_red' : s === 'amber' ? 'prt_sig_amber' : 'prt_sig_green');
  }

  /**
   * «المقررة · المعدّلة · المصروف». Each bar's colour identifies the SERIES,
   * never a verdict on its size (05 §7.9) — which is why the revised bar is
   * not red when it exceeds the approved one.
   */
  costBars = computed<BarItem[]>(() => {
    const d = this.data();
    if (!d) return [];
    return [
      { label: this.lang.t('prt_cost_approved'), value: d.cost.approved,
        display: fmt.money(d.cost.approved), color: 'var(--viz-1)' },
      { label: this.lang.t('prt_cost_revised'), value: d.cost.revised,
        display: fmt.money(d.cost.revised), color: 'var(--viz-2)' },
      { label: this.lang.t('prt_cost_spent'), value: d.cost.spent,
        display: fmt.money(d.cost.spent), color: 'var(--viz-3)' },
    ];
  });

  statusSegments = computed<DonutSegment[]>(() => {
    const d = this.data();
    if (!d) return [];
    return d.statusDistribution.map(s => ({
      value: s.count,
      color: STATUS_VAR[s.status] ?? 'var(--status-cancelled)',
      label: this.lookups.label('project-status', s.status),
    }));
  });

  statusLegend = computed(() => {
    const total = this.data()?.projectCount || 1;
    return this.statusSegments().map(s => ({
      ...s, share: Math.round((s.value / total) * 100),
    }));
  });

  /** 02 §9 — approved but not applied. Shown only when there is something. */
  hasPending = computed(() => (this.data()?.pendingAmendmentCount ?? 0) > 0);

  watchName(r: WorkspaceWatchRow) { return this.lang.pick(r.nameAr, r.nameEn); }
  milestoneName(m: WorkspaceMilestone) { return this.lang.pick(m.nameAr, m.nameEn); }

  /** Same keyboard contract the project register's rows carry. */
  onRowKey(e: KeyboardEvent, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.openProject(id);
    }
  }

  setStatus(code: string) { this.navigate({ status: code || null }); }
  setBranch(code: string) { this.navigate({ branch: code || null }); }
  clearFilters() { this.navigate({ status: null, branch: null }); }

  private navigate(params: Record<string, string | null>) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  constructor() {
    this.route.queryParamMap.subscribe(p => {
      const ws = p.get('ws') ?? '';
      // No workspace, no workspace overview. The register is where you pick one.
      if (!ws) {
        this.router.navigate(['/entities'], { replaceUrl: true });
        return;
      }
      this.code.set(ws);
      this.status.set(p.get('status') ?? '');
      this.branch.set(p.get('branch') ?? '');
      this.load();
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      lookups: this.lookups.ensureLoaded(),
      res: this.api.overview(this.code(), { status: this.status(), branch: this.branch() }),
    }).subscribe({
      next: ({ res }) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: e => {
        // A 403 here is handled by the shell, which resets the scope and says
        // so. Anything else is a real failure and gets the retry state.
        this.error.set(e?.status === 403 ? null : (e?.message ?? 'request failed'));
        this.loading.set(false);
      },
    });
  }

  projectName(p: WorkspaceProjectRow) { return this.lang.pick(p.nameAr, p.nameEn); }

  reasonLabel(p: WorkspaceProjectRow) {
    return p.reason ? this.lookups.label('project-status', p.reason) : '';
  }

  /** Workspace → project, carrying the scope so the chrome stays coherent. */
  openProject(id: string) {
    this.router.navigate(['/projects', id, 'overview'], { queryParams: { ws: this.code() } });
  }

  goProjects() {
    this.router.navigate(['/projects'], { queryParams: { ws: this.code() } });
  }

  goAlerts() {
    this.router.navigate(['/alerts'], { queryParams: { ws: this.code() } });
  }
}

/** 06 §1 code → the status token. Status colour, because this IS status (05 §1). */
const STATUS_VAR: Record<string, string> = {
  ongoing: 'var(--status-ongoing)',
  completed: 'var(--status-completed)',
  delayed: 'var(--status-delayed)',
  suspended: 'var(--status-suspended)',
  cancelled: 'var(--status-cancelled)',
};
