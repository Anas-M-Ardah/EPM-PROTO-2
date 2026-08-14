import {
  Component, ViewEncapsulation, computed, effect, inject, signal, untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { SectionComponent } from '../../shared/section.component';
import { DrawerComponent } from '../../shared/drawer.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { PersonaService } from '../../core/persona';
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { ChangeOrdersApi } from './change-orders.api';
import {
  ChangeOrderRecordResponse, RecordColumn, RecordLine, RecordStage,
} from './change-order-record.types';

/**
 * SCR-W8 — the change-order RECORD (`03 §9` · ملحق الأشكال 30–34).
 *
 * PORTED from the v1.1 change-order module — ../epm@design/system-revamp
 * app/vo-record.jsx, the record half of `DModVO` (:960 onwards) with
 * `voRecord` :129 as its derivation. Everything `voRecord` computes in the
 * browser is computed on the server here (CLAUDE.md §3.1); this component
 * chooses tabs and formats.
 *
 * ── THE DOCUMENT, NOT A DASHBOARD ─────────────────────────────────────────
 * `03 §9`: *"The record is an official document: what was requested, what was
 * approved, what was applied."* So the six tabs are six views of ONE payload,
 * every figure carries which party it belongs to, and no tab summarises
 * another. There is not a single card of aggregate here.
 *
 * ── FOUR COLUMNS THAT MAY NEVER MERGE ─────────────────────────────────────
 * before · مقترح المقاول · مقترح دائرة المهندس المقيم · المعتمد. `02 §6` makes
 * the RE department's the governing DISPLAY figure and the pricing committee's
 * the only approved one, so a null in the approved column reads «بانتظار
 * القرار» and never 0 — an approval of nothing is a different fact from no
 * approval.
 *
 * ── THE ACTIONS ARE NOT HERE ──────────────────────────────────────────────
 * Deciding, returning, recording for an external party and applying are
 * Phase 5.4. The relation still arrives resolved (BR-14) and المسار states in
 * words whose decision it is — `03 §7` requires the explicit locked note, never
 * a bare disabled button.
 */
@Component({
  selector: 'epm-change-order-page',
  standalone: true,
  imports: [IconComponent, StatusPillComponent, SectionComponent, DrawerComponent, TableSkeletonComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './change-order.page.html',
})
export class ChangeOrderPage {
  private api = inject(ChangeOrdersApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  persona = inject(PersonaService);
  /** طباعة · تصدير are demo stubs and say so — ToastService.demo(). */
  toast = inject(ToastService);
  fmt = fmt;

  projectId = signal('');
  no = signal('');
  data = signal<ChangeOrderRecordResponse | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);

  /** `03 §9`'s six, in its order. `flow` is المسار — 5.4 fills in its actions. */
  readonly tabs = [
    { k: 'summary', label: 'chg_tab_summary', icon: 'description' },
    { k: 'cost', label: 'chg_tab_cost', icon: 'list_alt' },
    { k: 'time', label: 'chg_tab_time', icon: 'calendar_month' },
    { k: 'flow', label: 'chg_tab_flow', icon: 'alt_route' },
    { k: 'files', label: 'chg_tab_files', icon: 'attach_file' },
    { k: 'log', label: 'chg_tab_log', icon: 'history' },
  ];
  tab = signal('summary');

  /** One stage expands at a time — الشكل 33's «مراحل قابلة للتوسيع». */
  openStage = signal<number | null>(null);

  /**
   * الشكل 31's «اضغط أي بند لعرض تفاصيله الكاملة». A DRAWER, not an in-place
   * expander: the comparison table is the thing being read, and pushing its
   * remaining rows down loses the line the reader was comparing against
   * (CLAUDE.md §6).
   */
  openLine = signal<string | null>(null);

  line = computed(() => this.data()?.lines.find(l => l.code === this.openLine()) ?? null);

  title = computed(() => {
    const d = this.data();
    return d ? this.lang.pick(d.titleAr, d.titleEn) : '';
  });

  contractName = computed(() => {
    const d = this.data();
    return d ? this.lang.pick(d.contractNameAr, d.contractNameEn) : '';
  });

  /** The stage the order sits at, or «مكتملة» when the chain is done. */
  stageLabel = computed(() => {
    const c = this.data()?.card;
    if (!c) return '—';
    const name = this.lang.pick(c.stageNameAr ?? '', c.stageNameEn ?? '');
    return name || this.lang.t('chg_stage_complete');
  });

  lineCount = computed(() => this.data()?.lines.length ?? 0);
  activityCount = computed(() => this.data()?.time.activities.length ?? 0);
  fileCount = computed(() => this.data()?.attachments.length ?? 0);
  logCount = computed(() => this.data()?.audit.length ?? 0);

  stageCount = computed(() => {
    const s = this.data()?.stages ?? [];
    const applicable = s.filter(x => x.applicable);
    return { done: applicable.filter(x => x.status === 'done').length, total: applicable.length };
  });

  // ── labels ────────────────────────────────────────────────────────────

  desc(l: { descriptionAr: string; descriptionEn: string }): string {
    return this.lang.pick(l.descriptionAr, l.descriptionEn);
  }

  /**
   * «45 يوم» — a day count carries its unit, the way الشكل 30 and الشكل 32
   * print it. A bare 45 beside a bare 60 in a money-heavy card is read as a
   * currency figure often enough to be worth the word.
   */
  dayText(v: number | null | undefined): string {
    return v === null || v === undefined ? '—' : `${fmt.days(v)} ${this.lang.t('scd_days')}`;
  }

  /** The same, signed — for a difference, where the direction IS the message. */
  deltaDays(v: number | null | undefined): string {
    return v === null || v === undefined ? '—'
      : v === 0 ? this.lang.t('chg_unchanged')
      : `${fmt.delta(v)} ${this.lang.t('scd_days')}`;
  }

  typeLabel(code: string): string { return this.lookups.label('co-type', code); }
  changeLabel(code: string): string { return this.lookups.label('boq-change-type', code); }
  actChangeLabel(code: string): string { return this.lookups.label('activity-change-type', code); }
  applyLabel(code: string): string { return this.lookups.label('apply-step-status', code); }
  extLabel(code: string): string { return this.lookups.label('external-party-state', code); }
  decisionLabel(code: string | null): string {
    return code ? this.lookups.label('decision', code) : '—';
  }
  weightStateLabel(code: string): string { return this.lookups.label('weight-recalc-state', code); }
  relLabel(key: string): string { return this.lang.t(('chg_rel_' + key) as never); }
  categoryLabel(code: string): string { return this.lookups.label('attachment-category', code); }
  auditActionLabel(code: string): string { return this.lang.t(('chg_act_' + code) as never); }

  /**
   * The pill class for an application status. `fail` is the one that must not
   * be neutral — `03 §6` makes a failed step the thing the register raises
   * فشل التطبيق for.
   */
  applyClass(code: string): string {
    return code === 'done' ? 'completed'
      : code === 'wip' ? 'ongoing'
      : code === 'fail' ? 'stalled'
      : '';
  }

  extClass(code: string): string {
    return code === 'in' ? 'completed' : code === 'back' ? 'stalled' : '';
  }

  /** الشكل 33's stage rail: done · active · overdue · returned · skipped. */
  stageClass(s: RecordStage): string {
    if (!s.applicable) return 'na';
    if (s.status === 'done') return 'ok';
    if (s.status === 'returned') return 'bad';
    if (s.breached) return 'late';
    if (s.status === 'active') return 'on';
    return '';
  }

  stageIcon(s: RecordStage): string {
    if (!s.applicable) return 'remove';
    if (s.status === 'done') return 'check';
    if (s.status === 'returned') return 'undo';
    if (s.breached) return 'priority_high';
    return 'pending';
  }

  stageStatusLabel(s: RecordStage): string {
    if (!s.applicable) return this.lang.t('chg_stage_skipped');
    if (s.status === 'returned') return this.lang.t('chg_grp_returned');
    if (s.breached) return this.lang.t('chg_f_sla');
    return this.lang.t(('chg_st_' + s.status) as never);
  }

  /** Elapsed against the ceiling, capped for the bar only — the number is exact. */
  slaPct(s: RecordStage): number {
    if (!s.slaDays) return 0;
    return Math.min(100, Math.round((s.elapsedDays / s.slaDays) * 100));
  }

  slaClass(s: RecordStage): string {
    if (!s.slaDays) return '';
    const over = (s.elapsedDays / s.slaDays) * 100;
    return over > 100 ? 'over' : over >= 80 ? 'warn' : '';
  }

  // ── الشكل 31's three party rows under each item row ────────────────────

  /**
   * The «الوصف / التفصيل» cell: how BR-05 split THIS party's quantity. A line
   * inside the limit says so; a line beyond it prints both halves, because
   * only the second one may carry a new rate (`02 §5`).
   */
  tierText(l: RecordLine, c: RecordColumn): string {
    if (c.qtyAfter === null) return this.lang.t('chg_awaiting_decision');
    if (l.changeType === 'rate') return this.lang.t('chg_rate_change_note');
    if (l.changeType === 'redist') return this.lang.t('chg_redist_note');
    if (!c.tripsThreshold) return this.lang.t('chg_within_tier');
    return `${this.lang.t('chg_within_20')} ${fmt.qty(c.atRateQty)} ${l.unit}`
      + ` · ${this.lang.t('chg_beyond_20')} ${fmt.qty(c.excessQty)} ${l.unit}`;
  }

  parties = computed(() => [
    { key: 'contractor', label: this.lang.t('chg_party_contractor') },
    { key: 'reDept', label: this.lang.t('chg_party_redept') },
    { key: 'approved', label: this.lang.t('chg_party_approved') },
  ]);

  col(l: RecordLine, key: string): RecordColumn {
    return key === 'contractor' ? l.contractor : key === 'reDept' ? l.reDept : l.approved;
  }

  /**
   * The rate column's header. `02 §5` gives the 20% tier to quantity changes
   * only, so on an order that changes RATES the column is the unit rate itself
   * and says so — the reference switches the same header for supply orders
   * (`vo-record.jsx`: `isSupply ? 'سعر الوحدة' : 'سعر الزائد'`).
   */
  rateHeader = computed(() => {
    const lines = this.data()?.lines ?? [];
    const allRate = lines.length > 0 && lines.every(l => l.changeType === 'rate');
    return this.lang.t(allRate ? 'chg_col_unit_rate' : 'chg_col_excess_rate');
  });

  /**
   * `02 §5` — the rate cell on the APPROVED row of a line that tripped 20%
   * names لجنة تثبيت الأسعار while it is unfixed, rather than showing a dash
   * that reads as "no rate applies".
   */
  awaitingRate(l: RecordLine, key: string): boolean {
    return key === 'approved' && l.approved.tripsThreshold && l.approved.rateShown === null;
  }

  onLineKey(e: KeyboardEvent, code: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.openLine.set(code);
    }
  }

  back() {
    this.router.navigate(['/projects', this.projectId(), 'changeorders']);
  }

  constructor() {
    // The order number is a URL segment and the project is the parent route's:
    // a record is a document, and a link to one has to survive being pasted.
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(pm => {
      this.no.set(pm.get('no') ?? '');
      this.tab.set('summary');
      this.openStage.set(null);
    });
    this.route.parent!.paramMap.pipe(takeUntilDestroyed()).subscribe(pm => {
      this.projectId.set(pm.get('id') ?? '');
    });

    // ONE effect on all three inputs. Switching persona is a RE-READ, never a
    // client-side re-evaluation of a relation computed for somebody else
    // (BR-14, the same call the register makes).
    effect(() => {
      const pid = this.projectId();
      const no = this.no();
      this.persona.currentId();
      if (pid && no) untracked(() => this.load());
    });
  }

  load() {
    const pid = this.projectId();
    const no = this.no();
    if (!pid || !no) return;
    this.loading.set(true);
    this.error.set(null);

    forkJoin({ lookups: this.lookups.ensureLoaded(), model: this.api.record(pid, no) }).subscribe({
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
