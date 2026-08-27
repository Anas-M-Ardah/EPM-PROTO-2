import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { DrawerComponent } from '../../shared/drawer.component';
import { TileComponent, TileDir, TileState } from '../../shared/tile.component';
import { FieldGroupComponent } from '../../shared/field-group.component';
import { SelectComponent, SelectOption } from '../../shared/select.component';
import { SCurveComponent, CurvePeriod } from '../../shared/scurve.component';
import { LangService, StrKey } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { ProgressApi } from './progress.api';
import { ProgressActivity, ProgressBoq, ProgressResponse } from './progress.types';

/**
 * SCR-W6 — the project workspace Progress module (`04 §3`, `02 §4`).
 *
 * PORTED from the v1.1 progress module — ../epm@design/system-revamp
 * app/project-modules.jsx `DModProgress` :1391.
 *
 * ── THE ONE SCREEN WHERE PROGRESS MOVES (P-55) ────────────────────────────
 * The reference's own header comment calls this module a "READ-ONLY
 * dashboard". `07 §M3` and ROADMAP 4.4 ask for the opposite in as many words:
 * *"change an activity's progress, watch BOQ progress, achieved quantity and
 * achieved amount update"*. Both are honoured — the dashboard is the
 * reference's, and the editor sits beneath it with the BOQ lines it moves
 * visible in the same view. SCR-W5 deliberately refuses the same edit because
 * there the consequence would be off screen.
 *
 * ── WHAT THIS COMPONENT COMPUTES ──────────────────────────────────────────
 * NOTHING. Not one percentage, not one amount. Every figure — physical,
 * planned, financial, each BOQ line's progress, achieved quantity and achieved
 * amount, and all four EVM indices — arrives derived from
 * `api/Epm.Api/Domain/`. The draft below is a text box's contents, and it
 * becomes a number only after the server has recomputed the model.
 *
 * ── EVM IS A DIAGNOSTIC, NOT A HEADLINE (`05 §7.9`) ───────────────────────
 * 13px, `--on-surface-variant`, and never coloured by threshold. `cpi < 1 ?
 * error : success` is the defect the design system names explicitly, so the
 * indices carry a WORD — "behind plan", "over cost" — and the colour channel
 * stays out of it.
 *
 * ── THE SCREEN IS ARCHETYPE L04, AND WAS NOT (P-199) ──────────────────────
 * الأشكال 25–28 are built out of `.d-tile` KPI cards over a `.d-l04` twelve
 * column grid, and nothing else: four, three, six and four of them. This build
 * had reached for `<epm-summary-strip>` and `.d-recon` instead, which have
 * nowhere to put the four things the plates give every card — a comparison, a
 * delta against the selected period, a governing note, and a «التفصيل في…»
 * drill-through. The last of those is a FUNCTION, not a decoration: all four
 * plates list «الانتقال إلى الوحدة المصدر لكل مؤشر» among their user actions,
 * and this screen offered no way off itself.
 *
 * The whole vocabulary had been in `styles/desktop.css:3395` since Phase 1 and
 * no screen in the build had ever used it. Same substitution P-186 found on
 * SCR-W7, and no CSS was added.
 */
@Component({
  selector: 'epm-progress-page',
  standalone: true,
  imports: [IconComponent, StatusPillComponent, TableSkeletonComponent, DrawerComponent,
    TileComponent, FieldGroupComponent, SelectComponent, SCurveComponent, RouterLink],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './progress.page.html',
})
export class ProgressPage {
  private api = inject(ProgressApi);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  toast = inject(ToastService);
  fmt = fmt;

