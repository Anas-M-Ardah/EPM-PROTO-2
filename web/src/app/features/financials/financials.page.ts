import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { SummaryStripComponent, Stat } from '../../shared/summary-strip.component';
import { SectionComponent } from '../../shared/section.component';
import { FieldGroupComponent } from '../../shared/field-group.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { PersonaService } from '../../core/persona';
import { PaymentWizard } from './payment.wizard';
import { LangService } from '../../core/lang';
import { ToastService } from '../../shared/toast.service';
import { LookupsService } from '../../core/lookups';
import * as fmt from '../../core/format';
import { FinancialsApi } from './financials.api';
import { FinancialsAuditStage, FinancialsPayment, FinancialsResponse } from './financials.types';

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
  imports: [IconComponent, StatusPillComponent, SummaryStripComponent, TableSkeletonComponent,
    SectionComponent, FieldGroupComponent, PaymentWizard],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './financials.page.html',
})
export class FinancialsPage {
  private api = inject(FinancialsApi);
  private persona = inject(PersonaService);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);
  toast = inject(ToastService);
  lookups = inject(LookupsService);
  fmt = fmt;

  projectId = signal('');
  data = signal<FinancialsResponse | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);

  /** sheet · payments · diagnostics */
  /**
   * الشكل 14 — «ستة تبويبات». Four are figures of their own that are not built
   * (الأشكال 15 · 17 · 18 · 19); they render a named empty state rather than
   * being left off a strip the document draws.
   */
  readonly tabs = [
    { k: 'sheet', label: 'fin_tab_sheet', needs: '' },
    { k: 'allocation', label: 'fin_tab_alloc', needs: '' },
    { k: 'payments', label: 'fin_tab_payments', needs: '' },
    { k: 'sla', label: 'fin_tab_sla', needs: '' },
    { k: 'records', label: 'fin_tab_records', needs: 'fin_tab_records_needs' },
    { k: 'changes', label: 'fin_tab_changes', needs: 'fin_tab_changes_needs' },
  ] as const;

  view = signal<string>('sheet');

  /** The tab in view when it is one of the four with nothing behind it yet. */
  unbuiltTab = computed(() =>
    this.tabs.find(t => t.k === this.view() && t.needs !== '') ?? null);

  // ── الشكل 17 — مهل التدقيق ───────────────────────────────────────────

  /**
   * The stage dot. `.d-sev-dot` is the severity marker the alerts screens
   * use, so a late desk here reads the same as a late anything else — and it
   * is never the only carrier: the card states its cap and its elapsed days
   * in words beside it (05 §7.6).
   */
  stageDot(state: string): string {
    switch (state) {
      case 'overdue': return 'high';
      case 'current': return 'medium';
      case 'done': return 'low';
      default: return 'none';
    }
  }

  /** What a stage card says on its left: «منجز» · «5ي مضت» · «لم تبدأ». */
  stageLabel(st: FinancialsAuditStage): string {
    if (st.state === 'done') return this.lang.t('fin_sla_done');
    if (st.elapsedDays === null) return this.lang.t('fin_sla_waiting');
    return `${st.elapsedDays} ${this.lang.t('fin_sla_elapsed')}`;
  }

  // ── الشكل 16 — سجل الدفعات ───────────────────────────────────────────

  /**
   * The open funding letter, by its number. A LETTER and not a certificate:
   * this register's row is what the ministry released money against, and one
   * letter can cover several contracts (P-94).
   */
  openLetter = signal('');

  selectedLetter = computed(() =>
    (this.data()?.letters ?? []).find(l => l.letterNo === this.openLetter()) ?? null);

  lettersTotal = computed(() =>
    (this.data()?.letters ?? []).reduce((s, l) => s + l.net, 0));

  // ── الشكل 15 — التخصيص السنوي ────────────────────────────────────────

  /**
   * The year the card leads with: the one the filter is on, or the newest
   * recorded. «السنة الحالية» is what the plate labels it, and «الحالية» means
   * the latest RECORDED year — not the wall clock's (D-06).
   */
  currentAllocation = computed(() => {
    const all = this.data()?.allocations ?? [];
    if (!all.length) return null;
    const y = this.year();
    return (y !== null ? all.find(a => a.year === y) : null) ?? all[0];
  });

  /**
   * The «صف إجمالي». The consumption total is Σ spent ÷ Σ allocated and NOT
   * the average of the per-year percentages: a 100%-consumed year of 12M and
   * a 10%-consumed year of 300M do not average to 55% of anything.
   */
  allocTotals = computed(() => {
    const all = this.data()?.allocations ?? [];
    const allocated = all.reduce((s, a) => s + a.allocated, 0);
    const spent = all.reduce((s, a) => s + a.spent, 0);
    return {
      allocated,
      spent,
      remaining: allocated - spent,
      pct: allocated > 0 ? (spent / allocated) * 100 : null,
    };
  });

  /** A bar width — display geometry, clamped (CLAUDE.md §3.1). */
  bar(pct: number): number { return Math.max(0, Math.min(100, pct)); }

  /** «مرشح السنة» — null is «كل السنوات». The server filters; this only asks. */
  year = signal<number | null>(null);

  setYear(y: number | null) {
    if (this.year() === y) return;
    this.year.set(y);
    this.load();
  }

  // «صفوف عقود قابلة للطي لعرض المكوّنات» reuses the page's own open()/toggle()
  // rather than a second collapse map — the components tree and the payment
  // groups are the same interaction.

  /**
   * The forecast column's total — Σ of the contracts that HAVE one. Null when
   * none does: a project nobody has spent on is not forecast to cost nothing
   * (P-09), and a partial sum under a full column would read as one.
   */
  forecastTotal = computed(() => {
    const withF = (this.data()?.contracts ?? []).filter(c => c.forecast !== null);
    return withF.length ? withF.reduce((a, c) => a + (c.forecast ?? 0), 0) : null;
  });

  varianceTotal = computed(() => {
    const f = this.forecastTotal();
    if (f === null) return null;
    const withF = (this.data()?.contracts ?? []).filter(c => c.forecast !== null);
    return withF.reduce((a, c) => a + c.revised, 0) - f;
  });

  /**
   * «(132,620,402)» — the plate prints an overrun in parentheses, which is the
   * accounting convention and NOT a colour: 05 §7.9 keeps the magnitude
   * neutral and lets the notation carry the sign.
   */
  paren(v: number): string {
    return v < 0 ? `(${this.fmt.money(-v)})` : this.fmt.money(v);
  }

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

  // ── ملحق الشكل 20 — «تسجيل دفعة» ───────────────────────────────────────

  payOpen = signal(false);

  /**
   * P-96 — the capacity that raises a certificate. Mirrors
   * `Personas.CanRegisterPayment` exactly: the party that MEASURES the works is
   * the party that raises the certificate against them, so دائرة المهندس المقيم
   * and مدير المشروع, and not المستخدم المختص who defined the contract.
   *
   * The server checks it too — this only decides whether the button is drawn,
   * and what it draws instead is the REASON rather than nothing.
   */
  canRegister = computed(() =>
    this.persona.current()?.party === 'دائرة المهندس المقيم'
    || this.persona.current()?.party === 'مدير المشروع');

  paymentRegistered() {
    this.payOpen.set(false);
    this.toast.show(this.lang.t('pay_w_registered'));
    this.load();
  }

  load() {
    const pid = this.projectId();
    if (!pid) return;
    this.loading.set(true);
    this.error.set(null);

    forkJoin({ lookups: this.lookups.ensureLoaded(), model: this.api.get(pid, this.year()) }).subscribe({
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
