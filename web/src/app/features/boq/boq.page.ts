import { NgTemplateOutlet } from '@angular/common';
import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { DrawerComponent } from '../../shared/drawer.component';
import { PopoverComponent } from '../../shared/popover.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { BoqImportWizard } from './boq-import.wizard';
import { BoqImportApi } from './boq-import.api';
import { BoqImportVersionDto } from './boq-import.types';
import { SectionComponent } from '../../shared/section.component';
import { ModuleBarComponent } from '../../shared/module-bar.component';
import { AmendmentMarkComponent } from '../../shared/amendment-mark.component';
import { AmendmentDeltaComponent } from '../../shared/amendment-delta.component';
import {
  AmendmentBandView, AmendmentFactView, AmendmentPanelComponent, AmendmentStepView,
} from '../../shared/amendment-panel.component';
import { SelectComponent, SelectOption } from '../../shared/select.component';
import { PersonaSwitcherComponent } from '../../shared/persona-switcher.component';
import { PersonaService } from '../../core/persona';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { BoqApi } from './boq.api';
import {
  BoqAllocation, BoqAllocationRow, BoqAmendmentDetail, BoqAssignmentResponse,
  BoqContractOption, BoqDistributionResponse, BoqDivision, BoqItemCreate,
  BoqRegisterResponse, BoqRow, BoqSavedView, ProjectBeneficiaryRow,
} from './boq.types';

/** One row of the distribution drawer while it is being edited. */
interface DistDraft {
  beneficiaryCode: string;
  siteCode: string;
  /** Kept as a STRING while typing: "1." and "" are states a number cannot hold. */
  qty: string;
}

/** One link of the assignment editor while it is being edited. */
interface ShareDraft {
  activityId: string;
  pct: string;
}

/**
 * SCR-W4 — the project workspace BOQ module (`04 §4`), the densest screen here.
 *
 * PORTED from the v1.1 BOQ module — ../epm@design/system-revamp
 * app/boq-workspace.jsx:16 (shell + contract context) ·
 * app/boq-register.jsx:435 (the grid) · app/boq-assign.jsx:11 (the matrix).
 *
 * ── THE CONTRACT SELECTOR COMES FIRST ─────────────────────────────────────
 * `04 §4`: nothing renders until a contract is chosen. A BOQ item belongs to
 * exactly one contract (non-negotiable #1), so "the project's BOQ" is not a
 * thing — each contract has one, and a list spanning two would be a bill of
 * quantities for no contract at all.
 *
 * A project with ONE contract is not asked: there is no choice to make, and the
 * reference does the same. That is the only place this page departs from the
 * v1.1 component, which opens on the first contract however many there are —
 * see P-46.
 *
 * ── THE CONTRACT IS THE URL, THE VIEW IS NOT ──────────────────────────────
 * `/projects/:id/boq/:contractId`, exactly as SCR-W3 settles it: a contract is
 * a record and a link to one has to survive being pasted. Register vs activity
 * assignment are two VIEWS of that record, so they stay in component state.
 *
 * ── TWO VIEWS, NOT THREE ──────────────────────────────────────────────────
 * `04 §4` names three (register · distribution · assignment). v1.1 made
 * distribution a row action opening a drawer, which is also what CLAUDE.md §6
 * requires of secondary detail, and what ROADMAP 4.2 asks for. So: two tabs and
 * a drawer.
 *
 * ── NO ARITHMETIC ─────────────────────────────────────────────────────────
 * Weight, share, assigned amount, progress, coverage and distribution state all
 * arrive computed from `api/Epm.Api/Domain/`. The two exceptions are stated
 * where they are: `previewAmount` and `draftTotal`, both of which are what the
 * user is about to send, shown back to them before they send it.
 */
