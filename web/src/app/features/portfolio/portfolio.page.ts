import { Component, inject, signal, computed, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { PageHeadComponent, Crumb } from '../../shared/page-head.component';
import { DonutComponent, DonutSegment } from '../../shared/donut.component';
import { BarCompareComponent, BarItem } from '../../shared/bar-compare.component';
import { SCurveComponent, CurvePeriod } from '../../shared/scurve.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { LangService } from '../../core/lang';
import { WorkspacesService } from '../../core/workspaces';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { PortfolioApi } from './portfolio.api';
import {
  PortfolioResponse, EntityValue, PortfolioCurvePeriod,
  WatchlistRow, UpcomingMilestone,
} from './portfolio.types';

/**
 * SCR-E1 — Executive Portfolio (04 §2).
 * PORTED from the LIVE prototype's `DDashboard`, desktop-views.jsx:45.
 *
 * ── WHAT CHANGED, AND WHY (P-137) ─────────────────────────────────────────
 * The first build of this screen led with «مؤشرات غير متوفرة بعد» — four
 * tiles saying physical %, financial %, SPI and CPI could not be derived. That
 * was true when it was written and stopped being true in Phase 4.4, and the
 * screen kept saying it. A dashboard that reports a derivable figure as absent
 * teaches the person reading it to stop looking, which is a worse failure than
 * the one P-09 was written to prevent.
 *
 * The four are now real, and `unavailable` survives for the cases that
 * genuinely have no input — an empty database, a portfolio with no bill of
 * quantities anywhere in it. Each tile falls back to its own reason in place,
 * beside the label it belongs to, rather than into a separate panel at the
 * bottom that nobody reads.
 *
 * ── NO ARITHMETIC HERE ────────────────────────────────────────────────────
 * Every figure arrives derived from `Domain/`. The computeds below pick,
 * label, colour and sign. The one subtraction — physical minus planned — is
 * the same one the prototype does inline, and it is a display comparison of
 * two figures the server already stated, not a rule.
 */
@Component({
  selector: 'epm-portfolio-page',
  standalone: true,
  imports: [
    IconComponent, PageHeadComponent, DonutComponent, BarCompareComponent,
    SCurveComponent, StatusPillComponent, RouterLink,
  ],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './portfolio.page.html',
})
export class PortfolioPage {
  private api = inject(PortfolioApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  lang = inject(LangService);
  workspaces = inject(WorkspacesService);
  lookups = inject(LookupsService);
  /** The export action is a demo stub and says so — ToastService.demo(). */
  toast = inject(ToastService);
  fmt = fmt;

  data = signal<PortfolioResponse | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  workspace = signal('');

  /**
   * The toolbar's two filters. They live in the URL, not in the component:
   * a portfolio narrowed to «متعثّرة · جامعات حكومية» is a view somebody will
   * want to send to somebody else, and a filter that cannot be linked to is a
   * filter that has to be re-applied by hand at the other end.
   */
  status = signal('');
  kind = signal('');

  filtered = computed(() => this.status() !== '' || this.kind() !== '');

  /** The chips, in the order 06 §1 lists them — from Lookups, never hardcoded. */
  statusCodes = computed(() => this.lookups.list('project-status').map(i => i.code));

  /**
   * Z2 breadcrumb. الشكلان 48، 49 breadcrumb this screen «جامعة بغداد › …»
   * when it is scoped, not «الوزارة › …» — a filtered register that still
   * calls itself ministry-wide is the one thing a reader cannot recover from.
   */
  crumbs = computed<Crumb[]>(() => {
    const ws = this.workspace();
    if (!ws) {
      return [
        { label: this.lang.t('ministry_short') },
        { label: this.lang.t('nav_portfolio') },
      ];
    }
    return [
      { label: this.lang.t('ministry_short') },
      { label: this.scopeName(), link: ['/workspace'], query: { ws } },
      { label: this.lang.t('nav_portfolio') },
    ];
  });

  /**
   * «12 مشروعاً ضمن النطاق · بيانات حتى 2026-08-02» — DDashboard's own
   * identity line. The DATE is the part that matters: a portfolio percentage
   * with no as-of date is not a fact anybody can check (D-06).
   */
  scopeSub = computed(() => {
    const d = this.data();
    const scope = this.workspace() ? this.scopeName() : this.lang.t('portfolio_sub');
    if (!d) return scope;
    return `${scope} · ${d.projectCount} ${this.lang.t('prt_projects_in_scope')}`
      + ` · ${this.lang.t('prt_as_of')} ${fmt.date(d.asOf)}`;
  });

  /** The scoped workspace's name, from the list the switcher already loaded. */
  scopeName = computed(() => {
    const ws = this.workspaces.byCode(this.workspace());
    return ws ? this.lang.pick(ws.nameAr, ws.nameEn) : this.workspace();
  });

  // ══ الشكل 4's «مخططان بمفاتيح سلاسل» ═══════════════════════════════════

  /** «ش1» · «M1» — the period ordinal. A language call, so the client makes it. */
  private labelled(rows: PortfolioCurvePeriod[]): CurvePeriod[] {
    return rows.map((r, i) => ({
      label: fmt.month(r.at, i === 0 ? null : rows[i - 1].at),
      planCum: r.planCum, actCum: r.actCum,
      planPeriod: r.planPeriod, actPeriod: r.actPeriod,
    }));
  }

  progressCurve = computed<CurvePeriod[]>(() => this.labelled(this.data()?.progressCurve ?? []));
  costCurve = computed<CurvePeriod[]>(() => this.labelled(this.data()?.costCurve ?? []));

  /**
   * Physical minus planned, in points. Null when either side is missing —
   * an unknown variance is not a zero one.
   */
  physVariance = computed(() => {
    const d = this.data();
    if (!d || d.physical === null || d.planned === null) return null;
    return Math.round((d.physical - d.planned) * 10) / 10;
  });

  /**
   * Financial minus physical: is the money running ahead of the work? A
   * positive number is the ADVERSE direction here, which is why the tile that
   * shows it inverts its arrow against the progress tile's.
   */
  burnVariance = computed(() => {
    const d = this.data();
    if (!d || d.financial === null || d.physical === null) return null;
    return Math.round((d.financial - d.physical) * 10) / 10;
  });

  // ══ WHAT RENDERS AT ALL ════════════════════════════════════════════════
  //
  // CLIENT DECISION (P-144): a chart or a card with no data is HIDDEN, not
  // shown with an empty state and not shown as "unavailable + reason". The
  // reasons stay on the response for anyone reading the API; they are simply
  // no longer on the screen.
  //
  // The consequence to keep in mind: two portfolios side by side can now show
  // different tile sets, and a reader cannot tell "we do not measure this"
  // from "this is fine". That is the trade the decision makes.

  /** The whole first row goes when neither its chart nor any of its tiles has data. */
  showProgressRow = computed(() => {
    const d = this.data();
    if (!d) return false;
    return this.progressCurve().length > 0
      || d.physical !== null || d.spi !== null || d.financial !== null;
  });

  /** «مقارنة الكلف» with three zero bars is a chart of nothing. */
  hasCost = computed(() => {
    const c = this.data()?.cost;
    return !!c && (c.approved > 0 || c.revised > 0 || c.spent > 0);
  });

  absVariance = computed(() => Math.abs(this.physVariance() ?? 0));
  absBurn = computed(() => Math.abs(this.burnVariance() ?? 0));

  /** DDashboard's own bands: 5 points behind is the line between the two tones. */
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

  // ══ «المؤشر التنفيذي» ═══════════════════════════════════════════════════
  //
  // Three bands from `Domain/ExecutiveSignal`, always all three. Each carries
  // an icon AND a label, so the band is never read from colour alone (05 §7.6).

  signalTone(s: string) { return s === 'red' ? 'over' : s === 'amber' ? 'risk' : 'ok'; }
  signalIcon(s: string) { return s === 'red' ? 'warning' : s === 'amber' ? 'error' : 'check_circle'; }
  signalLabel(s: string) {
    return this.lang.t(s === 'red' ? 'prt_sig_red' : s === 'amber' ? 'prt_sig_amber' : 'prt_sig_green');
  }

  // ══ the breakdown panels ═══════════════════════════════════════════════

  /**
   * 05 §1 — the ONE place status colour encodes data. Colours are status
   * tokens; the legend beside it carries label and count so nothing is
   * colour-only (05 §7.6).
   */
  statusSegments = computed<DonutSegment[]>(() => {
    const d = this.data();
    if (!d) return [];
    return d.statusDistribution.map(s => ({
      color: STATUS_VAR[s.code] ?? 'var(--status-cancelled)',
      value: s.count,
      label: this.lookups.label('project-status', s.code),
    }));
  });

  statusLegend = computed(() => {
    const d = this.data();
    if (!d) return [];
    const total = d.projectCount || 1;
    return this.statusSegments().map(s => ({
      ...s, share: Math.round((s.value / total) * 100),
    }));
  });

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

  /**
   * The prototype draws this as a cumulative line over five weights it made
   * up (`[0.14, 0.17, 0.20, 0.23, 0.26]`). These are the years that actually
   * carry a paid payment, and only those — a year with no disbursement is
   * absent rather than drawn at zero.
   */
  spendBars = computed<BarItem[]>(() => {
    const d = this.data();
    if (!d) return [];
    return d.annualSpend.map((y, i) => ({
      label: String(y.year),
      value: y.value,
      display: fmt.money(y.value),
      color: `var(--viz-${(i % 6) + 1})`,
    }));
  });

  /** Widest entity bar = 100%. The viz ramp, never status colour (05 §7.5). */
  entityBars = computed(() => {
    const d = this.data();
    if (!d || d.valueByEntity.length === 0) return [];
    const max = Math.max(...d.valueByEntity.map(e => e.value), 1);
    return d.valueByEntity.map((e, i) => ({
      ...e,
      pct: (e.value / max) * 100,
      color: `var(--viz-${(i % 6) + 1})`,
    }));
  });

  // ══ small helpers ══════════════════════════════════════════════════════

  entityName(e: EntityValue) { return this.lang.pick(e.nameAr, e.nameEn); }
  name(r: WatchlistRow | UpcomingMilestone) { return this.lang.pick(r.nameAr, r.nameEn); }
  wsName(r: WatchlistRow | UpcomingMilestone) {
    return this.lang.pick(r.workspaceNameAr, r.workspaceNameEn);
  }

  openProject(id: string) { this.router.navigate(['/projects', id]); }

  /** Same keyboard contract the project register's rows carry. */
  onRowKey(e: KeyboardEvent, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.openProject(id);
    }
  }

  setStatus(code: string) { this.navigate({ status: code || null }); }
  setKind(code: string) { this.navigate({ kind: code || null }); }
  clearFilters() { this.navigate({ status: null, kind: null }); }

  private navigate(params: Record<string, string | null>) {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: params,
      queryParamsHandling: 'merge',
    });
  }

  constructor() {
    this.route.queryParamMap.subscribe(p => {
      this.workspace.set(p.get('ws') ?? '');
      this.status.set(p.get('status') ?? '');
      this.kind.set(p.get('kind') ?? '');
      this.load();
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      lookups: this.lookups.ensureLoaded(),
      res: this.api.get({
        workspace: this.workspace(),
        status: this.status(),
        kind: this.kind(),
      }),
    }).subscribe({
      next: ({ res }) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.message ?? 'request failed');
        this.loading.set(false);
      },
    });
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
