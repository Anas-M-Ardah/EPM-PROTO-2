import {
  Component, ViewEncapsulation, computed, effect, inject, signal, untracked,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconComponent } from '../../core/icon.component';
import { SectionComponent } from '../../shared/section.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { LangService } from '../../core/lang';
import { ToastService } from '../../shared/toast.service';
import { ProjectReportsApi } from './project-reports.api';
import { ProjectReportRow, ProjectReportsResponse } from './project-reports.types';

/**
 * SCR-W14 — التقارير والتحليلات, the project tab · `04 §3`.
 *
 * ── THE SAME CATALOGUE AS SCR-E7, A SHARPER QUESTION ──────────────────────
 * There is one list of the reports this system defines. The enterprise
 * register asks whether a report can be produced AT ALL; this tab asks whether
 * it can be produced FOR THIS PROJECT — every source it reads must have rows
 * here. RPT-09 «الأوامر التغييرية» is available ministry-wide the moment the
 * table exists, and on a project with no change order there is still nothing
 * to print.
 *
 * ── AN UNAVAILABLE ROW NAMES WHAT IS EMPTY ────────────────────────────────
 * Never a greyed-out button with no explanation: the row says which source has
 * no rows on this project, which is either something to go and record or a
 * phase that has not arrived. Same contract as SCR-E1's EVM tiles and SCR-E7's
 * own register (P-09, P-38).
 *
 * ── RUNNING ONE IS NOT BUILT ──────────────────────────────────────────────
 * No PDF and no XLSX is produced in any phase of this build, so the button
 * says «تجريبي» rather than doing nothing quietly.
 */
@Component({
  selector: 'epm-project-reports-page',
  standalone: true,
  imports: [IconComponent, SectionComponent, TableSkeletonComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './project-reports.page.html',
})
export class ProjectReportsPage {
  private api = inject(ProjectReportsApi);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);
  /** «تشغيل» and «تصدير» are demo stubs and say so. */
  toast = inject(ToastService);

  /** التقرير · الفئة · الدورية · المصادر · الحالة. */
  readonly colCount = 5;

  projectId = signal('');
  data = signal<ProjectReportsResponse | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);

  category = signal('all');
  /** Off by default: the register's job is to show everything it defines. */
  availableOnly = signal(false);

  rows = computed(() => this.data()?.rows ?? []);

  title(r: ProjectReportRow): string { return this.lang.pick(r.titleAr, r.titleEn); }
  description(r: ProjectReportRow): string {
    return this.lang.pick(r.descriptionAr, r.descriptionEn);
  }
  missing(r: ProjectReportRow): string {
    return this.lang.pick(r.missingAr ?? '', r.missingEn ?? '');
  }
  sourceName(s: { nameAr: string; nameEn: string }): string {
    return this.lang.pick(s.nameAr, s.nameEn);
  }

  /** Category and frequency labels come from the CATALOGUE, not from Lookups. */
  categoryLabel(code: string): string {
    if (code === 'all') return this.lang.t('prp_all');
    const c = this.data()?.categories.find(x => x.code === code);
    return c ? this.lang.pick(c.nameAr, c.nameEn) : code;
  }

  frequencyLabel(code: string): string {
    return code === 'weekly' ? this.lang.t('prp_weekly')
      : code === 'monthly' ? this.lang.t('prp_monthly')
      : this.lang.t('prp_ondemand');
  }

  shown = computed(() => {
    const c = this.category();
    const only = this.availableOnly();
    return this.rows().filter(r => {
      if (c !== 'all' && r.category !== c) return false;
      if (only && !r.available) return false;
      return true;
    });
  });

  filtered = computed(() => this.category() !== 'all' || this.availableOnly());

  clearFilters() {
    this.category.set('all');
    this.availableOnly.set(false);
  }

  run(r: ProjectReportRow) {
    if (!r.available) return;
    this.toast.demo(`تشغيل ${r.titleAr}`, `Run ${r.titleEn}`);
  }

  constructor() {
    this.route.parent!.paramMap.pipe(takeUntilDestroyed()).subscribe(pm => {
      this.projectId.set(pm.get('id') ?? '');
      this.clearFilters();
    });

    effect(() => {
      const pid = this.projectId();
      if (pid) untracked(() => this.load());
    });
  }

  load() {
    const pid = this.projectId();
    if (!pid) return;
    this.loading.set(true);
    this.error.set(null);

    this.api.list(pid).subscribe({
      next: model => {
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
