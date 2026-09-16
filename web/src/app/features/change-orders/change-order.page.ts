import {
  Component, ViewEncapsulation, computed, effect, inject, signal, untracked,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { PanelHeadComponent } from '../../shared/panel-head.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { SectionComponent } from '../../shared/section.component';
import { DrawerComponent } from '../../shared/drawer.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { PersonaSwitcherComponent } from '../../shared/persona-switcher.component';
import { DateComponent } from '../../shared/date.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { PersonaService } from '../../core/persona';
import { ChangeOrderFocusQueue } from '../../core/change-order-focus';
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { ChangeOrdersApi } from './change-orders.api';
import {
  ChangeOrderRecordResponse, RecordColumn, RecordExternalParty, RecordLine, RecordStage,
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
  imports: [IconComponent, StatusPillComponent, SectionComponent, DrawerComponent, TableSkeletonComponent, PanelHeadComponent,
            PersonaSwitcherComponent, DateComponent],
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
  focusQueue = inject(ChangeOrderFocusQueue);
  /** طباعة · تصدير are demo stubs and say so — ToastService.demo(). */
  toast = inject(ToastService);
  fmt = fmt;

  projectId = signal('');
  no = signal('');
  data = signal<ChangeOrderRecordResponse | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);
  actionError = signal<string | null>(null);
  actionSuccess = signal<string | null>(null);
  hasFailedApply = computed(() => (this.data()?.applySteps ?? []).some(s => s.status === 'fail'));

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

  // ── `03 §5` — the decision, and `03 §4` — recording for a party ────────

  /** The chosen decision key, or null while nothing is selected. */
  decision = signal<string | null>(null);
  decisionNote = signal('');
  /** Set once the user has tried to submit — errors appear then, not while typing. */
  decisionTouched = signal(false);
  deciding = signal(false);

  /** The stage this viewer would be acting on right now, applicable and open. */
  currentStage = computed(() => {
    const d = this.data();
    return d?.stages.find(s => s.applicable && (s.status === 'active' || s.breached)) ?? null;
  });

  /**
   * P-252 — تثبيت الأسعار never skips, and approving it is the only place
   * `ApprovedValue` is ever written. `chooseDecision` pre-fills
   * `lineApprovals` from each line's RE-department proposal; the committee
   * edits from there before submitting.
   */
  isStage3Approve = computed(() =>
    this.currentStage()?.stageNo === 3 && this.decision() === 'approve');

  /** Lines لجنة تثبيت الأسعار is ruling on — every line the RE department proposed something for. */
  approvalLines = computed(() => (this.data()?.lines ?? [])
    .filter(l => l.reDeptDeltaQty !== null || l.reDeptNewRate !== null));

  /** code → the committee's editable entry, seeded from the RE department's own proposal. */
  lineApprovals = signal<Record<string, { deltaQty: number | null; rate: number | null; excessRate: number | null }>>({});
  approvedDaysInput = signal<number | null>(null);

  /** The external party whose outcome is being recorded, and its letter. */
  recording = signal<RecordExternalParty | null>(null);
  recordingStage = signal<RecordStage | null>(null);
  letterNo = signal('');
  letterDate = signal('');
  recordNote = signal('');
  recordState = signal('in');

  /**
   * WHICH decisions this viewer may take, mirrored from
   * `Domain/WorkflowMachine.Available`. The server refuses anything else
   * (BR-14 · `03 §7`) — this list is what the page OFFERS, and the two are
   * derived from the same rule so they cannot drift.
   */
  decisions = computed(() => {
    const d = this.data();
    if (!d || !d.relation.canAct) return [];

    const current = this.currentStage();
    const externalsOut = (current?.external ?? []).some(x => x.state === 'wait');

    switch (d.lifecycle) {
      case 'pending': {
        const set: { key: string; needsNote: boolean; danger: boolean }[] = [];
        // `03 §3` — the stage cannot complete while a party is still out.
        if (!externalsOut) set.push({ key: 'approve', needsNote: false, danger: false });
        set.push({ key: 'return', needsNote: true, danger: false });
        set.push({ key: 'reject', needsNote: true, danger: true });
        if (d.viewerIsDelegate) set.push({ key: 'cancel', needsNote: true, danger: true });
        return set;
      }
      case 'returned':
        return [{ key: 'resubmit', needsNote: false, danger: false }];
      case 'approved':
      case 'applied_partial':
        return [{ key: 'apply', needsNote: false, danger: false }];
      default:
        return [];
    }
  });

  chosen = computed(() => this.decisions().find(d => d.key === this.decision()) ?? null);

  noteMissing = computed(() =>
    !!this.chosen()?.needsNote && !this.decisionNote().trim());

  decisionLabelOf(key: string): string {
    return key === 'resubmit' ? this.lang.t('chg_d_resubmit')
      : key === 'apply' ? this.lang.t('chg_d_apply')
      : this.lookups.label('decision', key);
  }

  /**
   * «ماذا سيحدث بعد ذلك» — what the decision DOES, before it is taken. The
   * reference states this per decision and it is the reason the panel is not
   * just a dropdown: the consequences are the part a reader cannot infer.
   */
  consequences(key: string): string[] {
    const d = this.data();
    const next = d?.stages.find(s => s.applicable && s.stageNo > (this.currentStage()?.stageNo ?? 0));
    const owner = next ? this.lang.pick(next.ownerParty, next.ownerPartyEn) : '';
    const nextName = next ? this.lang.pick(next.nameAr, next.nameEn) : '';

    switch (key) {
      case 'approve':
        return [
          next ? this.lang.t('chg_c_forward').replace('{s}', nextName).replace('{o}', owner)
               : this.lang.t('chg_c_complete'),
          this.lang.t('chg_c_sla_reset'),
          this.lang.t('chg_c_nothing_posts'),
        ];
      case 'return':
        return [this.lang.t('chg_c_return_1'), this.lang.t('chg_c_note_kept')];
      case 'reject':
        return [this.lang.t('chg_c_reject_1'), this.lang.t('chg_c_note_kept')];
      case 'cancel':
        return [this.lang.t('chg_c_cancel_1'), this.lang.t('chg_c_note_kept')];
      case 'resubmit':
        return [this.lang.t('chg_c_resubmit_1'), this.lang.t('chg_c_sla_reset')];
      case 'apply':
        return [
          this.lang.t('chg_c_apply_1'),
          this.lang.t('chg_c_apply_2'),
          this.lang.t('chg_c_apply_3'),
        ];
      default:
        return [];
    }
  }

  chooseDecision(key: string) {
    this.decision.set(key || null);
    this.decisionTouched.set(false);

    // P-252 — seed the committee's entry from the RE department's own
    // proposal the moment stage 3's approval is chosen; they edit from there.
    if (key === 'approve' && this.currentStage()?.stageNo === 3) {
      const seed: Record<string, { deltaQty: number | null; rate: number | null; excessRate: number | null }> = {};
      for (const l of this.approvalLines()) {
        seed[l.code] = { deltaQty: l.reDeptDeltaQty, rate: l.reDeptNewRate, excessRate: l.reDeptExcessRate };
      }
      this.lineApprovals.set(seed);
      this.approvedDaysInput.set(this.data()?.impact.requestedDays ?? null);
    }
  }

  setLineApproval(code: string, field: 'deltaQty' | 'rate' | 'excessRate', raw: string) {
    const value = raw.trim() === '' ? null : Number(raw);
    this.lineApprovals.update(m => {
      const base = m[code] ?? { deltaQty: null, rate: null, excessRate: null };
      return { ...m, [code]: { ...base, [field]: value } };
    });
  }

  setApprovedDays(raw: string) {
    this.approvedDaysInput.set(raw.trim() === '' ? null : Number(raw));
  }

  /** P-252 — a stage-3 approval with nothing entered is refused server-side too. */
  approvalsMissing = computed(() => this.isStage3Approve() && (
    this.approvalLines().length === 0 || this.approvalLines().some(l => {
      const a = this.lineApprovals()[l.code];
      if (!a) return true;
      if (l.changeType === 'inc' || l.changeType === 'dec')
        return a.deltaQty === null || !Number.isFinite(a.deltaQty) ||
          (Math.abs(a.deltaQty) > l.threshold &&
            (a.excessRate === null || !Number.isFinite(a.excessRate) || a.excessRate <= 0));
      return l.changeType === 'rate' && (a.rate === null || !Number.isFinite(a.rate) || a.rate <= 0);
    })));

  submitDecision() {
    const key = this.chosen()?.key;
    if (!key || this.deciding()) return;

    if (this.noteMissing()) { this.decisionTouched.set(true); return; }
    if (this.approvalsMissing()) { this.decisionTouched.set(true); return; }

    this.deciding.set(true);
    this.actionError.set(null);
    this.actionSuccess.set(null);
    const note = this.decisionNote().trim() || null;

    const approvals = this.isStage3Approve()
      ? this.approvalLines().map(l => {
          const a = this.lineApprovals()[l.code] ?? { deltaQty: null, rate: null, excessRate: null };
          return { code: l.code, deltaQty: a.deltaQty, rate: a.rate, excessRate: a.excessRate };
        })
      : undefined;
    const approvedDays = this.isStage3Approve() ? this.approvedDaysInput() : undefined;

    const call = key === 'apply'
      ? this.api.apply(this.projectId(), this.no())
      : this.api.decide(this.projectId(), this.no(), key, note, approvals, approvedDays);

    call.subscribe({
      next: r => {
        this.deciding.set(false);
        this.decision.set(null);
        this.decisionNote.set('');
        this.lineApprovals.set({});
        this.approvedDaysInput.set(null);
        this.actionSuccess.set(r.message);
        this.toast.show(r.message);
        this.load();
      },
      error: e => {
        this.deciding.set(false);
        // A 422 from apply is `03 §6`'s failable step: nothing moved, and the
        // message names the step that stopped.
        this.actionError.set(e?.error?.message ?? e?.message ?? 'request failed');
        this.load();
      },
    });
  }

  openRecording(stage: RecordStage, party: RecordExternalParty) {
    this.actionError.set(null);
    this.recording.set(party);
    this.recordingStage.set(stage);
    this.recordState.set('in');
    this.letterNo.set('');
    this.letterDate.set(this.data()?.dataDate ?? '');
    this.recordNote.set('');
    this.decisionTouched.set(false);
  }

  letterMissing = computed(() => !this.letterNo().trim() || !this.letterDate().trim());

  submitRecording() {
    const party = this.recording();
    if (!party || this.deciding()) return;
    if (this.letterMissing()) { this.decisionTouched.set(true); return; }

    this.deciding.set(true);
    this.actionError.set(null);
    this.actionSuccess.set(null);
    this.api.recordExternal(this.projectId(), this.no(), party.id, {
      state: this.recordState(),
      letterNo: this.letterNo().trim(),
      letterDate: this.letterDate(),
      note: this.recordNote().trim() || null,
    }).subscribe({
      next: r => {
        this.deciding.set(false);
        this.recording.set(null);
        this.actionSuccess.set(r.message);
        this.toast.show(r.message);
        this.load();
      },
      error: e => {
        this.deciding.set(false);
        this.actionError.set(e?.error?.message ?? e?.message ?? 'request failed');
      },
    });
  }

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

  /**
   * الشكل 30's «منتقي الأمر». It navigates — the record is a ROUTE, so moving
   * between orders is a navigation and not a signal swap; the back button then
   * walks the orders a reader actually looked at.
   */
  siblings = computed(() => this.data()?.siblings ?? []);

  openSibling(no: string) {
    if (!no || no === this.no()) return;
    this.router.navigate(['/projects', this.projectId(), 'changeorders', no]);
  }

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

  /**
   * `vo-record.jsx:1373-1388` — a breached stage gets its own trail entry
   * naming who it moved from and to. «المستوى الإداري الأعلى» is the same
   * fixed escalation target the reference names (`MANAGER`, `:564`) — not a
   * stored value, so it is a label, not an invented workflow role.
   */
  escalationNote(s: RecordStage): string {
    return this.lang.t('chg_esc_note')
      .replace('{stage}', this.lang.pick(s.nameAr, s.nameEn))
      .replace('{sla}', String(s.slaDays))
      .replace('{elapsed}', String(s.elapsedDays))
      .replace('{from}', this.lang.pick(s.ownerParty, s.ownerPartyEn))
      .replace('{to}', this.lang.t('chg_esc_manager'));
  }

  // ── الشكل 31's three party rows under each item row ────────────────────

  /**
   * The «الوصف / التفصيل» cell: how BR-05 split THIS party's quantity. A line
   * inside the limit says so; a line beyond it prints both halves, because
   * only the second one may carry a new rate (`02 §5`).
   */
  tierText(l: RecordLine, c: RecordColumn, key: string): string {
    if (c.qtyAfter === null) return this.lang.t(key === 'applied' ? 'chg_not_applied' : 'chg_awaiting_decision');
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
    { key: 'applied', label: this.lang.t('chg_applied') },
  ]);

  col(l: RecordLine, key: string): RecordColumn {
    return key === 'contractor' ? l.contractor : key === 'reDept' ? l.reDept
      : key === 'applied' ? l.applied : l.approved;
  }

  onTabKey(e: KeyboardEvent, key: string) {
    const forward = this.lang.isAr() ? -1 : 1;
    const index = this.tabs.findIndex(t => t.k === key);
    const next = e.key === 'ArrowRight' ? index + forward
      : e.key === 'ArrowLeft' ? index - forward
      : e.key === 'Home' ? 0 : e.key === 'End' ? this.tabs.length - 1 : -1;
    if (next < 0 && e.key !== 'Home' && e.key !== 'End') return;
    if (next < 0 || next >= this.tabs.length) return;
    e.preventDefault();
    this.tab.set(this.tabs[next].k);
    const buttons = (e.currentTarget as HTMLElement).parentElement?.querySelectorAll<HTMLButtonElement>('[role="tab"]');
    buttons?.[next]?.focus();
  }

  /** D-14 — المجهز requests, لجنة الفحص والاستلام reviews, in place of
   *  المقاول and دائرة المهندس المقيم (`Domain`'s own `PartiesFor`, ported
   *  from the prototype's `voTerms`, `model.js:722`). */
  isSupply = computed(() => this.data()?.type === 'supply');
  requesterLabel = computed(() => this.lang.t(this.isSupply() ? 'chg_party_supplier' : 'chg_party_contractor'));
  reviewerLabel = computed(() => this.lang.t(this.isSupply() ? 'chg_party_inspection' : 'chg_party_redept'));

  /**
   * The rate column's header — «سعر الوحدة» only when every line on the
   * order is a `rate` change (the whole line re-prices, no tier), «سعر
   * الزائد» otherwise. A supply order's `inc`/`dec` lines go through the
   * same 20% tier as construction (D-14, P-261), so they carry a genuine
   * excess rate too — this no longer special-cases `isSupply()`.
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

  // ── Focus mode — `04 §8`, `vo-record.jsx:800-803,993-1006` ────────────────
  //
  // The queue is the register's own «awaiting me» list (BR-14, resolved once
  // when the queue starts). This component only walks it and never recomputes
  // who belongs in it.
  focusActive = computed(() => this.focusQueue.active());
  focusIndex = computed(() => this.focusQueue.index(this.no()));
  focusTotal = computed(() => this.focusQueue.orderNos().length);
  /** Z8's own tab, while a queue is active — «البطاقة» / «القائمة» (`vo-record.jsx:1013-1015`). */
  paneTab = signal<'facts' | 'queue'>('facts');
  focusQueueList = computed(() => {
    const titles = this.focusQueue.titles();
    return this.focusQueue.orderNos().map(n => ({
      no: n, titleAr: titles[n]?.ar ?? '', titleEn: titles[n]?.en ?? '',
    }));
  });

  private gotoQueue(i: number) {
    const list = this.focusQueue.orderNos();
    if (i < 0 || i >= list.length) return;
    this.router.navigate(['/projects', this.projectId(), 'changeorders', list[i]]);
  }
  goNext() { this.gotoQueue(this.focusIndex() + 1); }
  goPrev() { this.gotoQueue(this.focusIndex() - 1); }
  jumpTo(no: string) { if (no !== this.no()) this.gotoQueue(this.focusQueue.index(no)); }

  /** `vo-record.jsx:983` — `setOpenNo(null); setFocus(false)`, in that order. */
  exitFocus() {
    this.focusQueue.stop();
    this.back();
  }

  constructor() {
    // The order number is a URL segment and the project is the parent route's:
    // a record is a document, and a link to one has to survive being pasted.
    this.route.paramMap.pipe(takeUntilDestroyed()).subscribe(pm => {
      this.no.set(pm.get('no') ?? '');
      this.tab.set('summary');
      this.openStage.set(null);
      this.actionError.set(null);
      this.actionSuccess.set(null);
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

    // A direct link (pasted, or opened from the sibling picker) can land on
    // an order the active queue never listed — the focus UI would then show
    // stale prev/next controls for a queue this order isn't part of. Drop it
    // rather than carry it silently.
    effect(() => {
      const no = this.no();
      const active = this.focusQueue.active();
      if (active && no && !this.focusQueue.contains(no)) {
        untracked(() => this.focusQueue.stop());
      }
    });

    // `vo-record.jsx:525` — `useEffect(() => { if (!focus) setPaneTab('facts'); }, [focus])`.
    effect(() => {
      if (!this.focusQueue.active()) untracked(() => this.paneTab.set('facts'));
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
