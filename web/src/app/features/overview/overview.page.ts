import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { SectionComponent } from '../../shared/section.component';
import { CurvePeriod, SCurveComponent } from '../../shared/scurve.component';
import { SummaryStripComponent, Stat } from '../../shared/summary-strip.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import * as fmt from '../../core/format';
import { moduleById } from '../workspace/project-modules';
import { OverviewApi } from './overview.api';
import { OverviewResponse } from './overview.types';

/**
 * SCR-W1 — the project workspace Overview module (`04 §3`).
 *
 * PORTED from DModOverview (v1.1) —
 * ../epm@design/system-revamp app/project-modules.jsx:2512.
 *
 * ── WHAT THE REFERENCE LEADS WITH, AND WHY WE DO NOT ──────────────────────
 * The reference opens on a verdict: an S-curve, physical %, SPI, CPI and a
 * readiness dot per module — all of it generated (`smooth(f)`, `p.tech + 8`,
 * `charCodeAt(6)`). The endpoint's remarks list each one. Here the four
 * figures render as "unavailable + reason" tiles and the curve is absent
 * entirely, because a chart of fabricated points is worse than no chart: it
 * cannot be labelled as unavailable.
 *
 * What survives is everything the system can defend — the contractual
 * position, which is exactly what BR-00, BR-09 and BR-10 answer.
 *
 * ── NO ARITHMETIC ─────────────────────────────────────────────────────────
 * Every figure arrives computed. This component formats and groups.
 */
