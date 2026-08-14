import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { combineLatest, forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { SectionComponent } from '../../shared/section.component';
import { FieldGroupComponent } from '../../shared/field-group.component';
import { FieldGridComponent, Field } from '../../shared/field-grid.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { LangService, StrKey } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import { PersonaService, canDefineProjects } from '../../core/persona';
import * as fmt from '../../core/format';
import { ContractTabApi } from './contract.api';
import {
  AmendmentVersion, ContractDefinitionInput, ContractDetail, ContractEvent,
  ContractMoney, ContractPayment, ContractRegisterTotals, ContractRow,
  ContractUnavailable, ContractViolation, PenaltyImpact,
} from './contract.types';

/**
 * SCR-W3 — the project workspace Contract module (`04 §7`).
 *
 * PORTED from DModContractNew + DContractAmendments (v1.1) —
 * ../epm@design/system-revamp app/project-modules.jsx:363 and
 * app/contract-amendments.jsx:301.
 *
 * ── THE SCREEN WHERE APPROVED ≠ APPLIED IS THE SUBJECT ────────────────────
 * Three values, three meanings, never mixed: the awarded original, the
 * EFFECTIVE value in force (BR-09), and the PROJECTION if every approved-but-
 * unapplied amendment were applied (`02 §9`). The projection has its own line
 * everywhere it appears and is never summed into the effective figure.
 *
 * ── THE SELECTED CONTRACT IS THE URL, THE SUB-TAB IS NOT ──────────────────
 * `/projects/:id/contract/:contractId` — a contract is a record, and a link to
 * one has to survive being pasted, the same argument `?ws=` settles for scope.
 * The four sub-tabs are views OF that record, not records, so they stay in
 * component state; putting them in the URL would make "which tab was I on"
 * part of a shared link, which is noise.
 *
 * ── NO ARITHMETIC ─────────────────────────────────────────────────────────
 * The chain, the penalty comparison and every total arrive computed. The one
 * thing computed here is a bar width, which is display geometry.
 */
@Component({
  selector: 'epm-contract-page',
  standalone: true,
  imports: [
    IconComponent, StatusPillComponent, SectionComponent, TableSkeletonComponent,
    FieldGroupComponent, FieldGridComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './contract.page.html',
})
export class ContractPage {
  private api = inject(ContractTabApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  persona = inject(PersonaService);
  toast = inject(ToastService);
  fmt = fmt;

  /** §23 — contract entry belongs to «المستخدم المختص» (المسار 2 المرحلة 1). */
  canDefine = computed(() => canDefineProjects(this.persona.current()));

  /** المسار 2 step 1 — «إضافة عقد», inside the project the contract belongs to. */
  newContract() {
    const ws = this.route.snapshot.queryParamMap.get('ws');
    this.router.navigate(['/projects', this.projectId(), 'contract', 'new'],
      { queryParams: ws ? { ws } : {} });
  }

  projectId = signal('');
  contractId = signal('');

  rows = signal<ContractRow[]>([]);
  totals = signal<ContractRegisterTotals | null>(null);
  countByStatus = signal<Record<string, number>>({});

  contract = signal<ContractDetail | null>(null);
  money = signal<ContractMoney | null>(null);
  versions = signal<AmendmentVersion[]>([]);
  pending = signal<AmendmentVersion[]>([]);
  penalty = signal<PenaltyImpact | null>(null);
  payments = signal<ContractPayment[]>([]);
  unavailable = signal<ContractUnavailable[]>([]);
  events = signal<ContractEvent[]>([]);
  /** Resolved server-side (§23 «المستخدم المختص»); the button never decides. */
  canEdit = signal(false);

  loading = signal(true);
  error = signal<string | null>(null);

  /** الشكل 7's five: overview · details · payments · amendments · activity. */
  tab = signal('overview');

  /**
   * الشكل 9 — «اختيار دفعة لعرض تفاصيلها». The payment whose Z8 panel is open,
   * by `no`, or null. Component state, not the URL: a payment is a row of one
   * contract's register, and the contract is already what the link carries.
   */
  openPayment = signal<number | null>(null);

  /**
   * «قابلة للتصغير» — الشكل 9 gives the panel a minimise control beside its
   * close. Folded, the header stays: which payment is selected is the one thing
   * that must survive getting the panel out of the way.
   */
  panelMin = signal(false);

  // ── الشكل 8's «تحرير البيانات» ──────────────────────────────────────────
  editing = signal(false);
  saving = signal(false);
  violations = signal<ContractViolation[]>([]);
  formError = signal<string | null>(null);

  /** The editable definition, from EP-CON-05, sent back by EP-CON-04. */
  private form = signal<ContractDefinitionInput | null>(null);
  /** What the card showed when editing began — Cancel restores it. */
  private snapshot = signal<ContractDefinitionInput | null>(null);

  readonly colCount = 7;

  /**
   * ── الشكل 6 IS SHOWN WHENEVER NO CONTRACT IS SELECTED ───────────────────
   * It used to be skipped for a project with exactly one contract, because the
   * v1.1 reference does that and a register of one row is a click that tells
   * you nothing. But الشكل 6 is not a row list: the project equation, the
   * weighted physical progress and the spend comparison live ONLY here, and
   * skipping the screen hid all three from every single-contract project —
   * which is most of them. Client decision, recorded in DECISIONS.
   */
  showRegister = computed(() => !this.contractId());

  /** The contract being shown, or none — the register is the other branch. */
  private effectiveContractId = computed(() => this.contractId());

  /**
   * True when the amendments moved the value, the finish, or both.
   *
   * `detailSpentPct` is GONE: it divided by the effective value, and الشكل 7
   * fixes the contract card's denominator as كلفة العقد الكلية. The percentage
   * now arrives as `money.spentPct`, derived once by EP-CON-02 — this page does
   * not divide (CLAUDE.md §3.1).
   */
  amended = computed(() => {
    const c = this.contract();
    return !!c && (c.effectiveValue !== c.originalValue || c.effectiveFinish !== c.originalFinish);
  });

  // ── الشكل 8 — التفاصيل ──────────────────────────────────────────────────

  /**
   * The document's FIVE sections, in its order: هوية العقد · التواريخ والمدة ·
   * المبالغ التعاقدية · المصروف · المقاول.
   *
   * The live prototype renders a sixth — «الأداء والالتزامات» — carrying the
   * penalty rate and the guarantees. الشكل 8 does not, and its penalty figures
   * live on الشكل 10's own «أثر التعديلات على الغرامات» section instead, so
   * there is no place this build would show them twice.
   *
   * `key` is the ContractDefinitionInput member the cell edits, so a field is
   * editable exactly when the definition can carry it — no second list.
   */
  detailSections = computed(() => {
    const c = this.contract();
    const m = this.money();
    if (!c) return [];

    const spent = (k: string) => m?.costLines.find(x => x.key === k)?.spent ?? null;
    const totalSpent = m?.disbursed ?? null;

    return [
      this.section('identity', [
        this.text('nameAr', c.nameAr),
        this.text('id', c.id, { mono: true, readonly: true }),
        this.text('component', c.component),
        this.text('status', c.status, { lookup: 'contract-status' }),
      ]),
      this.section('dates', [
        this.text('start', c.start, { kind: 'date' }),
        this.text('finish', c.originalFinish, { kind: 'date' }),
      ]),
      this.section('amounts', [
        this.text('awardAmount', c.awardAmount, { kind: 'money' }),
        this.text('reserveAmount', c.reserveAmount, { kind: 'money' }),
        this.text('supervisionAmount', c.supervisionAmount, { kind: 'money' }),
      ]),
      // READ-ONLY, all four. Spend is Σ of the payment portions over the paid
      // certificates — you record a payment, you do not type a spend.
      this.section('spend', [
        this.text('spentAward', spent('award'), { kind: 'money', readonly: true }),
        this.text('spentReserve', spent('reserve'), { kind: 'money', readonly: true }),
        this.text('spentSupervision', spent('supervision'), { kind: 'money', readonly: true }),
        this.text('spentTotal', totalSpent, { kind: 'money', readonly: true }),
      ]),
      this.section('contractor', [
        this.text('contractor', c.contractor),
        this.text('executingParty', c.executingParty),
        this.text('contactInfo', c.contactInfo, { mono: true }),
      ]),
    ];
  });

  private section(id: string, fields: Field[]) {
    return {
      id,
      title: this.lang.t(('con_grp_' + id) as StrKey),
      sub: this.lang.t(('con_grp_' + id + '_sub') as StrKey),
      fields,
    };
  }

  /**
   * One cell. `readonly` fields keep their value while the rest of the card is
   * in edit mode — a derived figure has nothing to type into.
   */
  private text(
    key: string,
    value: string | number | null,
    o: { mono?: boolean; kind?: string; lookup?: string; readonly?: boolean } = {},
  ): Field {
    const raw = value === null || value === undefined ? '' : String(value);
    const display = value === null || value === undefined || raw === ''
      ? null
      : o.lookup
        ? this.lookups.label(o.lookup, raw)
        : o.kind === 'money'
          ? fmt.money(Number(value))
          : o.kind === 'date'
            ? fmt.date(raw)
            : raw;

    const form = this.form();
    const editable = !o.readonly && form !== null
      && Object.prototype.hasOwnProperty.call(form, key);

    return {
      key,
      label: this.lang.t(('con_f_' + key) as StrKey),
      value: display,
      raw: editable
        ? String((form as unknown as Record<string, unknown>)[key] ?? '')
        : raw,
      mono: o.mono || o.kind === 'money' || o.kind === 'date',
      numeric: o.kind === 'money',
      required: ContractRequired.has(key),
      options: o.lookup
        ? this.lookups.list(o.lookup).map(x => ({
            code: x.code, label: this.lang.pick(x.nameAr, x.nameEn),
          }))
        : undefined,
      // A readonly cell renders its value even while editing.
      readonly: !editable,
      error: this.errorFor(key),
    };
  }

  private errorFor(key: string): string | null {
    const v = this.violations().find(x => x.field === key);
    return v ? this.lang.pick(v.messageAr, v.messageEn) : null;
  }

  constructor() {
    // :id is the parent's, :contractId is this route's — and the parent
    // outlives this component, so both need takeUntilDestroyed (P-42).
    combineLatest([
      this.route.parent!.paramMap,
      this.route.paramMap,
    ]).pipe(takeUntilDestroyed()).subscribe(([parent, own]) => {
      this.projectId.set(parent.get('id') ?? '');
      this.contractId.set(own.get('contractId') ?? '');
      this.tab.set('overview');
      this.editing.set(false);
      this.form.set(null);
      this.openPayment.set(null);
      this.load();
    });
  }

  load() {
    const pid = this.projectId();
    if (!pid) return;
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      lookups: this.lookups.ensureLoaded(),
      reg: this.api.register(pid),
    }).subscribe({
      next: ({ reg }) => {
        this.rows.set(reg.rows);
        this.totals.set(reg.totals);
        this.countByStatus.set(reg.countByStatus);

        const cid = this.effectiveContractId();
        if (!cid) { this.clearDetail(); this.loading.set(false); return; }

        this.api.detail(pid, cid).subscribe({
          next: d => {
            this.contract.set(d.contract);
            this.money.set(d.money);
            this.versions.set(d.versions);
            this.pending.set(d.pending);
            this.penalty.set(d.penalty);
            this.payments.set(d.payments);
            this.unavailable.set(d.unavailable);
            this.events.set(d.events);
            this.canEdit.set(d.can.edit);
            this.loading.set(false);
          },
          error: e => {
            this.error.set(e?.error?.message ?? e?.message ?? 'request failed');
            this.loading.set(false);
          },
        });
      },
      error: e => {
        this.error.set(e?.error?.message ?? e?.message ?? 'request failed');
        this.loading.set(false);
      },
    });
  }

  private clearDetail() {
    this.contract.set(null);
    this.money.set(null);
    this.versions.set([]);
    this.pending.set([]);
    this.penalty.set(null);
    this.payments.set([]);
  }

  private qp() {
    const ws = this.route.snapshot.queryParamMap.get('ws');
    return ws ? { ws } : {};
  }

  open(row: ContractRow) {
    this.router.navigate(['/projects', this.projectId(), 'contract', row.id],
      { queryParams: this.qp() });
  }

  backToRegister() {
    this.router.navigate(['/projects', this.projectId(), 'contract'],
      { queryParams: this.qp() });
  }

  need(key: string): string {
    const u = this.unavailable().find(x => x.key === key);
    return u ? this.lang.pick(u.needsAr, u.needsEn) : '';
  }

  /** The chain's state pill. `06 §8` codes, labelled from the lookups. */
  stateLabel(v: AmendmentVersion): string {
    return this.lookups.label('amendment-state', v.state);
  }

  /** The reference's own class map for the chain pill. */
  stateClass(v: AmendmentVersion): string {
    switch (v.state) {
      case 'effective': return 'completed';
      case 'pending': return 'suspended';
      case 'partial': return 'ongoing';
      default: return '';
    }
  }

  /**
   * Row 0's label comes from the `amendment-state` lookup rather than a chrome
   * key: «العقد الأصلي» is already that list's label for `original`, and having
   * two sources for one string is how they drift apart.
   */
  versionLabel(v: AmendmentVersion): string {
    if (v.no === 0) return this.lookups.label('amendment-state', 'original');
    return this.lang.isAr() ? `ملحق عقد رقم ${v.no}` : `Amendment no. ${v.no}`;
  }

  // ── الشكل 10 — الملاحق والتعديلات ──────────────────────────────────────

  /** «بعد 2 ملحق مطبّق» — applied only. The pending ones have their own field. */
  appliedCount = computed(() => Math.max(0, this.versions().length - 1));

  effectiveSub = computed(() =>
    this.appliedCount()
      ? this.lang.t('con_effective_after').replace('{n}', String(this.appliedCount()))
      : this.lang.t('con_effective_none'));

  /**
   * «الإصدار النافذ» — the LAST APPLIED link, which is row 0 when none has been
   * applied. Never a pending one: that is the whole distinction this screen
   * exists to draw (02 §9).
   */
  effectiveVersion = computed(() => {
    const v = this.versions();
    return v.length ? v[v.length - 1] : null;
  });

  /** Signed, and 0 when no ملحق has moved the contract. */
  netApplied = computed(() => {
    const c = this.contract();
    return c ? c.effectiveValue - c.originalValue : 0;
  });

  durationDelta = computed(() => {
    const c = this.contract();
    return c ? c.effectiveDurationDays - c.originalDurationDays : 0;
  });

  /** What the approved-but-unapplied ones WOULD add. Never added here. */
  pendingValue = computed(() => this.pending().reduce((a, v) => a + v.deltaValue, 0));
  pendingDays = computed(() => this.pending().reduce((a, v) => a + v.deltaDays, 0));

  /** The finish the projection would land on — the last pending link carries it. */
  projectionFinish = computed(() => {
    const p = this.pending();
    return p.length ? p[p.length - 1].finish : this.contract()?.effectiveFinish ?? null;
  });

  /**
   * الشكل 10 draws ONE «سجل التعديلات التعاقدية» — the original, the applied
   * chain, then the approved-but-unapplied, each with its own state pill. They
   * are still two lists in the API and two meanings on screen (P-80); this is
   * the display order, not a merge of the figures.
   */
  chainRows = computed(() => [...this.versions(), ...this.pending()]);

  /** Only the rate is a percentage; the amounts are money. */
  ratePct(v: number): string {
    return (v * 100).toFixed(1).replace(/\.0$/, '') + '%';
  }

  statusCount(code: string): number { return this.countByStatus()[code] ?? 0; }
  statusCodes = computed(() => Object.keys(this.countByStatus()));

  // ── الشكل 6 — the register cards ────────────────────────────────────────

  /**
   * A bar's width. Display GEOMETRY, which is the one thing this component is
   * allowed to compute (CLAUDE.md §3.1) — every percentage it draws arrives
   * from `EP-CON-01` already divided and rounded. Clamped because a bar that
   * overruns its rail is a layout bug, not a finding: the number beside it is
   * printed unclamped and is the one that reports the overrun.
   */
  bar(pct: number | null): number {
    return pct === null ? 0 : Math.max(0, Math.min(100, pct));
  }

  /** «31%» — whole numbers, as the plate prints them. Null stays an em dash. */
  pct0(v: number | null): string {
    return v === null ? '—' : fmt.pct(v, 0);
  }

  /** An applied ملحق moved the value, so the card leads with القيمة النافذة. */
  amendedRow(r: ContractRow): boolean {
    return r.effectiveValue !== r.originalValue;
  }

  /** Signed, and always absolute in the text — the arrow carries direction. */
  rowDelta(r: ContractRow): number {
    return Math.abs(r.effectiveValue - r.originalValue);
  }

  rowRaised(r: ContractRow): boolean {
    return r.effectiveValue > r.originalValue;
  }

  // ── «تحرير البيانات» — EP-CON-05 loads, EP-CON-04 saves ─────────────────

  /**
   * The definition has to be FETCHED before the first edit: the card carries
   * resolved labels and derived spend, not the raw codes a save needs.
   * `EP-CON-05` already returns exactly that shape.
   */
  edit() {
    if (this.editing()) return;
    this.formError.set(null);
    this.violations.set([]);

    if (this.form()) { this.snapshot.set(this.form()); this.editing.set(true); return; }

    this.api.definition(this.projectId(), this.effectiveContractId()).subscribe({
      next: def => {
        this.form.set(def.definition);
        this.snapshot.set(def.definition);
        this.editing.set(true);
      },
      error: e => this.formError.set(e?.error?.messageAr ?? e?.message ?? 'request failed'),
    });
  }

  /** One field. Money and the two dates are the only non-string members. */
  set(change: { key: string; value: string }) {
    const raw = change.value;
    const money = ['awardAmount', 'reserveAmount', 'supervisionAmount', 'monitoringAmount'];
    const value: string | number | null = money.includes(change.key)
      ? (raw.trim() === '' || Number.isNaN(Number(raw)) ? null : Number(raw))
      : (raw.trim() === '' ? null : raw);

    this.form.update(f => (f ? { ...f, [change.key]: value } as ContractDefinitionInput : f));

    if (this.violations().length) {
      this.violations.update(v => v.filter(x => x.field !== change.key));
    }
  }

  save() {
    const form = this.form();
    if (this.saving() || !form) return;

    this.saving.set(true);
    this.violations.set([]);
    this.formError.set(null);

    // [EP-CON-04] — the one contract update endpoint. Saving الشكل 8 and saving
    // the create form are the same call.
    this.api.save(this.projectId(), this.effectiveContractId(), form).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.toast.show(this.lang.t('con_updated'));
        // Re-read rather than patch locally: the server re-derives the effective
        // value, the penalty, the spend split and the activity row.
        this.form.set(null);
        this.load();
      },
      error: e => {
        this.saving.set(false);
        const body = e?.error;
        if (body?.violations?.length) {
          this.violations.set(body.violations);
          this.formError.set(this.lang.t('con_fix_errors'));
          this.tab.set('details');
        } else {
          this.formError.set(
            this.lang.pick(body?.messageAr ?? '', body?.messageEn ?? '')
            || body?.message || e?.message || 'request failed');
        }
      },
    });
  }

  /** DISCARDS: the edits live only in `form`, so restoring the snapshot is the discard. */
  cancel() {
    this.form.set(this.snapshot());
    this.violations.set([]);
    this.formError.set(null);
    this.editing.set(false);
  }

  /**
   * One cost item's spend as a share of ITS OWN amount — الشكل 7 draws a bar
   * per item, each against its own budget, not against the contract's.
   * Geometry only; both numbers are printed beside it.
   */
  costPct(l: { amount: number; spent: number | null }): number {
    if (!l.amount || l.spent === null) return 0;
    return Math.round((l.spent / l.amount) * 100);
  }

  /** الشكل 8 puts «تعديل» on the details tab only — there is nothing else to edit. */
  showEditButton = computed(() =>
    !this.loading() && !this.error() && !!this.contract()
    && this.canEdit() && this.tab() === 'details' && !this.editing());

  openTab(t: string) {
    // Leaving Details while editing would hide the controls without resolving
    // them, so the tab strip does not steal an unsaved edit.
    if (this.editing()) return;
    this.tab.set(t);
    this.openPayment.set(null);
  }

  // ── الشكل 9 — the payment panel ─────────────────────────────────────────

  selectedPayment = computed(() =>
    this.payments().find(p => p.no === this.openPayment()) ?? null);

  togglePayment(p: ContractPayment) {
    const same = this.openPayment() === p.no;
    this.openPayment.set(same ? null : p.no);
    // A new selection always opens expanded: a folded panel would look like
    // the click did nothing.
    if (!same) this.panelMin.set(false);
  }

  /** «3 بنود» — how many of the three cost items this payment actually touched. */
  portionCount(p: ContractPayment): number {
    return p.portions.filter(x => x.amount !== 0).length;
  }

  paymentsTotal = computed(() => this.payments().reduce((a, p) => a + p.netAmount, 0));

  /** KB, as الشكل 9 prints it. Files are metadata; nothing is stored. */
  fileSize(bytes: number): string {
    return Math.round(bytes / 1024) + ' KB';
  }

  // ── الشكل 11 — سجل النشاط ───────────────────────────────────────────────

  /** Activity-log verbs. Workflow verbs are chrome, not business value lists (06). */
  actionLabel(action: string): string {
    return action === 'created' ? this.lang.t('con_act_created') : this.lang.t('con_act_updated');
  }

  /**
   * «أيقونات نوعية للأوامر التغييرية» — one icon per KIND of event, so the
   * timeline is scannable before it is read. Never the only carrier: every row
   * also states its actor, its capacity and what it did (05 §7.6).
   */
  eventIcon(e: ContractEvent): string {
    switch (e.action) {
      case 'change-order': return 'sync_alt';
      case 'progress': return 'trending_up';
      case 'created': return 'add';
      default: return 'edit';
    }
  }

  /**
   * The label for the field a row changed — the SAME `con_f_*` key الشكل 8
   * prints over that field's cell, so the log and the card cannot name one
   * field two ways.
   */
  fieldLabel(field: string): string {
    return this.lang.t(('con_f_' + field) as StrKey);
  }

  /**
   * One side of a diff, formatted the way that field is formatted everywhere
   * else: money grouped, dates as dates, a lookup code as its label. The log
   * stores what the field HELD (a raw string); presentation stays here, with
   * every other presentation decision.
   *
   * An empty side is «—», not a blank: a field that was unset and now has a
   * value is exactly the change the row is reporting.
   */
  eventValue(e: ContractEvent, raw: string | null): string {
    if (raw === null || raw.trim() === '') return '—';

    if (MoneyFields.has(e.field ?? '')) return fmt.money(Number(raw));
    if (DateFields.has(e.field ?? '')) return fmt.date(raw);
    if (e.field === 'status') return this.lookups.label('contract-status', raw);
    return raw;
  }
}

/**
 * الشكل 8's «نجمة على الحقول الإلزامية» — the five its screen marks, mirroring
 * `Domain/ContractDefinition.RequiredFields`. The server's set is the one that
 * decides; this is the same list on the other side of the wire, and a test
 * pins the server's to the rule that enforces it.
 */
/**
 * How a logged value is read back. Keyed by the DTO member name, which is what
 * `ContractActivityEvent.Field` stores — one list, not a switch per call site.
 */
const MoneyFields = new Set(['awardAmount', 'reserveAmount', 'supervisionAmount', 'monitoringAmount']);
const DateFields = new Set(['start', 'finish', 'incomingDate']);

const ContractRequired = new Set([
  'nameAr', 'start', 'finish', 'contractor', 'executingParty',
]);
