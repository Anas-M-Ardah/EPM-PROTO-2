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

/**
 * SCR-W10 — النموذج ثلاثي الأبعاد · **ملحق الشكل 44**.
 *
 * ── THE TAB IS KEPT AND THE VIEWER IS STUBBED ─────────────────────────────
 * `07 §8` puts real BIM/IFC rendering out of Phase 1 in exactly those words.
 * So everything on الشكل 44 that carries DATA is built — the version selector,
 * the discipline filters, the tree, the element panel, its links, the colour
 * key — and the scene is an honest placeholder that says what it would show
 * and why it is not there (P-120). The plate's floating toolbar is NOT drawn:
 * measure, section and snapshot controls over an empty viewport are the same
 * defect as a tab that opens onto nothing (P-118).
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
  imports: [IconComponent],
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
  /** The plate opens with COL-L1 selected. */
  selected = signal<string | null>(null);

  elements = computed(() => this.data()?.elements ?? []);
  versions = computed(() => this.data()?.versions ?? []);

  current = computed(() => this.versions().find(v => v.isCurrent) ?? null);

  name(e: { nameAr: string; nameEn: string }): string {
    return this.lang.pick(e.nameAr, e.nameEn);
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
        building: b.building,
        levels: b.levels
          .map(l => ({
            level: l.level,
            elements: l.elements.filter(e => d === 'all' || e.discipline === d),
          }))
          .filter(l => l.elements.length > 0),
      }))
      .filter(b => b.levels.length > 0);
  });

  shownCount = computed(() =>
    this.tree().reduce((n, b) => n + b.levels.reduce((m, l) => m + l.elements.length, 0), 0));

  opened = computed(() => this.elements().find(e => e.code === this.selected()) ?? null);

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
        // الشكل 44 opens with an element already selected, because an empty
        // panel beside a tree teaches nothing about what the tree is for.
        this.selected.set(model.elements[0]?.code ?? null);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.error?.message ?? e?.message ?? 'request failed');
        this.loading.set(false);
      },
    });
  }
}
