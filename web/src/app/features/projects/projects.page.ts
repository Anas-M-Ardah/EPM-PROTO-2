import { Component, inject, signal, computed, ViewEncapsulation } from '@angular/core';
import { HttpClient } from '@angular/common/http';
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
  lang = inject(LangService);
  fmt = fmt;

  rows = signal<ProjectRow[]>([]);
  countByStatus = signal<Record<string, number>>({});
  loading = signal(true);
  error = signal<string | null>(null);

  q = signal('');
  status = signal('');

  /** True only when the database itself is empty, not when a filter excluded everything. */
  isUnfiltered = computed(() => !this.q() && !this.status());

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
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    this.api.list({ q: this.q(), status: this.status() }).subscribe({
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
