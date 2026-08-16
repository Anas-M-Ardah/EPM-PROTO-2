import { Component, EventEmitter, Input, Output, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { IconComponent } from '../../core/icon.component';
import { LangService, StrKey } from '../../core/lang';
import * as fmt from '../../core/format';
import { BoqImportApi } from './boq-import.api';
import {
  BoqImportPreviewResponse, BoqImportRow, BoqImportVersionDto,
} from './boq-import.types';

/**
 * الشكل 13 · المسار 3 — استيراد جدول الكميات (Excel).
 *
 * «معالج بخمس خطوات مؤشَّرة بعلامات إنجاز: رفع الملف ✓ · تحليل Excel ✓ ·
 * التحقق ✓ · المقارنة ✓ · تأكيد وربط».
 *
 * ── THE WHOLE POINT IS THAT NOTHING IS REPLACED ───────────────────────────
 * The dialog says so on its last step and the endpoint enforces it: a submission
 * writes a VERSION and never touches `BoqItems`. «يحمي البيانات التاريخية: لا
 * يُمحى إصدار سابق، ويُعرض أثر الاستيراد بالمقارنة قبل التقديم».
 *
 * ── WHAT THIS COMPONENT DECIDES, AND WHAT IT DOES NOT ─────────────────────
 * It reads the file and lets the user map its columns — «مطابقة الأعمدة» is
 * المسار 3 step 3أ, a user step, and parsing is not business logic. Every
 * JUDGEMENT is the server's: validation, the comparison against the bill in
 * force, the weights, and whether submit is allowed at all (`canSubmit`).
 *
 * ── .xlsx ─────────────────────────────────────────────────────────────────
 * A real .xlsx is a zip of XML and reading one needs a parser this build does
 * not have. Rather than pretend, the upload step accepts CSV/TSV — which is
 * `حفظ باسم` away in Excel — and says exactly that when handed a workbook. See
 * P-86: adding a spreadsheet library is a dependency decision, not a screen one.
 */
@Component({
  selector: 'epm-boq-import-wizard',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent],
  templateUrl: './boq-import.wizard.html',
})
export class BoqImportWizard {
  private api = inject(BoqImportApi);
  lang = inject(LangService);
  fmt = fmt;

  @Input({ required: true }) projectId = '';
  @Input({ required: true }) contractId = '';
  /** Fired when a version was submitted, so the register can refresh its bar. */
  @Output() submitted = new EventEmitter<BoqImportVersionDto>();
  @Output() closed = new EventEmitter<void>();

  /** 1 رفع الملف · 2 تحليل · 3 التحقق · 4 المقارنة · 5 تأكيد وربط. */
  step = signal(1);

  readonly steps = [
    { n: 1, label: 'boq_imp_s1' },
    { n: 2, label: 'boq_imp_s2' },
    { n: 3, label: 'boq_imp_s3' },
    { n: 4, label: 'boq_imp_s4' },
    { n: 5, label: 'boq_imp_s5' },
  ] as const;

  // ── step 1 — رفع الملف ──────────────────────────────────────────────────
  fileName = signal('');
  fileSize = signal(0);
  fileError = signal<string | null>(null);

  /** The raw grid, header row included, exactly as the file had it. */
  private grid = signal<string[][]>([]);
  headers = computed(() => this.grid()[0] ?? []);
  dataRows = computed(() => this.grid().slice(1));

  // ── step 2 — تحليل: «مطابقة الأعمدة» ────────────────────────────────────
  /** field → column index, or -1 for "not mapped". */
  map = signal<Record<string, number>>({});

  readonly fields = [
    { k: 'code', label: 'boq_col_code', required: true },
    { k: 'description', label: 'boq_col_desc', required: true },
    { k: 'division', label: 'boq_card_division', required: false },
    { k: 'unit', label: 'boq_col_unit', required: true },
    { k: 'qty', label: 'boq_col_qty', required: true },
    { k: 'rate', label: 'boq_col_rate', required: true },
  ] as const;

