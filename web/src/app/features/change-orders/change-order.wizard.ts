import {
  Component, EventEmitter, Input, Output, ViewEncapsulation, computed, inject, signal,
} from '@angular/core';
import { Subject, debounceTime } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconComponent } from '../../core/icon.component';
import { SectionComponent } from '../../shared/section.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { ChangeOrdersApi } from './change-orders.api';
import {
  PreviewLine, PreviewNet, PreviewParty, PreviewTransfer, WizardActivity, WizardAllocation,
  WizardBoqLine, WizardContract, WizardDraft, WizardPreviewResponse, WizardSourceResponse,
  WizardTransferInput,
} from './change-order-wizard.types';

/** One BOQ line being composed. The DRAFT, not a computed figure. */
interface LineRow {
  code: string;
  changeType: string;
  contractorDeltaQty: number | null;
  contractorNewRate: number | null;
  contractorExcessRate: number | null;
  reDeptDeltaQty: number | null;
  reDeptNewRate: number | null;
  reDeptExcessRate: number | null;
  targetCode: string | null;
  drawnQty: number | null;
  distributedQty: number | null;
  /** الشكل 58's transfers. Empty on every change type but a supply `redist`. */
  transfers: WizardTransferInput[];
}

interface ActRow {
  activityId: string;
  changeType: string;
  requestedDeltaDays: number | null;
}

/**
 * المسار 9 — إنشاء أمر تغييري. `03 §8` and ملحق الأشكال 37–42.
 *
 * PORTED from `docs/spec/reference/app/vo-wizard.jsx` `DVOCreateWizard` :6 —
 * its five steps, its stepper, its context bar, its two-proposal card and its
 * class names.
 *
 * ── WHAT THIS PORT DOES NOT COPY ─────────────────────────────────────────
 * The reference computes the 20% split, the revised quantities, the impacts and
 * the weight preview in the browser (`bOne` / `bCalc`). Here every one of those
 * comes from EP-WIZ-02, debounced as the two proposals are typed — the same
 * Domain/ChangeOrderRecord the RECORD page reads. That is what makes الشكل 39's
 * figures and الشكل 31's the same figures rather than two implementations that
 * agree today (CLAUDE.md §3.1).
 *
 * ── THE CONTRACT IS THE FIRST DECISION ───────────────────────────────────
 * It scopes every list the wizard offers, and it cannot be changed after lines
 * are chosen without clearing them: a change order may never span two contracts
 * (non-negotiable #1), and silently carrying a selection across would be
 * exactly that.
 *
 * ── NOTHING APPROVED IS ENTERED HERE ─────────────────────────────────────
 * `02 §5`–§6: both parties propose, including the rate beyond 20%. The approved
 * value and the binding excess rate belong to the pricing and rate-fixing
 * committees, and the screen says where each is set instead of offering a field.
 */
