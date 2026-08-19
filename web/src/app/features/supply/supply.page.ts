import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { DrawerComponent } from '../../shared/drawer.component';
import {
  CellTemplateDirective, DataTableComponent, TableColumn,
} from '../../shared/data-table.component';
import { LangService, StrKey } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { Router } from '@angular/router';
import { BoqApi } from '../boq/boq.api';
import { BoqContractOption } from '../boq/boq.types';
import { SupplyApi } from './supply.api';
import {
  SupplyItemDetailResponse, SupplyItemRow, SupplyReceiptDoc, SupplyReceiptRow,
  SupplyRegisterResponse,
} from './supply.types';

/**
 * الفقرات التجهيزية — ملحق الأشكال 50–56 · المسارات 10 و11.
 *
 * PORTED from the live prototype's `app/supply-items.jsx` — `DModSupplyItems`
 * :24, `DModReceipts` :627, `DModItemInquiry` :694. That file is NOT in
 * `docs/spec/reference/`; it was fetched from the deployed prototype, which
 * `ROADMAP.md`'s own warning says is ahead of both checked-in copies.
 *
 * ── IT IS THE BOQ MODULE UNDER ANOTHER NAME ───────────────────────────────
 * `EPM.modulesFor` (model.js:751): on a supply project the `boq` module keeps
 * its id and swaps its label; receipts and item inquiry are FACETS inside it,
 * not new tabs on the rail. So this page reads the same `BoqItems` a works bill
 * reads and adds only the device half (D-14).
 *
 * ── THREE TABS ────────────────────────────────────────────────────────────
 * الفقرات التجهيزية N · الاستلامات N · استعلام الفقرات — الشكل 50's own strip.
 *
 * ── WHAT THIS COMPONENT DECIDES ───────────────────────────────────────────
 * Nothing. Every quantity is derived server-side by `Domain/SupplyReceipts` and
 * `Domain/SupplyStatus`; the receipt form caps its own field as a courtesy
 * (`05 §6`) and `EP-SUP-04` refuses it anyway.
 */
@Component({
  selector: 'epm-supply-page',
  standalone: true,
  imports: [IconComponent, StatusPillComponent, TableSkeletonComponent, DrawerComponent,
    DataTableComponent, CellTemplateDirective],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './supply.page.html',
})
export class SupplyPage {
  private api = inject(SupplyApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private boq = inject(BoqApi);
  private lookups = inject(LookupsService);
  lang = inject(LangService);
  toast = inject(ToastService);
  fmt = fmt;

  readonly colCount = 8;

  projectId = signal('');
  contractId = signal('');

  data = signal<SupplyRegisterResponse | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  /** items · receipts · inquiry — الشكل 50's three tabs. */
  view = signal<'items' | 'receipts' | 'inquiry'>('items');

  /** الشكل 55's «مبدّل نوع الاستلام» — أولي · مخزني. */
  receiptKind = signal<'warehouse' | 'preliminary'>('warehouse');

  q = signal('');
  status = signal('');

  constructor() {
    // `:id` is the PARENT route's and the parent outlives this component, so
    // both subscriptions need takeUntilDestroyed (P-42) — the same shape
    // SCR-W4 uses, and for the same reason.
    combineLatest([this.route.parent!.paramMap, this.route.paramMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([parent, own]) => {
        this.projectId.set(parent.get('id') ?? '');
        this.contractId.set(own.get('contractId') ?? '');
        this.view.set('items');
        this.closePanel();
        this.load();
      });
  }

  // ── THE CONTRACT GATE (P-46) ────────────────────────────────────────────
  //
  // Same rule and same shape as SCR-W4's: a فقرة belongs to exactly one
  // contract, a project with one contract is NOT asked, and the contract is a
  // URL segment so a link survives being pasted.
  //
  // It reuses `EP-BOQ-01` rather than adding a supply gate of its own — that
  // endpoint already answers precisely «which contracts does this project have,
  // and which of them carry a bill», and a supply bill IS a bill (D-14).

  gateContracts = signal<BoqContractOption[]>([]);

  singleContract = computed(() => this.gateContracts().length === 1);

  gated = computed(() => !this.contractId() && !this.singleContract());

  load() {
    const pid = this.projectId();
    if (!pid) return;

    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      lookups: this.lookups.ensureLoaded(),
      gate: this.boq.gate(pid),
    }).subscribe({
      next: ({ gate }) => {
        this.gateContracts.set(gate.contracts);

        const cid = this.contractId()
          || (gate.contracts.length === 1 ? gate.contracts[0].id : '');
        if (!cid) { this.loading.set(false); return; }

        this.api.register(pid, cid).subscribe({
          next: model => { this.data.set(model); this.loading.set(false); },
          error: e => { this.error.set(this.message(e)); this.loading.set(false); },
        });
      },
      error: e => { this.error.set(this.message(e)); this.loading.set(false); },
    });
  }

