import {
  Component, effect, inject, signal, computed, untracked, ViewEncapsulation,
} from '@angular/core';
import { Router } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { PageHeadComponent, Crumb } from '../../shared/page-head.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { DrawerComponent } from '../../shared/drawer.component';
import { PersonaService } from '../../core/persona';
import { PersonaSwitcherComponent } from '../../shared/persona-switcher.component';
import { WorkspacesService } from '../../core/workspaces';
import { WorkspacesApi } from '../workspaces/workspaces.api';
import { EntitiesApi } from './entities.api';
import { EntityRow } from './entities.types';

type SortKey = 'name' | 'projectCount' | 'activeCount' | 'value';

/**
 * SCR-E4 — the WORKSPACE REGISTER (04 §2, ملحق الشاشات الشكل 1).
 *
 * PORTED from DSpaces (v1.1) — ../epm/app/desktop-views.jsx:375. The reference
 * calls this مساحات العمل: the universities and ministry units that own
 * projects. Columns follow it — code · name · type · active · projects ·
 * completion — with the value column added because the effective figure is
 * derivable now (BR-09) and is the number this table is read for.
 *
 * ── IT IS AN ENTRY POINT, NOT A READ-ONLY LIST ────────────────────────────
 * الشكل 1 lists «الدخول إلى مساحة عمل» first among its available actions and
 * names this screen «نقطة الدخول المؤسسية». The reference row carries
 * `onClick={() => openWorkspace(w)}` (desktop-views.jsx:301). A row that
 * displays an entity you cannot open is the inert affordance the whole screen
 * exists to avoid — so the row enters, and it says so on hover and on focus.
 *
 * ── EVERY ROW HERE IS ONE THE USER MAY OPEN (BR-15) ───────────────────────
 * EP-ENT-01 returns the persona's assignments and nothing else, so this table
 * and the sidebar switcher are the same set by construction. There is no
 * client-side filter to keep in sync, and no row that leads to a 403.
 *
 * ── SORTING IS THE POINT ──────────────────────────────────────────────────
 * 04 §2 asks for a *dense sortable* master table, and the reference makes the
 * numeric columns sortable with an explicit direction indicator. Sorting is
 * client-side over the full result set, not the page — sorting a single page
 * would silently reorder within a slice and mislead.
 */