@Component({
  selector: 'epm-boq-page',
  standalone: true,
  // NgTemplateOutlet: one BOQ line renders in three states (reading, inline
  // edit, delete confirm) and is used from two places in the grid — grouped
  // under a division, and ungrouped. One template, one definition of a row.
  imports: [NgTemplateOutlet, IconComponent, DrawerComponent, TableSkeletonComponent,
    SectionComponent, ModuleBarComponent, SelectComponent, PersonaSwitcherComponent, BoqImportWizard,
    AmendmentMarkComponent, AmendmentDeltaComponent, AmendmentPanelComponent, PopoverComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './boq.page.html',
})
export class BoqPage {
  private api = inject(BoqApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private importApi = inject(BoqImportApi);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  toast = inject(ToastService);
  persona = inject(PersonaService);
  fmt = fmt;

  projectId = signal('');
  contractId = signal('');

  contracts = signal<BoqContractOption[]>([]);
  reg = signal<BoqRegisterResponse | null>(null);
  asn = signal<BoqAssignmentResponse | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);
  /** A write in flight. Every button that writes is disabled while it is true. */
  saving = signal(false);

  /** register · assign */
  view = signal<'register' | 'assign'>('register');

  // ── register filters ───────────────────────────────────────────────────
  q = signal('');
  coverage = signal('');
  /** Divisions are open by default; this holds the ones collapsed. */
  collapsed = signal<Record<string, boolean>>({});
  colMenu = signal(false);
  /**
   * DEFAULTS ARE الشكل 12's TWELVE, in its order:
   *
   *   الرمز · الوصف · الوحدة · الكمية · سعر الوحدة · القيمة · الوزن % ·
   *   الأنشطة · الوزن المُخصَّص · التنفيذ · القيمة المكتسبة · حالة التخصيص
   *
   * Everything else is opt-in through «الأعمدة». القيمة الأصلية and الفرق
   * (أمر تغييري) stay off because on a bill with no amendments they are two
   * columns of «—».
   *
   * `distribution` is off for a REASON, not to save width: الشكل 12 does not
   * list التوزيع among the register's columns — it names it as a TAB of the
   * item card («عام · التخصيص · التوزيع · الإنجاز · الكلفة · السجل»), which is
   * where this page already shows it. Nothing is lost by the default, and a
   * reader who wants the column can still switch it on.
   */
  cols = signal<Record<string, boolean>>({
    unit: true, qty: true, rate: true, amount: true, weight: true,
    links: true, assignedWeight: true, progress: true, coverage: true,
    earned: true, distribution: false, origAmount: false, variance: false,
  });

  // ── «العروض» — saved views (ملحق الشكل 12) ────────────────────────────
  /**
   * NOT scoped to the contract, and loaded ONCE rather than per switch: a view
   * carries a search string, a coverage chip and a set of column toggles, none
   * of which belongs to a bill. The server scopes them to the persona instead,
   * so this list is «my views» wherever the page is standing.
   */
  viewMenu = signal(false);
  savedViews = signal<BoqSavedView[]>([]);

  // ── «الجهات المستفيدة» — the master list and this project's use of it ──
  /**
   * A DRAWER, per CLAUDE.md §6 — secondary detail, never an in-place expander —
   * and the reference's own shape (contract-context.jsx:182 `DBenDrawer`).
   *
   * `benDraft` holds the ticked codes while the drawer is open, so closing
   * without saving changes nothing. The reference toggles straight into
   * persisted state and therefore has no cancel; a screen that writes a project
   * field on every checkbox click cannot offer one.
   */
  benOpen = signal(false);
  bens = signal<ProjectBeneficiaryRow[]>([]);
  benDraft = signal<Set<string>>(new Set());
  benSaving = signal(false);

  // ── inline row edit / delete (04 §4) ───────────────────────────────────
  editing = signal('');
  editDescriptionAr = signal('');
  editDescriptionEn = signal('');
  editUnit = signal('');
  editQty = signal('');
  editRate = signal('');
  deleting = signal('');
  /** The row whose overflow menu is open. One at a time, by code. */
  rowMenu = signal('');

  // ── EP-BOQ-12 — «الإدخال اليدوي» (المسار 3 step 3ب) ───────────────────
  /**
   * A DOCKED Z8 RECORD PANE, not a modal — design/system-revamp
   * boq-workspace.jsx:237 is explicit about why: "Adding or editing an item is a
   * record edit, so it opens in the page's docked pane like every other record —
   * not in a drawer over the grid, which hid the very rows the new item has to
   * sit among." A first pass here used a modal and had exactly that fault.
   *
   * The code is NOT asked for. The branch renders it read-only as
   * «يُولَّد تلقائياً» (:283) and EP-BOQ-12 generates it.
   *
   * «الكمية المنفذة» from the branch's form is NOT here. `BoqItem.ExecutedQty`
   * is deliberately pruned: BR-04 derives execution from the linked activities,
   * and «التنفيذ مشتق لا مُدخَل» (proposal §12-1) makes it un-typeable by rule.
   * The branch is a clickable prototype with no schedule behind it.
   */
  addOpen = signal(false);
  addDescriptionAr = signal('');
  addDescriptionEn = signal('');
  addUnit = signal('');
  addQty = signal('');
  addRate = signal('');
  addDivision = signal('');
  addDivisionName = signal('');
  /** The sub-type half. Only sent when the bill's kind is `supply` (D-14). */
  addManufacturer = signal('');
  addCountry = signal('');
  addModel = signal('');
  addSerialFrom = signal('');
  addSerialTo = signal('');
  addSuppliedQty = signal('');
  addWarrantyMonths = signal('');
  addNotes = signal('');
  addError = signal('');

  // ── الشكل 12 — بطاقة البند ───────────────────────────────────────────
  /**
   * «لوحة تفاصيل البند بتبويبات» — the open item's code, or none. Component
   * state and not the URL, by the same argument الشكل 9's payment panel
   * settles: an item is a row of one contract's bill, and the contract is
   * already what the link carries.
   */
  // ── الشكل 13 — استيراد جدول الكميات ──────────────────────────────────
  /** The wizard is a modal, so it is open or it is not. */
  importOpen = signal(false);

  /**
   * Submitted versions on this contract. Read so the register can say one is
   * waiting — «لا يُمحى إصدار سابق» is only true if a submission is visible
   * afterwards, and nothing else on this screen would show it.
   */
  importVersions = signal<BoqImportVersionDto[]>([]);

  /**
   * The one awaiting a decision, and there is at most one: `EP-BOQ-10` lapses
   * an earlier pending version when a newer sheet is submitted, and `EP-BOQ-13`
   * lapses any other when one is approved. An approval replaces every line the
   * other version was compared against, so a second pending submission could
   * only ever be approved on a comparison against a bill that no longer exists.
   */
  pendingImport = computed(() =>
    this.importVersions().find(v => v.state === 'submitted') ?? null);

  /**
   * EP-BOQ-13 — المسار 3 step 7. Whether THIS capacity may approve.
   *
   * Mirrors `Personas.CanApproveBoqImport` so the bar shows the reason instead
   * of a button that 403s. The server re-checks it and its answer is binding —
   * a rule enforced only in the UI is not enforced (P-05).
   *
   * Separation of duties is the whole point: المستخدم المختص submits (step 6),
   * إدارة المشاريع approves (step 7). Switch capacity to see the other view.
   */
  canApproveImport = computed(() =>
    this.persona.current()?.party === 'دائرة المهندس المقيم'
    || this.persona.current()?.party === 'مدير المشروع');

  approving = signal(false);

  approveImport(no: number) {
    if (this.approving()) return;
    this.approving.set(true);
    this.importApi.approve(this.projectId(), this.effectiveContractId(), no).subscribe({
      next: () => {
        this.approving.set(false);
        // The bill just changed — reload the register, the versions bar and the
        // assignment view, which all read what this replaced.
        this.loadImportVersions();
        this.asn.set(null);
        this.load();
        this.toast.show(this.lang.t('boq_imp_approved'));
      },
      error: e => { this.approving.set(false); this.toast.show(this.message(e)); },
    });
  }

  loadImportVersions() {
    // `effectiveContractId()`, NOT the route's `contractId()`. A project with
    // one contract is never asked to choose (P-46), so the URL carries no
    // contract and the route signal is empty — this returned early and the
    // pending-version bar never appeared on exactly the projects most likely
    // to have one. Every other call on this page already resolves it this way.
    const p = this.projectId(); const c = this.effectiveContractId();
    if (!p || !c) return;
    this.importApi.versions(p, c).subscribe({
      next: v => this.importVersions.set(v),
      // A missing version list must never take the register down with it:
      // the bill is what this screen is for.
      error: () => this.importVersions.set([]),
    });
  }

  /**
   * EP-BOQ-10 wrote a version; the bill is deliberately unchanged.
   *
   * RE-READ rather than prepended. The submission that just landed lapsed the
   * pending one before it (`EP-BOQ-10`), so the row this list already holds for
   * that version now says `submitted` on the client and `lapsed` on the server.
   * Pushing the new version on top would leave the stale one underneath it,
   * saying a thing that is no longer true of any row in the database.
   */
  importSubmitted(_v: BoqImportVersionDto) {
    this.loadImportVersions();
    this.toast.show(this.lang.t('boq_imp_done_t'));
  }

  card = signal('');
  cardTab = signal('general');

  /** The open row, read back out of the register so it re-derives on reload. */
  cardRow = computed(() => this.rows().find(r => r.code === this.card()) ?? null);

  // ── the distribution drawer ────────────────────────────────────────────
  distCode = signal('');
  dist = signal<BoqDistributionResponse | null>(null);
  distDraft = signal<DistDraft[]>([]);

  // ── the assignment editor ──────────────────────────────────────────────
  activeCode = signal('');
  basis = signal<'cost' | 'mh'>('cost');
  shareDraft = signal<ShareDraft[] | null>(null);
  queueFilter = signal('');
  picker = signal(false);
  /** A5-rest — «توزيع», the `.d-actmenu` that holds the basis and the action. */
  distMenu = signal(false);

  readonly colCount = 13;

  readonly coverageKeys = ['full', 'partial', 'over', 'unassigned'];

  /** The column list, in the reference's order. `k` is also the lookup key. */
  readonly columns = [
    { k: 'unit', label: 'boq_col_unit' },
    { k: 'qty', label: 'boq_col_qty' },
    { k: 'rate', label: 'boq_col_rate' },
    { k: 'amount', label: 'boq_col_amount' },
    // ملحق الشكل 12 · the reference's picker lists these three and ours did
    // not. القيمة الأصلية and الفرق are 4.5's amendment disclosure by another
    // name — the reference calls the delta «الفرق (أمر تغييري)» and gives it a
    // column toggle, and `04 §6` wants the same fact at the cell.
    { k: 'origAmount', label: 'boq_col_orig_amount' },
    { k: 'variance', label: 'boq_col_variance' },
    // On the reference's DEFAULT grid, computed by BR-04 here and by
    // `Domain/EarnedValue` at contract level — and shown on no screen until now.
    { k: 'earned', label: 'boq_col_earned' },
    { k: 'weight', label: 'boq_col_weight' },
    { k: 'links', label: 'boq_col_links' },
    { k: 'assignedWeight', label: 'boq_col_assigned_wt' },
    { k: 'progress', label: 'boq_col_progress' },
    { k: 'distribution', label: 'boq_col_distribution' },
    { k: 'coverage', label: 'boq_col_coverage' },
  ] as const;

  // ── the gate ───────────────────────────────────────────────────────────

  /**
   * One contract is not a choice. The register opens on it directly, and the
   * selector is not rendered — the same call SCR-W3 makes about its register.
   */
  singleContract = computed(() => this.contracts().length === 1);

  gated = computed(() => !this.contractId() && !this.singleContract());

  private effectiveContractId = computed(() =>
    this.contractId() || (this.singleContract() ? this.contracts()[0].id : ''));

  contract = computed(() =>
    this.contracts().find(c => c.id === this.effectiveContractId()));

  contractLabel = computed(() => {
    const c = this.contract();
    return c ? this.lang.pick(c.nameAr, c.nameEn) : '';
  });

  // ── the register ───────────────────────────────────────────────────────

  rows = computed(() => this.reg()?.rows ?? []);

  filtered = computed(() => {
    const q = this.q().trim().toLowerCase();
    const cov = this.coverage();
    return this.rows().filter(r => {
      if (cov && r.coverage !== cov) return false;
      if (!q) return true;
      return (r.code + ' ' + r.descriptionAr + ' ' + r.descriptionEn).toLowerCase().includes(q);
    });
  });

  isUnfiltered = computed(() => !this.q().trim() && !this.coverage());

  /**
   * The grid as it renders: a division header followed by its lines. Divisions
   * with nothing left after the filter drop out entirely — a header over no
   * rows says a group is empty when it is only hidden.
   */
  groups = computed(() => {
    const shown = this.filtered();
    return (this.reg()?.divisions ?? [])
      .map(d => ({ division: d, rows: this.sorted(shown.filter(r => r.division === d.key)) }))
      .filter(g => g.rows.length > 0);
  });

  /** Lines filed under no division. They follow the groups rather than vanish. */
  ungrouped = computed(() => this.sorted(this.filtered().filter(r => !r.division)));

  // ── the sort (ملحق الشكل 12 · the reference's own grid) ────────────────
  //
  // SORTING HAPPENS INSIDE EACH DIVISION, never across them. The reference does
  // the same, and it is not a stylistic choice: a division is a heading with a
  // SUBTOTAL row under it (01 §2.4), and a sort that dissolved the grouping
  // would leave twelve subtotals with nothing beneath them. Clicking «القيمة»
  // on CNT-0279 reorders the three lines inside «الأعمال الترابية والأسس» and
  // leaves the group where it is.
  //
  // Empty `sortKey` is the BILL'S OWN ORDER — code within division, which is
  // how a bill of quantities is written — and is the state the register opens
  // in. Clicking a sorted header a third time returns to it, so there is always
  // a way back to the document's order without reloading.

  sortKey = signal('');
  sortDir = signal<'asc' | 'desc'>('asc');

  /** asc → desc → off, which is the reference's cycle. */
  toggleSort(key: string) {
    if (this.sortKey() !== key) { this.sortKey.set(key); this.sortDir.set('asc'); return; }
    if (this.sortDir() === 'asc') { this.sortDir.set('desc'); return; }
    this.sortKey.set('');
    this.sortDir.set('asc');
  }

  sortState(key: string): 'asc' | 'desc' | '' {
    return this.sortKey() === key ? this.sortDir() : '';
  }

  /** `05 §7` — the sort is announced, not only drawn. */
  ariaSort(key: string): string {
    const s = this.sortState(key);
    return s === 'asc' ? 'ascending' : s === 'desc' ? 'descending' : 'none';
  }

  /**
   * The caret. An UNSORTED column carries `unfold_more` rather than nothing:
   * a header that only reveals it can be clicked once clicked is a control the
   * reader has to discover by accident.
   */
  caret(key: string): string {
    const s = this.sortState(key);
    return s === 'asc' ? 'expand_less' : s === 'desc' ? 'expand_more' : 'unfold_more';
  }

  /**
   * A stable sort over one group's rows. `Array.prototype.sort` is stable in
   * every engine this targets, so equal values keep the bill's order — which
   * matters on a column like التنفيذ where half the lines read 0%.
   */
  private sorted(rows: BoqRow[]): BoqRow[] {
    const k = this.sortKey();
    if (!k) return rows;
    const dir = this.sortDir() === 'desc' ? -1 : 1;

    return [...rows].sort((a, b) => dir * this.compare(a, b, k));
  }

  private compare(a: BoqRow, b: BoqRow, k: string): number {
    const num = (v: number) => v ?? 0;
    switch (k) {
      case 'code': return a.code.localeCompare(b.code);
      case 'desc': return this.description(a).localeCompare(this.description(b));
      case 'unit': return a.unit.localeCompare(b.unit);
      case 'qty': return num(a.qty) - num(b.qty);
      case 'rate': return num(a.rate) - num(b.rate);
      case 'amount': return num(a.amount) - num(b.amount);
      case 'origAmount': return this.origAmountOf(a) - this.origAmountOf(b);
      case 'variance': return num(a.amendment?.deltaAmount ?? 0) - num(b.amendment?.deltaAmount ?? 0);
      case 'earned': return num(a.achievedAmount) - num(b.achievedAmount);
      case 'weight': return num(a.weight) - num(b.weight);
      case 'links': return num(a.links) - num(b.links);
      case 'assignedWeight': return num(a.assignedWeight) - num(b.assignedWeight);
      case 'progress': return num(a.progress) - num(b.progress);
      // The two enumerations sort by their CODE, not by their translated label:
      // the label changes with the language and a sort that reordered itself on
      // «EN» would be reporting the dictionary, not the bill.
      case 'distribution': return a.distributionState.localeCompare(b.distributionState);
      case 'coverage': return a.coverage.localeCompare(b.coverage);
      default: return 0;
    }
  }

  origAmountOf(r: BoqRow): number { return r.amendment ? r.amendment.originalAmount : r.amount; }

  coverageCount(code: string): number { return this.reg()?.countByCoverage[code] ?? 0; }

  isOpen(key: string): boolean { return !this.collapsed()[key]; }

  toggleDivision(key: string) {
    this.collapsed.update(c => ({ ...c, [key]: !c[key] }));
  }

  /** الشكل 12 — «فتح بطاقة البند وتعديله». Always opens on عام. */
  openCard(code: string) {
    this.card.set(code);
    this.cardTab.set('general');
  }

  /**
   * «تعديل البند» from inside the card. The card CLOSES: the edit happens in
   * the row, and leaving a panel open beside a row that has turned into a set
   * of inputs shows the same item twice, in two states.
   */
  editFromCard() {
    const r = this.cardRow();
    if (!r) return;
    this.card.set('');
    this.startEdit(r);
  }

  /** The six tabs, in the plate's order. */
  readonly cardTabs = [
    { k: 'general', label: 'boq_card_general' },
    { k: 'alloc', label: 'boq_card_alloc' },
    { k: 'dist', label: 'boq_card_dist' },
    { k: 'prog', label: 'boq_card_prog' },
    { k: 'cost', label: 'boq_card_cost' },
    { k: 'log', label: 'boq_card_log' },
  ] as const;

  toggleCol(k: string) {
    this.cols.update(c => ({ ...c, [k]: !c[k] }));
  }

  shown(k: string): boolean { return !!this.cols()[k]; }

  /** How many <td>s a full-width row has to span, given the column menu. */
  spanCount = computed(() =>
    2 + this.columns.filter(c => this.cols()[c.k]).length + 1);

  /**
   * الأصلية for the whole bill. Summed from the rows' own original amounts —
   * a line no order has touched contributes its current amount, because for it
   * the two are the same figure.
   */
  totalOriginalAmount = computed(() =>
    this.filtered().reduce((s, r) => s + (r.amendment ? r.amendment.originalAmount : r.amount), 0));

  /**
   * الفرق, with its sign kept. Never coloured by direction (CLAUDE.md §6): an
   * increase and a decrease are both amendments, and this column reports which
   * one happened, not whether it was welcome.
   */
  signed(v: number): string { return (v > 0 ? '+' : '') + fmt.money(v); }

  /**
   * The span the inline editor's buttons take: everything after the four
   * editable columns. They cannot sit in the 44px actions cell — two buttons
   * there wrap onto two lines and take the row with them, which is the same
   * measurement that turned the row actions into one overflow menu.
   */
  editTailSpan = computed(() => {
    const editable = ['unit', 'qty', 'rate', 'amount'];
    return this.spanCount() - 2 - editable.filter(k => this.cols()[k]).length;
  });

  // ── the assignment view ────────────────────────────────────────────────

  queue = computed(() => {
    const f = this.queueFilter();
    const items = this.asn()?.items ?? [];
    return f ? items.filter(i => i.coverage === f) : items;
  });

  active = computed<BoqAllocation | undefined>(() =>
    this.asn()?.items.find(i => i.code === this.activeCode()));

  /**
   * The links as they stand in the editor — the draft when there is one.
   *
   * The share is seeded at ONE decimal, which is how `02 §3` states it (52.7 /
   * 47.3) and how the reference renders it. The exact repeating decimal stays
   * on the server; nothing here rounds a figure that is then saved back, since
   * the save is disabled until the user actually types.
   */
  activeRows = computed<ShareDraft[]>(() => {
    const draft = this.shareDraft();
    if (draft) return draft;
    return (this.active()?.rows ?? [])
      .map(r => ({ activityId: r.activityId, pct: r.sharePct.toFixed(1) }));
  });

  /**
   * Σ of what is in the boxes right now. This is arithmetic in the browser, and
   * it is deliberate: it is not a business figure, it is the user's own input
   * added up so they can see the 100% they are aiming at before they save. The
   * binding total comes back from the server on the next response.
   */
  draftTotal = computed(() =>
    this.activeRows().reduce((s, r) => s + (parseFloat(r.pct) || 0), 0));

  draftDirty = computed(() => this.shareDraft() !== null);

  /** Over-allocation blocks the save (02 §3) — more than the line's value earned. */
  draftOver = computed(() => this.draftTotal() > 100.5);

  /** Activities not yet linked, and never a milestone (02 §2). */
  pickable = computed(() => {
    const used = new Set(this.activeRows().map(r => r.activityId));
    return (this.asn()?.activities ?? []).filter(a => !a.isMilestone && !used.has(a.activityId));
  });

  activityWeight(activityId: string): number {
    const a = this.asn()?.activities.find(x => x.activityId === activityId);
    if (!a) return 0;
    return this.basis() === 'mh' ? (a.absoluteWeightManHours ?? a.absoluteWeightCost) : a.absoluteWeightCost;
  }

  activityName(activityId: string): string {
    const a = this.asn()?.activities.find(x => x.activityId === activityId);
    return a ? this.lang.pick(a.nameAr, a.nameEn) : activityId;
  }

  activityProgress(activityId: string): number {
    return this.asn()?.activities.find(x => x.activityId === activityId)?.progress ?? 0;
  }

  /** The row the server sent for this link, when there is one. */
  serverRow(activityId: string): BoqAllocationRow | undefined {
    return this.active()?.rows.find(r => r.activityId === activityId);
  }

  /**
   * The assigned amount for one link.
   *
   * WHILE THE LINE IS UNTOUCHED THIS IS THE SERVER'S FIGURE, not a product
   * computed here. `Domain/Allocation` deliberately divides before it
   * multiplies so that BQ-003 comes out at exactly 14,094,000; recomputing it
   * in the browser from a share rounded for display gives 14,094,007, and a
   * screen that disagrees with the rule by seven dinars is a screen nobody can
   * reconcile against the spec.
   *
   * Once the user starts typing there is no server figure for what they have
   * typed, so the cell becomes a preview of what the save will produce — the
   * same contract as `previewAmount` on the register.
   */
  assignedFor(index: number): number {
    const rows = this.activeRows();
    const r = rows[index];
    if (!r) return 0;
    if (!this.draftDirty()) return this.serverRow(r.activityId)?.assigned ?? 0;
    return (this.active()?.amount ?? 0) * (parseFloat(r.pct) || 0) / 100;
  }

  /** Same rule as `assignedFor`, for the link's absolute weight (BR-03). */
  absWeightFor(index: number): number {
    const rows = this.activeRows();
    const r = rows[index];
    if (!r) return 0;
    if (!this.draftDirty()) return this.serverRow(r.activityId)?.absoluteWeight ?? 0;
    return (this.active()?.weight ?? 0) * (parseFloat(r.pct) || 0) / 100;
  }

  /** Σ of the assigned column, by the same rule — server's when untouched. */
  assignedTotal = computed(() => {
    if (!this.draftDirty()) {
      return (this.active()?.rows ?? []).reduce((s, r) => s + r.assigned, 0);
    }
    return (this.active()?.amount ?? 0) * this.draftTotal() / 100;
  });

  // ── the distribution drawer ────────────────────────────────────────────

  /**
   * The cap on one row: the line's quantity less every OTHER row as it stands
   * in the drawer. `02 §8` PREVENTS an invalid entry rather than flagging it,
   * so this is what the input is clamped to as it is typed — and it moves as
   * the other rows move, which is why it cannot come from the server's copy.
   */
  capFor(index: number): number {
    const d = this.dist();
    if (!d) return 0;
    const others = this.distDraft()
      .reduce((s, r, i) => s + (i === index ? 0 : (parseFloat(r.qty) || 0)), 0);
    return Math.max(0, d.qty - others);
  }

  distDistributed = computed(() =>
    this.distDraft().reduce((s, r) => s + (parseFloat(r.qty) || 0), 0));

  distRemaining = computed(() => {
    const d = this.dist();
    return d ? Math.max(0, d.qty - this.distDistributed()) : 0;
  });

  distExcess = computed(() => {
    const d = this.dist();
    return d ? Math.max(0, this.distDistributed() - d.qty) : 0;
  });

  /**
   * The state the drawer is IN, from the same thresholds `Domain/Distribution`
   * uses (02 §8). It re-states the server's answer for the unsaved draft; the
   * saved state always comes back from the server.
   */
  distState = computed(() => {
    const d = this.dist();
    if (!d) return 'none';
    const done = this.distDistributed();
    if (done > d.qty + 0.001) return 'over';
    if (Math.abs(done - d.qty) <= 0.001) return 'full';
    return done > 0 ? 'partial' : 'none';
  });

  /** Beneficiaries not yet on a row — one row per entity (02 §8, gate 4). */
  addableBeneficiaries = computed(() => {
    const used = new Set(this.distDraft().map(r => r.beneficiaryCode));
    return (this.dist()?.beneficiaries ?? []).filter(b => !used.has(b.code));
  });

  constructor() {
    // :id is the PARENT route's and the parent outlives this component, so both
    // subscriptions need takeUntilDestroyed (P-42).
    combineLatest([this.route.parent!.paramMap, this.route.paramMap])
      .pipe(takeUntilDestroyed())
      .subscribe(([parent, own]) => {
        this.projectId.set(parent.get('id') ?? '');
        this.contractId.set(own.get('contractId') ?? '');
        this.view.set('register');
        this.resetEditors();
        this.load();
      });

    // Views belong to the PERSONA, not the contract, so this runs once for the
    // life of the component rather than inside the subscription above.
    this.loadViews();
  }

  private resetEditors() {
    this.editing.set('');
    this.deleting.set('');
    this.rowMenu.set('');
    this.distCode.set('');
    this.dist.set(null);
    this.shareDraft.set(null);
    this.picker.set(false);
    this.colMenu.set(false);
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
        if (!cid) { this.reg.set(null); this.asn.set(null); this.loading.set(false); return; }

        this.api.register(pid, cid).subscribe({
          next: r => {
            this.reg.set(r);
            this.loading.set(false);
            // الشكل 13 — whether a submitted version is waiting on this
            // contract. Its own call: a failure here must not take the
            // register down, and the register must not wait on it.
            this.loadImportVersions();
          },
          error: e => this.fail(e),
        });
      },
      error: e => this.fail(e),
    });
  }

  private fail(e: unknown) {
    this.error.set(this.message(e));
    this.loading.set(false);
  }

  /**
   * THE API SPEAKS TWO ERROR SHAPES and this read only one of them. The older
   * refusals carry `{ message }`; every bilingual one — `BoqKind.Unsupported`,
   * EP-BOQ-13's banded-line guard, EP-PRJ-06's capacity and master-list checks —
   * carries `{ messageAr, messageEn }`, and those all fell through to
   * `e.message`, which is Angular's own «Http failure response for …: 409».
   *
   * Measured: EP-BOQ-13 refuses to overwrite a لجنة تثبيت الأسعار rate with a
   * sentence naming the line, and the user was shown the raw HTTP string
   * instead. A refusal nobody can read is a refusal that teaches nothing.
   *
   * The bilingual pair wins, then the single-language `message`, then the
   * transport error as a last resort.
   */
  private message(e: any): string {
    const body = e?.error;
    const bilingual = this.lang.isAr() ? body?.messageAr : body?.messageEn;
    return bilingual ?? body?.message ?? e?.message ?? 'request failed';
  }

  private qp() {
    const ws = this.route.snapshot.queryParamMap.get('ws');
    return ws ? { ws } : {};
  }

  /** Switching contracts RE-SCOPES EVERYTHING (01 §1) — it is a navigation. */
  chooseContract(id: string) {
    if (!id) return;
    this.router.navigate(['/projects', this.projectId(), 'boq', id], { queryParams: this.qp() });
  }

  backToGate() {
    this.router.navigate(['/projects', this.projectId(), 'boq'], { queryParams: this.qp() });
  }

  clearFilters() { this.q.set(''); this.coverage.set(''); }

  // ── «العروض» — save, restore, delete ──────────────────────────────────

  private loadViews() {
    this.api.views().subscribe({
      next: v => this.savedViews.set(v),
      // A failed view list must not take the register down with it: the bill is
      // the screen's subject and the menu is a convenience over it.
      error: () => this.savedViews.set([]),
    });
  }

  /**
   * Restores every control the view captured. A column key the grid no longer
   * has is ignored, and one it has gained stays hidden — the stored set is the
   * SHOWN set, so a view cannot start showing a column its author never chose.
   */
  applyView(v: BoqSavedView) {
    this.q.set(v.query);
    this.coverage.set(v.coverage);

    const on = new Set(v.visibleColumns);
    this.cols.set(Object.fromEntries(this.columns.map(c => [c.k, on.has(c.k)])));

    // A view saved before the grid could sort restores as unsorted, which is
    // the bill's own order and exactly what its author was looking at.
    this.sortKey.set(v.sortKey ?? '');
    this.sortDir.set(v.sortDir === 'desc' ? 'desc' : 'asc');
    this.viewMenu.set(false);
  }

  /**
   * THE NAME IS ASKED FOR WITH `prompt`, which is what the reference does
   * (boq-register.jsx:452) and the only control on this screen that is not the
   * design system's. `.boq-colmenu .row.save` in the copied stylesheet is a
   * click target with no input in it, so an inline field would mean inventing a
   * rule — and the row's own «…» already signals that it asks something.
   * Recorded rather than papered over: a proper named-save control belongs in
   * the design system, and this is the one place its absence shows.
   */
  saveCurrentView() {
    const name = (window.prompt(this.lang.t('boq_view_name')) ?? '').trim();
    if (!name) { this.viewMenu.set(false); return; }

    this.api.saveView({
      name,
      query: this.q().trim(),
      coverage: this.coverage(),
      visibleColumns: this.columns.filter(c => this.cols()[c.k]).map(c => c.k),
      sortKey: this.sortKey(),
      sortDir: this.sortDir(),
    }).subscribe({
      next: () => { this.loadViews(); this.toast.show(this.lang.t('boq_view_saved')); },
      error: e => this.toast.show(this.message(e)),
    });
    this.viewMenu.set(false);
  }

  // ── «الجهات المستفيدة» — open, tick, save ─────────────────────────────

  openBeneficiaries() {
    this.benOpen.set(true);
    this.api.beneficiaries(this.projectId()).subscribe({
      next: rows => {
        this.bens.set(rows);
        this.benDraft.set(new Set(rows.filter(b => b.assigned).map(b => b.code)));
      },
      error: e => { this.benOpen.set(false); this.toast.show(this.message(e)); },
    });
  }

  benTicked(code: string) { return this.benDraft().has(code); }

  /**
   * `01 §2.1` — an inactive beneficiary cannot receive new quantity, so it
   * cannot be newly ticked. One ALREADY ticked stays editable: it may hold
   * quantity distributed before it was stood down, and the server refuses the
   * same case, so the drawer is preventing the entry rather than reporting it
   * afterwards (CLAUDE.md §6).
   */
  benLocked(b: ProjectBeneficiaryRow) { return !b.active && !this.benDraft().has(b.code); }

  toggleBen(b: ProjectBeneficiaryRow) {
    if (this.benLocked(b)) return;
    this.benDraft.update(set => {
      const next = new Set(set);
      next.has(b.code) ? next.delete(b.code) : next.add(b.code);
      return next;
    });
  }

  saveBeneficiaries() {
    this.benSaving.set(true);
    this.api.saveBeneficiaries(this.projectId(), [...this.benDraft()]).subscribe({
      next: () => {
        this.benSaving.set(false);
        this.benOpen.set(false);
        this.toast.show(this.lang.t('boq_ben_saved'));
        // The distribution drawer offers exactly the ticked set (BR-08), so the
        // register is reloaded rather than left showing a list that no longer
        // matches what a distribution would accept.
        this.load();
      },
      error: e => { this.benSaving.set(false); this.toast.show(this.message(e)); },
    });
  }

  /** `stopPropagation` so deleting a view does not also apply it. */
  deleteView(v: BoqSavedView, ev: Event) {
    ev.stopPropagation();
    this.api.deleteView(v.id).subscribe({
      next: () => {
        this.savedViews.update(vs => vs.filter(x => x.id !== v.id));
        this.toast.show(this.lang.t('boq_view_gone'));
      },
      error: e => this.toast.show(this.message(e)),
    });
  }

  setView(v: 'register' | 'assign') {
    this.view.set(v);
    if (v === 'assign' && !this.asn()) this.loadAssignment();
  }

  // ── the inline row edit (04 §4) ────────────────────────────────────────

  startEdit(r: BoqRow) {
    this.deleting.set('');
    this.editing.set(r.code);
    this.editDescriptionAr.set(r.descriptionAr);
    this.editDescriptionEn.set(r.descriptionEn);
    this.editUnit.set(r.unit);
    this.editQty.set(String(r.qty));
    this.editRate.set(String(r.rate));
  }

  cancelEdit() { this.editing.set(''); }

  /**
   * The live amount `04 §4` asks for. It is the one product this page computes,
   * and it computes it because it is showing the user what they have typed
   * before they commit it — the authoritative amount is what comes back from
   * EP-BOQ-03, recomputed with every weight in the contract.
   */
  previewAmount = computed(() =>
    (parseFloat(this.editQty()) || 0) * (parseFloat(this.editRate()) || 0));

  editValid = computed(() =>
    this.editDescriptionAr().trim().length > 0
    && this.editUnit().trim().length > 0
    && (parseFloat(this.editQty()) || 0) > 0
    && (parseFloat(this.editRate()) || 0) > 0);

  saveEdit() {
    if (!this.editValid() || this.saving()) return;
    const code = this.editing();
    this.saving.set(true);
    this.api.saveItem(this.projectId(), this.effectiveContractId(), code, {
      descriptionAr: this.editDescriptionAr().trim(),
      descriptionEn: this.editDescriptionEn().trim(),
      unit: this.editUnit().trim(),
      qty: parseFloat(this.editQty()),
      rate: parseFloat(this.editRate()),
    }).subscribe({
      next: r => {
        this.reg.set(r);
        this.editing.set('');
        this.saving.set(false);
        // The allocation view reads the same amounts, so it is now stale.
        this.asn.set(null);
        this.toast.show(this.lang.t('boq_saved'));
      },
      error: e => { this.saving.set(false); this.toast.show(this.message(e)); },
    });
  }

  // ── EP-BOQ-12 — «الإدخال اليدوي» ──────────────────────────────────────

  /** The bill's shape (D-14). `works` until the register arrives. */
  kind = computed(() => this.reg()?.kind ?? 'works');
  isSupplyBill = computed(() => this.kind() === 'supply');

  /**
   * «الوحدة» as a select — design/system-revamp boq-workspace.jsx:227.
   * The units ALREADY IN USE in this bill first, then the standard list, so the
   * common case is one click and an unusual unit is still reachable. A select
   * that cannot represent a value the bill already holds reads as empty, which
   * is the fault the branch's own comment calls out.
   */
  units = computed(() => {
    const std = this.lang.isAr()
      ? ['م³', 'م²', 'م.ط', 'عدد', 'كغم', 'طن', 'نقطة', 'مقطوعية']
      : ['m³', 'm²', 'l.m', 'no.', 'kg', 'ton', 'pt', 'L.S.'];
    const out: string[] = [];
    for (const r of this.reg()?.rows ?? []) {
      if (r.unit && r.unit !== '—' && !out.includes(r.unit)) out.push(r.unit);
    }
    for (const u of std) if (!out.includes(u)) out.push(u);
    return out;
  });

  /** The unit list as <epm-select> takes it: options in, code out. */
  unitSelectOptions = computed<SelectOption[]>(() =>
    this.units().map(u => ({ code: u, label: u })));

  /** «الباب» as a select over the bill's own divisions, plus «+ باب جديد…». */
  divisionOptions = computed(() => this.reg()?.divisions ?? []);

  /**
   * «+ باب جديد…» is the last OPTION rather than a separate button: it is the
   * same question — which division does this line belong to — and the branch
   * puts it in the list for that reason (boq-workspace.jsx:288).
   * The empty choice is <epm-select>'s own placeholder, so it is not repeated.
   */
  divisionSelectOptions = computed<SelectOption[]>(() => [
    ...this.divisionOptions().map(d => ({ code: d.key, label: d.name })),
    { code: '__new', label: this.lang.t('boq_add_division_new') },
  ]);
  /** True while «+ باب جديد…» is picked, which reveals the name field. */
  addNewDivision = computed(() => this.addDivision() === '__new');

  openAdd() {
    this.editing.set('');
    this.deleting.set('');
    this.addError.set('');
    this.addDescriptionAr.set('');
    this.addDescriptionEn.set('');
    this.addUnit.set('');
    this.addQty.set('');
    this.addRate.set('');
    this.addDivision.set('');
    this.addDivisionName.set('');
    this.addManufacturer.set('');
    this.addCountry.set('');
    this.addModel.set('');
    this.addSerialFrom.set('');
    this.addSerialTo.set('');
    this.addSuppliedQty.set('');
    this.addWarrantyMonths.set('');
    this.addNotes.set('');
    this.addOpen.set(true);
  }

  closeAdd() { this.addOpen.set(false); }

  /** Same preview as the inline edit: what the user typed, before it is sent. */
  addPreviewAmount = computed(() =>
    (parseFloat(this.addQty()) || 0) * (parseFloat(this.addRate()) || 0));

  /**
   * The client-side gate. It mirrors EP-BOQ-12's checks so the button explains
   * itself before a round trip — the server re-checks every one of them, and
   * its answer is the binding one.
   *
   * The two supply comparisons are `05 §6`'s rule: prevent the invalid entry
   * rather than flagging it after the save fails.
   */
  addValid = computed(() => {
    const base = this.addDescriptionAr().trim().length > 0
      && this.addUnit().trim().length > 0
      && (parseFloat(this.addQty()) || 0) > 0
      && (parseFloat(this.addRate()) || 0) > 0
      // «+ باب جديد…» is not a division until it is named.
      && (!this.addNewDivision() || this.addDivisionName().trim().length > 0);
    if (!base) return false;
    if (!this.isSupplyBill()) return true;

    const qty = parseFloat(this.addQty()) || 0;
    const supplied = parseFloat(this.addSuppliedQty()) || 0;
    // NO received check: a new item has received nothing by construction, and
    // what it receives later is a محضر, not a field (المسار 11 · EP-SUP-04).
    return supplied >= 0 && supplied <= qty;
  });

  /** Why the button is disabled, in words, when the numbers contradict. */
  addHint = computed(() => {
    if (!this.isSupplyBill()) return '';
    const qty = parseFloat(this.addQty()) || 0;
    const supplied = parseFloat(this.addSuppliedQty()) || 0;
    if (supplied > qty) return this.lang.t('boq_add_err_supplied');
    return '';
  });

  submitAdd() {
    if (!this.addValid() || this.saving()) return;
    this.saving.set(true);
    this.addError.set('');

    // A NEW division carries its typed name as both key and label; an existing
    // one is picked by key and its label comes from the bill it already has.
    const newDiv = this.addNewDivision();
    const divKey = newDiv ? this.addDivisionName().trim() : this.addDivision().trim();
    const divName = newDiv
      ? this.addDivisionName().trim()
      : (this.divisionOptions().find(d => d.key === divKey)?.name ?? divKey);

    const body: BoqItemCreate = {
      // No `code` — EP-BOQ-12 generates it («يُولَّد تلقائياً»).
      code: '',
      descriptionAr: this.addDescriptionAr().trim(),
      descriptionEn: this.addDescriptionEn().trim(),
      unit: this.addUnit().trim(),
      qty: parseFloat(this.addQty()),
      rate: parseFloat(this.addRate()),
      division: divKey,
      divisionName: divName,
    };

    // SENT ONLY ON A SUPPLY BILL. EP-BOQ-12 refuses a supply payload on a works
    // contract rather than dropping it, so this is not an optional extra.
    if (this.isSupplyBill()) {
      body.supply = {
        manufacturer: this.addManufacturer().trim(),
        country: this.addCountry().trim(),
        model: this.addModel().trim(),
        serialFrom: this.addSerialFrom().trim(),
        serialTo: this.addSerialTo().trim(),
        suppliedQty: parseFloat(this.addSuppliedQty()) || 0,
        warrantyMonths: parseInt(this.addWarrantyMonths(), 10) || 0,
        notes: this.addNotes().trim(),
      };
    }

    this.api.addItem(this.projectId(), this.effectiveContractId(), body).subscribe({
      next: r => {
        this.reg.set(r);
        this.saving.set(false);
        this.addOpen.set(false);
        // The allocation view reads the same amounts, so it is now stale.
        this.asn.set(null);
        this.toast.show(this.lang.t('boq_added'));
      },
      // Kept IN the modal rather than thrown at a toast: a duplicate code is
      // fixed in the field that caused it, and closing the form would lose
      // everything else the user typed.
      error: e => { this.saving.set(false); this.addError.set(this.message(e)); },
    });
  }

  startDelete(code: string) { this.editing.set(''); this.deleting.set(code); }

  cancelDelete() { this.deleting.set(''); }

  confirmDelete() {
    if (this.saving()) return;
    const code = this.deleting();
    this.saving.set(true);
    this.api.deleteItem(this.projectId(), this.effectiveContractId(), code).subscribe({
      next: r => {
        this.reg.set(r);
        this.deleting.set('');
        this.saving.set(false);
        this.asn.set(null);
        this.toast.show(this.lang.t('boq_deleted'));
      },
      error: e => { this.saving.set(false); this.toast.show(this.message(e)); },
    });
  }

  // ── the distribution drawer ────────────────────────────────────────────

  openDistribution(code: string) {
    this.distCode.set(code);
    this.dist.set(null);
    this.api.distribution(this.projectId(), this.effectiveContractId(), code).subscribe({
      next: d => { this.dist.set(d); this.seedDraft(d); },
      error: e => { this.distCode.set(''); this.toast.show(this.message(e)); },
    });
  }

  private seedDraft(d: BoqDistributionResponse) {
    this.distDraft.set(d.rows.map(r => ({
      beneficiaryCode: r.beneficiaryCode,
      siteCode: r.siteCode ?? '',
      qty: String(r.qty),
    })));
  }

  closeDistribution() { this.distCode.set(''); this.dist.set(null); this.distDraft.set([]); }

  // ── the amendment drawer (ROADMAP 4.5 · 04 §6) ─────────────────────────
  //
  // FETCHED ON OPEN, not sent with every row. The register needs the count and
  // the two deltas — which the row already carries — and the chain is only ever
  // read one line at a time. Sending twelve chains to draw one is the same
  // trade the distribution drawer makes.

  amdCode = signal('');
  amd = signal<BoqAmendmentDetail | null>(null);

  openAmendments(code: string) {
    this.amdCode.set(code);
    this.amd.set(null);
    this.api.amendments(this.projectId(), this.effectiveContractId(), code).subscribe({
      next: d => this.amd.set(d),
      error: e => { this.amdCode.set(''); this.toast.show(this.message(e)); },
    });
  }

  closeAmendments() { this.amdCode.set(''); this.amd.set(null); }

  amdTitle = computed(() => {
    const d = this.amd();
    if (!d) return this.lang.t('amd_panel_boq');
    return this.lang.isAr() ? d.descriptionAr : d.descriptionEn;
  });

  /** «الوضع النافذ» — the four figures the drawer opens on. */
  amdFacts = computed<AmendmentFactView[]>(() => {
    const d = this.amd();
    if (!d) return [];
    const delta = d.effectiveQty - d.originalQty;
    return [
      { key: this.lang.t('amd_orig_qty'), value: `${fmt.qty(d.originalQty)} ${d.unit}` },
      {
        key: this.lang.t('amd_eff_qty'),
        value: `${fmt.qty(d.effectiveQty)} ${d.unit}`,
        sub: delta === 0 ? null : (delta > 0 ? '+' : '') + fmt.qty(delta),
      },
      { key: this.lang.t('amd_eff_value'), value: fmt.money(d.effectiveAmount) },
      {
        key: this.lang.t('amd_blended'),
        value: fmt.money(d.blendedRate),
        sub: d.banded ? this.lang.t('amd_multi_rate') : null,
      },
    ];
  });

  /**
   * The chain, in the drawer's own shape. A BOQ step's primary pair is the
   * QUANTITY and its secondary the signed money impact — the activity drawer
   * puts days first and the finish date second, which is why the panel takes
   * strings rather than each caller's own record.
   */
  amdChain = computed<AmendmentStepView[]>(() =>
    (this.amd()?.chain ?? []).map(s => ({
      no: s.no,
      at: s.at,
      isApplied: s.isApplied,
      from: `${fmt.qty(s.qtyFrom)} ${this.amd()?.unit ?? ''}`.trim(),
      to: `${fmt.qty(s.qtyTo)} ${this.amd()?.unit ?? ''}`.trim(),
      secondary: (s.amountTo - s.amountFrom > 0 ? '+' : '') + fmt.money(s.amountTo - s.amountFrom),
      excess: s.excessRate === null ? null : fmt.money(s.excessRate),
    })));

  /**
   * BR-05's bands, with the blended total as the last row. Empty on an
   * unbanded line — one rate needs no breakdown, and printing a single-row
   * table over it would suggest there is something to compare.
   */
  amdBands = computed<AmendmentBandView[]>(() => {
    const d = this.amd();
    if (!d || !d.banded || d.bands.length === 0) return [];
    const rows: AmendmentBandView[] = d.bands.map(b => ({
      label: this.lang.t(b.isExcess ? 'amd_band_excess' : 'amd_band_base'),
      sourceNo: b.sourceNo,
      qty: `${fmt.qty(b.qty)} ${d.unit}`,
      rate: fmt.money(b.rate),
      amount: fmt.money(b.amount),
      isExcess: b.isExcess,
      isTotal: false,
    }));
    rows.push({
      label: this.lang.t('amd_band_total'),
      sourceNo: null,
      qty: `${fmt.qty(d.effectiveQty)} ${d.unit}`,
      rate: fmt.money(d.blendedRate),
      amount: fmt.money(d.effectiveAmount),
      isExcess: false,
      isTotal: true,
    });
    return rows;
  });

  addDistRow(code: string) {
    if (!code) return;
    // A new row takes what is still undistributed, so the common case needs no
    // typing at all — and it can never open above the cap.
    this.distDraft.update(rows =>
      [...rows, { beneficiaryCode: code, siteCode: '', qty: String(this.distRemaining()) }]);
  }

  removeDistRow(index: number) {
    this.distDraft.update(rows => rows.filter((_, i) => i !== index));
  }

  /**
   * CAPPED AS IT IS TYPED (02 §8) — the field cannot hold an invalid figure.
   *
   * The element is written back explicitly, and it has to be: `[value]` is a
   * one-way binding, so when the cap turns 900 back into the 540 that was
   * already in the signal, Angular sees no change and never re-renders the
   * input. Measured — the box read 900 while the total below it read 540.
   * That is worse than no cap at all, because the screen is then lying about
   * what it is holding.
   */
  setDistQty(index: number, value: string, el: HTMLInputElement) {
    const clean = value.replace(/[^\d.]/g, '');
    const cap = this.capFor(index);
    const n = parseFloat(clean);
    const overCap = !isNaN(n) && n > cap;
    const capped = overCap ? String(cap) : clean;

    if (capped !== value) el.value = capped;
    if (overCap) this.toast.show(this.lang.t('boq_dist_capped'));

    this.distDraft.update(rows => rows.map((r, i) => i === index ? { ...r, qty: capped } : r));
  }

  setDistSite(index: number, value: string) {
    this.distDraft.update(rows => rows.map((r, i) => i === index ? { ...r, siteCode: value } : r));
  }

  saveDistribution() {
    if (this.saving() || this.distExcess() > 0) return;
    this.saving.set(true);
    this.api.saveDistribution(this.projectId(), this.effectiveContractId(), this.distCode(), {
      rows: this.distDraft().map(r => ({
        beneficiaryCode: r.beneficiaryCode,
        siteCode: r.siteCode.trim() || null,
        qty: parseFloat(r.qty) || 0,
      })),
    }).subscribe({
      next: d => {
        this.dist.set(d);
        this.seedDraft(d);
        this.saving.set(false);
        this.toast.show(this.lang.t('boq_dist_saved'));
        // The register carries the distribution STATE column, so it moved.
        this.refreshRegister();
      },
      error: e => { this.saving.set(false); this.toast.show(this.message(e)); },
    });
  }

  private refreshRegister() {
    this.api.register(this.projectId(), this.effectiveContractId())
      .subscribe({ next: r => this.reg.set(r), error: () => {} });
  }

  // ── the assignment editor ──────────────────────────────────────────────

  loadAssignment() {
    this.api.assignment(this.projectId(), this.effectiveContractId(), this.basis()).subscribe({
      next: a => {
        this.asn.set(a);
        this.shareDraft.set(null);
        if (!this.active()) {
          // Open on something that needs attention, not on row one.
          const first = a.items.find(i => i.coverage === 'over')
            ?? a.items.find(i => i.coverage === 'partial')
            ?? a.items[0];
          this.activeCode.set(first?.code ?? '');
        }
      },
      error: e => this.toast.show(this.message(e)),
    });
  }

  /**
   * The basis toggle is a WHAT-IF (02 §2, P-48). Nothing stores which basis the
   * schedule was imported on, so the register always computes on cost; flipping
   * to man-hours shows what the shares would be, and only «توزيع تلقائي» followed
   * by a save makes it binding.
   */
  setBasis(b: 'cost' | 'mh') {
    if (this.basis() === b) return;
    this.basis.set(b);
    this.shareDraft.set(null);
    this.loadAssignment();
  }

  selectItem(code: string) {
    if (this.draftDirty() && code !== this.activeCode()) {
      this.toast.show(this.lang.t('boq_alloc_discarded'));
    }
    this.shareDraft.set(null);
    this.activeCode.set(code);
    this.picker.set(false);
  }

  /**
   * Strips anything that is not a figure, and writes the stripped value back to
   * the element — same reason as `setDistQty`: a one-way `[value]` cannot undo
   * what the user typed when the model does not change.
   */
  private numeric(raw: string, el: HTMLInputElement): string {
    const clean = raw.replace(/[^\d.]/g, '');
    if (clean !== raw) el.value = clean;
    return clean;
  }

  setShare(index: number, value: string, el: HTMLInputElement) {
    const clean = this.numeric(value, el);
    this.shareDraft.set(this.activeRows().map((r, i) => i === index ? { ...r, pct: clean } : r));
  }

  setEditQty(value: string, el: HTMLInputElement) { this.editQty.set(this.numeric(value, el)); }

  setEditRate(value: string, el: HTMLInputElement) { this.editRate.set(this.numeric(value, el)); }

  removeShare(index: number) {
    this.shareDraft.set(this.activeRows().filter((_, i) => i !== index));
  }

  addShare(activityId: string) {
    if (!activityId) return;
    // A new link takes whatever share is still unallocated.
    const left = Math.max(0, Math.round((100 - this.draftTotal()) * 10) / 10);
    this.shareDraft.set([...this.activeRows(), { activityId, pct: String(left) }]);
    this.picker.set(false);
  }

  /**
   * BR-03's own answer, filled into the boxes: each link takes its activity's
   * absolute weight as a share of the linked activities' weights. On the cost
   * basis this restores what the rule already says; on man-hours it is the
   * what-if made concrete, which is exactly why saving it is an override.
   */
  autoDistribute() {
    const rows = this.activeRows();
    if (!rows.length) return;
    const sum = rows.reduce((s, r) => s + this.activityWeight(r.activityId), 0);
    if (sum <= 0) { this.toast.show(this.lang.t('boq_alloc_no_weight')); return; }

    let acc = 0;
    this.shareDraft.set(rows.map((r, i) => {
      // The last row takes the remainder so the column lands on exactly 100.0
      // rather than on 99.9 — the same argument largest-remainder makes.
      const pct = i === rows.length - 1
        ? Math.round((100 - acc) * 10) / 10
        : Math.round(this.activityWeight(r.activityId) / sum * 1000) / 10;
      acc = Math.round((acc + pct) * 10) / 10;
      return { activityId: r.activityId, pct: String(Math.max(0, pct)) };
    }));
  }

  revertShares() { this.shareDraft.set(null); }

  saveShares() {
    if (this.saving() || this.draftOver() || !this.draftDirty()) return;
    this.saving.set(true);
    this.api.saveAllocation(this.projectId(), this.effectiveContractId(), this.activeCode(), {
      reset: false,
      rows: this.activeRows().map(r => ({
        activityId: r.activityId,
        sharePct: parseFloat(r.pct) || 0,
      })),
    }).subscribe({
      next: a => {
        this.asn.set(a);
        this.shareDraft.set(null);
        this.saving.set(false);
        this.toast.show(this.lang.t('boq_alloc_saved'));
        this.refreshRegister();
      },
      error: e => { this.saving.set(false); this.toast.show(this.message(e)); },
    });
  }

  /** Restores BR-03's computed shares. It does NOT remove the links (02 §3). */
  resetShares() {
    if (this.saving()) return;
    this.saving.set(true);
    this.api.saveAllocation(this.projectId(), this.effectiveContractId(), this.activeCode(),
      { reset: true, rows: [] }).subscribe({
      next: a => {
        this.asn.set(a);
        this.shareDraft.set(null);
        this.saving.set(false);
        this.toast.show(this.lang.t('boq_alloc_reset'));
        this.refreshRegister();
      },
      error: e => { this.saving.set(false); this.toast.show(this.message(e)); },
    });
  }

  // ── labels ─────────────────────────────────────────────────────────────

  /**
   * `workspace-kind`, from the Lookups like every other stored code. A
   * beneficiary IS a workspace (P-174), so it is labelled from the workspace
   * vocabulary — `beneficiary-type` went with the table it described.
   */
  benTypeLabel(code: string): string { return this.lookups.label('workspace-kind', code); }

  coverageLabel(code: string): string { return this.lookups.label('allocation-coverage', code); }

  distributionLabel(code: string): string { return this.lookups.label('distribution-state', code); }

  /**
   * The reference's own class map. Coverage is BOQ vocabulary wearing the shared
   * status pill, so the label always travels with the colour (CLAUDE.md §6).
   */
  coverageClass(code: string): string {
    switch (code) {
      case 'full': return 'completed';
      case 'partial': return 'ongoing';
      case 'over': return 'delayed';
      default: return 'cancelled';
    }
  }

  distributionClass(code: string): string {
    switch (code) {
      case 'full': return 'completed';
      case 'partial': return 'ongoing';
      case 'over': return 'delayed';
      default: return 'cancelled';
    }
  }

  /**
   * A bar width. Display geometry — the one thing a page may compute
   * (CLAUDE.md §3.1) — clamped because a bar overrunning its rail is a
   * layout bug, while the number printed beside it reports the overrun.
   */
  bar(pct: number): number {
    return Math.max(0, Math.min(100, pct));
  }

  description(r: { descriptionAr: string; descriptionEn: string }): string {
    return this.lang.pick(r.descriptionAr, r.descriptionEn);
  }

  divisionName(d: BoqDivision): string { return d.name; }
}
