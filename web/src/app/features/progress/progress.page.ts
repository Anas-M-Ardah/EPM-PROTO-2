import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { SummaryStripComponent, Stat } from '../../shared/summary-strip.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { LangService } from '../../core/lang';
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
 */
@Component({
  selector: 'epm-progress-page',
  standalone: true,
  imports: [IconComponent, StatusPillComponent, SummaryStripComponent, TableSkeletonComponent],
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
  view = signal<'summary' | 'activities' | 'boq'>('summary');

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

  summaryStats = computed<Stat[]>(() => {
    const d = this.data();
    if (!d) return [];
    const h = d.headline;
    return [
      { label: this.lang.t('prg_physical'), value: h.physical, suffix: '%' },
      { label: this.lang.t('prg_planned'), value: h.planned, suffix: '%' },
      { label: this.lang.t('prg_financial'), value: h.financial, suffix: '%' },
      // The leading space is deliberate and is what SCR-E5 does: a unit word
      // butted against its figure reads as one token in both scripts.
      { label: this.lang.t('prg_gap'), value: this.gap(), suffix: ' ' + this.lang.t('prg_pts') },
      {
        label: this.lang.t('prg_delay'),
        value: h.delayDays ?? 0,
        suffix: ' ' + this.lang.t('scd_days'),
      },
    ];
  });

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
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.error?.message ?? e?.message ?? 'request failed');
        this.loading.set(false);
      },
    });
  }
}
