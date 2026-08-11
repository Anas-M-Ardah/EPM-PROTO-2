import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { SectionComponent } from '../../shared/section.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { ContractTabApi } from './contract.api';
import {
  AmendmentVersion, ContractDetail, ContractMoney, ContractPayment,
  ContractRegisterTotals, ContractRow, ContractUnavailable, PenaltyImpact,
} from './contract.types';

/**
 * SCR-W3 — the project workspace Contract module (`04 §7`).
 *
 * PORTED from DModContractNew + DContractAmendments (v1.1) —
 * ../epm@design/system-revamp app/project-modules.jsx:363 and
 * app/contract-amendments.jsx:301.
 *
 * ── THE SCREEN WHERE APPROVED ≠ APPLIED IS THE SUBJECT ────────────────────
 * Three values, three meanings, never mixed: the awarded original, the
 * EFFECTIVE value in force (BR-09), and the PROJECTION if every approved-but-
 * unapplied amendment were applied (`02 §9`). The projection has its own line
 * everywhere it appears and is never summed into the effective figure.
 *
 * ── THE SELECTED CONTRACT IS THE URL, THE SUB-TAB IS NOT ──────────────────
 * `/projects/:id/contract/:contractId` — a contract is a record, and a link to
 * one has to survive being pasted, the same argument `?ws=` settles for scope.
 * The four sub-tabs are views OF that record, not records, so they stay in
 * component state; putting them in the URL would make "which tab was I on"
 * part of a shared link, which is noise.
 *
 * ── NO ARITHMETIC ─────────────────────────────────────────────────────────
 * The chain, the penalty comparison and every total arrive computed. The one
 * thing computed here is a bar width, which is display geometry.
 */
@Component({
  selector: 'epm-contract-page',
  standalone: true,
  imports: [
    IconComponent, StatusPillComponent, SectionComponent, TableSkeletonComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './contract.page.html',
})
export class ContractPage {
  private api = inject(ContractTabApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  toast = inject(ToastService);
  fmt = fmt;

  projectId = signal('');
  contractId = signal('');

  rows = signal<ContractRow[]>([]);
  totals = signal<ContractRegisterTotals | null>(null);
  countByStatus = signal<Record<string, number>>({});

  contract = signal<ContractDetail | null>(null);
  money = signal<ContractMoney | null>(null);
  versions = signal<AmendmentVersion[]>([]);
  pending = signal<AmendmentVersion[]>([]);
  penalty = signal<PenaltyImpact | null>(null);
  payments = signal<ContractPayment[]>([]);
  unavailable = signal<ContractUnavailable[]>([]);

  loading = signal(true);
  error = signal<string | null>(null);

  /** overview · details · payments · amendments */
  tab = signal('overview');

  readonly colCount = 7;

  /**
   * A project with exactly one contract goes straight to it — a register of
   * one row is a click that tells you nothing, and the reference does the
   * same. The back button then has nothing to go back to, so it is not shown.
   */
  singleContract = computed(() => this.rows().length === 1);

  showRegister = computed(() => !this.contractId() && !this.singleContract());

  /** The contract being shown: the URL's, or the only one there is. */
  private effectiveContractId = computed(() =>
    this.contractId() || (this.singleContract() ? this.rows()[0].id : ''));

  spentPct = computed(() => {
    const t = this.totals();
    if (!t || t.effectiveValue === 0) return 0;
    return Math.round((t.disbursed / t.effectiveValue) * 100);
  });

  detailSpentPct = computed(() => {
    const c = this.contract(); const m = this.money();
    if (!c || !m || c.effectiveValue === 0) return 0;
    return Math.round((m.disbursed / c.effectiveValue) * 100);
  });

  /** True when the amendments moved the value, the finish, or both. */
  amended = computed(() => {
    const c = this.contract();
    return !!c && (c.effectiveValue !== c.originalValue || c.effectiveFinish !== c.originalFinish);
  });

  hasProjection = computed(() => this.pending().length > 0);

  constructor() {
    // :id is the parent's, :contractId is this route's — and the parent
    // outlives this component, so both need takeUntilDestroyed (P-42).
    combineLatest([
      this.route.parent!.paramMap,
      this.route.paramMap,
    ]).pipe(takeUntilDestroyed()).subscribe(([parent, own]) => {
      this.projectId.set(parent.get('id') ?? '');
      this.contractId.set(own.get('contractId') ?? '');
      this.tab.set('overview');
      this.load();
    });
  }

  load() {
    const pid = this.projectId();
    if (!pid) return;
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      lookups: this.lookups.ensureLoaded(),
      reg: this.api.register(pid),
    }).subscribe({
      next: ({ reg }) => {
        this.rows.set(reg.rows);
        this.totals.set(reg.totals);
        this.countByStatus.set(reg.countByStatus);

        const cid = this.effectiveContractId();
        if (!cid) { this.clearDetail(); this.loading.set(false); return; }

        this.api.detail(pid, cid).subscribe({
          next: d => {
            this.contract.set(d.contract);
            this.money.set(d.money);
            this.versions.set(d.versions);
            this.pending.set(d.pending);
            this.penalty.set(d.penalty);
            this.payments.set(d.payments);
            this.unavailable.set(d.unavailable);
            this.loading.set(false);
          },
          error: e => {
            this.error.set(e?.error?.message ?? e?.message ?? 'request failed');
            this.loading.set(false);
          },
        });
      },
      error: e => {
        this.error.set(e?.error?.message ?? e?.message ?? 'request failed');
        this.loading.set(false);
      },
    });
  }

  private clearDetail() {
    this.contract.set(null);
    this.money.set(null);
    this.versions.set([]);
    this.pending.set([]);
    this.penalty.set(null);
    this.payments.set([]);
  }

  private qp() {
    const ws = this.route.snapshot.queryParamMap.get('ws');
    return ws ? { ws } : {};
  }

  open(row: ContractRow) {
    this.router.navigate(['/projects', this.projectId(), 'contract', row.id],
      { queryParams: this.qp() });
  }

  backToRegister() {
    this.router.navigate(['/projects', this.projectId(), 'contract'],
      { queryParams: this.qp() });
  }

  need(key: string): string {
    const u = this.unavailable().find(x => x.key === key);
    return u ? this.lang.pick(u.needsAr, u.needsEn) : '';
  }

  /** The chain's state pill. `06 §8` codes, labelled from the lookups. */
  stateLabel(v: AmendmentVersion): string {
    return this.lookups.label('amendment-state', v.state);
  }

  /** The reference's own class map for the chain pill. */
  stateClass(v: AmendmentVersion): string {
    switch (v.state) {
      case 'effective': return 'completed';
      case 'pending': return 'suspended';
      case 'partial': return 'ongoing';
      default: return '';
    }
  }

  /**
   * Row 0's label comes from the `amendment-state` lookup rather than a chrome
   * key: «العقد الأصلي» is already that list's label for `original`, and having
   * two sources for one string is how they drift apart.
   */
  versionLabel(v: AmendmentVersion): string {
    if (v.no === 0) return this.lookups.label('amendment-state', 'original');
    return this.lang.isAr() ? `ملحق عقد رقم ${v.no}` : `Amendment no. ${v.no}`;
  }

  /** Only the rate is a percentage; the amounts are money. */
  ratePct(v: number): string {
    return (v * 100).toFixed(1).replace(/\.0$/, '') + '%';
  }

  statusCount(code: string): number { return this.countByStatus()[code] ?? 0; }
  statusCodes = computed(() => Object.keys(this.countByStatus()));
}
