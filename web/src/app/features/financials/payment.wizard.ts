import { Component, EventEmitter, Input, Output, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { IconComponent } from '../../core/icon.component';
import { LangService, StrKey } from '../../core/lang';
import * as fmt from '../../core/format';
import { FinancialsApi } from './financials.api';
import { FinancialsContract, PaymentAttachmentInput } from './financials.types';

/**
 * ملحق الشكل 20 · المسار 8 step 1 — «تسجيل دفعة».
 *
 * «معالج بخمس خطوات: العقود المشمولة ✓ · المبالغ والبنود ✓ · كتاب المالية ✓ ·
 * ذرعات الأعمال ✓ · مراجعة (النشطة)».
 *
 * ── THE ORDER IS THE CONTROL ──────────────────────────────────────────────
 * The plate's own reasoning: «يفرض ترتيبًا ثابتًا لإجراء الصرف: عقود ← مبالغ ←
 * كتاب مالية ← ذرعات ← مراجعة، فيمنع تسجيل دفعة ناقصة المستندات». So a step
 * cannot be left incomplete and «التالي» is disabled until it is — the wizard
 * PREVENTS the invalid state rather than reporting it at the end (`05 §6`).
 *
 * ── WHAT IT REGISTERS ─────────────────────────────────────────────────────
 * A `pending` certificate and its audit route. NOT a payment: المسار 8's
 * review, certification and disbursement are decisions with owners and dates,
 * and P-26's rule — «المصروف» counts PAID only — holds through this screen.
 *
 * ── WHAT IT DOES NOT DECIDE ───────────────────────────────────────────────
 * The net, and whether the split adds up. Both are the server's: `EP-FIN-02`
 * computes `gross − retention − advance` and refuses a split that does not
 * equal it. The preview below is a PREVIEW, and says so.
 *
 * `.d-modal` and `.d-stepper` are the reference's own primitives, already in
 * the stylesheet — the BOQ importer uses them and no CSS is added here.
 */
@Component({
  selector: 'epm-payment-wizard',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent],
  templateUrl: './payment.wizard.html',
})
export class PaymentWizard {
  lang = inject(LangService);
  fmt = fmt;
  private api = inject(FinancialsApi);

  @Input({ required: true }) projectId = '';
  /** The project's contracts — الشكل 20's first step picks one. */
  @Input() set contracts(v: FinancialsContract[]) { this.opts.set(v ?? []); }

  @Output() registered = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  opts = signal<FinancialsContract[]>([]);

  /** 1 العقود · 2 المبالغ والبنود · 3 كتاب المالية · 4 الذرعات · 5 المراجعة. */
  step = signal(1);

  readonly steps = [
    { n: 1, label: 'pay_w_s1' as StrKey },
    { n: 2, label: 'pay_w_s2' as StrKey },
    { n: 3, label: 'pay_w_s3' as StrKey },
    { n: 4, label: 'pay_w_s4' as StrKey },
    { n: 5, label: 'pay_w_s5' as StrKey },
  ] as const;

  saving = signal(false);
  error = signal('');

  // ── step 1 — العقود المشمولة ────────────────────────────────────────────
  //
  // ONE CONTRACT, NOT SEVERAL. الشكل 16 shows a funding letter covering two
  // contracts and the register draws it as one row with «عقدان» — but that is
  // TWO certificates sharing a letter number, which is exactly how the fixture
  // records it. A certificate belongs to one contract, because it is measured
  // against one bill (CLAUDE.md §5.1). Registering the second is running the
  // wizard again with the same letter.
  contractId = signal('');

  contract = computed(() => this.opts().find(c => c.id === this.contractId()) ?? null);

  // ── step 2 — المبالغ والبنود ────────────────────────────────────────────
  kind = signal('interim');
  gross = signal('');
  retention = signal('');
  advance = signal('');
  award = signal('');
  reserve = signal('');
  supervision = signal('');

