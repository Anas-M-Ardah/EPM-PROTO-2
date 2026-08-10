import { Component, inject, signal, computed, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { PageHeadComponent, Crumb } from '../../shared/page-head.component';
import { PagerComponent } from '../../shared/pager.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { ContractsApi } from './contracts.api';
import { ContractRow } from './contracts.types';

/**
 * SCR-E3 — Contracts, the cross-portfolio list (04 §2).
 *
 * PORTED from DContractsAll (v1.1) —
 * docs/spec/reference/app/enterprise-areas.jsx:299.
 *
 * ── NO ARITHMETIC ─────────────────────────────────────────────────────────
 * `effectiveValue` and `projectedValue` arrive computed from Domain/Amendments.cs
 * (BR-09). This component formats and filters; it never derives a figure.
 *
 * ── THE ONE THING THIS SCREEN MUST NOT GET WRONG ──────────────────────────
 * The value column shows the EFFECTIVE value — original plus APPLIED
 * amendments. Approved-but-unapplied orders are a projection (02 §9) and are
 * shown as a separate, labelled note on the row, never added into the figure.
 * Conflating them overstates what the ministry is committed to, which is the
 * single most consequential error this system exists to prevent.
 */
@Component({
  selector: 'epm-contracts-page',
  standalone: true,
  imports: [
    IconComponent, StatusPillComponent, TableSkeletonComponent,
    PageHeadComponent, PagerComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './contracts.page.html',
})
export class ContractsPage {
  private api = inject(ContractsApi);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  /** The page-head actions are demo stubs and say so — ToastService.demo(). */
  toast = inject(ToastService);
  fmt = fmt;

  rows = signal<ContractRow[]>([]);
  countByStatus = signal<Record<string, number>>({});
  loading = signal(true);
  error = signal<string | null>(null);

  q = signal('');
  status = signal('');
  workspace = signal('');

  page = signal(1);
  pageSize = signal(15);

  /**
   * 06 §4 — the EXTENDED nine-value contract list, not the five-state project
   * set. A contract can be «لم يباشر به» or «تسوية حسابات»; a project cannot.
   * Asking for the right kind is the point of having two (see lookups.md §7).
   */
  statuses = computed(() => this.lookups.list('contract-status'));

  crumbs = computed<Crumb[]>(() => [
    { label: this.lang.t('ministry_short') },
    { label: this.lang.t('nav_contracts_all') },
  ]);

  isUnfiltered = computed(() => !this.q() && !this.status());

  totalCount = computed(() =>
    Object.values(this.countByStatus()).reduce((a, b) => a + b, 0));

  count(code: string): number {
    return this.countByStatus()[code] ?? 0;
  }

  /** Chips for statuses that actually occur, plus any that are selected. */
  activeStatuses = computed(() =>
    this.statuses().filter(s => this.count(s.code) > 0 || this.status() === s.code));

  pageRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.rows().slice(start, start + this.pageSize());
  });

  resultLabel = computed(() => {
    const n = this.rows().length;
    return this.lang.isAr() ? `${n} نتيجة` : `${n} result${n === 1 ? '' : 's'}`;
  });

  /** Column count for the loading skeleton — must match the real table. */
  readonly colCount = 8;

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
      res: this.api.list({ q: this.q(), status: this.status(), workspace: this.workspace() }),
    }).subscribe({
      next: ({ res }) => {
        this.rows.set(res.rows);
        this.countByStatus.set(res.countByStatus);
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
  setStatus(v: string) { this.status.set(v); this.load(); }
  clearFilters() { this.q.set(''); this.status.set(''); this.load(); }

  setPageSize(n: number) {
    this.pageSize.set(n);
    this.page.set(1);
  }

  /**
   * The signed delta between the awarded value and the value in force.
   * Null when nothing has been applied — an unamended contract shows no delta
   * rather than a "+0", which would imply an amendment happened.
   */
  amendedBy(r: ContractRow): number | null {
    return r.amendmentCount === 0 ? null : r.effectiveValue - r.originalValue;
  }

  /** The projection note (02 §9) — only when something is approved and unapplied. */
  pendingDelta(r: ContractRow): number | null {
    return r.pendingCount === 0 ? null : r.projectedValue - r.effectiveValue;
  }
}
