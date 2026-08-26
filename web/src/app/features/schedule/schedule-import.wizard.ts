import { Component, EventEmitter, Input, Output, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { IconComponent } from '../../core/icon.component';
import { SelectComponent, SelectOption } from '../../shared/select.component';
import { LangService, StrKey } from '../../core/lang';
import * as fmt from '../../core/format';
import { ScheduleImportApi } from './schedule-import.api';
import {
  ScheduleImportPreviewResponse, ScheduleImportRow, ScheduleImportVersion,
} from './schedule-import.types';

/**
 * ملحق الشكل 24 · المسار 4 — «استيراد الجدول الزمني».
 *
 * «معالج بخمس خطوات: الصيغة والملف · تحليل الملف · التحقق · تحليل الأثر · تأكيد
 * وتقديم؛ خيارات الصيغة (Primavera XER · P6 XML · Excel)؛ خيارا أساس احتساب وزن
 * هيكل التجزئة (الكلفة المدرجة أو ساعات العمل المدرجة)؛ منطقة سحب وإفلات».
 *
 * ── WHAT THIS COMPONENT DECIDES, AND WHAT IT DOES NOT ─────────────────────
 * It READS the file — an XER is tab-delimited text, a P6 XML is XML, a workbook
 * goes through the same lazily-imported SheetJS the bill importer uses. Parsing
 * is not business logic. Every JUDGEMENT is `EP-SCD-04`'s: validation, the
 * impact against the schedule in force, and whether submission is allowed at
 * all (`canSubmit`).
 *
 * ── AND IT REPLACES NOTHING ───────────────────────────────────────────────
 * Submitting writes a VERSION. `Activities.Baseline*` is the datum every slip,
 * float and planned percentage measures from, and it moves only when a second
 * person approves — which is `EP-SCD-06` and not this screen.
 */
@Component({
  selector: 'epm-schedule-import-wizard',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  imports: [IconComponent, SelectComponent],
  templateUrl: './schedule-import.wizard.html',
})
export class ScheduleImportWizard {
  lang = inject(LangService);
  fmt = fmt;
  private api = inject(ScheduleImportApi);

  @Input({ required: true }) projectId = '';
  @Input({ required: true }) contractId = '';

  @Output() submitted = new EventEmitter<ScheduleImportVersion[]>();
  @Output() closed = new EventEmitter<void>();

  /** 1 الصيغة والملف · 2 تحليل الملف · 3 التحقق · 4 تحليل الأثر · 5 تأكيد وتقديم. */
  step = signal(1);

  readonly steps = [
    { n: 1, label: 'scd_imp_s1' as StrKey },
    { n: 2, label: 'scd_imp_s2' as StrKey },
    { n: 3, label: 'scd_imp_s3' as StrKey },
    { n: 4, label: 'scd_imp_s4' as StrKey },
    { n: 5, label: 'scd_imp_s5' as StrKey },
  ] as const;

  // ── step 1 — الصيغة والملف ──────────────────────────────────────────────

  format = signal<'xer' | 'p6xml' | 'excel'>('xer');
  /** BR-02's basis. `02 §2` puts the choice HERE, and nothing stored it before. */
  basis = signal<'cost' | 'manhours'>('cost');

  /**
   * ملحق الشكل 24's three formats, for `<epm-select>` (P-197). A plain field —
   * the names are product names and are not translated, so nothing here reads
   * the language.
   */
  readonly formatOptions: SelectOption[] = [
    { code: 'xer', label: 'Primavera XER' },
    { code: 'p6xml', label: 'P6 XML' },
    { code: 'excel', label: 'Excel' },
  ];

  /** The two weight bases; these ARE translated, so they follow the language. */
  basisOptions = computed<SelectOption[]>(() => [
    { code: 'cost', label: this.lang.t('scd_imp_basis_cost') },
    { code: 'manhours', label: this.lang.t('scd_imp_basis_mh') },
  ]);

  fileName = signal('');
  fileSize = signal(0);
  fileError = signal<string | null>(null);
  dragging = signal(false);

  rows = signal<ScheduleImportRow[]>([]);
  preview = signal<ScheduleImportPreviewResponse | null>(null);
  checking = signal(false);
  saving = signal(false);
  error = signal<string | null>(null);

  stepState(n: number): 'done' | 'on' | '' {
    return n < this.step() ? 'done' : n === this.step() ? 'on' : '';
  }

  onDrag(ev: DragEvent, over: boolean) {
    ev.preventDefault();
    this.dragging.set(over);
  }

  onDrop(ev: DragEvent) {
    ev.preventDefault();
    this.dragging.set(false);
    const f = ev.dataTransfer?.files?.[0];
    if (f) this.read(f);
  }

  onPick(ev: Event) {
    const f = (ev.target as HTMLInputElement).files?.[0];
    if (f) this.read(f);
  }

  /**
   * «تحليل الملف» — الشكل 24's own second step, and the only place in this
   * component that knows what a file looks like. The format is the one the
   * person CHOSE, not one sniffed from the extension: an XER exported with a
   * `.txt` name is still an XER, and guessing would be a second answer to a
   * question the wizard already asked.
   */
  private read(f: File) {
    this.fileError.set(null);
    this.preview.set(null);
    this.fileName.set(f.name);
    this.fileSize.set(f.size);

    const parse = this.format() === 'excel'
      ? readWorkbook(f)
      : f.text().then(t => this.format() === 'xer' ? parseXer(t) : parseP6Xml(t));

    parse.then(rows => {
      if (rows.length === 0) {
        this.rows.set([]);
        this.fileError.set(this.lang.t('scd_imp_empty'));
        return;
      }
      this.rows.set(rows);
      this.step.set(2);
    }).catch(() => {
      this.rows.set([]);
      this.fileError.set(this.lang.t('scd_imp_unreadable'));
    });
  }

  // ── navigation ──────────────────────────────────────────────────────────

  next() {
    const s = this.step();
    if (s === 2) { this.check(); return; }      // 2 → 3 runs the server's checks
    if (s < 5) this.step.set(s + 1);
  }

  back() { if (this.step() > 1) this.step.set(this.step() - 1); }

  /** EP-SCD-04 — validation AND impact in one call: steps 3 and 4. */
  private check() {
    this.checking.set(true);
    this.error.set(null);

    this.api.preview(this.projectId, this.contractId, this.body()).subscribe({
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

  /** EP-SCD-05 — «تأكيد وتقديم». Writes a version; replaces nothing. */
  submit() {
    if (this.saving() || !this.preview()?.canSubmit) return;
    this.saving.set(true);
    this.error.set(null);

    this.api.submit(this.projectId, this.contractId, this.body()).subscribe({
      next: versions => { this.saving.set(false); this.submitted.emit(versions); },
      error: e => {
        this.saving.set(false);
        this.error.set(e?.error?.messageAr ?? e?.message ?? 'request failed');
      },
    });
  }

  private body() {
    return {
      format: this.format(),
      basis: this.basis(),
      fileName: this.fileName(),
      fileSizeBytes: this.fileSize(),
      rows: this.rows(),
    };
  }

  // ── what the steps render ───────────────────────────────────────────────

  /** The first twenty rows. A preview is a sample, not a second grid. */
  sample = computed(() => this.rows().slice(0, 20));

  violations = computed(() => this.preview()?.violations ?? []);
  impact = computed(() => this.preview()?.impact ?? null);

  /**
   * The basis a person chose against what the file can actually support. Choosing
   * man-hours on a file that carries none is refused by `EP-SCD-04`; this says so
   * before they get there (`05 §6` — prevent, then explain).
   */
  basisWarning = computed(() => {
    const p = this.preview();
    return p && this.basis() === 'manhours' && !p.manHoursComplete;
  });

  /** added · moved · absent, in words — the pill is never a bare code. */
  changeLabel(kind: string): string {
    return this.lang.t(
      kind === 'added' ? 'scd_imp_chg_added'
      : kind === 'removed' ? 'scd_imp_chg_removed'
      : 'scd_imp_chg_moved');
  }

  size(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }
}

// ══ the three readers ══════════════════════════════════════════════════════
//
// None of them judges anything. They turn a file into rows and the server
// decides whether those rows are a schedule.

/**
 * PRIMAVERA XER — a tab-delimited text format with a simple record grammar:
 *
 *   %T  TASK              a table begins
 *   %F  task_id  task_code  task_name  …      its field names
 *   %R  1234     A1010      Site clearance …  one row
 *
 * So reading one is reading the `TASK` table and naming its columns from the
 * `%F` line that precedes it. No library: this IS the format, in about thirty
 * lines, and a dependency for it would be larger than the parser.
 */
function parseXer(text: string): ScheduleImportRow[] {
  const lines = text.split(/\r?\n/);
  let fields: string[] = [];
  let inTask = false;
  const out: ScheduleImportRow[] = [];
  let n = 0;

  const col = (r: string[], ...names: string[]) => {
    for (const name of names) {
      const i = fields.indexOf(name);
      if (i >= 0 && r[i] !== undefined && r[i] !== '') return r[i];
    }
    return '';
  };

  for (const line of lines) {
    const cells = line.split('\t');
    const tag = cells[0];

    if (tag === '%T') { inTask = cells[1] === 'TASK'; fields = []; continue; }
    if (tag === '%F') { fields = cells.slice(1); continue; }
    if (tag !== '%R' || !inTask) continue;

    const r = cells.slice(1);
    const id = col(r, 'task_code', 'task_id');
    if (!id) continue;

    // XER dates are `YYYY-MM-DD HH:MM` — the time is not a schedule fact here.
    const day = (v: string) => (v || '').slice(0, 10) || null;

    // `TT_Mile` and `TT_FinMile` are P6's two milestone task types.
    const type = col(r, 'task_type');

    out.push({
      row: ++n,
      activityId: id,
      name: col(r, 'task_name'),
      wbsPath: col(r, 'wbs_id'),
      wbsNames: col(r, 'wbs_name'),
      baselineStart: day(col(r, 'target_start_date', 'early_start_date', 'act_start_date')),
      baselineFinish: day(col(r, 'target_end_date', 'early_end_date', 'act_end_date')),
      budgetedCost: num(col(r, 'target_cost', 'total_cost')),
      budgetedManHours: col(r, 'target_work_qty') ? num(col(r, 'target_work_qty')) : null,
      isMilestone: type.includes('Mile'),
      predecessors: '',
    });
  }

  return out;
}

/**
 * P6 XML — the same activities, in `<Activity>` elements. Parsed with the
 * browser's own `DOMParser`; there is no reason to ship an XML library to a
 * browser that has one.
 */
function parseP6Xml(text: string): ScheduleImportRow[] {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('malformed xml');

  const txt = (el: Element, ...names: string[]) => {
    for (const name of names) {
      const node = el.querySelector(name);
      if (node?.textContent) return node.textContent.trim();
    }
    return '';
  };

  const out: ScheduleImportRow[] = [];
  let n = 0;

  doc.querySelectorAll('Activity').forEach(el => {
    const id = txt(el, 'Id', 'ActivityId');
    if (!id) return;

    const day = (v: string) => (v || '').slice(0, 10) || null;
    const type = txt(el, 'Type', 'ActivityType');

    out.push({
      row: ++n,
      activityId: id,
      name: txt(el, 'Name'),
      wbsPath: txt(el, 'WBSCode', 'WBSObjectId'),
      wbsNames: txt(el, 'WBSName'),
      baselineStart: day(txt(el, 'PlannedStartDate', 'StartDate')),
      baselineFinish: day(txt(el, 'PlannedFinishDate', 'FinishDate')),
      budgetedCost: num(txt(el, 'PlannedTotalCost', 'AtCompletionTotalCost')),
      budgetedManHours: txt(el, 'PlannedLaborUnits')
        ? num(txt(el, 'PlannedLaborUnits'))
        : null,
      isMilestone: /Milestone/i.test(type),
      predecessors: '',
    });
  });

  return out;
}

/**
 * EXCEL — through SheetJS, LAZILY imported so the parser is fetched the first
 * time somebody opens a workbook and never on the schedule's first paint. The
 * same trade P-156 made for the bill importer, and the same instance of it.
 *
 * The column names are matched case-insensitively in both languages, because a
 * ministry's own export is as likely to be Arabic-headed as English.
 */
async function readWorkbook(file: File): Promise<ScheduleImportRow[]> {
  const XLSX = await import('xlsx');
  const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const grid: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
  if (grid.length < 2) return [];

  const head = grid[0].map(h => (h ?? '').toString().trim().toLowerCase());
  const at = (...names: string[]) => {
    for (const nm of names) {
      const i = head.indexOf(nm.toLowerCase());
      if (i >= 0) return i;
    }
    return -1;
  };

  const cId = at('activity id', 'id', 'المعرّف', 'معرف النشاط');
  const cName = at('activity name', 'name', 'النشاط', 'اسم النشاط');
  const cPath = at('wbs', 'wbs code', 'هيكل التجزئة');
  const cNames = at('wbs name', 'اسم المستوى');
  const cStart = at('baseline start', 'start', 'بداية الأساس');
  const cFinish = at('baseline finish', 'finish', 'إنجاز الأساس');
  const cCost = at('budgeted cost', 'cost', 'الكلفة');
  const cHours = at('budgeted labor units', 'man hours', 'ساعات العمل');
  const cMile = at('milestone', 'حدث فارق');
  const cPreds = at('predecessors', 'السوابق');

  const cell = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').toString().trim() : '');
  const day = (v: string) => {
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? v.slice(0, 10) : d.toISOString().slice(0, 10);
  };

  const out: ScheduleImportRow[] = [];
  for (let i = 1; i < grid.length; i++) {
    const r = grid[i];
    const id = cell(r, cId);
    if (!id) continue;

    out.push({
      row: i,
      activityId: id,
      name: cell(r, cName),
      wbsPath: cell(r, cPath),
      wbsNames: cell(r, cNames),
      baselineStart: day(cell(r, cStart)),
      baselineFinish: day(cell(r, cFinish)),
      budgetedCost: num(cell(r, cCost)),
      budgetedManHours: cell(r, cHours) ? num(cell(r, cHours)) : null,
      isMilestone: /^(1|true|yes|نعم)$/i.test(cell(r, cMile)),
      predecessors: cell(r, cPreds),
    });
  }

  return out;
}

/** Thousands separators and stray spaces are formatting, not data. */
function num(v: string): number {
  const n = parseFloat((v ?? '').toString().replace(/[,\s]/g, ''));
  return Number.isFinite(n) ? n : 0;
}
