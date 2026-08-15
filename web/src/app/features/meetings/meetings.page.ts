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
import * as fmt from '../../core/format';
import { MeetingsApi } from './meetings.api';
import { ActionRow, MeetingRow, MeetingsResponse } from './meetings.types';

/**
 * SCR-W11 — محاضر الاجتماعات وسجل الإجراءات · **ملحق الشكل 45**.
 *
 * ── WHAT THE PLATE DRAWS ──────────────────────────────────────────────────
 * Two tabs, and under the first one BOTH sections: a timeline of minutes,
 * newest first, each with its date in the gutter, its title, ONE decision line
 * and its attachment card — then سجل الإجراءات as a six-column register. The
 * second tab is the register on its own, for a reader who came for the actions.
 *
 * ── «متأخر» IS A VALUE, NOT A DERIVATION ─────────────────────────────────
 * The first cut derived it from the due date. الشكل 45 refutes that: ACT-02 is
 * past its due date and still reads «قيد التنفيذ». This register is kept by
 * hand, and lateness on it is the minute-keeper's judgement (P-116).
 */
@Component({
  selector: 'epm-meetings-page',
  standalone: true,
  imports: [IconComponent, SectionComponent, TableSkeletonComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './meetings.page.html',
})
export class MeetingsPage {
  private api = inject(MeetingsApi);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  /** «محضر اجتماع جديد» and opening a file are demo stubs and say so. */
  toast = inject(ToastService);
  fmt = fmt;

  projectId = signal('');
  data = signal<MeetingsResponse | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);

  /** الشكل 45's two tabs. */
  tab = signal<'minutes' | 'actions'>('minutes');

  meetings = computed(() => this.data()?.meetings ?? []);
  actions = computed(() => this.data()?.actions ?? []);

  title(m: { titleAr: string; titleEn: string }): string {
    return this.lang.pick(m.titleAr, m.titleEn);
  }

  decision(m: MeetingRow): string { return this.lang.pick(m.decisionAr, m.decisionEn); }

  priorityLabel(code: string): string { return this.lookups.label('action-priority', code); }
  statusLabel(code: string): string { return this.lookups.label('action-status', code); }

  /**
   * `05 §7.6` — every status pill carries its label. «متأخر» is one of the
   * four values this register stores, not something computed here (P-116).
   */
  statusText(a: ActionRow): string { return this.statusLabel(a.status); }

  statusClass(a: ActionRow): string {
    return a.status === 'overdue' ? 'stalled'
      : a.status === 'closed' ? 'completed'
      : a.status === 'inprogress' ? 'ongoing'
      : '';
  }

  overdueCount = computed(() => this.actions().filter(a => a.status === 'overdue').length);

  constructor() {
    this.route.parent!.paramMap.pipe(takeUntilDestroyed()).subscribe(pm => {
      this.projectId.set(pm.get('id') ?? '');
      this.tab.set('minutes');
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
}
