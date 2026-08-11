import { Component, DestroyRef, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { SummaryStripComponent, Stat } from '../../shared/summary-strip.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { ScheduleApi } from './schedule.api';
import { ScheduleContractOption, ScheduleResponse, ScheduleRow } from './schedule.types';

/** One month column of the timeline header. */
interface MonthCol { label: string; year: string; }

/**
 * SCR-W5 — the project workspace Schedule module (`04 §5`).
 *
 * PORTED from the v1.1 schedule module — ../epm@design/system-revamp
 * app/schedule-module.jsx `DGantt` :80 · `DSchedTable` :257 · `DModSchedule` :437.
 *
 * ── THE CONTRACT GATE, AGAIN ──────────────────────────────────────────────
 * Same rule and same shape as SCR-W4 (P-46): an activity belongs to exactly
 * one contract, a project with one contract is not asked, and the contract is
 * a URL segment so a link to a programme survives being pasted.
 *
 * ── WHAT THIS COMPONENT COMPUTES ──────────────────────────────────────────
 * PIXELS. `left()` and `width()` turn two dates and the timeline bounds into a
 * percentage of a track. That is geometry, not arithmetic about the business:
 * both weights, the roll-up, the slip and the bounds themselves arrive derived
 * from `api/Epm.Api/Domain/`.
 *
 * ── CRITICALITY IS A RING (04 §5) ─────────────────────────────────────────
 * The bar carries STATUS as its fill and criticality as a 2px `--on-surface`
 * ring. The reference's stylesheet paints a critical bar `--error`, which
 * contradicts its own legend; the override lives in `web/src/styles.css` and
 * the reasoning in P-52.
 *
 * ── COLLAPSE IS A PATH MATCH ──────────────────────────────────────────────
 * The server sends ONE FLAT ORDERED LIST with a `path` per row. Hiding a
 * subtree is "does any collapsed path prefix mine", so the tree on screen can
 * never drift from the tree in the data — there is only one tree.
 */
@Component({
  selector: 'epm-schedule-page',
  standalone: true,
  imports: [IconComponent, StatusPillComponent, SummaryStripComponent, TableSkeletonComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './schedule.page.html',
})
export class SchedulePage {
  private api = inject(ScheduleApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  toast = inject(ToastService);
  fmt = fmt;

  projectId = signal('');
  contractId = signal('');

  contracts = signal<ScheduleContractOption[]>([]);
  data = signal<ScheduleResponse | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);

  /** gantt · table */
  view = signal<'gantt' | 'table'>('gantt');

  basis = signal<'cost' | 'mh'>('cost');
  criticalOnly = signal(false);
  /** WBS depth to open to. Deeper nodes start collapsed (the reference's L15). */
  wbsLevel = signal(2);
  collapsed = signal<Record<string, boolean>>({});
  selected = signal('');

  /** The pinned name block. `04 §5`: floor 160px, default 320px. */
  nameWidth = signal(320);
  /** Below 1280px the picker opens on the 4 essential columns (`04 §5`); set in the constructor. */
  allColumns = signal(true);
  /**
   * Set the moment the button is pressed, and never cleared. `04 §5` asks for a
   * DEFAULT, and a default that reasserts itself over an explicit choice is not
   * a default — it is the screen arguing with the person using it.
   */
  private columnsChosen = false;

  toggleColumns() {
    this.columnsChosen = true;
    this.allColumns.update(v => !v);
  }

  readonly colCount = 13;

  /** Pixels per month column. The reference's own 46. */
  readonly monthWidth = 46;

  // ── the gate ───────────────────────────────────────────────────────────

  singleContract = computed(() => this.contracts().length === 1);
  gated = computed(() => !this.contractId() && !this.singleContract());

  private effectiveContractId = computed(() =>
    this.contractId() || (this.singleContract() ? this.contracts()[0].id : ''));

  contract = computed(() => this.contracts().find(c => c.id === this.effectiveContractId()));

  contractLabel = computed(() => {
    const c = this.contract();
    return c ? this.lang.pick(c.nameAr, c.nameEn) : '';
  });

  // ── the timeline ───────────────────────────────────────────────────────

  private originMs = computed(() => Date.parse(this.data()?.timeline.origin ?? '') || 0);

  private spanMs = computed(() => {
    const t = this.data()?.timeline;
    if (!t) return 1;
    return Math.max(1, Date.parse(t.end) - Date.parse(t.origin));
  });

  months = computed<MonthCol[]>(() => {
    const t = this.data()?.timeline;
    if (!t) return [];
    const loc = this.lang.isAr() ? 'ar' : 'en';
    return t.months.map(m => {
      const d = new Date(m);
      return {
        label: d.toLocaleDateString(loc, { month: 'short' }),
        year: String(d.getFullYear()).slice(2),
      };
    });
  });

  trackWidth = computed(() => this.months().length * this.monthWidth);

  /** Total inner width: the pinned name block + the info grid + the track. */
  innerWidth = computed(() =>
    this.nameWidth() + (this.allColumns() ? 564 : 264) + this.trackWidth());

  /** Where the `--viz-base` data-date line goes. D-06: the project's date. */
  dataDateLeft = computed(() => this.fraction(this.data()?.timeline.dataDate) * this.trackWidth());

  /** A date as a fraction of the timeline. Geometry only. */
  private fraction(iso: string | null | undefined): number {
    if (!iso) return 0;
    const t = Date.parse(iso);
    if (isNaN(t)) return 0;
    return (t - this.originMs()) / this.spanMs();
  }

  left(iso: string | null | undefined): number {
    return this.fraction(iso) * this.trackWidth();
  }

  /** A bar never renders thinner than 2px, or a one-day task disappears. */
  width(from: string | null | undefined, to: string | null | undefined): number {
    if (!from || !to) return 0;
    return Math.max(2, (this.fraction(to) - this.fraction(from)) * this.trackWidth());
  }

  /**
   * The bar's own span: actual start → the finish in force. A finished
   * activity draws to its ACTUAL finish; anything else draws to its forecast,
   * which is where it is currently expected to end.
   */
  barStart(r: ScheduleRow): string | null { return r.actualStart ?? r.baselineStart; }
  barEnd(r: ScheduleRow): string | null { return r.actualFinish ?? r.forecastFinish ?? r.baselineFinish; }

  /** 06 §9 status → the shared status-pill token, so the fill is the design system's. */
  statusToken(code: string): string {
    switch (code) {
      case 'completed': return 'completed';
      case 'ahead': return 'completed';
      case 'inprogress': return 'ongoing';
      case 'delayed': return 'delayed';
      default: return 'cancelled';
    }
  }

  /** The bar fill, as a token — never a literal (CLAUDE.md §6). */
  barColor(r: ScheduleRow): string {
    return `var(--status-${this.statusToken(r.status)})`;
  }

  // ── rows ───────────────────────────────────────────────────────────────

  rows = computed(() => this.data()?.rows ?? []);

  /**
   * What actually renders: the flat list, minus collapsed subtrees, minus
   * everything off the critical path when that filter is on.
   *
   * A WBS node survives the critical filter only when something critical lives
   * beneath it — a heading over nothing is worse than no heading.
   */
  visible = computed(() => {
    const collapsed = this.collapsed();
    const crit = this.criticalOnly();
    return this.rows().filter(r => {
      if (crit && !r.isCritical) return false;
      // A row is hidden when any STRICT ancestor of it is collapsed.
      for (const [path, isClosed] of Object.entries(collapsed)) {
        if (!isClosed || path === r.path) continue;
        if (r.path === path || r.path.startsWith(path + '.')) return false;
      }
      // An activity's own node being collapsed hides it too.
      if (r.kind === 'act' && collapsed[r.path]) return false;
      return true;
    });
  });

  isOpen(path: string): boolean { return !this.collapsed()[path]; }

  toggle(path: string) {
    this.collapsed.update(c => ({ ...c, [path]: !c[path] }));
  }

  /** Opens the tree to the chosen depth — nodes deeper than it start closed. */
  private applyLevel(level: number) {
    const next: Record<string, boolean> = {};
    for (const r of this.rows()) {
      if (r.kind === 'wbs' && r.level >= level) next[r.path] = true;
    }
    this.collapsed.set(next);
  }

  setLevel(level: number) {
    this.wbsLevel.set(level);
    this.applyLevel(level);
  }

  selectedRow = computed(() => this.rows().find(r => r.id === this.selected() && r.kind === 'act'));

  select(r: ScheduleRow) {
    if (r.kind !== 'act') return;
    this.selected.set(this.selected() === r.id ? '' : r.id);
  }

  name(r: { nameAr: string; nameEn: string }): string {
    return this.lang.pick(r.nameAr, r.nameEn);
  }

  statusLabel(code: string): string {
    return code ? this.lookups.label('activity-status', code) : '';
  }

  /** Indent, in px. Level 1 sits flush; every level adds 10. */
  indent(level: number): number { return (level - 1) * 10; }

  summaryStats = computed<Stat[]>(() => {
    const s = this.data()?.summary;
    if (!s) return [];
    return [
      { label: this.lang.t('scd_stat_activities'), value: s.activities },
      { label: this.lang.t('scd_stat_critical'), value: s.critical },
      { label: this.lang.t('scd_stat_delayed'), value: s.delayed },
      { label: this.lang.t('scd_stat_progress'), value: s.averageProgress, suffix: '%' },
      { label: this.lang.t('scd_stat_milestones'), value: s.milestones },
    ];
  });

  // ── the resizable name block (04 §5) ───────────────────────────────────

  /**
   * Drag, with the direction flipped in RTL — the pointer moving left widens
   * the block when the block is on the right.
   */
  startResize(ev: PointerEvent) {
    ev.preventDefault();
    const startX = ev.clientX;
    const startW = this.nameWidth();
    const dir = this.lang.isAr() ? -1 : 1;

    const move = (e: PointerEvent) =>
      this.nameWidth.set(Math.min(560, Math.max(160, startW + (e.clientX - startX) * dir)));
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  }

  /** Keyboard equivalent — a drag handle nobody can reach is not an affordance. */
  nudge(delta: number) {
    this.nameWidth.update(w => Math.min(560, Math.max(160, w + delta)));
  }

  constructor() {
    combineLatest([this.route.parent!.paramMap, this.route.paramMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([parent, own]) => {
        this.projectId.set(parent.get('id') ?? '');
        this.contractId.set(own.get('contractId') ?? '');
        this.view.set('gantt');
        this.selected.set('');
        this.load();
      });

    // `04 §5`: "Below 1280px a column picker defaults to 4 essential columns
    // with a toggle for all 9." A VIEWPORT breakpoint, and taken literally —
    // 1440 / 1280 / 1024 / 768 are the four widths the audit checks (`04 §12`),
    // and a pane-room heuristic went compact at 1440 with 230px of track left,
    // which is the screen disagreeing with the spec at an audited breakpoint.
    // The chart survives a narrow pane by SCROLLING, not by dropping columns.
    const narrow = window.matchMedia('(max-width: 1279.98px)');
    this.allColumns.set(!narrow.matches);
    const onChange = (e: MediaQueryListEvent) => {
      if (!this.columnsChosen) this.allColumns.set(!e.matches);
    };
    narrow.addEventListener('change', onChange);
    inject(DestroyRef).onDestroy(() => narrow.removeEventListener('change', onChange));
  }

  load() {
    const pid = this.projectId();
    if (!pid) return;
    this.loading.set(true);
    this.error.set(null);

    forkJoin({ lookups: this.lookups.ensureLoaded(), gate: this.api.gate(pid) }).subscribe({
      next: ({ gate }) => {
        this.contracts.set(gate.contracts);

        const cid = this.effectiveContractId();
        if (!cid) { this.data.set(null); this.loading.set(false); return; }

        this.fetch(cid);
      },
      error: e => this.fail(e),
    });
  }

  private fetch(contractId: string) {
    this.api.get(this.projectId(), contractId, this.basis()).subscribe({
      next: d => {
        this.data.set(d);
        // The server decides whether man-hours are usable at all.
        this.basis.set(d.summary.basis === 'mh' ? 'mh' : 'cost');
        this.applyLevel(this.wbsLevel());
        this.loading.set(false);
      },
      error: e => this.fail(e),
    });
  }

  private fail(e: any) {
    this.error.set(e?.error?.message ?? e?.message ?? 'request failed');
    this.loading.set(false);
  }

  setBasis(b: 'cost' | 'mh') {
    if (this.basis() === b) return;
    this.basis.set(b);
    this.fetch(this.effectiveContractId());
  }

  private qp() {
    const ws = this.route.snapshot.queryParamMap.get('ws');
    return ws ? { ws } : {};
  }

  chooseContract(id: string) {
    if (!id) return;
    this.router.navigate(['/projects', this.projectId(), 'schedule', id], { queryParams: this.qp() });
  }

  backToGate() {
    this.router.navigate(['/projects', this.projectId(), 'schedule'], { queryParams: this.qp() });
  }
}
