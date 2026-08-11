import { Component, inject, signal, computed, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { IconComponent } from '../../core/icon.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { PageHeadComponent, Crumb } from '../../shared/page-head.component';
import { PagerComponent } from '../../shared/pager.component';
import { LangService } from '../../core/lang';
import { WorkspacesService } from '../../core/workspaces';
import { ToastService } from '../../shared/toast.service';
import { ReportsApi } from './reports.api';
import { ReportRow, ReportCategory, ReportLabel, ReportProject, ReportCounts } from './reports.types';

/**
 * SCR-E7 — Reports & Analytics, the gate every defined report is run from
 * (04 §2).
 *
 * PORTED from DReports (v1.1) —
 * ../epm@design/system-revamp app/desktop-reports.jsx:58.
 *
 * ── IT IS A CATALOG, NOT A CHART BOARD ────────────────────────────────────
 * The pre-v1.1 component of the same name is four charts; v1.1 replaced it
 * with a register of the twelve reports a user can actually run. Same
 * substitution the Alerts Center went through at Phase 2.4. See P-37 — and
 * SCR-E1, which is where the charts live.
 *
 * ── NO ARITHMETIC ─────────────────────────────────────────────────────────
 * The catalog, its counts and its availability all arrive computed. This
 * component filters nothing and derives nothing: every filter is a round trip,
 * because the counts on the chips have to agree with the rows in the table and
 * only one of the two can own that arithmetic.
 *
 * ── A ROW THAT CANNOT RUN SAYS SO IN WORDS ────────────────────────────────
 * Nine of the twelve read a table this build has not registered yet. They get
 * no Run button — CLAUDE.md's rule for a gated action is an explicit note, not
 * a bare disabled button — and the note names the source and the phase.
 */
@Component({
  selector: 'epm-reports-page',
  standalone: true,
  imports: [IconComponent, TableSkeletonComponent, PageHeadComponent, PagerComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './reports.page.html',
})
export class ReportsPage {
  private api = inject(ReportsApi);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);
  workspaces = inject(WorkspacesService);
  /** The page-head actions and Run are demo stubs and say so — ToastService.demo(). */
  toast = inject(ToastService);

  rows = signal<ReportRow[]>([]);
  counts = signal<ReportCounts>({ total: 0, scheduled: 0, available: 0 });
  categories = signal<ReportCategory[]>([]);
  scopes = signal<ReportLabel[]>([]);
  frequencies = signal<ReportLabel[]>([]);
  projects = signal<ReportProject[]>([]);

  loading = signal(true);
  error = signal<string | null>(null);

  q = signal('');
  category = signal('');
  projectId = signal('');
  workspace = signal('');

  page = signal(1);
  pageSize = signal(15);

  /** Column count for the loading skeleton — must match the real table. */
  readonly colCount = 7;

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
        { label: this.lang.t('nav_reports') },
      ];
    }
    return [
      { label: this.lang.t('ministry_short') },
      { label: this.scopeName(), link: ['/workspace'], query: { ws } },
      { label: this.lang.t('nav_reports') },
    ];
  });

  /** The scoped workspace's name, from the list the switcher already loaded. */
  scopeName = computed(() => {
    const ws = this.workspaces.byCode(this.workspace());
    return ws ? this.lang.pick(ws.nameAr, ws.nameEn) : this.workspace();
  });

  /**
   * The reference's own sub line — "12 defined reports · 5 scheduled
   * automatically" — plus the figure this port can give and it cannot: how many
   * of them the system could actually produce today.
   *
   * Phrased partitively in Arabic for the same reason SCR-E5's KPI foot is:
   * «١٢ تقريراً» is right for 11–99 and wrong for 3–10, and the scoped count
   * moves between those ranges when a project is chosen. A partitive never has
   * to pick an inflection.
   */
  sub = computed(() => {
    const c = this.counts();
    return this.lang.isAr()
      ? `${c.total} من التقارير المعرّفة · ${c.scheduled} منها مجدولة تلقائياً · ${c.available} متاحة للتشغيل اليوم`
      : `${c.total} defined reports · ${c.scheduled} scheduled automatically · ${c.available} runnable today`;
  });

  isUnfiltered = computed(() => !this.q() && !this.category() && !this.projectId());

  /** The project in scope, or null for the whole catalog. */
  selectedProject = computed(() =>
    this.projects().find(p => p.id === this.projectId()) ?? null);

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
      // A project chosen in one workspace is not in scope in another.
      this.projectId.set('');
      this.load();
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list({
      q: this.q(),
      category: this.category(),
      projectId: this.projectId(),
      workspace: this.workspace(),
    }).subscribe({
      next: res => {
        this.rows.set(res.rows);
        this.counts.set(res.counts);
        this.categories.set(res.categories);
        this.scopes.set(res.scopes);
        this.frequencies.set(res.frequencies);
        this.projects.set(res.projects);
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
  setCategory(v: string) { this.category.set(this.category() === v ? '' : v); this.load(); }
  setProject(v: string) { this.projectId.set(v); this.load(); }

  clearFilters() {
    this.q.set('');
    this.category.set('');
    this.projectId.set('');
    this.load();
  }

  setPageSize(n: number) {
    this.pageSize.set(n);
    this.page.set(1);
  }

  // ── Label resolution ────────────────────────────────────────────────────
  // Every code on this screen is labelled from the response, the same way an
  // enum is labelled from EP-LKP-01. Falling back to the code is honest: it
  // means the catalog gained a value and its label did not.

  categoryLabel(code: string): string {
    const c = this.categories().find(x => x.code === code);
    return c ? this.lang.pick(c.nameAr, c.nameEn) : code;
  }

  scopeLabel(code: string): string {
    const s = this.scopes().find(x => x.code === code);
    return s ? this.lang.pick(s.nameAr, s.nameEn) : code;
  }

  frequencyLabel(code: string): string {
    const f = this.frequencies().find(x => x.code === code);
    return f ? this.lang.pick(f.nameAr, f.nameEn) : code;
  }

  /** A scheduled report gets the pill; on-demand is plain secondary text. */
  isScheduled(r: ReportRow): boolean { return r.frequency !== 'on-demand'; }

  needs(r: ReportRow): string {
    return this.lang.pick(r.needsAr ?? '', r.needsEn ?? '');
  }

  /**
   * Running a report. Rendering a PDF or an XLSX is in no phase of this build,
   * so this is a demo stub in the reference's own wording — and it only exists
   * on rows whose data the system actually holds.
   */
  run(r: ReportRow) {
    if (!r.available) return;
    const p = this.selectedProject();
    const suffix = p ? ` — ${this.lang.pick(p.nameAr, p.nameEn)}` : '';
    this.toast.demo(
      `تشغيل: ${r.titleAr}${suffix}`,
      `Running: ${r.titleEn}${suffix}`,
    );
  }
}