  /** The contract in force — the route's, or the only one there is. */
  private effectiveContractId = computed(() =>
    this.contractId() || (this.singleContract() ? this.gateContracts()[0].id : ''));

  chooseContract(id: string) {
    this.router.navigate(['/projects', this.projectId(), 'supply', id],
      { queryParams: this.route.snapshot.queryParams });
  }

  items = computed(() => this.data()?.items ?? []);
  receipts = computed(() => this.data()?.receipts ?? []);
  totals = computed(() => this.data()?.totals ?? null);

  // ── الشكل 50's columns, as a list ────────────────────────────────────
  //
  // D-16 — the register's columns are a CONFIG now, not markup. The cost is
  // that a reader no longer sees them as HTML in this screen's own template;
  // the gain is that `<bdi>`, the money format, the four empty states and the
  // totals row cannot be got wrong one register at a time. الفقرات التجهيزية
  // got three of those wrong on its first cut, which is what prompted it.

  itemColumns = computed<TableColumn<SupplyItemRow>[]>(() => [
    {
      key: 'code', label: this.lang.t('boq_col_code'), kind: 'custom', width: '96px',
      totalText: () => this.lang.t('sup_total'),
    },
    {
      key: 'device', label: this.lang.t('sup_device'), strong: true,
      value: r => r.device,
      // «Dell · OptiPlex 7010» — the plate's own second line.
      sub: r => [r.manufacturer, r.model].filter(Boolean).join(' · '),
      totalText: rows => `${rows.length} ${this.lang.t('sup_item_word')}`,
    },
    { key: 'unit', label: this.lang.t('boq_col_unit'), kind: 'text', width: '76px' },
    {
      key: 'contractedQty', label: this.lang.t('sup_contracted'), kind: 'qty',
      numeric: true, width: '96px',
      total: rows => rows.reduce((s, r) => s + r.contractedQty, 0),
    },
    {
      key: 'rate', label: this.lang.t('sup_unit_rate'), kind: 'money',
      numeric: true, width: '130px', currency: this.lang.t('cur_iqd'),
    },
    {
      key: 'amount', label: this.lang.t('boq_col_amount'), kind: 'money',
      numeric: true, width: '150px', currency: this.lang.t('cur_iqd'),
      // BR-01's weight rides UNDER the value, labelled — which is where and
      // how الشكل 50 prints it.
      sub: r => `${this.lang.t('boq_weight_lbl')} ${fmt.pct(r.weight, 2)}`,
      total: rows => rows.reduce((s, r) => s + r.amount, 0),
    },
    {
      key: 'receipt', label: this.lang.t('sup_receipt'), kind: 'custom', width: '180px',
      totalText: rows =>
        `${fmt.qty(rows.reduce((s, r) => s + r.contractedQty, 0))}`
        + ` / ${fmt.qty(rows.reduce((s, r) => s + r.receivedQty, 0))}`,
    },
    { key: 'status', label: this.lang.t('sup_status'), kind: 'custom', width: '130px' },
  ]);