  private num(v: string): number {
    const n = parseFloat((v ?? '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : 0;
  }

  grossN = computed(() => this.num(this.gross()));
  retentionN = computed(() => this.num(this.retention()));
  advanceN = computed(() => this.num(this.advance()));

  /** A PREVIEW of what EP-FIN-02 will compute. The server's is the binding one. */
  net = computed(() => this.grossN() - this.retentionN() - this.advanceN());

  splitTotal = computed(() =>
    this.num(this.award()) + this.num(this.reserve()) + this.num(this.supervision()));

  /** What is still unallocated across the three expense items. */
  splitRemaining = computed(() => this.net() - this.splitTotal());

  /**
   * «وزّع الباقي» — puts everything still unallocated on الإحالة, which is where
   * the overwhelming majority of a certificate sits. A convenience, not a rule:
   * the person can move it afterwards, and the server checks the sum either way.
   */
  fillAward() {
    this.award.set(String(this.num(this.award()) + this.splitRemaining()));
  }

  // ── step 3 — كتاب المالية ───────────────────────────────────────────────
  letterNo = signal('');
  letterDate = signal('');

  // ── step 4 — ذرعات الأعمال ──────────────────────────────────────────────
  files = signal<PaymentAttachmentInput[]>([]);

  onFiles(ev: Event) {
    const el = ev.target as HTMLInputElement;
    const picked = [...(el.files ?? [])];
    if (picked.length === 0) return;
    this.files.update(list => [
      ...list,
      ...picked.map(f => ({
        titleAr: this.lang.t('pay_w_measure'),
        titleEn: 'Measurement sheet',
        fileName: f.name,
        sizeBytes: f.size,
      })),
    ]);
    el.value = '';
  }

  removeFile(i: number) { this.files.update(l => l.filter((_, k) => k !== i)); }

  /** The review step prints the kind in words, not its lookup code. */
  kindLabel = computed(() => this.lang.t(
    this.kind() === 'advance' ? 'pay_w_kind_advance'
    : this.kind() === 'final' ? 'pay_w_kind_final'
    : 'pay_w_kind_interim'));

  /** File sizes, in the units a person reads. Metadata only — no bytes stored. */
  size(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  note = signal('');

  // ── the gates, one per step ─────────────────────────────────────────────
  //
  // 05 §6 — PREVENT rather than flag. Each returns the reason it is closed, so
  // the footer can say what is missing instead of a disabled button saying
  // nothing.

  stepError = computed(() => {
    switch (this.step()) {
      case 1:
        return this.contractId() ? '' : this.lang.t('pay_w_need_contract');
      case 2:
        if (this.grossN() <= 0) return this.lang.t('pay_w_need_gross');
        if (this.net() <= 0) return this.lang.t('pay_w_need_net');
        if (Math.abs(this.splitRemaining()) > 0.01) return this.lang.t('pay_w_need_split');
        return '';
      case 3:
        return this.letterNo().trim() && this.letterDate()
          ? '' : this.lang.t('pay_w_need_letter');
      case 4:
        return this.files().length > 0 ? '' : this.lang.t('pay_w_need_file');
      default:
        return '';
    }
  });

  canNext = computed(() => this.stepError() === '');

  stepState(n: number): 'done' | 'on' | '' {
    return n < this.step() ? 'done' : n === this.step() ? 'on' : '';
  }

  next() {
    if (!this.canNext()) return;
    if (this.step() < 5) this.step.set(this.step() + 1);
  }

  back() { if (this.step() > 1) this.step.set(this.step() - 1); }

  submit() {
    if (this.saving()) return;
    this.saving.set(true);
    this.error.set('');

    this.api.registerPayment(this.projectId, {
      contractId: this.contractId(),
      kind: this.kind(),
      grossAmount: this.grossN(),
      retentionAmount: this.retentionN(),
      advanceRecovery: this.advanceN(),
      awardPortion: this.num(this.award()),
      reservePortion: this.num(this.reserve()),
      supervisionPortion: this.num(this.supervision()),
      financeLetterNo: this.letterNo().trim(),
      financeLetterDate: this.letterDate(),
      note: this.note().trim(),
      attachments: this.files(),
    }).subscribe({
      next: () => { this.saving.set(false); this.registered.emit(); },
      error: e => {
        this.saving.set(false);
        this.error.set(
          e?.error?.messageAr ?? e?.error?.message ?? this.lang.t('pay_w_failed'));
      },
    });
  }
}
