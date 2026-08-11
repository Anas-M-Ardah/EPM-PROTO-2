import { Component, inject, signal, computed, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { PageHeadComponent, Crumb } from '../../shared/page-head.component';
import { SummaryStripComponent, Stat } from '../../shared/summary-strip.component';
import { DonutComponent, DonutSegment } from '../../shared/donut.component';
import { LangService } from '../../core/lang';
import { WorkspacesService } from '../../core/workspaces';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { PortfolioApi } from './portfolio.api';
import { PortfolioResponse, EntityValue } from './portfolio.types';

/**
 * SCR-E1 — Executive Portfolio (04 §2).
 * PORTED from DDashboard (v1.1), desktop-views.jsx:45.
 *
 * ── WHY THE HEADLINE TILES ARE NOT HERE ───────────────────────────────────
 * The reference leads with physical %, financial %, SPI and CPI over an
 * S-curve. Every one needs an input that does not exist yet: physical progress
 * is weight-rolled BOQ progress (BR-04), financial progress needs payments, and
 * the indices need both (BR-11).
 *
 * This screen shows what IS derivable — the contractual position — and renders
 * each missing figure as an explicit "unavailable + reason" tile, which is what
 * the v1.1 design language requires. The reasons come from the server so they
 * stay next to the rules that own them.
 *
 * ── NO ARITHMETIC ─────────────────────────────────────────────────────────
 * Every figure arrives computed. This component formats and lays out.
 */
@Component({
  selector: 'epm-portfolio-page',
  standalone: true,
  imports: [IconComponent, PageHeadComponent, SummaryStripComponent, DonutComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './portfolio.page.html',
})
export class PortfolioPage {
  private api = inject(PortfolioApi);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);
  workspaces = inject(WorkspacesService);
  lookups = inject(LookupsService);
  /** The page-head actions are demo stubs and say so — ToastService.demo(). */
  toast = inject(ToastService);
  fmt = fmt;

  data = signal<PortfolioResponse | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);
  workspace = signal('');

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
   * The identity line. Scoped, it is the ENTITY — the reference does exactly
   * this (enterprise-areas.jsx:33, :85, :130, :183), and it is what stops a
   * filtered register from reading as the whole ministry.
   */
  scopeSub = computed(() => this.workspace() ? this.scopeName() : this.lang.t('portfolio_sub'));

  /** The scoped workspace's name, from the list the switcher already loaded. */
  scopeName = computed(() => {
    const ws = this.workspaces.byCode(this.workspace());
    return ws ? this.lang.pick(ws.nameAr, ws.nameEn) : this.workspace();
  });

  /**
   * The contractual position — the figures this system can actually defend.
   * One hairline-divided band, auto-fit columns (05 §8), never floating cards.
   */
  stats = computed<Stat[]>(() => {
    const d = this.data();
    if (!d) return [];

    return [
      { label: this.lang.t('kpi_projects'), value: d.projectCount,
        foot: `${d.activeCount} ${this.lang.t('kpi_active_suffix')}` },
      { label: this.lang.t('kpi_contracts'), value: d.contractCount },
      { label: this.lang.t('kpi_effective_value'), value: d.effectiveValue,
        foot: this.lang.t('kpi_effective_foot') },
      { label: this.lang.t('kpi_delayed'), value: d.delayedCount },
      { label: this.lang.t('kpi_applied_amd'), value: d.appliedAmendmentCount },
    ];
  });

  /**
   * 05 §1 — the ONE place status colour encodes data. Colours are status
   * tokens, and the legend beside it carries the label and count so the
   * information is never colour-only (05 §7.6).
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

  /** Widest entity bar = 100%. Uses the viz ramp, never status colour. */
  entityBars = computed(() => {
    const d = this.data();
    if (!d || d.valueByEntity.length === 0) return [];

    const max = Math.max(...d.valueByEntity.map(e => e.value), 1);
    return d.valueByEntity.map(e => ({ ...e, pct: (e.value / max) * 100 }));
  });

  /** Approved but not applied — shown only when there is something to show (02 §9). */
  hasPending = computed(() => (this.data()?.pendingAmendmentCount ?? 0) > 0);

  entityName(e: EntityValue) { return this.lang.pick(e.nameAr, e.nameEn); }
  unavailableReason(u: { needsAr: string; needsEn: string }) { return this.lang.pick(u.needsAr, u.needsEn); }

  /** Label for an unavailable tile, from its key. */
  unavailableLabel(key: string) {
    const map: Record<string, string> = {
      physical: 'kpi_physical', financial: 'kpi_financial', spi: 'kpi_spi', cpi: 'kpi_cpi',
    };
    return this.lang.t((map[key] ?? 'kpi_physical') as never);
  }

  constructor() {
    this.route.queryParamMap.subscribe(p => {
      this.workspace.set(p.get('ws') ?? '');
      this.load();
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      lookups: this.lookups.ensureLoaded(),
      res: this.api.get({ workspace: this.workspace() }),
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
