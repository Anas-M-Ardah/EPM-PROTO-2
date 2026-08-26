import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { SectionComponent } from '../../shared/section.component';
import { ModuleBarComponent } from '../../shared/module-bar.component';
import { FieldGroupComponent } from '../../shared/field-group.component';
import { FieldGridComponent, Field } from '../../shared/field-grid.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { PersonaService } from '../../core/persona';
import { PaymentWizard } from './payment.wizard';
import { LangService } from '../../core/lang';
import { ToastService } from '../../shared/toast.service';
import { LookupsService } from '../../core/lookups';
import * as fmt from '../../core/format';
import { FinancialsApi } from './financials.api';
import { FinancialRecordsInput, FinancialsAuditStage, FinancialsResponse } from './financials.types';

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
 * ── TWO BASES, AND الشكل 14 USES BOTH ─────────────────────────────────────
 * The reconciliation strip reads the RECORDED budget — الشكل 18's pair — and
 * the sheet's footer totals the CONTRACTS' commitments. «أساسا القياس» exists
 * to set the two against each other. Where no budget is recorded the strip
 * falls back to commitments and SAYS which basis it is on.
 *
 * ── THREE WRITES, EACH GATED ON A DIFFERENT PARTY ─────────────────────────
 * «تسجيل دفعة» belongs to دائرة المهندس المقيم or مدير المشروع (P-96);
 * «إطلاق المعاملة» belongs to the party that owns the DESK holding the file;
 * «تعديل» on الشكل 18 belongs to الدائرة المالية alone (§7). Every one of the
 * three checks is the server's — these only decide whether a control is drawn,
 * and what is drawn instead is the reason.
 *
 * ── WHAT THIS COMPONENT COMPUTES ──────────────────────────────────────────
 * Nothing but display formatting. Every figure arrives derived.
 */
