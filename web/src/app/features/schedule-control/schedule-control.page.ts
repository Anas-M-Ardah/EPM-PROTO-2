import { Component, inject, signal, computed, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { PageHeadComponent, Crumb } from '../../shared/page-head.component';
import { PagerComponent } from '../../shared/pager.component';
import { SummaryStripComponent, Stat } from '../../shared/summary-strip.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { ScheduleControlApi } from './schedule-control.api';
import { ScheduleRow, ScheduleUnavailable } from './schedule-control.types';

/**
 * SCR-E5 — Schedule Control, portfolio-wide schedule health (04 §2).
 *
 * PORTED from DScheduleControl (v1.1) —
 * ../epm@design/system-revamp app/enterprise-areas.jsx:8.
 *
 * ── NO ARITHMETIC ─────────────────────────────────────────────────────────
 * Delay days arrive from `Domain/Penalty.DelayDays` (BR-10) and the baseline
 * from `Domain/Amendments.Effective` (BR-09). This component formats, groups
 * into tiles and filters. The one number it computes is a percentage-of-
 * portfolio for a tile's progress rail, which is display geometry.
 *
 * ── THE THREE STATES ARE THREE, NOT TWO ───────────────────────────────────
 * Delayed · on track · **no schedule position**. A project with no contract, or
 * with no recorded forecast, is not on track — nothing has been claimed about
 * it. Folding it into "on track" would turn absent data into good news, on the
 * one screen an executive reads to find bad news.
 */
@Component({
  selector: 'epm-schedule-control-page',
  standalone: true,
  imports: [
    IconComponent, StatusPillComponent, TableSkeletonComponent,
    PageHeadComponent, PagerComponent, SummaryStripComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './schedule-control.page.html',
})
export class ScheduleControlPage {
  private api = inject(ScheduleControlApi);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  /** The page-head actions are demo stubs and say so — ToastService.demo(). */
  toast = inject(ToastService);
  fmt = fmt;

  rows = signal<ScheduleRow[]>([]);
  total = signal(0);
  delayed = signal(0);
  onTrack = signal(0);
  noSchedule = signal(0);
  avgDelayDays = signal(0);
  unavailable = signal<ScheduleUnavailable[]>([]);

  loading = signal(true);
  error = signal<string | null>(null);

  q = signal('');
  state = signal('');
  workspace = signal('');

  page = signal(1);
  pageSize = signal(15);

  /** Column count for the loading skeleton — must match the real table. */
  readonly colCount = 8;

  crumbs = computed<Crumb[]>(() => [
    { label: this.lang.t('ministry_short') },
    { label: this.lang.t('nav_schedule') },
  ]);

  isUnfiltered = computed(() => !this.q() && !this.state());

  private pct = (n: number) => (this.total() === 0 ? 0 : Math.round((n / this.total()) * 100));

  /**
   * The KPI band. Three figures the system can defend, and one it cannot —
   * rendered as "unavailable + reason" rather than dropped, so the gap stays
   * visible (see `Stat.unavailable`).
   */
  stats = computed<Stat[]>(() => {
    const ar = this.lang.isAr();
    const critical = this.unavailable().find(u => u.key === 'critical');

    return [
      {
        label: this.lang.t('sc_avg_delay'),
        value: this.avgDelayDays(),
        suffix: ar ? ' يوم' : ' d',
        // «مشروعاً متأخراً» would be wrong for 2 (dual) and for 3–10 (plural).
        // Arabic number agreement has four cases; the reference ignores them
        // and gets «2 مشروعاً» wrong. A partitive phrase is correct for every
        // count, so the count never has to pick an inflection.
        foot: ar
          ? `عبر ${this.delayed()} من المشاريع المتأخرة`
          : `across ${this.delayed()} delayed project${this.delayed() === 1 ? '' : 's'}`,
      },
      {
        label: this.lang.t('sc_delayed'),
        value: this.delayed(),
        bar: this.pct(this.delayed()),
        // The neutral branch is --on-surface; the delta text says which way it
        // reads rather than colouring the magnitude by threshold (05 §7.9).
        delta: this.delayed()
          ? (ar ? 'خلف الخط الأساس' : 'behind baseline')
          : (ar ? 'لا تأخير' : 'none'),
        deltaDir: this.delayed() ? 'down' : 'up',
        foot: `${this.pct(this.delayed())}${ar ? '% من المحفظة' : '% of portfolio'}`,
      },
      // Third, where the reference puts it. The tile is underivable, not
      // unimportant — moving it to the end would quietly demote a figure the
      // screen is supposed to lead with once Phase 4.3 lands.
      {
        label: this.lang.t('sc_critical'),
        value: 0,
        unavailable: critical
          ? this.lang.pick(critical.needsAr, critical.needsEn)
          : this.lang.t('sc_critical_needs'),
      },
      {
        label: this.lang.t('sc_ontrack'),
        value: this.onTrack(),
        bar: this.pct(this.onTrack()),
        delta: ar ? 'ضمن الخط الأساس' : 'on baseline',
        deltaDir: 'up',
        foot: `${this.pct(this.onTrack())}${ar ? '% من المحفظة' : '% of portfolio'}`,
      },
    ];
  });

  pageRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.rows().slice(start, start + this.pageSize());
  });

  resultLabel = computed(() => {
    const n = this.rows().length;
    return this.lang.isAr() ? `${n} نتيجة` : `${n} result${n === 1 ? '' : 's'}`;
  });

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
      res: this.api.list({ q: this.q(), state: this.state(), workspace: this.workspace() }),
    }).subscribe({
      next: ({ res }) => {
        this.rows.set(res.rows);
        this.total.set(res.counts.total);
        this.delayed.set(res.counts.delayed);
        this.onTrack.set(res.counts.onTrack);
        this.noSchedule.set(res.counts.noSchedule);
        this.avgDelayDays.set(res.counts.avgDelayDays);
        this.unavailable.set(res.unavailable);
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
  setState(v: string) { this.state.set(v); this.load(); }
  clearFilters() { this.q.set(''); this.state.set(''); this.load(); }

  setPageSize(n: number) {
    this.pageSize.set(n);
    this.page.set(1);
  }

  /** True when an applied amendment moved the contractual finish (BR-09). */
  baselineMoved(r: ScheduleRow): boolean {
    return !!r.baselineFinish && !!r.originalFinish && r.baselineFinish !== r.originalFinish;
  }

  /**
   * The delay cell. `null` and `0` are different answers and must not collapse:
   * null means nothing has been forecast, 0 means a forecast exists and it
   * lands on the baseline.
   */
  delayLabel(r: ScheduleRow): string {
    if (r.delayDays === null) return '—';
    if (r.delayDays === 0) return this.lang.isAr() ? 'لا' : '0';
    return `+${r.delayDays}${this.lang.isAr() ? ' ي' : 'd'}`;
  }

  /** Why a row has no schedule position — stated, never left as a blank cell. */
  noScheduleReason(r: ScheduleRow): string {
    const ar = this.lang.isAr();
    if (r.contractCount === 0) return ar ? 'لا يوجد عقد' : 'no contract';
    return ar ? 'لا يوجد إنجاز متوقع مسجَّل' : 'no forecast recorded';
  }
}