  mappedAll = computed(() =>
    this.fields.filter(f => f.required).every(f => (this.map()[f.k] ?? -1) >= 0));

  /**
   * The rows as the server will see them. Row numbers are 1-based and count the
   * HEADER, so «الصف 4» in a violation is row 4 in the spreadsheet.
   */
  rows = computed<BoqImportRow[]>(() => {
    const m = this.map();
    const at = (r: string[], k: string) => {
      const i = m[k] ?? -1;
      return i >= 0 ? (r[i] ?? '').trim() : '';
    };

    return this.dataRows()
      // A trailing blank line is a spreadsheet artefact, not an item.
      .filter(r => r.some(c => (c ?? '').trim() !== ''))
      .map((r, i) => ({
        row: i + 2,
        code: at(r, 'code'),
        description: at(r, 'description'),
        division: at(r, 'division'),
        unit: at(r, 'unit'),
        qty: num(at(r, 'qty')),
        rate: num(at(r, 'rate')),
      }));
  });

  // ── steps 3 and 4 — التحقق · المقارنة ───────────────────────────────────
  preview = signal<BoqImportPreviewResponse | null>(null);
  checking = signal(false);
  error = signal<string | null>(null);

  // ── step 5 — تأكيد وربط ─────────────────────────────────────────────────
  /** «نوع الجدول» — the plate's own field, defaulting to its own value. */
  sheetType = signal('replace');
  readonly sheetTypes = [
    { k: 'initial', label: 'boq_imp_type_initial' },
    { k: 'replace', label: 'boq_imp_type_replace' },
    { k: 'revision', label: 'boq_imp_type_revision' },
  ] as const;

  saving = signal(false);
  done = signal<BoqImportVersionDto | null>(null);

  // ── file reading ────────────────────────────────────────────────────────

  pick(ev: Event) {
    const input = ev.target as HTMLInputElement;
    const f = input.files?.[0];
    if (!f) return;

    this.fileError.set(null);
    this.preview.set(null);
    this.fileName.set(f.name);
    this.fileSize.set(f.size);

    if (/\.xlsx?$/i.test(f.name)) {
      this.fileError.set(this.lang.t('boq_imp_xlsx'));
      this.grid.set([]);
      return;
    }

    f.text().then(text => {
      const g = parseDelimited(text);
      if (g.length < 2) {
        this.fileError.set(this.lang.t('boq_imp_empty'));
        this.grid.set([]);
        return;
      }
      this.grid.set(g);
      this.map.set(guessMapping(g[0]));
      this.step.set(2);
    }).catch(() => this.fileError.set(this.lang.t('boq_imp_unreadable')));
  }

  setMap(field: string, value: string) {
    this.map.update(m => ({ ...m, [field]: Number(value) }));
  }

  // ── navigation ──────────────────────────────────────────────────────────

  next() {
    const s = this.step();
    if (s === 2) { this.check(); return; }   // 2 → 3 runs the checks
    if (s < 5) this.step.set(s + 1);
  }

  back() { if (this.step() > 1) this.step.set(this.step() - 1); }

  /** EP-BOQ-09 — validation AND comparison, one call, steps 3 and 4. */
  private check() {
    this.checking.set(true);
    this.error.set(null);

    this.api.preview(this.projectId, this.contractId, this.sheetType(), this.rows()).subscribe({
      next: p => {
        this.preview.set(p);
        this.checking.set(false);
        this.step.set(3);
      },
      error: e => {
        this.checking.set(false);
        this.error.set(e?.error?.messageAr ?? e?.message ?? 'request failed');
      },
    });
  }

  /** EP-BOQ-10 — «تقديم للاعتماد». Writes a version; replaces nothing. */
  submit() {
    if (this.saving() || !this.preview()?.canSubmit) return;
    this.saving.set(true);
    this.error.set(null);

    this.api.submit(this.projectId, this.contractId, {
      sheetType: this.sheetType(),
      fileName: this.fileName(),
      fileSizeBytes: this.fileSize(),
      rows: this.rows(),
    }).subscribe({
      next: v => {
        this.saving.set(false);
        this.done.set(v);
        this.submitted.emit(v);
      },
      error: e => {
        this.saving.set(false);
        this.error.set(e?.error?.messageAr ?? e?.message ?? 'request failed');
      },
    });
  }