@Component({
  selector: 'epm-financials-page',
  standalone: true,
  imports: [IconComponent, StatusPillComponent, TableSkeletonComponent,
    SectionComponent, ModuleBarComponent, FieldGroupComponent, FieldGridComponent, PaymentWizard],
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

  /** الشكل 14 — «ستة تبويبات», الأشكال 14 · 15 · 16 · 17 · 18 · 19 in order. */
  readonly tabs = [
    { k: 'sheet', label: 'fin_tab_sheet' },
    { k: 'allocation', label: 'fin_tab_alloc' },
    { k: 'payments', label: 'fin_tab_payments' },
    { k: 'sla', label: 'fin_tab_sla' },
    { k: 'records', label: 'fin_tab_records' },
    { k: 'changes', label: 'fin_tab_changes' },
  ] as const;

  view = signal<string>('sheet');

  // ── الشكل 18 — «البيانات المالية المسجّلة» ────────────────────────────

  /**
   * The card's eight values, as `epm-field-grid` fields. GATHERED, not
   * computed: every figure arrives from the server, and this method chooses a
   * label and a flag for each — which is display formatting, the only thing
   * Angular is allowed to do here (CLAUDE.md §3.1).
   *
   * The three the figure tags «مقترح» come from `records.suggested`, so the
   * server owns which fields wear the tag and the card cannot drift from it.
   */
  recordFields = computed<Field[]>(() => {
    const r = this.data()?.records;
    if (!r) return [];
    const sug = (k: string) => r.suggested.includes(k);

    // A field is editable only if the SERVER lists it, and the annual
    // allocation loses that even for الدائرة المالية when its year is closed —
    // «السنوات السابقة سجل مقفل» (الشكل 15). A control the save would refuse is
    // worse than no control.
    const locked = (key: string) =>
      !r.editable.includes(key) || (key === 'annualAllocation' && r.yearLocked);

    const draft = this.draft();

    const money = (key: string, label: string, v: number | null): Field => ({
      key, label,
      value: v === null ? null : fmt.money(v),
      // The RAW stored value while editing — digits, never thousands
      // separators, as `field-grid.component.ts` requires.
      raw: key in draft ? draft[key] : (v === null ? '' : String(v)),
      numeric: true, unit: this.lang.t('cur_iqd'),
      proposed: sug(key), readonly: locked(key),
      error: this.fieldError()?.field === key ? this.fieldError()!.message : null,
    });

    return [
      // «نجمة على الحقل الإلزامي» — المعدلة is the figure every other screen
      // reads against, so it is the one the card marks required.
      { ...money('approvedCost', this.lang.t('fin_rec_approved'), r.approvedCost) },
      { ...money('revisedCost', this.lang.t('fin_rec_revised'), r.revisedCost), required: true },
      money('annualAllocation', this.lang.t('fin_rec_alloc'), r.annualAllocation),
      money('spentYear', this.lang.t('fin_rec_spent_year'), r.spentYear),
      money('spentToDate', this.lang.t('fin_rec_spent_todate'), r.spentToDate),
      money('retentionHeld', this.lang.t('fin_rec_retention'), r.retentionHeld),
      {
        key: 'transferState', label: this.lang.t('fin_rec_transfer'),
        // Null prints «غير متاح» — «لا يوجد» is a RECORDED value and stating it
        // where nothing was recorded asserts a fact nobody checked (P-179).
        value: r.transferState === null ? null : this.lookups.label('transfer-state', r.transferState),
        raw: 'transferState' in draft ? draft['transferState'] : (r.transferState ?? ''),
        options: this.lookups.list('transfer-state')
          .map(o => ({ code: o.code, label: this.lang.pick(o.nameAr, o.nameEn) })),
        proposed: sug('transferState'), readonly: locked('transferState'),
      },
      {
        key: 'plannedProgressPct', label: this.lang.t('fin_rec_planned'),
        value: r.plannedProgressPct === null ? null : fmt.pct(r.plannedProgressPct, 0),
        numeric: true, proposed: sug('plannedProgressPct'), readonly: true,
      },
    ];
  });

  // ── ملحق الشكل 18 — «تعديل» ──────────────────────────────────────────

  editing = signal(false);

  /**
   * What the person has typed, by field key. Only keys PRESENT here are sent,
   * which is what makes «omitted» and «cleared» two different requests — the
   * server logs them differently and one of them clears a recorded figure.
   */
  draft = signal<Record<string, string>>({});

  /** A 422 from `EP-FIN-04`, shown in the cell that caused it. */
  fieldError = signal<{ field: string; message: string } | null>(null);

  saving = signal(false);

  /**
   * §7's capacity, mirrored. The server refuses the call regardless; this
   * decides whether «تعديل» is drawn, and the reason is printed where it
   * would be (the P-96 treatment `canRegister` already uses).
   */
  canEditRecords = computed(() => this.data()?.records.canEdit === true);

  beginEdit() {
    this.draft.set({});
    this.fieldError.set(null);
    this.editing.set(true);
  }

  cancelEdit() {
    this.draft.set({});
    this.fieldError.set(null);
    this.editing.set(false);
  }

  setField(e: { key: string; value: string }) {
    this.draft.update(d => ({ ...d, [e.key]: e.value }));
    if (this.fieldError()?.field === e.key) this.fieldError.set(null);
  }

  saveRecords() {
    const r = this.data()?.records;
    if (!r || this.saving()) return;

    const d = this.draft();
    const num = (k: string) => {
      const raw = (d[k] ?? '').trim();
      // Emptied means CLEARED, not zero — `{ value: null }` and the log says so.
      return { value: raw === '' ? null : Number(raw) };
    };

    const body: FinancialRecordsInput = { year: r.year };
    if ('approvedCost' in d) body.approvedCost = num('approvedCost');
    if ('revisedCost' in d) body.revisedCost = num('revisedCost');
    if ('annualAllocation' in d) body.annualAllocation = num('annualAllocation');
    if ('transferState' in d) {
      const raw = (d['transferState'] ?? '').trim();
      body.transferState = { value: raw === '' ? null : raw };
    }

    // Nothing typed is not a save. Closing the card is the whole action.
    if (Object.keys(d).length === 0) { this.cancelEdit(); return; }

    this.saving.set(true);
    this.api.saveRecords(this.projectId(), body).subscribe({
      next: res => {
        this.saving.set(false);
        this.editing.set(false);
        this.draft.set({});
        this.toast.show(res.changed.length
          ? this.lang.t('fin_rec_saved')
          : this.lang.t('fin_rec_unchanged'));
        this.load();
      },
      error: e => {
        this.saving.set(false);
        const body = e?.error ?? {};
        const message = this.lang.pick(body.messageAr, body.messageEn)
          ?? body.message ?? e?.message ?? 'request failed';
        if (body.field) this.fieldError.set({ field: body.field, message });
        else this.toast.show(message);
      },
    });
  }

  /** الشكل 19's «أيقونات نوعية» — one per event kind, all four of them. */
  changeIcon(kind: string): string {
    return kind === 'payment' ? 'payments'
      : kind === 'amendment' ? 'swap_horiz'
      : kind === 'record' ? 'edit'
      : 'account_balance';
  }

  /**
   * A `record` event's before → after, as text. Money comes back as a number
   * pair and a lookup as a code pair, so this picks the one that is populated
   * — the field decides, never the value's spelling.
   */
  changeFrom(c: { before: number | null; beforeText: string | null }): string {
    if (c.beforeText !== null) return this.lookups.label('transfer-state', c.beforeText);
    return c.before === null ? this.lang.t('unavailable') : fmt.money(c.before);
  }

  changeTo(c: { after: number | null; afterText: string | null }): string {
    if (c.afterText !== null) return this.lookups.label('transfer-state', c.afterText);
    return c.after === null ? this.lang.t('unavailable') : fmt.money(c.after);
  }

  /**
   * What the timeline prints as the event's reference. `ref` is a CODE for
   * three of the four kinds — a funding letter, an amendment, a fiscal year —
   * but a recorded edit's is the FIELD KEY, an English identifier the title
   * beside it already states in Arabic. So an edit shows the year it moved, or
   * nothing at all.
   */
  changeRef(c: { kind: string; ref: string }): string {
    if (c.kind !== 'record') return c.ref;
    const [, year] = c.ref.split('·');
    return year?.trim() ?? '';
  }

  /** «تمييز المبالغ الموجبة» — the sign is carried in the text, not by colour. */
  signed(v: number): string { return (v > 0 ? '+' : '') + fmt.money(v); }

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

  /** The desk currently holding the file, if the viewer may not release it. */
  heldDesk = computed(() =>
    (this.data()?.auditSla?.stages ?? []).find(s => s.state === 'current' || s.state === 'overdue') ?? null);

  releasing = signal(0);

  /**
   * المسار 8 steps 5–9. What this release MEANS — advance the route, certify
   * the works, or move the money — is `EP-FIN-03`'s answer, so the toast is
   * chosen from what came back and not from what was pressed.
   */
  release(st: FinancialsAuditStage) {
    const sla = this.data()?.auditSla;
    if (!sla || this.releasing()) return;

    this.releasing.set(st.no);
    this.api.releaseDesk(this.projectId(), sla.paymentId, { stageNo: st.no, note: '' }).subscribe({
      next: res => {
        this.releasing.set(0);
        this.toast.show(
          res.disbursed ? this.lang.t('fin_sla_disbursed')
          : res.certified ? this.lang.t('fin_sla_certified')
          : this.lang.t('fin_sla_released'));
        this.load();
      },
      error: e => {
        this.releasing.set(0);
        const body = e?.error ?? {};
        this.toast.show(this.lang.pick(body.messageAr, body.messageEn)
          ?? body.message ?? e?.message ?? 'request failed');
      },
    });
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

  readonly colCount = 8;

  contracts = computed(() => this.data()?.contracts ?? []);

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

  /** The status pill on a letter's share, and on the الشكل 17 certificate. */
  statusLabel(code: string): string { return this.lookups.label('payment-status', code); }

  // The five-tile summary strip is GONE, and Z10 carries what it said.
  // الشكل 14 leads with the pinned equation and closes with a 28px status bar;
  // a band of tiles between them printed المعدلة, المصروف and المتبقي a second
  // time, forty pixels from the first, which asks the reader to check whether
  // two copies of one figure agree. `summaryStats()` went with it.

  constructor() {
    this.route.parent!.paramMap.pipe(takeUntilDestroyed()).subscribe(pm => {
      this.projectId.set(pm.get('id') ?? '');
      this.view.set('sheet');
      this.cancelEdit();
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
