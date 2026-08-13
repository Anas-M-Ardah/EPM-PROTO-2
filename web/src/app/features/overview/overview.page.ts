import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { SectionComponent } from '../../shared/section.component';
import { SummaryStripComponent, Stat } from '../../shared/summary-strip.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import * as fmt from '../../core/format';
import { moduleById } from '../workspace/project-modules';
import { OverviewApi } from './overview.api';
import {
  OverviewAlerts, OverviewBeneficiary, OverviewContract,
  OverviewModule, OverviewNextAction, OverviewProgress,
  OverviewProject, OverviewTotals, OverviewUnavailable,
} from './overview.types';

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

  project = signal<OverviewProject | null>(null);
  totals = signal<OverviewTotals | null>(null);
  contracts = signal<OverviewContract[]>([]);
  beneficiaries = signal<OverviewBeneficiary[]>([]);
  alerts = signal<OverviewAlerts>({ open: 0, critical: 0, warning: 0, info: 0 });
  unavailable = signal<OverviewUnavailable[]>([]);

  // ── الشكل 4 — «خط سير المراحل» و«الإجراء التالي المطلوب» ────────────────
  modules = signal<OverviewModule[]>([]);
  progress = signal<OverviewProgress>({ started: 0, available: 0 });
  nextAction = signal<OverviewNextAction | null>(null);

  /**
   * The strip, in rail order, carrying each module's LABEL and ROUTE.
   *
   * The label and the route come from `project-modules.ts` — the same list the
   * sidebar renders — so the strip cannot name a module differently from the
   * rail beside it, and cannot link somewhere the rail would not.
   * Unbuilt modules are dropped: الشكل 4's strip reports on the project, and a
   * phase-6 module is not this project's business.
   */
  strip = computed(() => this.modules()
    .filter(m => m.state !== 'not-available')
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
  progressPct = computed(() => {
    const p = this.progress();
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

  private need(key: string): string {
    const u = this.unavailable().find(x => x.key === key);
    return u ? this.lang.pick(u.needsAr, u.needsEn) : '';
  }

  /**
   * The project's attributes, as the reference's `.d-meta` list. Deliberately
   * excludes what Z2 already shows — number, name and status — so the same
   * fact is never printed twice on one screen.
   */
  meta = computed(() => {
    const p = this.project();
    if (!p) return [];
    const ar = this.lang.isAr();
    return [
      { k: ar ? 'مساحة العمل' : 'Workspace', v: this.lang.pick(p.workspaceNameAr, p.workspaceNameEn), num: false },
      { k: ar ? 'نوع المشروع' : 'Project type', v: this.lookups.label('project-type', p.type), num: false },
      { k: ar ? 'مرحلة التنفيذ' : 'Execution stage', v: this.lookups.label('execution-stage', p.executionStage), num: false },
      { k: ar ? 'نوع التمويل' : 'Funding', v: this.lookups.label('funding-type', p.fundingType), num: false },
      { k: ar ? 'الفرع' : 'Branch', v: p.branch, num: false },
      { k: ar ? 'المنطقة' : 'Region', v: p.region, num: false },
      { k: ar ? 'الجهة المنفّذة' : 'Executor', v: p.executor, num: false },
      // The data date is the project's "now" (D-06). Every date on this screen
      // is measured against it, so the screen states what it is.
      { k: ar ? 'تاريخ البيانات' : 'Data date', v: fmt.date(p.dataDate), num: true },
    ].filter(x => x.v && x.v !== '—' || x.num);
  });

  /**
   * The headline band. Two figures the system can defend and four it cannot,
   * rendered as "unavailable + reason" rather than dropped — the same contract
   * SCR-E1 and SCR-E5 honour (P-09).
   */
  stats = computed<Stat[]>(() => {
    const t = this.totals();
    const ar = this.lang.isAr();
    if (!t) return [];

    return [
      {
        label: ar ? 'قيمة المشروع' : 'Project value',
        value: t.effectiveValue,
        suffix: ar ? ' د.ع' : ' IQD',
        // Σ of no contracts is arithmetically 0, and rendering that would say
        // the project is worth nothing. It has no contractual value AT ALL
        // until it is awarded — a different statement, and the one P-09 asks
        // for: never a zero standing in for an absent figure.
        unavailable: t.contractCount === 0
          ? (ar
            ? 'لا يوجد عقد لهذا المشروع بعد — قيمة المشروع هي مجموع القيم النافذة لعقوده.'
            : 'This project has no contract yet — project value is the sum of its contracts\' effective values.')
          : undefined,
        // BR-00 over BR-09 — stated, because the difference between this and
        // the awarded total is the whole point of the amendment apparatus.
        foot: t.effectiveValue === t.originalValue
          ? (ar ? 'مطابقة للقيمة المحالة' : 'same as awarded')
          : (ar
            ? `المحالة ${fmt.money(t.originalValue)} · ${t.appliedAmendments} ملحق مطبَّق`
            : `awarded ${fmt.money(t.originalValue)} · ${t.appliedAmendments} applied`),
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
      // ── REAL SINCE PHASE 4.4 ────────────────────────────────────────────
      // The four the reference fabricated and this build refused to. Each
      // still falls back to "unavailable + reason" when its own input is
      // genuinely missing, which is the whole point of P-09: the tile says
      // which of the two it is instead of printing a 0 that means both.
      {
        label: ar ? 'الإنجاز المادي' : 'Physical progress',
        value: t.physical ?? 0,
        suffix: '%',
        unavailable: t.physical === null ? this.need('physical') : undefined,
        foot: ar ? 'مرجّح بأوزان بنود الكميات' : 'weighted by BOQ item weights',
      },
      {
        label: ar ? 'الإنجاز المالي' : 'Financial progress',
        value: t.financial ?? 0,
        suffix: '%',
        unavailable: t.financial === null ? this.need('financial') : undefined,
        foot: ar ? 'المصروف فعلاً، لا المصادق عليه' : 'what was paid, not what was certified',
      },
      // The indices are DIAGNOSTICS (05 §7.9) — `delta`/`deltaDir` would
      // colour them, so they carry a plain foot line instead.
      {
        label: 'SPI',
        value: t.spi ?? 0,
        dp: 2,
        unavailable: t.spi === null ? this.need('spi') : undefined,
        foot: t.spi === null ? undefined
          : t.spi < 1 ? (ar ? 'دون الخطة' : 'behind plan') : (ar ? 'على الخطة' : 'on plan'),
      },
      {
        label: 'CPI',
        value: t.cpi ?? 0,
        dp: 2,
        unavailable: t.cpi === null ? this.need('cpi') : undefined,
        foot: t.cpi === null ? undefined
          : t.cpi < 1 ? (ar ? 'تجاوز في الكلفة' : 'over cost') : (ar ? 'الكلفة ضمن الحدود' : 'cost within limits'),
      },
    ];
  });

  /**
   * True when at least one approved amendment has NOT been applied. The
   * projection is then shown as its own line and never inside the value above
   * — approving changes nothing (02 §9, non-negotiable #2).
   */
  hasProjection = computed(() => (this.totals()?.pendingAmendments ?? 0) > 0);

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
        this.project.set(res.project);
        this.totals.set(res.totals);
        this.contracts.set(res.contracts);
        this.beneficiaries.set(res.beneficiaries);
        this.alerts.set(res.alerts);
        this.unavailable.set(res.unavailable);
        this.modules.set(res.modules ?? []);
        this.progress.set(res.progress ?? { started: 0, available: 0 });
        this.nextAction.set(res.nextAction ?? null);
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

  /** True when an applied amendment moved this contract's finish (BR-09). */
  finishMoved(c: OverviewContract): boolean {
    return c.effectiveFinish !== c.originalFinish;
  }

  /** True when an applied amendment moved this contract's value (BR-09). */
  valueMoved(c: OverviewContract): boolean {
    return c.effectiveValue !== c.originalValue;
  }

  delayLabel(c: OverviewContract): string {
    if (c.delayDays === null) return '—';
    if (c.delayDays === 0) return this.lang.isAr() ? 'لا' : '0';
    return `+${c.delayDays}${this.lang.isAr() ? ' ي' : 'd'}`;
  }

  /** "كلية الهندسة — جامعة بغداد", or just the name at the root of the tree. */
  beneficiaryLine(b: OverviewBeneficiary): string {
    const name = this.lang.pick(b.nameAr, b.nameEn);
    const parent = b.parentNameAr ? this.lang.pick(b.parentNameAr, b.parentNameEn ?? '') : null;
    return parent ? `${name} — ${parent}` : name;
  }
}
