import {
  Component, ViewEncapsulation, computed, effect, inject, signal, untracked,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { SectionComponent } from '../../shared/section.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { DocumentsApi } from './documents.api';
import { DocumentRow, DocumentsResponse, RevisionRow } from './documents.types';

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
  imports: [IconComponent, SectionComponent, TableSkeletonComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './documents.page.html',
})
export class DocumentsPage {
  private api = inject(DocumentsApi);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  /** «رفع وثيقة» · «رفع مراجعة» · downloading are demo stubs and say so. */
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