  // ── الشكل 55's columns ───────────────────────────────────────────────
  receiptColumns = computed<TableColumn<SupplyReceiptRow>[]>(() => [
    {
      key: 'no', label: this.lang.t('sup_receipt_no'), kind: 'mono', width: '140px',
      totalText: () => this.lang.t('sup_total'),
    },
    { key: 'date', label: this.lang.t('prg_updates_at'), kind: 'date', width: '110px' },
    // الشكل 55 heads this «الفقرة» rather than «الرمز»: on the bill the code
    // IS the column, but here the row is a receipt and the code identifies
    // which فقرة it was booked against.
    { key: 'itemCode', label: this.lang.t('sup_item'), kind: 'custom', width: '100px' },
    { key: 'itemDevice', label: this.lang.t('sup_device'), strong: true },
    {
      key: 'qty', label: this.lang.t('sup_qty'), kind: 'qty', numeric: true, width: '90px',
      total: rows => rows.reduce((s, r) => s + r.qty, 0),
    },
    // الشكل 55 heads this «المخزن», because the plate is drawn on the WAREHOUSE
    // side of the switch. The same column on the أولي side is the receiving
    // university, so the header follows `receiptKind` rather than carrying one
    // merged label that is imprecise in both states.
    {
      key: 'party',
      label: this.receiptKind() === 'preliminary'
        ? this.lang.t('sup_recv_party')
        : this.lang.t('sup_store'),
      width: '200px',
    },
    // الشكل 55 heads the COLUMN «اللجنة»; الشكل 53 labels the FIELD «لجنة
    // الاستلام». Two labels for one column is a defect, two labels for a column
    // and a form field is what the plates draw.
    //
    // WAREHOUSE ONLY. A preliminary receipt has no committee — الشكل 52's two
    // cards differ exactly there, and الشكل 54's field list omits it — so on
    // the أولي side the column would be empty in every row, which is a column
    // that asks the reader to interpret a blank.
    ...(this.receiptKind() === 'preliminary' ? [] : [{
      key: 'committee' as const, label: this.lang.t('sup_committee_c'),
      kind: 'text' as const, width: '190px',
    }]),
    // «لا مستند» is a REAL state the plate calls «ثغرة توثيقية تستوجب
    // المعالجة», so it prints rather than leaving the cell blank.
    {
      key: 'documents', label: this.lang.t('sup_documents'), width: '130px',
      value: r => r.documents.length || this.lang.t('sup_no_doc'),
      totalText: rows => `${rows.length} ${this.lang.t('sup_recv_word')}`,
    },
  ]);

  /**
   * The four STATE chips, in الشكل 50's own order. «الكل» is drawn before them
   * by the template rather than living here, because it is not a status — it is
   * the absence of one, and `status()` holds '' for it.
   */
  readonly statusKeys = ['received', 'partial', 'supplied', 'pending'];

  statusCount(code: string): number { return this.data()?.countByStatus[code] ?? 0; }

  statusLabel(code: string): string { return this.lookups.label('supply-status', code); }

  /** «بحث بالرمز أو الجهاز أو المصنّع» — the plate's own three fields. */
  filtered = computed(() => {
    const needle = this.q().trim().toLowerCase();
    const st = this.status();
    return this.items().filter(i =>
      (!st || i.status === st)
      && (!needle
        || i.code.toLowerCase().includes(needle)
        || i.device.toLowerCase().includes(needle)
        || i.manufacturer.toLowerCase().includes(needle)));
  });

  /** True when a filter is what emptied the table, not an empty bill (04 §9). */
  isFiltered = computed(() => this.q().trim().length > 0 || this.status().length > 0);

  clearFilters() { this.q.set(''); this.status.set(''); }

  /** الشكل 50's section is collapsible — «زر طيّ» on its own header. */
  collapsed = signal(false);

  /**
   * الشكل 55's section title, which names the side of the switch being shown:
   * «سجل الاستلام المخزني» or «سجل الاستلام الأولي». One heading that said
   * «الاستلامات» over a filtered table would be titling the wrong list.
   */
  recLogTitle = computed(() => this.lang.t(
    this.receiptKind() === 'preliminary' ? 'sup_log_preliminary' : 'sup_log_warehouse'));

  /**
   * «زر إضافة فقرة». A supply line IS a BOQ line (D-14), and «الإدخال اليدوي»
   * on the bill is already the form that enters one — `EP-BOQ-12` requires the
   * device half on a supply bill and refuses it on a works one. Sending the
   * person there is one form for one table; a second form here would be a
   * second way to write the same rows.
   */
  addItem() {
    this.router.navigate(['/projects', this.projectId(), 'boq', this.effectiveContractId()],
      { queryParams: { ...this.route.snapshot.queryParams, add: '1' } });
  }

