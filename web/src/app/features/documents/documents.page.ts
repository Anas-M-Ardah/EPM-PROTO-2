import {
  Component, ViewEncapsulation, computed, effect, inject, signal, untracked,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { PanelHeadComponent } from '../../shared/panel-head.component';
import { SectionComponent } from '../../shared/section.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { DateComponent } from '../../shared/date.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import { PersonaService, canDecideDocuments } from '../../core/persona';
import * as fmt from '../../core/format';
import { DocumentsApi } from './documents.api';
import { DocumentRow, DocumentsResponse, RevisionInput, RevisionRow } from './documents.types';

/**
 * SCR-W12 — الوثائق والمخططات · **ملحق الشكل 46**.
 *
 * ── THREE COLUMNS, AS THE PLATE LAYS THEM OUT ─────────────────────────────
 * التصنيف (folders with counts) · سجل الوثائق (search, status chips, the
 * register) · تفاصيل الوثيقة (the identity card, the «المراجعات لا تُحذف»
 * notice, and the revision history).
 *
 * ── «آخر مراجعة فقط» IS A VIEW, NOT A FILTER ON THE DATA ─────────────────
 * The register always shows one row per DOCUMENT carrying its current
 * revision; the toggle switches the same list to one row per REVISION, so a
 * superseded issue is visible in the table rather than only in the panel. The
 * payload is identical either way — nothing is fetched again and nothing is
 * hidden from the client.
 */
@Component({
  selector: 'epm-documents-page',
  standalone: true,
  imports: [IconComponent, SectionComponent, TableSkeletonComponent, PanelHeadComponent, DateComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './documents.page.html',
})
export class DocumentsPage {
  private api = inject(DocumentsApi);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  /** Downloading a revision is a demo stub and says so — no bytes are ever
   *  stored (`DocumentRevision.cs`), so a real download has nothing to serve. */
  toast = inject(ToastService);
  fmt = fmt;

  projectId = signal('');
  data = signal<DocumentsResponse | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);

  folder = signal('all');
  status = signal('all');
  q = signal('');
  /** الشكل 46's toggle, on by default exactly as the plate shows it. */
  latestOnly = signal(true);
  /** The open document — the plate opens ST-DR-002. */
  open = signal<string | null>(null);
  /**
   * الشكل 46 draws four tabs — المعاينة · المراجعات · التأشيرات · التفاصيل —
   * but two of them have nothing behind them in this prototype: no file bytes
   * are stored and no flow records a stamp. They are named in a notice inside
   * التفاصيل rather than shown as two tabs that open onto nothing (04 §9), so
   * only the two that carry data are selectable here.
   */
  panelTab = signal<'revisions' | 'details'>('revisions');

  // ── P-253 — «رفع وثيقة» · «رفع مراجعة», made real ───────────────────────
  //
  // Neither this app's own reference nor the ministry spec describes a
  // "register a brand-new document" screen — only project-modules.jsx's own
  // real `upload(id)` function, which adds a REVISION to a document that
  // already exists. So the top-level button is a PICKER onto that same flow,
  // never a form for a new document code.

  /** True while the top-level button's document picker is open. */
  pickingDocument = signal(false);
  /** True while the upload form is open in an already-open document's drawer. */
  uploadingRevision = signal(false);

  revIssuedOn = signal('');
  revIssuer = signal('');
  revDescriptionAr = signal('');
  revDescriptionEn = signal('');
  revTransmittalNo = signal('');
  revFile = signal<File | null>(null);
  revSaving = signal(false);
  revError = signal<string | null>(null);

  /** الشكل 46's own transmittal scheme (`project-modules.jsx:2172`), generalised
   *  project-wide rather than per-document to cut collisions — still just a
   *  suggestion, never silently used if the reviewer changes it. */
  private suggestTransmittal(): string {
    return 'TR-' + (2900 + (this.data()?.revisionCount ?? 0));
  }

  startUpload(code: string) {
    this.pickingDocument.set(false);
    if (this.open() !== code) this.toggleOpen(code);
    this.beginRevisionUpload();
  }

  /** The in-drawer «رفع مراجعة» button — the document is already open. */
  beginRevisionUpload() {
    this.panelTab.set('revisions');
    this.revIssuedOn.set(this.data()?.dataDate ?? '');
    this.revIssuer.set('');
    this.revDescriptionAr.set('');
    this.revDescriptionEn.set('');
    this.revTransmittalNo.set(this.suggestTransmittal());
    this.revFile.set(null);
    this.revError.set(null);
    this.uploadingRevision.set(true);
  }

  cancelUpload() {
    this.uploadingRevision.set(false);
    this.revError.set(null);
  }

  onRevFile(ev: Event) {
    const el = ev.target as HTMLInputElement;
    const picked = el.files?.[0] ?? null;
    this.revFile.set(picked);
    el.value = '';
  }

  submitRevision() {
    const doc = this.opened();
    const file = this.revFile();
    if (!doc || this.revSaving()) return;

    if (!this.revIssuer().trim() || !this.revTransmittalNo().trim() || !file) {
      this.revError.set(this.lang.t('doc_upload_err'));
      return;
    }

    this.revSaving.set(true);
    this.revError.set(null);

    const body: RevisionInput = {
      issuedOn: this.revIssuedOn() || null,
      issuer: this.revIssuer().trim(),
      descriptionAr: this.revDescriptionAr().trim() || null,
      descriptionEn: this.revDescriptionEn().trim() || null,
      transmittalNo: this.revTransmittalNo().trim(),
      fileName: file.name,
    };

    this.api.uploadRevision(this.projectId(), doc.code, body).subscribe({
      next: r => {
        this.revSaving.set(false);
        this.uploadingRevision.set(false);
        this.toast.show(this.lang.t('doc_upload_ok').replace('{no}', String(r.revisionNo)));
        this.load();
      },
      error: e => {
        this.revSaving.set(false);
        this.revError.set(e?.error?.message ?? e?.message ?? 'request failed');
      },
    });
  }

  // ── P-267 — «اعتماد المراجعة» / «رفض المراجعة مع بيان السبب» ────────────
  // المسار 12 steps 5–6 and 5أ. Offered only on the CURRENT draft and only to
  // دائرة المهندس المقيم / مدير المشروع; the server enforces both.
  private persona = inject(PersonaService);
  canDecide = computed(() => canDecideDocuments(this.persona.current()));
  rejectingNo = signal<number | null>(null);
  rejectNote = signal('');
  deciding = signal(false);

  approveRevision(no: number) { this.decide(no, 'approve', null); }

  startReject(no: number) { this.rejectingNo.set(no); this.rejectNote.set(''); }

  cancelReject() { this.rejectingNo.set(null); this.rejectNote.set(''); }

  confirmReject(no: number) {
    if (!this.rejectNote().trim()) return;
    this.decide(no, 'reject', this.rejectNote().trim());
  }

  private decide(no: number, decision: 'approve' | 'reject', note: string | null) {
    const doc = this.opened();
    if (!doc || this.deciding()) return;
    this.deciding.set(true);
    this.api.decide(this.projectId(), doc.code, no, { decision, note }).subscribe({
      next: () => {
        this.deciding.set(false);
        this.cancelReject();
        this.toast.show(this.lang.t(decision === 'approve' ? 'doc_decided_approved' : 'doc_decided_rejected')
          .replace('{no}', String(no)));
        this.load();
      },
      error: e => {
        this.deciding.set(false);
        this.toast.show(e?.error?.message ?? e?.message ?? 'request failed');
      },
    });
  }

  rows = computed(() => this.data()?.rows ?? []);
  folders = computed(() => this.data()?.folders ?? []);
  statuses = computed(() => this.data()?.statuses ?? []);

  title(d: { titleAr: string; titleEn: string }): string {
    return this.lang.pick(d.titleAr, d.titleEn);
  }

  description(r: RevisionRow): string {
    return this.lang.pick(r.descriptionAr, r.descriptionEn);
  }

  disciplineLabel(code: string): string { return this.lookups.label('doc-discipline', code); }
  statusLabel(code: string): string { return this.lookups.label('doc-status', code); }
  folderLabel(code: string): string {
    return code === 'all' ? this.lang.t('doc_all') : this.disciplineLabel(code);
  }
  statusChipLabel(code: string): string {
    return code === 'all' ? this.lang.t('doc_all') : this.statusLabel(code);
  }

  statusClass(code: string): string {
    return code === 'approved' ? 'completed'
      : code === 'rejected' ? 'stalled'
      : code === 'draft' ? 'suspended'
      : '';
  }

  shown = computed(() => {
    const folder = this.folder();
    const status = this.status();
    const q = this.q().trim().toLowerCase();

    return this.rows().filter(d => {
      if (folder !== 'all' && d.discipline !== folder) return false;
      if (status !== 'all' && d.status !== status) return false;
      if (q) {
        const hay = `${d.code} ${d.titleAr} ${d.titleEn} ${d.issuer}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  /**
   * With the toggle off the register lists every ISSUE — one row per revision,
   * superseded ones included and marked. That is the only way to see, from the
   * table alone, that a drawing has been re-issued three times.
   */
  issues = computed(() =>
    this.shown().flatMap(d => d.revisions.map(r => ({ doc: d, rev: r }))));

  filtered = computed(() =>
    this.folder() !== 'all' || this.status() !== 'all' || !!this.q().trim());

  clearFilters() {
    this.folder.set('all');
    this.status.set('all');
    this.q.set('');
  }

  opened = computed(() => this.rows().find(d => d.code === this.open()) ?? null);

  toggleOpen(code: string) {
    this.open.update(v => (v === code ? null : code));
    this.panelTab.set('revisions');
    this.uploadingRevision.set(false);
  }

  onRowKey(e: KeyboardEvent, code: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.toggleOpen(code);
    }
  }

  constructor() {
    this.route.parent!.paramMap.pipe(takeUntilDestroyed()).subscribe(pm => {
      this.projectId.set(pm.get('id') ?? '');
      this.clearFilters();
      this.open.set(null);
    });

    effect(() => {
      const pid = this.projectId();
      if (pid) untracked(() => this.load());
    });
  }

  load() {
    const pid = this.projectId();
    if (!pid) return;
    this.loading.set(true);
    this.error.set(null);

    forkJoin({ lookups: this.lookups.ensureLoaded(), model: this.api.list(pid) }).subscribe({
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