  projectId = signal('');
  data = signal<ProgressResponse | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);

  /** summary · activities · boq */
  /**
   * الشكل 25 names FOUR tabs, and these are they. الأنشطة and بنود الكميات are
   * not among them: the plate makes updating progress a BUTTON — «زر تحديث
   * نسبة الإنجاز» — not a reading surface, and this screen is the one place
   * progress MOVES (P-55). They live behind `editing` instead, full width,
   * because two dense tables do not fit a drawer.
   */
  view = signal<'summary' | 'wbs' | 'cost' | 'risk'>('summary');

  /**
   * «تحديث نسبة الإنجاز» — the editor, reached from Z6 and left by a back
   * button. Not a tab, because it is an ACT rather than a view, and not a
   * drawer, because it is two full-width tables.
   */
  editing_mode = signal(false);

  /** «كيف تُحتسب» — the rules behind every figure on the current tab. */
  howOpen = signal(false);

  wbs = computed(() => this.data()?.wbs ?? []);
  costImpact = computed(() => this.data()?.costImpact ?? null);
  scheduleRisk = computed(() => this.data()?.scheduleRisk ?? null);
  updates = computed(() => this.data()?.updates ?? []);

  /** الشكل 26's «مستويات مكتملة 0 من 6». */
  wbsComplete = computed(() => this.wbs().filter(w => w.isComplete).length);

  /**
   * الشكل 26's own headline pair — the project rollup against the plan, read
   * off the SAME headline the الملخص tab prints, never re-derived from the
   * node rows (their weights are per contract and would not add up).
   */
  wbsGap = computed(() => {
    const h = this.data()?.headline;
    return h ? h.physical - h.planned : 0;
  });

  /**
   * ONE TAB CARRIES A COUNT, and only when it is not zero — `DModProgress`
   * :1445 gives `n` to «مخاطر الجدول» alone, as `atRisk.length || undefined`.
   *
   * «حسب هيكل التجزئة» had one here, and a badge on a tab means "this many
   * things need you": six WBS levels is the shape of the programme, not a
   * count of anything outstanding, so the badge was making a structural fact
   * look like a queue.
   */
  viewTabs = computed(() => [
    { id: 'summary' as const, key: 'prg_tab_summary' as StrKey, n: null as number | null },
    { id: 'wbs' as const, key: 'prg_tab_wbs' as StrKey, n: null as number | null },
    { id: 'cost' as const, key: 'prg_tab_cost' as StrKey, n: null as number | null },
    {
      id: 'risk' as const, key: 'prg_tab_risk' as StrKey,
      n: this.scheduleRisk()?.atRiskCount || null,
    },
  ]);

  /**
   * «تصدير PDF» — the browser's own print dialogue, which is what produces a
   * PDF here. There is no server-side renderer and inventing one would be a
   * dependency this phase does not own; `window.print()` produces the page a
   * reader is looking at, which is what the plate's button asks for.
   */
  exportPdf() { window.print(); }

  /** The activity being edited, and the text in its box. */
  editing = signal('');
  draft = signal('');
  saving = signal('');

  /** The BOQ line whose contributors are expanded. */
  openLine = signal('');

  readonly colCount = 8;

  // ── the model ──────────────────────────────────────────────────────────

  contracts = computed(() => this.data()?.contracts ?? []);
  activities = computed(() => this.data()?.activities ?? []);
  boqLines = computed(() => this.data()?.boqLines ?? []);

  /**
   * The contract column is dropped when there is only one — a column whose
   * every cell says the same thing is a column that costs width and says
   * nothing (the same call SCR-E2 makes about the Workspace column).
   */
  manyContracts = computed(() => this.contracts().length > 1);

  contractName(id: string): string {
    const c = this.contracts().find(x => x.id === id);
    return c ? this.lang.pick(c.nameAr, c.nameEn) : id;
  }

  name(r: { nameAr: string; nameEn: string }): string {
    return this.lang.pick(r.nameAr, r.nameEn);
  }

  description(r: { descriptionAr: string; descriptionEn: string }): string {
    return this.lang.pick(r.descriptionAr, r.descriptionEn);
  }

  /**
   * Physical minus planned, in points. The sign carries it and the colour
   * channel does not — a magnitude is never coloured by threshold.
   */
  gap = computed(() => {
    const h = this.data()?.headline;
    return h ? h.physical - h.planned : 0;
  });

  // ── الشكل 25 — «مرجع المقارنة» (P-198) ─────────────────────────────────

  /**
   * The selected span. NOT a baseline picker: it chooses which earlier READING
   * every tile's delta is measured from — `DModProgress` :1416's own «one
   * global period selector in Z6 governs every tile».
   *
   * `''` until the model arrives, then `defaultPeriod`. Kept across a save so
   * reporting a percentage does not silently reset the comparison the reader
   * had chosen.
   */
  period = signal('');

  /**
   * All three, always. A span the record cannot support arrives `available:
   * false` and is rendered DISABLED carrying its reason, never dropped —
   * CLAUDE.md §6 asks that a cap be explained, and a vocabulary that shrinks
   * with the data leaves a reader unable to tell what the system can do from
   * what this project happens to allow. Same call SCR-W5 makes about the
   * weight basis.
   */
  periodOptions = computed<SelectOption[]>(() =>
    (this.data()?.periods ?? []).map(p => ({
      code: p.id,
      label: this.lang.t(('prg_period_' + p.id) as StrKey),
      disabled: !p.available,
      why: p.available ? undefined : this.lang.pick(p.whyAr ?? '', p.whyEn ?? ''),
    })));

  activePeriod = computed(() =>
    this.data()?.periods.find(p => p.id === this.period()) ?? null);

  /**
   * «مقارنة مع القراءة السابقة» — the plate's note, and only that. The prior
   * reading's DATE is deliberately not appended: the reference does not, and
   * the date is one row down in «تحديثات الإنجاز», where the whole series is.
   */
  periodNote = computed(() => {
    const p = this.activePeriod();
    if (!p) return '';
    if (!p.available) return this.lang.t('prg_period_none');

    return `${this.lang.t('prg_period_vs')} ${this.lang.t(('prg_period_' + p.id) as StrKey)}`;
  });

  /**
   * A delta is FORMATTED here and computed nowhere: it arrives from
   * `Domain/ComparisonPeriod` already subtracted. `fmt.delta` signs it.
   */
  physDelta = computed(() => this.deltaText(this.activePeriod()?.physicalDelta));
  finDelta = computed(() => this.deltaText(this.activePeriod()?.financialDelta));

  physDir = computed<TileDir>(() => this.dirOf(this.activePeriod()?.physicalDelta));
  finDir = computed<TileDir>(() => this.dirOf(this.activePeriod()?.financialDelta));

  private deltaText(v: number | undefined): string {
    const p = this.activePeriod();
    if (!p?.available || v === undefined) return '';

    // A ZERO MOVEMENT IS A READING, NOT A BLANK. `fmt.delta` renders 0 as an
    // em-dash — right for a table cell where "no change" and "not recorded"
    // look alike and neither is worth a row — but wrong here: "— نقطة" beside
    // a flat arrow says nothing, while "0 نقطة" says the figure has not moved
    // since that reading, which is the tile's whole job. The arrow already
    // carries the direction, so only the number is needed.
    const n = v === 0 ? '0' : fmt.delta(v);
    return `${n} ${this.lang.t('prg_pts')}`;
  }

  /**
   * Flat is its own direction and draws a dash, not an arrow. A zero movement
   * shown as "up" would be a claim the figure does not make.
   */
  private dirOf(v: number | undefined): TileDir {
    if (v === undefined || v === 0) return 'flat';
    return v > 0 ? 'up' : 'down';
  }

  // ── الأشكال 25–28's tiles ──────────────────────────────────────────────

  /**
   * The band on a tile, from `Domain/TileThreshold`. Never computed here:
   * "five points behind plan" is a judgement about ministry projects, not
   * display formatting (P-199).
   */
  st(k: keyof NonNullable<ProgressResponse['tileStates']>): TileState {
    return (this.data()?.tileStates?.[k] ?? 'none') as TileState;
  }

  /**
   * الشكل 25's financial tile has TWO notes and the plate's own rule picks
   * between them: money running more than twenty points ahead of delivery is a
   * finding, and the tile says so instead of printing the amounts.
   */
  spentNote = computed(() => {
    const d = this.data();
    if (!d) return '';

    const lead = d.headline.financial - d.headline.physical;
    if (this.st('financial') === 'bad')
      return this.lang.t('prg_t_fin_ahead').replace('{n}', fmt.pct(lead, 0));

    return this.lang.t('prg_t_spent_of')
      .replace('{a}', fmt.money(d.costImpact.disbursed))
      .replace('{b}', fmt.money(d.costImpact.revisedCost));
  });

  /** «SPI / CPI» in one figure, as the plate prints it. */
  indicesValue = computed(() => {
    const e = this.data()?.evm;
    if (!e) return '';
    return `${fmt.index(e.spi)} / ${fmt.index(e.cpi)}`;
  });

  /**
   * Both halves, always. Earned value can keep pace while the critical path
   * slips, and saying only one of those beside a +61-day delay reads as a
   * contradiction — `DModProgress` :1560 states the reasoning and the tile
   * states both.
   */
  indicesNote = computed(() => {
    const d = this.data();
    if (!d) return '';
    const { spi, cpi } = d.evm;

    const time = spi === null ? ''
      : spi < 1 ? this.lang.t('prg_t_ev_below')
      : (d.headline.delayDays ?? 0) > 0 ? this.lang.t('prg_t_ev_on_crit')
      : this.lang.t('prg_t_ev_on');

    const cost = cpi === null ? ''
      : cpi < 1 ? this.lang.t('prg_cpi_over')
      : this.lang.t('prg_cpi_within');

    return [time, cost].filter(Boolean).join(' · ');
  });

  /**
   * الشكل 26's «الأدنى 0%». A minimum SELECTS one of the percentages already
   * sent; it derives nothing, which is why it can be read here rather than
   * added to the payload.
   */
  wbsLowest = computed(() => {
    const rows = this.wbs();
    return rows.length ? Math.min(...rows.map(w => w.progress)) : 0;
  });

  /**
   * الملخص's «منحنى الإنجاز». The rows arrive as month ends and are LABELLED
   * here — `fmt.month` prints the year only when it changes, which is the same
   * helper SCR-W1's curve uses, so the two read identically.
   *
   * Empty when the server judged the series undrawable, and the tile is then
   * not rendered at all (P-144).
   */
  curve = computed<CurvePeriod[]>(() => {
    const rows = this.data()?.curve ?? [];
    return rows.map((r, i) => ({
      label: fmt.month(r.at, i === 0 ? null : rows[i - 1].at),
      planCum: r.planCum,
      actCum: r.actCum,
      planPeriod: r.planPeriod,
      actPeriod: r.actPeriod,
    }));
  });

  /** «الحد: أكثر من 10 أيام» — the threshold the list was actually filtered by. */
  atRiskOver = computed(() =>
    this.lang.t('prg_t_atrisk_over')
      .replace('{n}', String(this.scheduleRisk()?.atRiskThresholdDays ?? 0)));

  /**
   * The word beside each index. `02 §11` gives the readings; saying them in
   * words is what lets the figure stay `--on-surface-variant` and uncoloured.
   */
  spiNote = computed(() => {
    const spi = this.data()?.evm.spi;
    if (spi === null || spi === undefined) return '';
    return spi < 1 ? this.lang.t('prg_spi_behind') : this.lang.t('prg_spi_on');
  });

  cpiNote = computed(() => {
    const cpi = this.data()?.evm.cpi;
    if (cpi === null || cpi === undefined) return '';
    return cpi < 1 ? this.lang.t('prg_cpi_over') : this.lang.t('prg_cpi_within');
  });

  // ── the editor ─────────────────────────────────────────────────────────

  /** The BOQ lines an activity feeds — what a drag is about to move. */
  feeds(a: ProgressActivity): string {
    return a.boqCodes.length ? a.boqCodes.join(' · ') : '';
  }

  startEdit(a: ProgressActivity) {
    this.editing.set(a.activityId);
    this.draft.set(String(a.progressPct));
  }

  cancelEdit() {
    this.editing.set('');
    this.draft.set('');
  }

  /**
   * Blocked BEFORE the request, with the reason — `04 §9` prefers preventing
   * invalid input to reporting it afterwards. The endpoint checks the same two
   * things again, because a rule that lives only in the browser is not a rule.
   */
  draftError = computed(() => {
    const raw = this.draft().trim();
    if (raw === '') return this.lang.t('prg_err_required');

    const n = Number(raw);
    if (!isFinite(n)) return this.lang.t('prg_err_number');
    if (n < 0 || n > 100) return this.lang.t('prg_err_range');

    const a = this.activities().find(x => x.activityId === this.editing());
    if (a?.isMilestone && n !== 0 && n !== 100) return this.lang.t('prg_err_milestone');

    return '';
  });

  save(a: ProgressActivity) {
    if (this.draftError()) return;

    const next = Number(this.draft().trim());
    if (next === a.progressPct) { this.cancelEdit(); return; }

    this.saving.set(a.activityId);
    this.api.saveProgress(this.projectId(), a.activityId, next).subscribe({
      next: d => {
        this.data.set(d);
        this.saving.set('');
        this.cancelEdit();
        // What actually moved, named — the point of the screen is the
        // consequence, so the confirmation states it rather than saying "saved".
        const moved = a.boqCodes.length
          ? this.lang.t('prg_saved_reflected').replace('{n}', String(a.boqCodes.length))
          : this.lang.t('prg_saved_unlinked');
        this.toast.show(`${a.activityId} — ${moved}`);
      },
      error: e => {
        this.saving.set('');
        this.toast.show(e?.error?.messageAr && this.lang.isAr()
          ? e.error.messageAr
          : e?.error?.message ?? this.lang.t('prg_err_save'));
      },
    });
  }

  toggleLine(code: string) {
    this.openLine.update(c => (c === code ? '' : code));
  }

  /** A line nothing is linked to can never be earned — worth saying once. */
  unlinked = computed(() => this.boqLines().filter(b => b.contributors.length === 0).length);

  unlinkedTitle = computed(() =>
    this.lang.t('prg_unlinked_t').replace('{n}', String(this.unlinked())));

  statusLabel(code: string): string {
    return code ? this.lookups.label('activity-status', code) : '';
  }

  coverageLabel(code: string): string {
    return code ? this.lookups.label('allocation-coverage', code) : '';
  }

  constructor() {
    this.route.parent!.paramMap.pipe(takeUntilDestroyed()).subscribe(pm => {
      this.projectId.set(pm.get('id') ?? '');
      this.view.set('summary');
      // A new project has its own readings, so it starts at its own default
      // span rather than inheriting the last project's choice.
      this.period.set('');
      this.cancelEdit();
      this.load();
    });
  }

  load() {
    const pid = this.projectId();
    if (!pid) return;
    this.loading.set(true);
    this.error.set(null);

    forkJoin({ lookups: this.lookups.ensureLoaded(), model: this.api.get(pid) }).subscribe({
      next: ({ model }) => {
        this.data.set(model);
        // The span الشكل 25 draws selected. Only when none is held: the
        // constructor clears it when the PROJECT changes, and `save()` sets
        // `data` directly without coming through here — so reporting a
        // percentage never resets the comparison a reader had chosen.
        if (!this.period()) this.period.set(model.defaultPeriod);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.error?.message ?? e?.message ?? 'request failed');
        this.loading.set(false);
      },
    });
  }
}
