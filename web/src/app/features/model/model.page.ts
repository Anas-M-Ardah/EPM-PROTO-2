import {
  Component, ViewEncapsulation, computed, effect, inject, signal, untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import * as fmt from '../../core/format';
import { ModelApi } from './model.api';
import { ModelElementRow, ModelResponse, ViewerMetadataSummary } from './model.types';
import { ApsViewerComponent } from './aps-viewer.component';
import { SelectComponent, SelectOption } from '../../shared/select.component';

/**
 * SCR-W10 — النموذج ثلاثي الأبعاد · **ملحق الشكل 44**.
 *
 * ── THE VIEWER ───────────────────────────────────────────────────────────────────────
 * Autodesk APS renders the derivative linked to each model version. Token
 * exchange stays in the API; this page receives only a URN and the viewer's
 * short-lived, viewables-only token.
 *
 * ── THE LINKS ARE THE SCREEN ──────────────────────────────────────────────
 * الشكل 44's own closing note says it: the element's links tie the model to the
 * BOQ line and the schedule activity. Those are joins `EP-MDL-01` resolved, and
 * clicking one navigates to the tab that owns it.
 *
 * ── STATUS IS THE COLOUR; CRITICALITY IS A RING ───────────────────────────
 * The plate's key lists «حرج» fourth, beside three statuses. It is not a fourth
 * status — an element can be both مكتمل and حرج — so it rides a ring, the same
 * channel `.d-gantt-bar.crit` uses on SCR-W5 (CLAUDE.md §6).
 */
@Component({
  selector: 'epm-model-page',
  standalone: true,
  imports: [IconComponent, ApsViewerComponent, SelectComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './model.page.html',
})
export class ModelPage {
  private api = inject(ModelApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  fmt = fmt;

  projectId = signal('');
  data = signal<ModelResponse | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);

  /** «مفتاح تبديل بين عرض الحالة وعرض التخصص». */
  colourBy = signal<'status' | 'discipline'>('status');
  discipline = signal('all');
  status = signal('all');
  versionCode = signal<string | null>(null);
  /** The plate opens with COL-L1 selected. */
  selected = signal<string | null>(null);
  viewerMetadata = signal<ViewerMetadataSummary | null>(null);
  viewerGroup = signal('all');

  elements = computed(() => this.data()?.elements ?? []);
  versions = computed(() => this.data()?.versions ?? []);

  current = computed(() => this.versions().find(v => v.isCurrent) ?? null);
  selectedVersion = computed(() =>
    this.versions().find(v => v.code === this.versionCode()) ?? this.current());
  versionOptions = computed<SelectOption[]>(() => this.versions().map(v => ({
    code: v.code,
    label: `${this.versionLabel(v)} · ${this.fmt.date(v.issuedOn)}`,
  })));
  viewerGroups = computed(() => {
    const metadata = this.viewerMetadata();
    if (!metadata?.elementCount) return [];
    return [
      { key: 'all', label: this.lang.t('mdl_all'), count: metadata.elementCount },
      ...metadata.groups.slice(0, 6).map(({ key, label, count }) => ({ key, label, count })),
    ];
  });

  name(e: { nameAr: string; nameEn: string }): string {
    return this.lang.pick(e.nameAr, e.nameEn);
  }

  /** «مبنى A» / «Building A» — a pair, like every other name (P-125). */
  building(b: { buildingAr: string; buildingEn: string }): string {
    return this.lang.pick(b.buildingAr, b.buildingEn);
  }

  versionLabel(v: { labelAr: string; labelEn: string }): string {
    return this.lang.pick(v.labelAr, v.labelEn);
  }

  disciplineLabel(code: string): string {
    if (code === 'all') return this.lang.t('mdl_all');
    if (code === 'other') return this.lang.t('mdl_other');
    return this.lookups.label('doc-discipline', code);
  }
  statusLabel(code: string): string { return this.lookups.label('activity-status', code); }

  statusClass(code: string): string {
    return code === 'completed' ? 'completed'
      : code === 'delayed' ? 'stalled'
      : code === 'inprogress' ? 'ongoing'
      : '';
  }

  /** The tree mark: status colour, plus a ring when the element is critical. */
  markClass(e: ModelElementRow): string {
    const base = this.colourBy() === 'status' ? e.status : '';
    return `${base}${e.isCritical ? ' crit' : ''}`;
  }

  /** With «التخصص» selected the tree names the discipline instead of colouring by status. */
  markTitle(e: ModelElementRow): string {
    return this.colourBy() === 'status'
      ? this.statusLabel(e.status)
      : this.disciplineLabel(e.discipline);
  }

  /** The tree, filtered by the discipline chips. Empty floors are not drawn. */
  tree = computed(() => {
    const d = this.discipline();
    return (this.data()?.tree ?? [])
      .map(b => ({
        buildingAr: b.buildingAr,
        buildingEn: b.buildingEn,
          levels: b.levels
          .map(l => ({
            level: l.level,
            elements: l.elements.filter(e => d === 'all' || e.discipline === d),
          }))
          .map(l => ({
            ...l,
            elements: l.elements.filter(e => this.status() === 'all' || e.status === this.status()),
          }))
          .filter(l => l.elements.length > 0),
      }))
      .filter(b => b.levels.length > 0);
  });

  shownCount = computed(() =>
    this.tree().reduce((n, b) => n + b.levels.reduce((m, l) => m + l.elements.length, 0), 0));

  opened = computed(() => {
    const visible = this.tree().flatMap(b => b.levels.flatMap(l => l.elements));
    return visible.find(e => e.code === this.selected()) ?? visible[0] ?? null;
  });

  select(code: string) { this.selected.set(code); }

  onNodeKey(e: KeyboardEvent, code: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.select(code);
    }
  }

  boqText(e: ModelElementRow): string {
    const d = this.lang.pick(e.boqDescriptionAr ?? '', e.boqDescriptionEn ?? '');
    return d ? `${e.boqCode} — ${d}` : `${e.boqCode} — ${this.lang.t('mdl_unlinked')}`;
  }

  activityText(e: ModelElementRow): string {
    const n = this.lang.pick(e.activityNameAr ?? '', e.activityNameEn ?? '');
    return n ? `${e.activityCode} — ${n}` : `${e.activityCode} — ${this.lang.t('mdl_unlinked')}`;
  }

  /**
   * The link is a link. الشكل 44's whole argument is that the element points at
   * a real BOQ line and a real activity, so following one lands on the tab that
   * OWNS that record rather than on a copy of it here.
   *
   * The contract is a route segment on both tabs, not a filter — switching
   * contracts re-scopes everything (01 §1) — so the link carries the element's
   * own contract and opens that register. It does not pre-select the row:
   * neither tab reads a row from the URL, and teaching them to would be a
   * change to two screens this one is only reading.
   */
  openBoq(e: ModelElementRow) {
    this.router.navigate(['/projects', this.projectId(), 'boq', e.contractId]);
  }

  openActivity(e: ModelElementRow) {
    this.router.navigate(['/projects', this.projectId(), 'schedule', e.contractId]);
  }

  constructor() {
    this.route.parent!.paramMap.pipe(takeUntilDestroyed()).subscribe(pm => {
      this.projectId.set(pm.get('id') ?? '');
      this.discipline.set('all');
      this.status.set('all');
      this.versionCode.set(null);
      this.selected.set(null);
      this.viewerMetadata.set(null);
      this.viewerGroup.set('all');
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

    forkJoin({ lookups: this.lookups.ensureLoaded(), model: this.api.get(pid) }).subscribe({
      next: ({ model }) => {
        this.data.set(model);
        // الشكل 44 opens with an element already selected, because an empty
        // panel beside a tree teaches nothing about what the tree is for.
        this.selected.set(model.elements[0]?.code ?? null);
        this.versionCode.set(model.versions.find(v => v.isCurrent)?.code ?? model.versions[0]?.code ?? null);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.error?.message ?? e?.message ?? 'request failed');
        this.loading.set(false);
      },
    });
  }

  chooseVersion(code: string) {
    this.viewerMetadata.set(null);
    this.viewerGroup.set('all');
    this.versionCode.set(code || null);
  }

  onViewerMetadata(summary: ViewerMetadataSummary) {
    this.viewerMetadata.set(summary);
  }
}
