import {
  Component, ViewEncapsulation, computed, effect, inject, signal, untracked,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconComponent } from '../../core/icon.component';
import { SectionComponent } from '../../shared/section.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { LangService } from '../../core/lang';
import { AuditApi } from './audit.api';
import { AuditResponse, AuditRow } from './audit.types';

/**
 * SCR-W15 — سجل التدقيق · `04 §3`.
 *
 * ── ONE TRAIL, THREE SOURCES ──────────────────────────────────────────────
 * The rows come from the logs kept beside the records they belong to — the
 * project's own, its contracts', and its change orders'. Nothing on this screen
 * is stored for it (P-122), so nothing here can disagree with the tab that owns
 * the record: opening SCR-W3's سجل النشاط shows the same contract rows.
 *
 * ── THE ORDER IS NOT NEGOTIABLE ───────────────────────────────────────────
 * Newest first, and no column sorts. An audit trail answers «ما آخر ما جرى»
 * and reads backwards from there; a sortable one invites a reader to make it
 * answer a question it was not written to answer.
 *
 * ── A SYSTEM ROW IS NOT A PERSON ──────────────────────────────────────────
 * «النظام · حدث آلي» is rendered as itself, never dressed as a persona — the
 * same call الشكل 11 made (P-83).
 */
@Component({
  selector: 'epm-audit-page',
  standalone: true,
  imports: [IconComponent, SectionComponent, TableSkeletonComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './audit.page.html',
})
export class AuditPage {
  private api = inject(AuditApi);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);

  /** الوقت · المصدر · السجل · الإجراء · التغيير · المنفّذ. */
  readonly colCount = 6;

  projectId = signal('');
  data = signal<AuditResponse | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);

  source = signal('all');
  q = signal('');

  rows = computed(() => this.data()?.rows ?? []);

  sourceLabel(code: string): string {
    return this.lang.t(
      code === 'all' ? 'aud_all'
        : code === 'project' ? 'aud_s_project'
        : code === 'contract' ? 'aud_s_contract'
        : 'aud_s_changeorder');
  }

  /**
   * The verbs are verbs, not a business value list, so they are labelled from
   * `lang.ts` and NOT from the Lookups table — the same call SCR-W2's log made.
   *
   * The keys are the ones the OWNING screens already use — `chg_act_*` on the
   * change-order record, `con_act_*` on the contract log — so one verb has one
   * wording wherever it is read. An action with no key prints its own code: a
   * worse label, never a wrong one, and never a crash.
   */
  actionLabel(r: AuditRow): string {
    if (r.source === 'changeorder') {
      switch (r.action) {
        case 'create': return this.lang.t('chg_act_create');
        case 'edit': return this.lang.t('chg_act_edit');
        case 'submit': return this.lang.t('chg_act_submit');
        case 'approve': return this.lang.t('chg_act_approve');
        case 'return': return this.lang.t('chg_act_return');
        case 'reject': return this.lang.t('chg_act_reject');
        case 'cancel': return this.lang.t('chg_act_cancel');
        case 'apply': return this.lang.t('chg_act_apply');
        case 'close': return this.lang.t('chg_act_close');
        case 'apply-failed': return this.lang.t('chg_act_apply-failed');
        case 'record-external': return this.lang.t('chg_act_record-external');
        default: return r.action;
      }
    }

    if (r.source === 'project') {
      switch (r.action) {
        case 'created': return this.lang.t('prj_act_created');
        case 'updated': return this.lang.t('prj_act_updated');
        default: return r.action;
      }
    }

    switch (r.action) {
      case 'created': return this.lang.t('con_act_created');
      case 'updated': return this.lang.t('con_act_updated');
      case 'change-order': return this.lang.t('aud_a_change_order');
      case 'progress': return this.lang.t('aud_a_progress');
      default: return r.action;
    }
  }

  sourceClass(code: string): string {
    return code === 'changeorder' ? 'ongoing' : code === 'contract' ? 'completed' : '';
  }

  /** «قيمة سابقة ← قيمة جديدة», or nothing when the action moved no field. */
  hasDiff(r: AuditRow): boolean { return r.field !== null; }

  shown = computed(() => {
    const s = this.source();
    const q = this.q().trim().toLowerCase();

    return this.rows().filter(r => {
      if (s !== 'all' && r.source !== s) return false;
      if (q) {
        const hay = `${r.sourceRef} ${r.action} ${r.actorName ?? ''} ${r.field ?? ''} ${r.note ?? ''}`;
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  });

  filtered = computed(() => this.source() !== 'all' || !!this.q().trim());

  clearFilters() {
    this.source.set('all');
    this.q.set('');
  }

  constructor() {
    this.route.parent!.paramMap.pipe(takeUntilDestroyed()).subscribe(pm => {
      this.projectId.set(pm.get('id') ?? '');
      this.clearFilters();
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

    this.api.list(pid).subscribe({
      next: model => {
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
