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
import { ModelElementRow, ModelResponse } from './model.types';
import { ApsViewerComponent } from './aps-viewer.component';
import { SelectComponent, SelectOption } from '../../shared/select.component';
import { DrawerComponent } from '../../shared/drawer.component';

/**
 * SCR-W10 — النموذج ثلاثي الأبعاد · **ملحق الشكل 44**.
 *
 * ── THE VIEWER OWNS THE HIERARCHY ─────────────────────────────────────────
 * Autodesk APS renders the derivative linked to each model version, and its
 * native Model Structure panel is the model hierarchy, as in PPlus. Token
 * exchange stays in the API; this page receives only a URN.
 *
 * ── THE LINKS ARE THE SCREEN ──────────────────────────────────────────────
 * Beside the scene sit the project's own elements, each joined by `EP-MDL-01`
 * to one BOQ line and one activity. They are a register, not a second tree:
 * an element carries no object ID from the model file yet, so selecting one
 * opens its details and links rather than pretending to isolate geometry.
 *
 * ── STATUS IS THE COLOUR; CRITICALITY IS A RING ───────────────────────────
 * «حرج» is not a fourth status — an element can be both مكتمل and حرج — so it
 * rides a ring (CLAUDE.md §6).
 */
@Component({
  selector: 'epm-model-page',
  standalone: true,
  imports: [IconComponent, ApsViewerComponent, SelectComponent, DrawerComponent],
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
  /** The register under the scene: the linked elements, or the version record. */
  tab = signal<'elements' | 'versions'>('elements');
  discipline = signal('all');
  status = signal('all');
  versionCode = signal<string | null>(null);
  /** The element whose details drawer is open. */
  selected = signal<string | null>(null);

  elements = computed(() => this.data()?.elements ?? []);
  versions = computed(() => this.data()?.versions ?? []);

  current = computed(() => this.versions().find(v => v.isCurrent) ?? null);
  selectedVersion = computed(() =>
    this.versions().find(v => v.code === this.versionCode()) ?? this.current());
  versionOptions = computed<SelectOption[]>(() => this.versions().map(v => ({
    code: v.code,
    label: `${this.versionLabel(v)} · ${this.fmt.date(v.issuedOn)}`,
  })));

  /** The register, filtered by the discipline and status chips. */
  shown = computed(() => {
    const d = this.discipline(), s = this.status();
    return this.elements().filter(e =>
      (d === 'all' || e.discipline === d) && (s === 'all' || e.status === s));
  });

  filtered = computed(() => this.discipline() !== 'all' || this.status() !== 'all');

  opened = computed(() => this.elements().find(e => e.code === this.selected()) ?? null);

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
    return code === 'all' ? this.lang.t('mdl_all') : this.lookups.label('doc-discipline', code);
  }
  statusLabel(code: string): string { return this.lookups.label('activity-status', code); }

  statusClass(code: string): string {
    return code === 'completed' ? 'completed'
      : code === 'delayed' ? 'stalled'
      : code === 'inprogress' ? 'ongoing'
      : '';
  }

  /** The row mark: status colour, plus a ring when the element is critical. */
  markClass(e: ModelElementRow): string {
    const base = this.colourBy() === 'status' ? e.status : '';
    return `${base}${e.isCritical ? ' crit' : ''}`;
  }

  /** The mark's word, so the mark is never colour alone (05 §7.6). */
  markTitle(e: ModelElementRow): string {
    const word = this.colourBy() === 'status'
      ? this.statusLabel(e.status)
      : this.disciplineLabel(e.discipline);
    return e.isCritical ? `${word} · ${this.lang.t('mdl_critical')}` : word;
  }

  boqText(e: ModelElementRow): string {
    const d = this.lang.pick(e.boqDescriptionAr ?? '', e.boqDescriptionEn ?? '');
    return d ? `${e.boqCode} — ${d}` : `${e.boqCode} — ${this.lang.t('mdl_unlinked')}`;
  }

  activityText(e: ModelElementRow): string {
    const n = this.lang.pick(e.activityNameAr ?? '', e.activityNameEn ?? '');
    return n ? `${e.activityCode} — ${n}` : `${e.activityCode} — ${this.lang.t('mdl_unlinked')}`;
  }

  open(code: string) { this.selected.set(code); }
  close() { this.selected.set(null); }

  clearFilters() {
    this.discipline.set('all');
    this.status.set('all');
  }

  /**
   * The link is a link: it lands on the tab that OWNS the record, scoped to
   * the element's own contract, rather than on a copy of it here.
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
      this.clearFilters();
      this.versionCode.set(null);
      this.selected.set(null);
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
    this.versionCode.set(code || null);
  }
}
