import { Component, inject, signal, computed, ViewEncapsulation } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute } from '@angular/router';
import { IconComponent } from '../../core/icon.component';
import { LangService } from '../../core/lang';
import * as fmt from '../../core/format';
import { ProjectsApi } from './projects.api';
import { ProjectRow } from './projects.types';

/**
 * SCR-E2 — Projects, the cross-portfolio list (04 §2).
 *
 * ── STYLING ───────────────────────────────────────────────────────────────
 * Every class here comes from src/styles/desktop.css, copied verbatim from the
 * reference prototype. There is NO component CSS. encapsulation: None so the
 * global sheet applies. Do not invent classes — look in desktop.css first.
 *
 * ── NO ARITHMETIC ─────────────────────────────────────────────────────────
 * `value` arrives computed from Domain/ProjectValue.cs. This component formats
 * and filters; it never calculates a business figure.
 *
 * ── STATES (04 §9) ────────────────────────────────────────────────────────
 * loading · error · empty-because-no-data · empty-because-filtered are four
 * DIFFERENT states with four different messages. The database starts empty, so
 * the empty state is load-bearing, not decoration.
 */
@Component({
  selector: 'epm-projects-page',
  standalone: true,
  imports: [IconComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './projects.page.html',
})
export class ProjectsPage {
  private api = inject(ProjectsApi);
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);
  fmt = fmt;

  rows = signal<ProjectRow[]>([]);
  countByStatus = signal<Record<string, number>>({});
  loading = signal(true);
  error = signal<string | null>(null);

  q = signal('');
  status = signal('');

  /**
   * SCOPE. Null/empty = the enterprise view (every workspace). A workspace code
   * = that workspace only, reached as /projects?ws=ub.
   *
   * The reference calls this `scopeWs` and THREE things depend on it
   * (enterprise-areas.jsx:130, :141, :145):
   *   1. the heading — نص "كل المشاريع" vs "المشاريع"
   *   2. the subtitle — the workspace's name vs the cross-portfolio line
   *   3. the مساحة العمل column, which is HIDDEN when scoped because every row
   *      would repeat the same value
   */
  workspace = signal('');

  /** Enterprise view only. Reference: `{!scopeWs && <th>…}` */
  showWorkspaceCol = computed(() => !this.workspace());

  /** Column count for the loading skeleton — follows showWorkspaceCol. */
  colCount = computed(() => (this.showWorkspaceCol() ? 7 : 6));

  /** Subtitle is the workspace's own name when scoped; rows carry it. */
  scopeName = computed(() => {
    const first = this.rows()[0];
    if (!first) return this.workspace();
    return this.lang.pick(first.workspaceNameAr, first.workspaceNameEn);
  });

  /** True only when the database itself is empty, not when a filter excluded everything. */
  isUnfiltered = computed(() => !this.q() && !this.status());

  /** The "الكل / All" chip's count — every status added up. */
  totalCount = computed(() =>
    Object.values(this.countByStatus()).reduce((a, b) => a + b, 0));

  /** Chip count for one status. 0 when the API reported none. */
  count(code: string): number {
    return this.countByStatus()[code] ?? 0;
  }

  /** 06 §1 — the five-state canonical set. Labels belong in the Lookups table
   *  once that page exists; inline here so PAGE-01 stays self-contained. */
  readonly statuses = [
    { code: 'ongoing',   ar: 'مستمر',  en: 'Ongoing' },
    { code: 'completed', ar: 'منجز',   en: 'Completed' },
    { code: 'delayed',   ar: 'متأخر',  en: 'Delayed' },
    { code: 'suspended', ar: 'متوقف',  en: 'Suspended' },
    { code: 'cancelled', ar: 'ملغى',   en: 'Cancelled' },
  ];

  constructor() {
    // /projects?ws=ub scopes the page to one workspace.
    this.route.queryParamMap.subscribe(p => {
      this.workspace.set(p.get('ws') ?? '');
      this.load();
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list({ q: this.q(), status: this.status(), workspace: this.workspace() }).subscribe({
      next: r => {
        this.rows.set(r.rows);
        this.countByStatus.set(r.countByStatus);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.message ?? 'request failed');
        this.loading.set(false);
      },
    });
  }

  onSearch(v: string) { this.q.set(v); this.load(); }
  setStatus(v: string) { this.status.set(v); this.load(); }
  clearFilters() { this.q.set(''); this.status.set(''); this.load(); }

  statusLabel(code: string) {
    const s = this.statuses.find(x => x.code === code);
    return s ? this.lang.pick(s.ar, s.en) : code;
  }

  /**
   * The API speaks the CANONICAL status keys from 06 §1 (delayed, cancelled).
   * The copied stylesheet was written against the reference prototype's older
   * internal keys and only defines .d-pill.stalled / .d-pill.withdrawn.
   *
   * Map here rather than renaming either side: the spec keys are correct and
   * must not be bent to the CSS, and editing the verbatim stylesheet would
   * break the "copied, not re-derived" guarantee. Recorded in DECISIONS.md.
   */
  statusClass(code: string) {
    return { delayed: 'stalled', cancelled: 'withdrawn' }[code] ?? code;
  }

  /** Loads the demo fixture. Prototype affordance only — see Fixture.cs. */
  loadFixture() {
    this.loading.set(true);
    this.http.post('/api/dev/load-fixture', {}).subscribe({
      next: () => this.load(),
      error: () => this.load(),
    });
  }
}