@Component({
  selector: 'epm-overview-page',
  standalone: true,
  imports: [
    IconComponent, StatusPillComponent, SectionComponent,
    SummaryStripComponent, TableSkeletonComponent,
    SCurveComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './overview.page.html',
})
export class OverviewPage {
  private api = inject(OverviewApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  fmt = fmt;

  /**
   * ONE payload, and every part below derived from it. The screen used to hold
   * nine separate signals set one by one in `load()`, which is nine chances
   * for a half-applied response to paint.
   */
  data = signal<OverviewResponse | null>(null);

  project = computed(() => this.data()?.project ?? null);
  totals = computed(() => this.data()?.totals ?? null);
  cost = computed(() => this.data()?.cost ?? null);
  alerts = computed(() => this.data()?.alerts ?? { open: 0, critical: 0, warning: 0, info: 0 });
  alertCards = computed(() => this.data()?.alertCards ?? []);
  unavailable = computed(() => this.data()?.unavailable ?? []);

  // ── الشكل 4 — «خط سير المراحل» و«الإجراء التالي المطلوب» ────────────────
  modules = computed(() => this.data()?.modules ?? []);
  progress = computed(() => this.data()?.progress ?? { started: 0, available: 0 });
  nextAction = computed(() => this.data()?.nextAction ?? null);

  /**
   * الشكل 4's «خط سير المراحل» lists EIGHT units — معلومات المشروع · العقود ·
   * جدول الكميات · الموقف المالي · الجدول الزمني · الإنجاز · الأوامر التغييرية ·
   * إدارة المخاطر — and the live prototype's `STAGE_IDS` is the same eight.
   * The other seven modules exist and are counted; they are just not what this
   * strip reports on.
   */
  private readonly stageIds = [
    'information', 'contract', 'boq', 'financial',
    'schedule', 'progress', 'changeorders', 'risk',
  ];

  /**
   * The strip, in rail order, carrying each module's LABEL and ROUTE.
   *
   * The label and the route come from `project-modules.ts` — the same list the
   * sidebar renders — so the strip cannot name a module differently from the
   * rail beside it, and cannot link somewhere the rail would not.
   * Unbuilt modules are dropped: الشكل 4's strip reports on the project, and a
   * phase-6 module is not this project's business.
   */
  strip = computed(() => this.stageIds
    .map(id => this.modules().find(m => m.id === id))
    .filter((m): m is NonNullable<typeof m> => !!m)
    .map(m => ({ ...m, mod: moduleById(m.id) }))
    .filter(x => !!x.mod));

  /** «الإجراء التالي المطلوب» resolved to something clickable, or null. */
  next = computed(() => {
    const n = this.nextAction();
    if (!n) return null;
    const mod = moduleById(n.moduleId);
    return mod ? { ...n, mod } : null;
  });

  /**
   * A readiness state's label. The wire codes are hyphenated (`not-started`)
   * and `lang.ts` keys are underscored, so the mapping happens HERE rather than
   * as string concatenation in the template — which silently produced
   * `ovw_state_not-started` and rendered the raw key.
   */
  stateLabel(state: string): string {
    return this.lang.t(('ovw_state_' + state.replace(/-/g, '_')) as never);
  }

  /** A module's own label, from the rail's list. */
  moduleLabel(key: string): string {
    return this.lang.t(key as never);
  }

  /**
   * The step's readiness class and icon, mapped onto the REFERENCE's own
   * vocabulary (`../epm/app/data.jsx:464` READINESS) so `.d-stagebar` renders
   * exactly as it does in the prototype.
   *
   * Only three of the reference's seven are reachable here. `approved`,
   * `ready` and `returned` are approval verdicts this system cannot make — see
   * Domain/ModuleReadiness.cs — so they are deliberately never emitted. The
   * reference reaches them by generating readiness from a seeded RNG
   * (`buildReadiness`, `rng(p.id.charCodeAt(6) * 13 + 5)`), which is exactly
   * the fabrication this screen must not repeat.
   */
  stateClass(state: string): string {
    switch (state) {
      case 'in-progress': return 'r-info';
      case 'needs-attention': return 'r-warn';
      default: return 'r-neutral';
    }
  }

  stateIcon(state: string): string {
    switch (state) {
      case 'in-progress': return 'pending';
      case 'needs-attention': return 'priority_high';
      default: return 'radio_button_unchecked';
    }
  }

  /** The head bar's completion fill, as a percentage of available modules. */
  /**
   * الشكل 4's «4/8 معتمد» counts the EIGHT units its strip lists, so the
   * counter is read over the strip and not over all fifteen modules. It still
   * says «بدأت» rather than «معتمد»: this system has no per-module approval
   * state to count, and saying so is the true version of the same sentence.
   */
  stripProgress = computed(() => {
    const rows = this.strip();
    return {
      started: rows.filter(m => m.state !== 'not-started').length,
      available: rows.length,
    };
  });

  progressPct = computed(() => {
    const p = this.stripProgress();
    return p.available === 0 ? 0 : Math.round((p.started / p.available) * 100);
  });

  /** Open the module the next action points at, keeping `?ws=` scope. */
  goToModule(moduleId: string) {
    const ws = this.route.snapshot.queryParamMap.get('ws');
    const id = this.route.parent?.snapshot.paramMap.get('id') ?? '';
    this.router.navigate(['/projects', id, moduleId],
      { queryParams: ws ? { ws } : {} });
  }

  loading = signal(true);
  error = signal<string | null>(null);

  readonly colCount = 7;

  need(key: string): string {
    const u = this.unavailable().find(x => x.key === key);
    return u ? this.lang.pick(u.needsAr, u.needsEn) : '';
  }

  /**
   * The project's attributes, as the reference's `.d-meta` list. Deliberately
   * excludes what Z2 already shows — number, name and status — so the same
   * fact is never printed twice on one screen.
   */
  /**
   * **ملحق الشكل 4**'s identity line, in the plate's own order: «الجهة
   * المستفيدة · المقاول · المكتب الاستشاري · نوع المشروع · التمويل · المنطقة ·
   * المباشرة · الإنجاز التعاقدي».
   *
   * The old list was the reference's — workspace, execution stage, branch,
   * executor, data date — and shared only three fields with the plate. The
   * data date moved to the Z6 header, where every other screen puts it.
   */
  meta = computed(() => {
    const d = this.data();
    if (!d) return [];
    const id = d.identity;
    const ar = this.lang.isAr();
    const t = (k: string) => this.lang.t(k as never);

    return [
      { k: t('ovw_f_beneficiary'), v: this.lang.pick(id.beneficiaryAr ?? '', id.beneficiaryEn ?? ''), num: false },
      { k: t('ovw_f_contractor'), v: id.contractor ?? '', num: false },
      { k: t('ovw_f_consultant'), v: id.consultant ?? '', num: false },
      { k: t('ovw_f_type'), v: this.lookups.label('project-type', id.type), num: false },
      { k: t('ovw_f_funding'), v: this.lookups.label('funding-type', id.fundingType), num: false },
      { k: t('ovw_f_region'), v: this.lookups.label('region', id.region), num: false },
      { k: t('ovw_f_start'), v: fmt.date(id.start), num: true },
      { k: t('ovw_f_finish'), v: fmt.date(id.contractualFinish), num: true },
    ].filter(x => x.v && x.v !== '—');
  });

  /**
   * More than one contract, so المقاول, المباشرة and الإنجاز التعاقدي above are
   * the LARGEST one's. Said on screen rather than left to be assumed — the
   * plate's project has a single contract and this one does not.
   */
  multiContract = computed(() => (this.data()?.identity.contractCount ?? 0) > 1);


  /**
   * The headline band. Two figures the system can defend and four it cannot,
   * rendered as "unavailable + reason" rather than dropped — the same contract
   * SCR-E1 and SCR-E5 honour (P-09).
   */
  /**
   * **ملحق الشكل 4**'s figure band, in the plate's own pairs:
   *
   *   «الإنجاز المادي 31% **مقابل مخطط 39%**»   — never the actual alone
   *   «التأخر 0»
   *   «CPI 0.91 و SPI 0.79 **والحد المقبول 0.95**»
   *   «نسبة الصرف 34% **(510 م من 1,500 م)**»   — the ratio and its two terms
   *
   * A percentage without what it is measured against is a number somebody has
   * to go and look up. The plate pairs every one of them and so does this.
   *
   * Each tile still falls back to "unavailable + reason" when its own input is
   * genuinely missing, which is the point of P-09: the tile says which of the
   * two it is instead of printing a 0 that means both.
   */
  stats = computed<Stat[]>(() => {
    const t = this.totals();
    const c = this.cost();
    const ar = this.lang.isAr();
    if (!t) return [];

    const pct = (v: number | null) => v === null ? '—' : fmt.pct(v, 0);

    return [
      {
        label: ar ? 'قيمة المشروع' : 'Project value',
        value: t.effectiveValue,
        suffix: ar ? ' د.ع' : ' IQD',
        // Σ of no contracts is arithmetically 0, and rendering that would say
        // the project is worth nothing. It has no contractual value AT ALL
        // until it is awarded — a different statement (P-09).
        unavailable: t.contractCount === 0
          ? (ar
            ? 'لا يوجد عقد لهذا المشروع بعد — قيمة المشروع هي مجموع القيم النافذة لعقوده.'
            : 'This project has no contract yet — project value is the sum of its contracts\' effective values.')
          : undefined,
        foot: t.effectiveValue === t.originalValue
          ? (ar ? 'مطابقة للقيمة المحالة' : 'same as awarded')
          : (ar
            ? `المقررة ${fmt.money(t.originalValue)} · ${t.appliedAmendments} ملحق مطبَّق`
            : `approved ${fmt.money(t.originalValue)} · ${t.appliedAmendments} applied`),
      },
      {
        // الشكل 4: «الإنجاز المادي 31% مقابل مخطط 39%».
        label: ar ? 'الإنجاز المادي' : 'Physical progress',
        value: t.physical ?? 0,
        suffix: '%',
        unavailable: t.physical === null ? this.need('physical') : undefined,
        foot: t.planned === null
          ? (ar ? 'مرجّح بأوزان بنود الكميات' : 'weighted by BOQ item weights')
          : (ar ? `مقابل مخطط ${pct(t.planned)}` : `against ${pct(t.planned)} planned`),
      },
      {
        label: ar ? 'التأخر' : 'Delay',
        value: t.delayDays ?? 0,
        suffix: ar ? ' يوم' : ' d',
        unavailable: t.delayDays === null
          ? (ar ? 'لا يوجد إنجاز متوقع مسجَّل لأي عقد.' : 'No forecast finish is recorded on any contract.')
          : undefined,
        foot: t.delayDrivenBy
          ? (ar ? `أسوأ عقد: ${t.delayDrivenBy}` : `worst contract: ${t.delayDrivenBy}`)
          : (ar ? 'ضمن الخط الأساس' : 'on baseline'),
      },
      {
        // الشكل 4: «نسبة الصرف 34% (510 م من 1,500 م)».
        label: ar ? 'نسبة الصرف' : 'Spend ratio',
        value: c?.spendPct ?? 0,
        suffix: '%',
        unavailable: c === null || c.spendPct === null ? this.need('financial') : undefined,
        foot: c === null ? undefined
          : (ar
            ? `${fmt.money(c.spent)} من ${fmt.money(c.revised)}`
            : `${fmt.money(c.spent)} of ${fmt.money(c.revised)}`),
      },
      // The indices are DIAGNOSTICS (05 §7.9), so no threshold colours them —
      // but الشكل 4 prints «الحد المقبول 0.95» beside them, and a bare index
      // with nothing to read it against is the number people misread.
      {
        label: 'SPI',
        value: t.spi ?? 0,
        dp: 2,
        unavailable: t.spi === null ? this.need('spi') : undefined,
        foot: t.spi === null ? undefined
          : (ar ? `الحد المقبول ${t.acceptableIndex.toFixed(2)}` : `acceptable ${t.acceptableIndex.toFixed(2)}`),
      },
      {
        label: 'CPI',
        value: t.cpi ?? 0,
        dp: 2,
        unavailable: t.cpi === null ? this.need('cpi') : undefined,
        foot: t.cpi === null ? undefined
          : (ar ? `الحد المقبول ${t.acceptableIndex.toFixed(2)}` : `acceptable ${t.acceptableIndex.toFixed(2)}`),
      },
    ];
  });

  /**
   * True when at least one approved amendment has NOT been applied. The
   * projection is then shown as its own line and never inside the value above
   * — approving changes nothing (02 §9, non-negotiable #2).
   */
  hasProjection = computed(() => (this.totals()?.pendingAmendments ?? 0) > 0);

  // ══ الشكل 4's «مخططان بمفاتيح سلاسل» ═════════════════════════════════
  //
  // Both are the live prototype's own `DSCurve`: period bars under cumulative
  // planned and actual lines. The prototype generates its data with a
  // smoothstep over twelve invented months; `Domain/ProgressSeries.Monthly`
  // supplies these from what was recorded, so a month nobody measured is flat
  // rather than rising.

  /** «ش1» · «M1» — the period ordinal. A language call, so the client makes it. */
  private labelled(rows: { planCum: number; actCum: number | null; planPeriod: number; actPeriod: number }[]): CurvePeriod[] {
    const pre = this.lang.isAr() ? 'ش' : 'M';
    return rows.map((r, i) => ({ label: pre + (i + 1), ...r }));
  }

  progressCurve = computed<CurvePeriod[]>(() => this.labelled(this.data()?.progressCurve ?? []));
  costCurve = computed<CurvePeriod[]>(() => this.labelled(this.data()?.costCurve ?? []));

  /** «▼ 8 نقطة عن المخطط (39%)» — the gap, with its own sign. */
  physVariance = computed(() => {
    const t = this.totals();
    if (!t || t.physical === null || t.planned === null) return null;
    return Math.round((t.physical - t.planned) * 10) / 10;
  });

  /** الشكل 4 reads an index against «الحد المقبول», so the class follows THAT. */
  indexClass(v: number | null): string {
    const t = this.totals();
    if (v === null || !t) return '';
    return v < t.acceptableIndex ? 'bad' : 'good';
  }

  /** «▲126 م» — the sign is the whole message, so it is not dropped. */
  costDelta = computed(() => {
    const c = this.cost();
    if (!c || c.delta === 0) return null;
    return (c.delta > 0 ? '▲ ' : '▼ ') + fmt.money(Math.abs(c.delta));
  });

  // ══ الشكل 4's «التنبيهات النشطة» ══════════════════════════════════════

  /** Templates cannot call Math. */
  abs(v: number): number { return Math.abs(v); }

  /**
   * الشكل 4's «التنبيهات النشطة» severity band, with each one's SHARE of the
   * open set. The prototype computes the share over the open alerts only —
   * acknowledged ones were inflating it and the percentages stopped adding to
   * 100 — and every band stays visible at zero.
   */
  severityBands = computed(() => {
    const a = this.alerts();
    const share = (n: number) => (a.open === 0 ? 0 : Math.round((n / a.open) * 100));
    return [
      { code: 'critical', cls: 'red', count: a.critical, share: share(a.critical) },
      { code: 'warning', cls: 'amber', count: a.warning, share: share(a.warning) },
      { code: 'info', cls: 'green', count: a.info, share: share(a.info) },
    ];
  });

  /** The prototype's own row classes: red · amber · green. */
  severityKey(code: string): string {
    return code === 'critical' ? 'red' : code === 'warning' ? 'amber' : 'green';
  }

  /**
   * «اتخاذ قرار الاعتماد» · «مراجعة المسار الحرج» · «تحديث نسبة الإنجاز» — the
   * prototype states the required action as a VERB for the module the alert is
   * about, and a generic "open" would throw away the one thing the card is for.
   * An alert pointing nowhere gets «مراجعة التنبيه», which is still a verb.
   */
  alertAction(a: { moduleId: string | null }): string {
    const key = a.moduleId ? 'ovw_act_' + a.moduleId : 'ovw_act_default';
    const label = this.lang.t(key as never);
    return label === key ? this.lang.t('ovw_act_default') : label;
  }

  alertTitle(a: { titleAr: string; titleEn: string }): string {
    return this.lang.pick(a.titleAr, a.titleEn);
  }

  severityClass(code: string): string {
    return code === 'critical' ? 'stalled' : code === 'warning' ? 'suspended' : 'completed';
  }

  severityIcon(code: string): string {
    return code === 'critical' ? 'warning' : code === 'warning' ? 'error' : 'info';
  }

  severityLabel(code: string): string { return this.lookups.label('alert-severity', code); }
  kindLabel(code: string): string { return this.lookups.label('alert-kind', code); }

  /**
   * «مراجعة التنبيه» — the card opens the module the alert is about, or the
   * project's own alerts tab when it names nothing this screen can reach. The
   * card never offers a destination it cannot go to.
   */
  openAlert(card: { moduleId: string | null }) {
    this.goToModule(card.moduleId ?? 'alerts');
  }

  constructor() {
    // The module is a child route, so its :id lives on the PARENT — and the
    // parent OUTLIVES this component. Without takeUntilDestroyed the
    // subscription survives leaving the module: switching project from the
    // Information tab then re-fetched THIS module's data too, for a component
    // that was no longer on screen. Measured — two requests per switch (P-42).
    this.route.parent?.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe(p => this.load(p.get('id') ?? ''));
  }

  load(id: string) {
    if (!id) return;
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      lookups: this.lookups.ensureLoaded(),
      res: this.api.get(id),
    }).subscribe({
      next: ({ res }) => {
        this.data.set(res);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.error?.message ?? e?.message ?? 'request failed');
        this.loading.set(false);
      },
    });
  }

  reload() {
    this.load(this.route.parent?.snapshot.paramMap.get('id') ?? '');
  }

  // `finishMoved`, `valueMoved`, `delayLabel` and `beneficiaryLine` went with
  // the two panels الشكل 4 does not name (P-130). The amendment comparison they
  // rendered is الشكل 10's subject and lives on the contract tab.
}
