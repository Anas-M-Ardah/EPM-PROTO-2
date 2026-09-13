import {
  Component, ViewEncapsulation, computed, effect, inject, signal, untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { PersonaSwitcherComponent } from '../../shared/persona-switcher.component';
import { FieldGroupComponent } from '../../shared/field-group.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { PersonaService } from '../../core/persona';
import { ChangeOrderFocusQueue } from '../../core/change-order-focus';
import * as fmt from '../../core/format';
import { ChangeOrdersApi } from './change-orders.api';
import { ChangeOrderRow, ChangeOrdersResponse, ExceptionChip } from './change-orders.types';
import { ChangeOrderWizard } from './change-order.wizard';

/**
 * SCR-W8 — the change-order register (`03 §10`).
 *
 * PORTED from the v1.1 change-order module — ../epm@design/system-revamp
 * app/vo-record.jsx `DModVO` :454. ROADMAP's `project-modules.jsx:1142` is the
 * PRE-v1.1 component; v1.1 moved the module into its own file and says so at
 * `vo-record.jsx:4`.
 *
 * ── TWO AXES THAT MUST NOT BE MIXED ───────────────────────────────────────
 * LIFECYCLE follows the workflow and is the same for everyone. ATTENTION —
 * «بانتظار إجرائي» — depends on WHO IS LOOKING and comes from BR-14. The
 * reference's own comment records what happens when they are conflated:
 * «بحاجة إلى إجراء» ends up beside «المعتمدة» as if they answered the same
 * question. So the tabs are lifecycle, and the relation is a separate filter.
 *
 * ── THE RELATION IS THE SERVER'S ANSWER ───────────────────────────────────
 * `relation.canAct` arrives decided. This component never recomputes it and
 * never infers it from a party name — `03 §7` makes BR-14 the whole
 * authorisation model, and a relation the browser could compute is one it
 * could change.
 *
 * ── WHAT THIS COMPONENT COMPUTES ──────────────────────────────────────────
 * Filtering and display formatting. Every figure, every chip and every
 * relation arrives derived.
 */
@Component({
  selector: 'epm-change-orders-page',
  standalone: true,
  imports: [
    IconComponent, StatusPillComponent, TableSkeletonComponent,
    ChangeOrderWizard, PersonaSwitcherComponent, FieldGroupComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './change-orders.page.html',
})
export class ChangeOrdersPage {
  private api = inject(ChangeOrdersApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  persona = inject(PersonaService);
  focusQueue = inject(ChangeOrderFocusQueue);
  fmt = fmt;

  projectId = signal('');
  data = signal<ChangeOrdersResponse | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);
  /** A denied register is a distinct state from a failed request. */
  forbidden = signal(false);

  /** المسار 9's wizard, over this register (الشكل 37). */
  wizardOpen = signal(false);

  /** Lifecycle tab — `all` plus one per group. */
  life = signal('all');
  /** «بانتظار إجرائي» · «تجاوزت السقف» · «متأخرة» — one at a time. */
  attn = signal('');
  /** Free text over the fields someone would actually type. */
  q = signal('');
  /**
   * الشكل 29's «المرحلة» filter. The plate lists it beside the three attention
   * filters and it answers a different question from them: not «is something
   * wrong with this order» but «where in the six stages is it sitting».
   */
  stage = signal('');
  /** الشكل 29's «مرشح نوع الأمر» — lookup `co-type`. */
  type = signal('');

  readonly colCount = 7;

  rows = computed(() => this.data()?.rows ?? []);
  groups = computed(() => (this.data()?.groups ?? []).filter(g => g.key !== 'draft' || g.count > 0));

  /**
   * The stages actually present on this project's orders, in stage order — not
   * the six `WorkflowMachine` defines. A stage nothing is sitting in is not a
   * filter anybody needs, and offering it would be offering an empty result.
   */
  stagesPresent = computed(() => {
    const seen = new Map<number, string>();
    for (const r of this.rows()) {
      if (r.currentStageNo != null && !seen.has(r.currentStageNo)) {
        seen.set(r.currentStageNo, this.lang.pick(r.currentStageNameAr ?? '', r.currentStageNameEn ?? ''));
      }
    }
    return [...seen].sort((a, b) => a[0] - b[0]).map(([no, name]) => ({ no, name }));
  });

  /** Likewise: the types present, labelled from the `co-type` lookup. */
  typesPresent = computed(() => {
    const seen = new Set(this.rows().map(r => r.type));
    return [...seen].sort().map(code => ({ code, label: this.lookups.label('co-type', code) }));
  });

  /**
   * A row's lifecycle group. `approved` and `applied_partial` share one —
   * both mean "decided, not yet on the contract" — and `cancelled` joins
   * `rejected` because both are terminal refusals.
   */
  private groupOf(r: ChangeOrderRow): string {
    if (r.lifecycle === 'approved' || r.lifecycle === 'applied_partial') return 'applying';
    if (r.lifecycle === 'cancelled') return 'rejected';
    return r.lifecycle;
  }

  groupLabel(key: string): string {
    return this.lang.t(('chg_grp_' + key) as never);
  }

  title(r: ChangeOrderRow): string { return this.lang.pick(r.titleAr, r.titleEn); }
  chip(c: ExceptionChip): string { return this.lang.pick(c.labelAr, c.labelEn); }

  /** The four filters compose; each is independent of the others. */
  shown = computed(() => {
    const life = this.life();
    const attn = this.attn();
    const q = this.q().trim().toLowerCase();

    const stage = this.stage();
    const type = this.type();

    return this.rows().filter(r => {
      if (life !== 'all' && this.groupOf(r) !== life) return false;
      if (stage && String(r.currentStageNo ?? '') !== stage) return false;
      if (type && r.type !== type) return false;

      if (attn === 'mine' && !r.relation.canAct) return false;
      if (attn === 'sla' && !r.exceptions.some(x => x.code === 'sla-breached')) return false;
      if (attn === 'overdue' && !r.exceptions.some(x => x.code === 'overdue')) return false;

      if (q) {
        const hay = `${r.no} ${r.titleAr} ${r.titleEn} ${r.justification} ${r.incomingNo}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  filtered = computed(() =>
    this.life() !== 'all' || !!this.attn() || !!this.stage() || !!this.type() || !!this.q().trim());

  clearFilters() {
    this.life.set('all');
    this.attn.set('');
    this.stage.set('');
    this.type.set('');
    this.q.set('');
  }

  /** Lifecycle is the register's grouping axis; a stage belongs to one group. */
  setLife(key: string) {
    this.life.set(key);
    this.stage.set('');
  }

  toggleAttn(k: string) { this.attn.update(v => (v === k ? '' : k)); }

  /** `03 §9`'s record. The number is the segment — a record has to be linkable. */
  open(no: string) {
    this.router.navigate(['/projects', this.projectId(), 'changeorders', no]);
  }

  /**
   * A submitted order goes straight to its record: it is the document the
   * person who just wrote it wants to read, and it is where the decision they
   * are waiting for will be taken.
   */
  afterCreate(no: string) {
    this.wizardOpen.set(false);
    this.load();
    this.open(no);
  }

  onRowKey(e: KeyboardEvent, no: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.open(no);
    }
  }

  slaCount = computed(() => this.rows().filter(r => r.exceptions.some(x => x.code === 'sla-breached')).length);
  overdueCount = computed(() => this.rows().filter(r => r.exceptions.some(x => x.code === 'overdue')).length);

  /** Σ of what is on screen — a footer that ignores the filter is a footer nobody trusts. */
  shownValue = computed(() => this.shown().reduce((a, r) => a + r.value, 0));
  shownDays = computed(() => this.shown().reduce((a, r) => a + r.days, 0));

  typeLabel(code: string): string { return this.lookups.label('co-type', code); }

  /** Approved is still outside the contract until the workflow applies it. */
  awaitsContractApplication(r: ChangeOrderRow): boolean {
    return r.lifecycle === 'approved' || r.lifecycle === 'applied_partial';
  }

  /** BR-14's five relations, as the chip beside the lifecycle pill (`03 §7`). */
  relLabel(key: string): string { return this.lang.t(('chg_rel_' + key) as never); }

  awaitingTitle = computed(() =>
    this.lang.t('chg_awaiting_t').replace('{n}', String(this.data()?.awaitingMe ?? 0)));

  scopeTitle = computed(() =>
    (this.data()?.awaitingMe ?? 0) > 0
      ? this.awaitingTitle()
      : this.lang.t('chg_scope_review_t'));

  scopeBody = computed(() =>
    this.data()?.viewerIsDelegate
      ? this.lang.t('chg_scope_delegate_b')
      : this.lang.t('chg_scope_review_b'));

  /**
   * `04 §8`'s «awaiting-me set» — the same rows `attn === 'mine'` filters to
   * and what the server's own `awaitingMe` counts. Focus mode works this
   * list in order; it is never recomputed once the queue starts (`03 §7`'s
   * relation is the server's answer, taken once per queue, not re-derived
   * as decisions land elsewhere).
   */
  mineList = computed(() => this.rows().filter(r => r.relation.canAct));

  /** `vo-record.jsx:685-692` — «وضع الإنجاز». Opens the queue on its first order. */
  startFocus() {
    const list = this.mineList();
    if (!list.length) return;
    this.focusQueue.start(list.map(r => ({ no: r.no, titleAr: r.titleAr, titleEn: r.titleEn })));
    this.open(list[0].no);
  }

  constructor() {
    this.route.parent!.paramMap.pipe(takeUntilDestroyed()).subscribe(pm => {
      this.projectId.set(pm.get('id') ?? '');
      this.clearFilters();
    });

    // ONE effect on BOTH inputs, so the page loads exactly once per change of
    // either. The persona IS the identity (P-05) and BR-14 is resolved from it
    // on the server, so switching persona is a RE-READ — not a client-side
    // re-filter of rows whose relations were computed for somebody else.
    effect(() => {
      const pid = this.projectId();
      this.persona.currentId();
      if (pid) untracked(() => this.load());
    });
  }

  load() {
    const pid = this.projectId();
    if (!pid) return;
    this.loading.set(true);
    this.error.set(null);
    this.forbidden.set(false);

    forkJoin({ lookups: this.lookups.ensureLoaded(), model: this.api.list(pid) }).subscribe({
      next: ({ model }) => {
        this.data.set(model);
        this.loading.set(false);
      },
      error: e => {
        this.forbidden.set(e?.status === 403);
        this.error.set(e?.error?.message ?? e?.message ?? 'request failed');
        this.loading.set(false);
      },
    });
  }
}
