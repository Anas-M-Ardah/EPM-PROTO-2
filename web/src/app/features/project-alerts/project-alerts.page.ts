import {
  Component, ViewEncapsulation, computed, effect, inject, signal, untracked,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { SectionComponent } from '../../shared/section.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import { ProjectAlertsApi } from './project-alerts.api';
import { AlertRuleRow, ProjectAlertRow, ProjectAlertsResponse } from './project-alerts.types';

/**
 * SCR-W13 — التنبيهات · **ملحق الشكل 47**.
 *
 * ── TWO VIEWS OF ONE PAYLOAD ──────────────────────────────────────────────
 * التنبيهات is the inbox; القواعد is the twelve rules that fill it. They come
 * from one read because a rule switch changes what the inbox contains — the
 * plate's own notice: *«إيقاف قاعدة يوقف التنبيهات التي أنتجتها فورًا»*.
 *
 * ── THE PAGE DECIDES NOTHING ──────────────────────────────────────────────
 * Which alerts are live, which group each belongs to, how many need action —
 * all `Domain/AlertInbox`, arriving as `bucket`, `daysToDue` and `needsAction`.
 * This class groups an already-grouped list and formats an already-signed
 * number of days. The one thing it decides is which chip is selected.
 *
 * ── THE ORDER IS THE SYSTEM'S ─────────────────────────────────────────────
 * متأخرة · مستحقة اليوم · خلال هذا الأسبوع · لاحقاً, in that order, always. No
 * column here is sortable: the point of an inbox is that the system decides
 * priority, and a reader who can re-sort it has been handed the decision back.
 */
@Component({
  selector: 'epm-project-alerts-page',
  standalone: true,
  imports: [IconComponent, SectionComponent, TableSkeletonComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './project-alerts.page.html',
})
export class ProjectAlertsPage {
  private api = inject(ProjectAlertsApi);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  toast = inject(ToastService);

  /** الشكل 47's rules table: الرمز · القاعدة · الشرط · الخطورة · القنوات · التكرار · التصعيد · الحالة. */
  readonly ruleColCount = 8;

  projectId = signal('');
  data = signal<ProjectAlertsResponse | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);

  /** The plate's segmented control. It opens on القواعد, which is what الشكل 47 shows. */
  view = signal<'inbox' | 'rules'>('rules');
  severity = signal('all');
  /** «محدد N» — the rows ticked for a bulk acknowledgement. */
  picked = signal<ReadonlySet<number>>(new Set());
  /** A rule mid-write, so its switch cannot be clicked twice. */
  busyRule = signal<string | null>(null);

  rows = computed(() => this.data()?.rows ?? []);
  rules = computed(() => this.data()?.rules ?? []);

  title(a: { titleAr: string; titleEn: string }): string {
    return this.lang.pick(a.titleAr, a.titleEn);
  }

  ruleName(r: AlertRuleRow): string { return this.lang.pick(r.nameAr, r.nameEn); }
  ruleTrigger(r: AlertRuleRow): string { return this.lang.pick(r.triggerAr, r.triggerEn); }

  severityLabel(code: string): string {
    return code === 'all' ? this.lang.t('pal_all') : this.lookups.label('alert-severity', code);
  }
  kindLabel(code: string): string { return this.lookups.label('alert-kind', code); }
  statusLabel(code: string): string { return this.lookups.label('alert-status', code); }
  bucketLabel(code: string): string { return this.lookups.label('alert-bucket', code); }
  recurrenceLabel(code: string): string { return this.lookups.label('alert-recurrence', code); }

  severityClass(code: string): string {
    return code === 'critical' ? 'stalled' : code === 'warning' ? 'suspended' : 'completed';
  }
  severityIcon(code: string): string {
    return code === 'critical' ? 'warning' : code === 'warning' ? 'error' : 'info';
  }
  statusClass(code: string): string {
    return code === 'acknowledged' ? 'completed' : 'ongoing';
  }

  /**
   * «القنوات» — the enabled ones, joined. Three bools rather than a string,
   * so a channel can be switched without re-parsing anybody's prose.
   */
  channels(r: AlertRuleRow): string {
    return [
      r.channelInApp ? this.lang.t('pal_ch_inapp') : null,
      r.channelEmail ? this.lang.t('pal_ch_email') : null,
      r.channelSms ? this.lang.t('pal_ch_sms') : null,
    ].filter(Boolean).join(' · ');
  }

  /**
   * Arabic counts a noun by its number: يوم واحد · يومان · N أيام for three to
   * ten · N يوماً beyond that. الشكل 47 prints both of the last two — «5 أيام»
   * and «خلال 45 يوماً» — so one invariant unit word would be wrong on half
   * the screen. English takes the plain singular/plural.
   */
  private daysPhrase(n: number): string {
    if (!this.lang.isAr()) return `${n} ${this.lang.t(n === 1 ? 'pal_day' : 'pal_days')}`;
    if (n === 1) return this.lang.t('pal_d_one');
    if (n === 2) return this.lang.t('pal_d_two');
    return `${n} ${this.lang.t(n <= 10 ? 'pal_days' : 'pal_d_many')}`;
  }

  /**
   * «التصعيد بعد» — one stored number of hours, shown in the unit that reads:
   * under three days as hours («48 ساعة»), beyond that as days («5 أيام»).
   * Display formatting of one value, not a second value (CLAUDE.md §3.1).
   */
  escalation(r: AlertRuleRow): string {
    const h = r.escalateAfterHours;
    if (h === null) return this.lang.t('pal_no_escalation');
    return h < 72
      ? `${h} ${this.lang.t('pal_hours')}`
      : this.daysPhrase(h / 24);
  }

  /**
   * «متأخر 3 أيام» · «يستحق اليوم» · «خلال 7 أيام» — off the signed number the
   * endpoint already computed against the DATA DATE (D-06).
   */
  dueLabel(a: ProjectAlertRow): string {
    const n = a.daysToDue;
    if (n === null) return this.lang.t('pal_no_due');
    if (n < 0) return `${this.lang.t('pal_overdue_by')} ${this.daysPhrase(-n)}`;
    if (n === 0) return this.lang.t('pal_due_today');
    return `${this.lang.t('pal_within')} ${this.daysPhrase(n)}`;
  }

  dueTone(a: ProjectAlertRow): string {
    return a.bucket === 'overdue' ? 'bad' : a.bucket === 'today' ? 'warn' : '';
  }

  shown = computed(() => {
    const sev = this.severity();
    return this.rows().filter(a => sev === 'all' || a.severity === sev);
  });

  /** The four groups, in `Domain/AlertInbox`'s order, empty ones dropped. */
  groups = computed(() => {
    const shown = this.shown();
    return (this.data()?.buckets ?? [])
      .map(b => ({ code: b.code, items: shown.filter(a => a.bucket === b.code) }))
      .filter(g => g.items.length > 0);
  });

  openCount = computed(() => this.rows().filter(a => a.status === 'open').length);

  /** «حرجة N» in the footer — read off the chip the endpoint counted. */
  criticalCount = computed(() =>
    this.data()?.severities.find(s => s.code === 'critical')?.count ?? 0);

  isPicked(id: number): boolean { return this.picked().has(id); }

  togglePick(id: number) {
    this.picked.update(set => {
      const next = new Set(set);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }

  clearPicked() { this.picked.set(new Set()); }

  /** Only OPEN rows can be acknowledged, so those are what the button counts. */
  pickedOpen = computed(() =>
    this.rows().filter(a => this.picked().has(a.id) && a.status === 'open'));

  constructor() {
    this.route.parent!.paramMap.pipe(takeUntilDestroyed()).subscribe(pm => {
      this.projectId.set(pm.get('id') ?? '');
      this.view.set('rules');
      this.severity.set('all');
      this.clearPicked();
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

    forkJoin({ lookups: this.lookups.ensureLoaded(), model: this.api.list(pid) }).subscribe({
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

  /** Re-reads instead of patching in place: the count that moved is the server's. */
  private refresh() {
    const pid = this.projectId();
    if (!pid) return;
    this.api.list(pid).subscribe({
      next: model => this.data.set(model),
      error: e => this.error.set(e?.error?.message ?? e?.message ?? 'request failed'),
    });
  }

  toggleRule(r: AlertRuleRow) {
    if (this.busyRule()) return;
    this.busyRule.set(r.code);

    this.api.setRuleEnabled(this.projectId(), r.code, !r.enabled).subscribe({
      next: () => {
        this.busyRule.set(null);
        this.toast.show(r.enabled ? this.lang.t('pal_rule_off_done') : this.lang.t('pal_rule_on_done'));
        this.refresh();
      },
      error: e => {
        this.busyRule.set(null);
        this.toast.show(e?.error?.message ?? e?.message ?? 'request failed');
      },
    });
  }

  acknowledge(a: ProjectAlertRow) {
    this.api.acknowledge(a.id, true).subscribe({
      next: () => { this.toast.show(this.lang.t('pal_ack_done')); this.refresh(); },
      error: e => this.toast.show(e?.error?.message ?? e?.message ?? 'request failed'),
    });
  }

  /**
   * The bulk action. It is a LOOP over the same single-alert endpoint, not a
   * batch write — so each acknowledgement is recorded against its own alert
   * with the persona that signed it, exactly as acknowledging one by one would.
   */
  acknowledgePicked() {
    const targets = this.pickedOpen();
    if (targets.length === 0) return;

    forkJoin(targets.map(a => this.api.acknowledge(a.id, true))).subscribe({
      next: () => {
        this.toast.show(`${this.lang.t('pal_ack_n')} ${targets.length}`);
        this.clearPicked();
        this.refresh();
      },
      error: e => this.toast.show(e?.error?.message ?? e?.message ?? 'request failed'),
    });
  }
}