  shownReceipts = computed(() =>
    this.receipts().filter(r => r.kind === this.receiptKind()));

  /** الشكل 55's footer — Σ the quantity of the kind on screen. */
  shownQty = computed(() => this.shownReceipts().reduce((s, r) => s + r.qty, 0));

  // ── الشكل 51 · الشكل 52 — the item detail panel ────────────────────────

  openCode = signal('');
  detail = signal<SupplyItemDetailResponse | null>(null);
  /** عام · التوزيع · الاستلامات · الكلفة · السجل — the plate's five. */
  panelTab = signal<'general' | 'dist' | 'receipts' | 'cost' | 'log'>('general');

  readonly panelTabs = [
    { k: 'general' as const, label: 'sup_tab_general' as StrKey },
    { k: 'dist' as const, label: 'sup_tab_dist' as StrKey },
    { k: 'receipts' as const, label: 'sup_tab_receipts' as StrKey },
    { k: 'cost' as const, label: 'sup_tab_cost' as StrKey },
    { k: 'log' as const, label: 'sup_tab_log' as StrKey },
  ];

  open(code: string) {
    this.openCode.set(code);
    this.detail.set(null);
    this.panelTab.set('general');
    this.api.item(this.projectId(), this.effectiveContractId(), code).subscribe({
      next: d => this.detail.set(d),
      error: e => { this.openCode.set(''); this.toast.show(this.message(e)); },
    });
  }

  closePanel() { this.openCode.set(''); this.detail.set(null); this.closeReceipt(); }

  /** الشكل 51's warning bar — «لم يُستلم بعد 16 جهاز من أصل 111». */
  shortfall = computed(() => {
    const d = this.detail();
    return d && d.item.remainingQty > 0 ? d.item.remainingQty : 0;
  });

  // ── الشكل 53 · الشكل 54 — the two receipt drawers ──────────────────────

  receiptForm = signal<'warehouse' | 'preliminary' | ''>('');
  rDate = signal('');
  rQty = signal('');
  rStore = signal('');
  rBeneficiary = signal('');
  rCommittee = signal('');
  rConformity = signal('');
  rNotes = signal('');
  rFiles = signal<SupplyReceiptDoc[]>([]);
  saving = signal(false);
  rError = signal('');

  /**
   * The ceiling for the kind being recorded — الشكل 53's «المتبقي 16 جهاز» hint
   * and الشكل 54's own. They are DIFFERENT numbers: one is what is still owed
   * against the contract, the other is what has arrived and not yet been handed
   * over (`Domain/SupplyReceipts`).
   */
  cap = computed(() => {
    const d = this.detail();
    if (!d) return 0;
    return this.receiptForm() === 'preliminary' ? d.remainingPreliminary : d.remainingWarehouse;
  });

  startReceipt(kind: 'warehouse' | 'preliminary') {
    const d = this.detail();
    if (!d) return;

    this.receiptForm.set(kind);
    this.rError.set('');
    this.rDate.set(this.data()?.asOf ?? '');
    // Opens on the WHOLE remainder, which is the common case and the one the
    // plate draws (الشكل 53 shows 16 against a remainder of 16).
    this.rQty.set(String(kind === 'preliminary' ? d.remainingPreliminary : d.remainingWarehouse));
    this.rStore.set(kind === 'warehouse' ? this.lang.t('sup_default_store') : '');
    this.rBeneficiary.set(kind === 'preliminary' ? (d.beneficiaries[0]?.code ?? '') : '');
    this.rCommittee.set(this.lang.t(
      kind === 'warehouse' ? 'sup_default_wcommittee' : 'sup_default_pcommittee'));
    this.rConformity.set(this.lang.t('sup_conform_yes'));
    this.rNotes.set('');
    this.rFiles.set([]);
  }

  closeReceipt() { this.receiptForm.set(''); this.rError.set(''); }

  /**
   * CAPPED AS IT IS TYPED (`05 §6` · الشكل 53's own «تقلل احتمال تسجيل كميات
   * تتجاوز المتبقي»). The field cannot hold an invalid figure; the server
   * refuses one anyway, because a cap in a form is a courtesy and this is a
   * record.
   */
  setQty(raw: string, el: HTMLInputElement) {
    const n = parseFloat(raw);
    const capped = !Number.isFinite(n) ? '' : String(Math.min(Math.max(n, 0), this.cap()));
    this.rQty.set(capped);
    if (capped !== raw) el.value = capped;
  }