@Component({
  selector: 'epm-entities-page',
  standalone: true,
  imports: [
    IconComponent, TableSkeletonComponent, PageHeadComponent, DrawerComponent,
    PersonaSwitcherComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './entities.page.html',
})
export class EntitiesPage {
  private api = inject(EntitiesApi);
  private router = inject(Router);
  private wsApi = inject(WorkspacesApi);
  private persona = inject(PersonaService);
  private workspaces = inject(WorkspacesService);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  /** The page-head actions are demo stubs and say so — ToastService.demo(). */
  toast = inject(ToastService);
  fmt = fmt;

  rows = signal<EntityRow[]>([]);
  countByKind = signal<Record<string, number>>({});
  /** Workspaces ministry-wide, before BR-15 narrowed them. */
  ministryTotal = signal(0);
  loading = signal(true);
  error = signal<string | null>(null);

  q = signal('');
  kind = signal('');

  sortKey = signal<SortKey>('activeCount');
  sortAsc = signal(false);

  crumbs = computed<Crumb[]>(() => [
    { label: this.lang.t('ministry_short') },
    { label: this.lang.t('nav_entities') },
  ]);

  isUnfiltered = computed(() => !this.q() && !this.kind());

  /**
   * Workspaces exist, but none of them is yours (BR-15). A correct and complete
   * answer about your scope — and a different problem from an empty database,
   * with a different way out.
   */
  assignedNone = computed(() => this.rows().length === 0 && this.ministryTotal() > 0);

  totalCount = computed(() =>
    Object.values(this.countByKind()).reduce((a, b) => a + b, 0));

  count(code: string): number {
    return this.countByKind()[code] ?? 0;
  }

  /** Only the kinds that actually occur, plus any selected one. */
  kinds = computed(() =>
    Object.keys(this.countByKind()).filter(k => this.count(k) > 0 || this.kind() === k));

  /** Sorted over the WHOLE result set, before paging. */
  sorted = computed(() => {
    const key = this.sortKey();
    const dir = this.sortAsc() ? 1 : -1;

    return [...this.rows()].sort((a, b) => {
      if (key === 'name') {
        return this.lang.pick(a.nameAr, a.nameEn)
          .localeCompare(this.lang.pick(b.nameAr, b.nameEn), this.lang.isAr() ? 'ar' : 'en') * dir;
      }
      return ((a[key] as number) - (b[key] as number)) * dir;
    });
  });

  resultLabel = computed(() => {
    const n = this.rows().length;
    return this.lang.isAr() ? `${n} ${this.lang.t('entities_showing')}` : `${n} ${this.lang.t('entities_showing')}`;
  });

  /** code · name · type · active · projects · value · completion — DSpaces'
   *  six (desktop-views.jsx:441) with ours added. */
  readonly colCount = 7;

  constructor() {
    // SWITCHING صفة IS A RE-READ, not a client-side re-filter. `EP-ENT-01`
    // returns the persona's own assignments and nothing else (BR-15), so rows
    // fetched for one capacity are the wrong rows for another — and after
    // defining the first تشكيل as a ministry persona, the register has to show
    // it. Same pattern as SCR-W8 (P-05).
    effect(() => {
      this.persona.currentId();
      untracked(() => this.load());
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      lookups: this.lookups.ensureLoaded(),
      res: this.api.list({ q: this.q(), kind: this.kind() }),
    }).subscribe({
      next: ({ res }) => {
        this.rows.set(res.rows);
        this.countByKind.set(res.countByKind);
        this.ministryTotal.set(res.ministryTotal);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.message ?? 'request failed');
        this.loading.set(false);
      },
    });
  }

  onSearch(v: string) { this.q.set(v); this.load(); }
  setKind(v: string) { this.kind.set(v); this.load(); }
  clearFilters() { this.q.set(''); this.kind.set(''); this.load(); }

  /** Name sorts ascending first; figures sort descending first — biggest matters. */
  toggleSort(k: SortKey) {
    if (this.sortKey() === k) this.sortAsc.set(!this.sortAsc());
    else { this.sortKey.set(k); this.sortAsc.set(k === 'name'); }
  }

  /**
   * 05 §7.8 — the sort state is carried by an ICON (direction), not by colour
   * alone. `unfold_more` marks a sortable-but-inactive column so the affordance
   * is visible before the first click.
   *
   * The reference uses `arrow_upward` / `arrow_downward` for the active
   * direction, but its own icons.js defines NEITHER — so in the reference those
   * arrows render as the fallback glyph (P-25). `expand_less` / `expand_more`
   * are ported, directional, and read the same; using them keeps the icon set
   * verbatim instead of hand-drawing two SVGs the reference never had.
   */
  sortIcon(k: SortKey) {
    if (this.sortKey() !== k) return 'unfold_more';
    return this.sortAsc() ? 'expand_less' : 'expand_more';
  }

  /**
   * The workspace kind, from the `workspace-kind` list (ملحق الشكل 1's four
   * chips). NOT `beneficiary-type` — that is the list of things quantity is
   * distributed TO (01 §2.1), and reading a workspace's kind out of it left a
   * directorate rendering as the raw string `directorate`.
   */
  kindLabel(code: string) {
    return this.lookups.label('workspace-kind', code);
  }

  /**
   * ENTER the workspace — الشكل 1 → الشكل 2. Scope is `?ws=`, the app's one
   * mechanism, so this lands on the overview already scoped and every
   * subsequent nav item inherits it.
   */
  open(code: string) {
    this.router.navigate(['/workspace'], { queryParams: { ws: code } });
  }

  /** Enter on a focused row does what clicking it does (05 §7.7). */
  onRowKey(e: KeyboardEvent, code: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.open(code);
    }
  }

  // ── CREATE (EP-WSP-02, الشكل 1 «إنشاء مساحة جديدة») ──────────────────────

  /**
   * The emblem palette, verbatim from the reference's own five workspaces
   * (data.jsx WORKSPACES).
   *
   * ── IT IS NO LONGER ASKED FOR ─────────────────────────────────────────────
   * The create drawer used to offer this as a swatch row. It does not any more:
   * the colour is not a decision the person defining an entity should have to
   * make, and it is not one this screen shows them the consequence of — the
   * register's emblem is gone (DSpaces' code column is plain mono text), so the
   * only place it lands is the switcher.
   *
   * It is still ASSIGNED, because the switcher popover does paint it — the
   * reference's DSwitcherPop sets `background: w.color` on every row, and the
   * five existing workspaces each have their own. Sending nothing would take
   * the server's `#1d3c6e` fallback (WorkspacesEndpoints.cs:92) and every new
   * entity would share one navy chip.
   *
   * So it is picked from the palette by the entity's own code — stable for a
   * given code, spread across the six, and never a hex from outside the set.
   */
  readonly palette = ['#0e6b47', '#1d4e89', '#7d611d', '#8c2f3a', '#2f5d8c', '#1d3c6e'];

  private paletteColor(code: string) {
    let h = 0;
    for (const ch of code) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    return this.palette[h % this.palette.length];
  }

  /** The colour the entity being defined will carry — derived, not chosen. */
  fColor = computed(() => this.paletteColor(this.fCode().trim() || this.fDisplayCode().trim()));

  createOpen = signal(false);
  saving = signal(false);
  createError = signal<string | null>(null);

  fCode = signal('');
  fDisplayCode = signal('');
  fNameAr = signal('');
  fNameEn = signal('');
  fKind = signal('state-university');

  /** §24 — defining a workspace is a ministry-centre permission (BR-15). */
  canCreate = computed(() => this.persona.current()?.ministryWide === true);

  kindOptions = computed(() => this.lookups.list('workspace-kind'));

  openCreate() {
    this.createError.set(null);
    this.fCode.set('');
    this.fDisplayCode.set('');
    this.fNameAr.set('');
    this.fNameEn.set('');
    this.fKind.set(this.kindOptions()[0]?.code ?? 'state-university');
    this.createOpen.set(true);
  }

  closeCreate() { this.createOpen.set(false); }

  submitCreate() {
    if (this.saving()) return;
    this.saving.set(true);
    this.createError.set(null);

    this.wsApi.create({
      code: this.fCode().trim(),
      displayCode: this.fDisplayCode().trim(),
      nameAr: this.fNameAr().trim(),
      nameEn: this.fNameEn().trim(),
      kind: this.fKind(),
      color: this.fColor(),
    }).subscribe({
      next: () => {
        this.saving.set(false);
        this.createOpen.set(false);
        this.toast.show(this.lang.isAr() ? 'أُضيفت مساحة العمل' : 'Workspace added');
        // The switcher reads the same list (EP-ENT-01), so it has to be told
        // too — otherwise the new workspace exists in the register and not in
        // the control that navigates to it.
        this.workspaces.reload().subscribe();
        this.load();
      },
      error: e => {
        this.saving.set(false);
        this.createError.set(e?.error?.message ?? e?.message ?? 'request failed');
      },
    });
  }
}
