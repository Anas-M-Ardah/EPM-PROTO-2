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
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { WorkspacesApi } from './workspaces.api';
import { WorkspaceOverviewResponse, WorkspaceProjectRow } from './workspaces.types';

/**
 * SCR-E8 — the workspace overview, «مساحة العمل › نظرة عامة» (ملحق الشكل 2).
 *
 * PORTED from DWorkspaceOverview (v1.1) — ../epm/app/desktop-workspace.jsx:284:
 * a stat band over a two-column row, distribution beside the entity's projects,
 * with «عرض الكل» leading to the register. The reference's four `DStat` cards
 * become the project's own `<epm-summary-strip>` — same figures, same order, and
 * the auto-fit grid `05 §8` makes binding instead of the reference's pinned four
 * columns (P-17).
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
    StatusPillComponent, DonutComponent,
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

  statusSegments = computed<DonutSegment[]>(() => {
    const d = this.data();
    if (!d) return [];
    return d.statusDistribution.map(s => ({
      value: s.count,
      color: STATUS_VAR[s.status] ?? 'var(--status-cancelled)',
      label: this.lookups.label('project-status', s.status),
    }));
  });

  /** 02 §9 — approved but not applied. Shown only when there is something. */
  hasPending = computed(() => (this.data()?.pendingAmendmentCount ?? 0) > 0);

  constructor() {
    this.route.queryParamMap.subscribe(p => {
      const ws = p.get('ws') ?? '';
      // No workspace, no workspace overview. The register is where you pick one.
      if (!ws) {
        this.router.navigate(['/entities'], { replaceUrl: true });
        return;
      }
      this.code.set(ws);
      this.load();
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      lookups: this.lookups.ensureLoaded(),
      res: this.api.overview(this.code()),
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