@Component({
  selector: 'epm-change-order-wizard',
  standalone: true,
  imports: [IconComponent, SectionComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './change-order.wizard.html',
})
export class ChangeOrderWizard {
  private api = inject(ChangeOrdersApi);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  toast = inject(ToastService);
  fmt = fmt;

  @Input({ required: true }) projectId = '';
  /** Preselects the contract when the wizard is opened from inside one. */
  @Input() contractId: string | null = null;

  @Output() closed = new EventEmitter<void>();
  /** Emits the new order's number so the register can reload and open it. */
  @Output() created = new EventEmitter<string>();

  source = signal<WizardSourceResponse | null>(null);
  preview = signal<WizardPreviewResponse | null>(null);

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);

  /** `03 §8`'s five, in its order. */
  readonly steps = [
    { n: 1, label: 'chg_w_step1', icon: 'description' },
    { n: 2, label: 'chg_w_step2', icon: 'list_alt' },
    { n: 3, label: 'chg_w_step3', icon: 'difference' },
    { n: 4, label: 'chg_w_step4', icon: 'attach_file' },
    { n: 5, label: 'chg_w_step5', icon: 'verified_user' },
  ];
  step = signal(1);
  /** BOQ items · activities — two tabs in ONE step (`03 §8` step 2). */
  tab = signal<'boq' | 'act'>('boq');
  /** The line whose two proposal cards are open — one at a time. */
  openLine = signal<string | null>(null);
  /** The picker, over the contract's own lines or activities. */
  picking = signal<'boq' | 'act' | null>(null);
  pickQuery = signal('');

  // ── the draft ─────────────────────────────────────────────────────────
  ckey = signal<string | null>(null);
  type = signal('engineering');
  justification = signal('');
  party = signal('');
  incomingNo = signal('');
  incomingDate = signal('');
  lines = signal<LineRow[]>([]);
  acts = signal<ActRow[]>([]);
  files = signal<{ fileName: string; category: string; sizeBytes: number }[]>([]);

  private changed = new Subject<void>();

  contract = computed<WizardContract | null>(() =>
    this.source()?.contracts.find(c => c.id === this.ckey()) ?? null);

  contractName = computed(() => {
    const c = this.contract();
    return c ? this.lang.pick(c.nameAr, c.nameEn) : '';
  });

  /** `06 §7`'s five, minus the one a supply order cannot use (`02 §5`). */
  changeTypes = computed(() => {
    const all = ['inc', 'dec', 'rate', 'del', 'redist'];
    return (this.type() === 'supply' ? all.filter(c => c !== 'rate') : all)
      .map(code => ({ code, label: this.lookups.label('boq-change-type', code) }));
  });

  activityChangeTypes = computed(() =>
    ['inc', 'dec', 'start', 'finish', 'both']
      .map(code => ({ code, label: this.lookups.label('activity-change-type', code) })));

  categories = computed(() =>
    ['letter', 'drawing', 'boq', 'analysis', 'photos', 'support']
      .map(code => ({ code, label: this.lookups.label('attachment-category', code) })));

  // ── the source lists, scoped to the chosen contract ────────────────────

  boqPool = computed<WizardBoqLine[]>(() => {
    const c = this.contract();
    if (!c) return [];
    const taken = new Set(this.lines().map(l => l.code));
    const q = this.pickQuery().trim().toLowerCase();
    return c.lines.filter(l => !taken.has(l.code)).filter(l =>
      !q || `${l.code} ${l.descriptionAr} ${l.descriptionEn} ${l.divisionName}`.toLowerCase().includes(q));
  });

  actPool = computed<WizardActivity[]>(() => {
    const c = this.contract();
    if (!c) return [];
    const taken = new Set(this.acts().map(a => a.activityId));
    const q = this.pickQuery().trim().toLowerCase();
    return c.activities.filter(a => !taken.has(a.activityId)).filter(a =>
      !q || `${a.activityId} ${a.nameAr} ${a.nameEn}`.toLowerCase().includes(q));
  });

  boqOf(code: string): WizardBoqLine | null {
    return this.contract()?.lines.find(l => l.code === code) ?? null;
  }

  activityOf(id: string): WizardActivity | null {
    return this.contract()?.activities.find(a => a.activityId === id) ?? null;
  }

  previewOf(code: string): PreviewLine | null {
    return this.preview()?.lines.find(l => l.code === code) ?? null;
  }

  desc(l: { descriptionAr: string; descriptionEn: string } | null): string {
    return l ? this.lang.pick(l.descriptionAr, l.descriptionEn) : '—';
  }

  name(a: { nameAr: string; nameEn: string } | null): string {
    return a ? this.lang.pick(a.nameAr, a.nameEn) : '—';
  }

  changeLabel(code: string): string { return this.lookups.label('boq-change-type', code); }
  actChangeLabel(code: string): string { return this.lookups.label('activity-change-type', code); }
  categoryLabel(code: string): string { return this.lookups.label('attachment-category', code); }

  /**
   * Which field a change type actually needs (`03 §8` step 2 — *"only the
   * fields relevant to the chosen change type are shown"*). A form that asks
   * for a new rate on a cancellation is asking for a number nobody will use.
   */
  needsQty(t: string): boolean { return t === 'inc' || t === 'dec' || t === 'redist'; }
  needsRate(t: string): boolean { return t === 'rate'; }

  /** الشكل 39's «سعر الكمية الزائدة عن 20%» — only once the line trips it. */
  showsExcessRate(code: string): boolean {
    const p = this.previewOf(code);
    return !!p && (p.contractor.tripsThreshold || p.reDept.tripsThreshold);
  }

  // ── editing the draft ─────────────────────────────────────────────────

  chooseContract(id: string) {
    if (id === this.ckey()) return;
    // Clearing is the point: a line belongs to the contract it was chosen
    // from, and carrying it across would be the cross-contract order BR-07
    // exists to refuse.
    this.ckey.set(id || null);
    this.lines.set([]);
    this.acts.set([]);
    this.openLine.set(null);
    this.changed.next();
  }

  addLine(code: string) {
    this.lines.update(rows => [...rows, {
      code, changeType: 'inc',
      contractorDeltaQty: null, contractorNewRate: null, contractorExcessRate: null,
      reDeptDeltaQty: null, reDeptNewRate: null, reDeptExcessRate: null,
      targetCode: null, drawnQty: null, distributedQty: null,
      transfers: [],
    }]);
    this.changed.next();
  }

  dropLine(code: string) {
    this.lines.update(rows => rows.filter(r => r.code !== code));
    if (this.openLine() === code) this.openLine.set(null);
    this.changed.next();
  }

  setLine(code: string, patch: Partial<LineRow>) {
    this.lines.update(rows => rows.map(r => (r.code === code ? { ...r, ...patch } : r)));
    this.changed.next();
  }

  // ══ الشكل 58 — إعادة التوزيع بين الجهات المستفيدة ═══════════════════════
  //
  // NOTHING here computes. «المتاح» and «صافي التغيير» both arrive from
  // EP-WIZ-02, which reads Domain/SupplyRedistribution — the same function that
  // refuses the order. A browser-side cap and a server-side gate that were two
  // implementations would eventually disagree, and the one the user sees is not
  // the one that decides.

  /** BR-08's rows for a line — the «من» picker, and nothing else. */
  allocOf(code: string): WizardAllocation[] {
    return this.boqOf(code)?.allocation ?? [];
  }

  /** الشكل 58's chip strip, as the preview returned it. */
  netsOf(code: string): PreviewNet[] {
    return this.previewOf(code)?.nets ?? [];
  }

  /** The row's «المتاح», or null while the preview is still in flight. */
  transferOf(code: string, i: number): PreviewTransfer | null {
    return this.previewOf(code)?.transfers?.[i] ?? null;
  }

  /**
   * A supply order redistributing between beneficiaries. On a works bill the
   * same `redist` type means the OTHER movement — BOQ line to BOQ line — and
   * this panel would be answering a question nobody asked.
   */
  showsTransfers(r: LineRow): boolean {
    return this.type() === 'supply' && r.changeType === 'redist';
  }

  addTransfer(code: string) {
    const alloc = this.allocOf(code);
    this.lines.update(rows => rows.map(r => (r.code === code
      // The من picker opens on the line's first beneficiary rather than empty:
      // an unset select that looks set is what «لا تحويلات» is for.
      ? { ...r, transfers: [...r.transfers, { from: alloc[0]?.code ?? '', to: '', qty: 0 }] }
      : r)));
    this.changed.next();
  }

  setTransfer(code: string, i: number, patch: Partial<WizardTransferInput>) {
    this.lines.update(rows => rows.map(r => (r.code === code
      ? { ...r, transfers: r.transfers.map((t, j) => (j === i ? { ...t, ...patch } : t)) }
      : r)));
    this.changed.next();
  }

  dropTransfer(code: string, i: number) {
    this.lines.update(rows => rows.map(r => (r.code === code
      ? { ...r, transfers: r.transfers.filter((_, j) => j !== i) }
      : r)));
    this.changed.next();
  }

  /** `<input>` → number | null. An empty box means "not entered yet", never 0. */
  num(v: string): number | null {
    const t = (v ?? '').trim();
    if (!t) return null;
    const n = Number(t);
    return Number.isFinite(n) ? n : null;
  }

  addActivity(id: string) {
    this.acts.update(rows => [...rows, { activityId: id, changeType: 'inc', requestedDeltaDays: null }]);
    this.changed.next();
  }

  dropActivity(id: string) {
    this.acts.update(rows => rows.filter(r => r.activityId !== id));
    this.changed.next();
  }

  setActivity(id: string, patch: Partial<ActRow>) {
    this.acts.update(rows => rows.map(r => (r.activityId === id ? { ...r, ...patch } : r)));
    this.changed.next();
  }

  addFiles(e: Event) {
    const input = e.target as HTMLInputElement;
    const picked = Array.from(input.files ?? []);
    if (!picked.length) return;
    // The bytes are NOT kept — `03 §8` step 4 records a name, a category and a
    // size, and the prototype stores exactly that (ChangeOrderAttachment).
    this.files.update(f => [...f, ...picked.map(x => ({
      fileName: x.name, category: 'support', sizeBytes: x.size,
    }))]);
    input.value = '';
  }

  setCategory(i: number, code: string) {
    this.files.update(f => f.map((x, j) => (j === i ? { ...x, category: code } : x)));
  }

  dropFile(i: number) { this.files.update(f => f.filter((_, j) => j !== i)); }

  // ── steps ─────────────────────────────────────────────────────────────

  /** Step 1 is done once the contract is chosen — everything else depends on it. */
  canLeaveStep1 = computed(() => !!this.ckey());

  stepState(n: number): string {
    if (n === this.step()) return 'on';
    return n < this.step() ? 'done' : '';
  }

  go(n: number) {
    if (n > 1 && !this.canLeaveStep1()) return;
    this.step.set(Math.min(5, Math.max(1, n)));
    if (n >= 3) this.refresh();
  }

  next() { this.go(this.step() + 1); }
  back() { this.go(this.step() - 1); }

  // ── the draft, as the API takes it ────────────────────────────────────

  draft(): WizardDraft {
    return {
      contractId: this.ckey() ?? '',
      type: this.type(),
      justification: this.justification(),
      responsibleParty: this.party() || (this.source()?.parties[0] ?? ''),
      incomingNo: this.incomingNo(),
      incomingDate: this.incomingDate() || null,
      lines: this.lines().map(l => ({ ...l })),
      activities: this.acts().map(a => ({
        activityId: a.activityId,
        changeType: a.changeType,
        requestedDeltaDays: a.requestedDeltaDays,
        requestedStart: null,
        requestedFinish: null,
      })),
      attachments: this.files().map(f => ({ ...f })),
    };
  }

  refresh() {
    if (!this.ckey()) return;
    this.api.preview(this.projectId, this.draft()).subscribe({
      next: p => this.preview.set(p),
      error: e => this.error.set(e?.error?.message ?? e?.message ?? 'preview failed'),
    });
  }

  issuesFor(code: string) {
    return (this.preview()?.issues ?? []).filter(i => i.ref === code);
  }

  blocking = computed(() => (this.preview()?.issues ?? []).filter(i => i.blocking));

  issueText(i: { messageAr: string; messageEn: string }): string {
    return this.lang.pick(i.messageAr, i.messageEn);
  }

  save(kind: 'draft' | 'submit') {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set(null);

    this.api.create(this.projectId, this.draft(), kind).subscribe({
      next: r => {
        this.saving.set(false);
        this.toast.show(this.lang.isAr()
          ? (kind === 'submit' ? `أُرسل الأمر ${r.no} للمراجعة` : `حُفظ الأمر ${r.no} كمسودة`)
          : (kind === 'submit' ? `Order ${r.no} submitted for review` : `Order ${r.no} saved as a draft`));
        this.created.emit(r.no);
      },
      error: e => {
        this.saving.set(false);
        // A 422 is BR-07 refusing the order, and it names the lines. It is not
        // an error message — it is the gate, and the wizard shows it where the
        // offending line is (`02 §7`).
        const issues = e?.error?.issues;
        if (Array.isArray(issues) && issues.length) {
          this.preview.update(p => (p ? { ...p, issues, canSubmit: false } : p));
          this.step.set(2);
        }
        this.error.set(e?.error?.message ?? e?.message ?? 'request failed');
      },
    });
  }

  constructor() {
    // Debounced, because الشكل 39 recalculates AS THE FIGURES ARE TYPED and the
    // arithmetic is on the server. 300ms is long enough that a two-digit entry
    // is one request and short enough that the split lands while the eye is
    // still on the field.
    this.changed.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => this.refresh());
  }

  ngOnInit() {
    this.loading.set(true);
    this.api.wizardSource(this.projectId).subscribe({
      next: s => {
        this.source.set(s);
        this.party.set(s.parties[0] ?? '');
        this.incomingDate.set(s.dataDate ?? '');
        // One contract, or the one we were opened from: `03 §8` still shows the
        // selector, but there is nothing to decide.
        const only = s.contracts.length === 1 ? s.contracts[0].id : null;
        const pre = this.contractId && s.contracts.some(c => c.id === this.contractId)
          ? this.contractId : null;
        this.ckey.set(pre ?? only);
        this.loading.set(false);
        if (this.ckey()) this.refresh();
      },
      error: e => {
        this.error.set(e?.error?.message ?? e?.message ?? 'request failed');
        this.loading.set(false);
      },
    });
  }

  party$(p: PreviewParty | null | undefined): PreviewParty | null { return p ?? null; }
}