  onFiles(ev: Event) {
    const el = ev.target as HTMLInputElement;
    const picked = [...(el.files ?? [])];
    if (picked.length === 0) return;
    this.rFiles.update(list => [
      ...list,
      ...picked.map(f => ({
        titleAr: this.lang.t(this.receiptForm() === 'preliminary'
          ? 'sup_doc_preliminary' : 'sup_doc_warehouse'),
        titleEn: 'Receipt record',
        fileName: f.name,
        sizeBytes: f.size,
      })),
    ]);
    el.value = '';
  }

  removeFile(i: number) { this.rFiles.update(l => l.filter((_, k) => k !== i)); }

  receiptValid = computed(() => {
    const n = parseFloat(this.rQty());
    if (!Number.isFinite(n) || n <= 0 || n > this.cap()) return false;
    return this.receiptForm() === 'preliminary'
      ? this.rBeneficiary().length > 0
      : this.rStore().trim().length > 0;
  });

  saveReceipt() {
    if (!this.receiptValid() || this.saving()) return;
    const code = this.openCode();
    this.saving.set(true);
    this.rError.set('');

    this.api.recordReceipt(this.projectId(), this.effectiveContractId(), code, {
      kind: this.receiptForm(),
      date: this.rDate(),
      qty: parseFloat(this.rQty()),
      store: this.rStore().trim(),
      beneficiaryCode: this.rBeneficiary(),
      committee: this.rCommittee().trim(),
      conformity: this.rConformity().trim(),
      notes: this.rNotes().trim(),
      documents: this.rFiles(),
    }).subscribe({
      next: model => {
        this.saving.set(false);
        this.data.set(model);
        this.closeReceipt();
        this.toast.show(this.lang.t('sup_receipt_saved'));
        // The panel's own figures moved with the register's.
        this.open(code);
      },
      error: e => { this.saving.set(false); this.rError.set(this.message(e)); },
    });
  }

  // ── الشكل 56 — استعلام الفقرات ─────────────────────────────────────────

  inquiryQ = signal('');
  inquiryHits = signal<SupplyItemRow[] | null>(null);
  inquiryBusy = signal(false);

  runInquiry() {
    const q = this.inquiryQ().trim();
    if (!q) { this.inquiryHits.set(null); return; }

    this.inquiryBusy.set(true);
    this.api.inquiry(this.projectId(), this.effectiveContractId(), q).subscribe({
      next: hits => { this.inquiryHits.set(hits); this.inquiryBusy.set(false); },
      error: e => { this.inquiryBusy.set(false); this.toast.show(this.message(e)); },
    });
  }

  // ── shared ─────────────────────────────────────────────────────────────

  description(r: { descriptionAr: string; descriptionEn: string }): string {
    return this.lang.pick(r.descriptionAr, r.descriptionEn);
  }

  benName(b: { nameAr: string; nameEn: string }): string {
    return this.lang.pick(b.nameAr, b.nameEn);
  }

  size(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  /** الشكل 52's «الاستلام المخزني ·1 / الاستلام الأولي ·1» counts. */
  countOf(rows: { kind: string }[], kind: string): number {
    return rows.filter(r => r.kind === kind).length;
  }

  /** «أيقونة نوع الملف» — the plate's own control, from the extension. */
  fileIcon(name: string): string {
    return /\.(png|jpe?g|gif|webp)$/i.test(name) ? 'image' : 'description';
  }

  /**
   * «أيقونة معاينة». A DEMO ACTION: no bytes are stored anywhere in this
   * prototype — `SupplyReceiptAttachment` is metadata, as every attachment
   * table here is — so the control says what it would open rather than
   * pretending to open it.
   */
  preview(doc: SupplyReceiptDoc) {
    this.toast.show(`${this.lang.t('sup_preview')}: ${doc.fileName}`);
  }

  private message(e: any): string {
    return e?.error?.messageAr ?? e?.error?.message ?? e?.message ?? 'request failed';
  }
}