  // ── display ─────────────────────────────────────────────────────────────

  stepState(n: number): string {
    const s = this.step();
    return n === s ? 'on' : n < s ? 'done' : '';
  }

  label(k: string): string { return this.lang.t(k as StrKey); }

  /** Whether the wizard may leave the step it is on. */
  canNext = computed(() => {
    switch (this.step()) {
      case 1: return this.grid().length > 1;
      case 2: return this.mappedAll() && this.rows().length > 0;
      case 3: return !!this.preview();
      case 4: return !!this.preview();
      default: return false;
    }
  });

  violations = computed(() => this.preview()?.violations ?? []);
  comparison = computed(() => this.preview()?.comparison ?? null);

  /** The five rows the comparison step leads with, before the line table. */
  changeCounts = computed(() => {
    const c = this.comparison();
    if (!c) return [];
    return [
      { k: 'boq_imp_added', n: c.added },
      { k: 'boq_imp_removed', n: c.removed },
      { k: 'boq_imp_changed', n: c.changed },
      { k: 'boq_imp_unchanged', n: c.unchanged },
    ];
  });

  changeClass(change: string): string {
    switch (change) {
      case 'added': return 'completed';
      case 'removed': return 'stalled';
      case 'changed': return 'ongoing';
      default: return 'withdrawn';
    }
  }

  fileSizeKb(): string { return Math.round(this.fileSize() / 1024) + ' KB'; }
}

/** «١٬٢٣٤٫٥» or "1,234.5" — a spreadsheet's number, whichever locale wrote it. */
function num(v: string): number {
  if (!v) return 0;
  const western = v
    .replace(/[٠-٩]/g, d => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/[٬,\s]/g, '')
    .replace('٫', '.');
  const n = Number(western);
  return Number.isFinite(n) ? n : 0;
}

/**
 * CSV / TSV, with quoted fields. Small enough to read, which is why it is here
 * rather than a dependency — and a dependency is exactly what .xlsx would need.
 */
function parseDelimited(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');            // Excel's BOM
  const delim = (clean.split('\n')[0].match(/\t/g)?.length ?? 0) > 0 ? '\t' : ',';

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];

    if (quoted) {
      if (c === '"') {
        if (clean[i + 1] === '"') { cell += '"'; i++; }  // "" is a literal quote
        else quoted = false;
      } else cell += c;
      continue;
    }

    if (c === '"') { quoted = true; continue; }
    if (c === delim) { row.push(cell); cell = ''; continue; }
    if (c === '\r') continue;
    if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; continue; }
    cell += c;
  }

  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

/**
 * A first guess at «مطابقة الأعمدة», so the common file needs no mapping at all
 * — and every guess is a control the user can override, because a wrong guess
 * that cannot be corrected is worse than no guess.
 */
function guessMapping(header: string[]): Record<string, number> {
  const hints: Record<string, string[]> = {
    code: ['رمز', 'الرمز', 'code', 'item'],
    description: ['وصف', 'الوصف', 'description', 'desc'],
    division: ['قسم', 'القسم', 'مجموعة', 'division', 'section'],
    unit: ['وحدة', 'الوحدة', 'unit', 'uom'],
    qty: ['كمية', 'الكمية', 'qty', 'quantity'],
    rate: ['سعر', 'السعر', 'rate', 'price', 'unit rate'],
  };

  const map: Record<string, number> = {};
  for (const [field, words] of Object.entries(hints)) {
    map[field] = header.findIndex(h => {
      const t = (h ?? '').trim().toLowerCase();
      return words.some(w => t.includes(w.toLowerCase()));
    });
  }
  return map;
}
