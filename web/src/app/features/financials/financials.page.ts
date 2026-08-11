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
import * as fmt from '../../core/format';
import { FinancialsApi } from './financials.api';
import { FinancialsPayment, FinancialsResponse } from './financials.types';

/**
 * SCR-W7 — the project workspace Financials module (`04 §3`).
 *
 * PORTED from the v1.1 financial module — ../epm@design/system-revamp
 * app/project-modules.jsx `DModFinancialNew` :907.
 *
 * ── THE RECONCILIATION IS THE SCREEN ──────────────────────────────────────
 * approved + approved changes = revised − disbursed = balance, every middle
 * term visible. Same shape as SCR-W3's contract register, same reason: a total
 * whose parts are hidden is a total nobody can check.
 *
 * ── FOUR FIGURES PER CERTIFICATE ──────────────────────────────────────────
 * gross − retention − advance recovery = net. Retention held is a liability
 * the MINISTRY owes; advance outstanding is one the CONTRACTOR owes. Both are
 * counted from PAID certificates only, because a recovery happens when money
 * moves and not when works are certified.
 *
 * ── TWO REFERENCE TABS ARE MISSING, ON PURPOSE (P-56) ─────────────────────
 * The annual-allocation tab and the audit-SLA tab have no source in this data
 * model. They render "unavailable + reason" rather than being invented from a
 * payment date — the treatment SCR-E1 gives physical % and SCR-E5 gave the
 * critical path (P-09).
 *
 * ── WHAT THIS COMPONENT COMPUTES ──────────────────────────────────────────
 * Nothing but display formatting. Every figure arrives derived.
 */
@Component({
  selector: 'epm-financials-page',
  standalone: true,
  imports: [IconComponent, StatusPillComponent, SummaryStripComponent, TableSkeletonComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './financials.page.html',
})
export class FinancialsPage {
  private api = inject(FinancialsApi);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  fmt = fmt;

  projectId = signal('');
  data = signal<FinancialsResponse | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);

  /** sheet · payments · diagnostics */
  view = signal<'sheet' | 'payments' | 'diagnostics'>('sheet');

  /** Which contract's three cost components are open. */
  open = signal<Record<string, boolean>>({});
  /** The payment whose detail is docked beside the register. */
  selected = signal(0);

  readonly colCount = 8;

  contracts = computed(() => this.data()?.contracts ?? []);
  payments = computed(() => this.data()?.payments ?? []);

  manyContracts = computed(() => this.contracts().length > 1);

  name(r: { nameAr: string; nameEn: string }): string {
    return this.lang.pick(r.nameAr, r.nameEn);
  }

  label(r: { labelAr: string; labelEn: string }): string {
    return this.lang.pick(r.labelAr, r.labelEn);
  }

  isOpen(id: string): boolean { return this.open()[id] !== false; }

  toggle(id: string) {
    this.open.update(o => ({ ...o, [id]: !this.isOpen(id) }));
  }

  selectedPayment = computed(() => this.payments().find(p => p.id === this.selected()));

  select(p: FinancialsPayment) {
    this.selected.update(id => (id === p.id ? 0 : p.id));
  }

  kindLabel(code: string): string { return this.lookups.label('payment-kind', code); }
  statusLabel(code: string): string { return this.lookups.label('payment-status', code); }

  /**
   * The reason a figure cannot be derived, in the viewer's language. Kept on
   * the SERVER beside the rule that owns it (P-09), so this only picks.
   */
  reason(key: string): string {
    const u = this.data()?.unavailable.find(x => x.key === key);
    return u ? this.lang.pick(u.needsAr, u.needsEn) : '';
  }

  summaryStats = computed<Stat[]>(() => {
    const t = this.data()?.totals;
    if (!t) return [];
    return [
      { label: this.lang.t('fin_revised'), value: t.revised },
      { label: this.lang.t('fin_disbursed'), value: t.disbursed, bar: t.spendPct },
      { label: this.lang.t('fin_certified_unpaid'), value: t.certified },
      { label: this.lang.t('fin_retention'), value: t.retentionHeld },
      { label: this.lang.t('fin_balance'), value: t.balance },
    ];
  });

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

  constructor() {
    this.route.parent!.paramMap.pipe(takeUntilDestroyed()).subscribe(pm => {
      this.projectId.set(pm.get('id') ?? '');
      this.view.set('sheet');
      this.selected.set(0);
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
