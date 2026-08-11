import { Component, inject, signal, computed, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { StatusPillComponent } from '../../shared/status-pill.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { PageHeadComponent, Crumb } from '../../shared/page-head.component';
import { PagerComponent } from '../../shared/pager.component';
import { SevDotComponent } from '../../shared/sev-dot.component';
import { LangService } from '../../core/lang';
import { WorkspacesService } from '../../core/workspaces';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { AlertsApi } from './alerts.api';
import { AlertRow } from './alerts.types';

/** One severity card in the band above the register. */
export interface SevCard {
  /** The filter this card applies — a severity code, or 'open' for the fourth. */
  key: string;
  /** The `.d-sevcard` tone class the v1.1 stylesheet defines. */
  tone: 'crit' | 'warn' | 'info' | 'open';
  icon: string;
  label: string;
  value: number;
  /** Share of the whole scoped feed, 0–100. */
  pct: number;
  /** The line under the bar — what the count MEANS, not a restatement of it. */
  foot: string;
}

/**
 * SCR-E6 — Alerts Center, the portfolio-wide alert register (04 §2).
 *
 * PORTED from DAlertsCenter (v1.1) —
 * ../epm@design/system-revamp app/enterprise-areas.jsx:106.
 *
 * ── NO ARITHMETIC ─────────────────────────────────────────────────────────
 * Every count arrives from EP-ALR-01. The one number computed here is a card's
 * share of the feed — `value / total × 100` — which sizes the card's bar. That
 * is display geometry, not a business figure: it is never shown as a rate, it
 * derives from nothing but the two counts beside it, and no rule in `02` owns
 * it. Anything a rule owns comes from `Domain/`.
 *
 * ── THE ACKNOWLEDGE IS A WRITE ────────────────────────────────────────────
 * The reference keeps acknowledgement in component state. Here it POSTs to
 * EP-ALR-02 and the row reloads from the server, so the persona that
 * acknowledged is recorded rather than forgotten on refresh.
 *
 * ── SEVERITY IS NOT SORTABLE, AND THAT IS THE POINT ───────────────────────
 * The feed is ordered newest-first by the server and offers no column sort.
 * The reference says why: an inbox is the one register where the SYSTEM decides
 * priority. Filter it, do not re-rank it.
 */
@Component({
  selector: 'epm-alerts-page',
  standalone: true,
  imports: [
    IconComponent, StatusPillComponent, TableSkeletonComponent,
    PageHeadComponent, PagerComponent, SevDotComponent,
  ],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './alerts.page.html',
})
export class AlertsPage {
  private api = inject(AlertsApi);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);
  workspaces = inject(WorkspacesService);
  lookups = inject(LookupsService);
  /** The page-head actions are demo stubs and say so — ToastService.demo(). */
  toast = inject(ToastService);
  fmt = fmt;

  rows = signal<AlertRow[]>([]);
  total = signal(0);
  open = signal(0);
  acknowledged = signal(0);
  bySeverity = signal<Record<string, number>>({});
  openBySeverity = signal<Record<string, number>>({});

  loading = signal(true);
  error = signal<string | null>(null);
  /** Ids currently in flight on EP-ALR-02 — the row's button disables itself. */
  acking = signal<ReadonlySet<number>>(new Set());

  q = signal('');
  severity = signal('');
  status = signal('');
  workspace = signal('');

  page = signal(1);
  pageSize = signal(15);

  /** Column count for the loading skeleton — must match the real table. */
  readonly colCount = 7;

  /**
   * Z2 breadcrumb. الشكلان 48، 49 breadcrumb this screen «جامعة بغداد › …»
   * when it is scoped, not «الوزارة › …» — a filtered register that still
   * calls itself ministry-wide is the one thing a reader cannot recover from.
   * The workspace crumb links back to its overview.
   */
  crumbs = computed<Crumb[]>(() => {
    const ws = this.workspace();
    if (!ws) {
      return [
        { label: this.lang.t('ministry_short') },
        { label: this.lang.t('nav_alerts') },
      ];
    }
    return [
      { label: this.lang.t('ministry_short') },
      { label: this.scopeName(), link: ['/workspace'], query: { ws } },
      { label: this.lang.t('nav_alerts') },
    ];
  });

  /**
   * The identity line. Scoped, it is the ENTITY — the reference does exactly
   * this (enterprise-areas.jsx:33, :85, :130, :183), and it is what stops a
   * filtered register from reading as the whole ministry.
   */
  scopeSub = computed(() => this.workspace() ? this.scopeName() : this.lang.t('alerts_sub'));

  /** The scoped workspace's name, from the list the switcher already loaded. */
  scopeName = computed(() => {
    const ws = this.workspaces.byCode(this.workspace());
    return ws ? this.lang.pick(ws.nameAr, ws.nameEn) : this.workspace();
  });

  isUnfiltered = computed(() => !this.q() && !this.severity() && !this.status());

  /** Severities in the order the addendum lookup lists them — worst first. */
  severities = computed(() => this.lookups.list('alert-severity'));

  sevCount(code: string): number { return this.bySeverity()[code] ?? 0; }
  sevOpen(code: string): number { return this.openBySeverity()[code] ?? 0; }

  /**
   * Severity as a GROUP heading — used by the cards and the filter chips, both
   * of which name a set of alerts. The table cell uses the `alert-severity`
   * lookup instead, which is one alert's severity and takes the singular. The
   * reference makes the same split; see the note in lang.ts.
   */
  sevHeading(code: string): string {
    const key = SEV_HEADING[code];
    return key ? this.lang.t(key) : this.lookups.label('alert-severity', code);
  }

  /**
   * The four cards. The first three are severities; the fourth counts what is
   * still open across all of them, which is the number that decides whether
   * anyone has to do anything today.
   */
  cards = computed<SevCard[]>(() => {
    const ar = this.lang.isAr();
    const total = this.total();
    const share = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
    const tones: Record<string, SevCard['tone']> = { critical: 'crit', warning: 'warn', info: 'info' };
    const icons: Record<string, string> = { critical: 'warning', warning: 'error', info: 'info' };
    const feet: Record<string, (n: number) => string> = {
      critical: n => (ar ? `${n} مفتوحة · تتطلب تدخلاً فورياً` : `${n} open · needs immediate action`),
      warning: n => (ar ? `${n} مفتوحة · تحت المتابعة` : `${n} open · under watch`),
      info: () => (ar ? 'للعلم فقط — لا إجراء مطلوب' : 'Informational — no action'),
    };

    const sevCards = this.severities().map(s => ({
      key: s.code,
      tone: tones[s.code] ?? 'info',
      icon: icons[s.code] ?? 'info',
      // The card has room to spell the top severity out; the chip does not.
      label: s.code === 'critical' ? this.lang.t('sev_critical_card') : this.sevHeading(s.code),
      value: this.sevCount(s.code),
      pct: share(this.sevCount(s.code)),
      foot: (feet[s.code] ?? (() => ''))(this.sevOpen(s.code)),
    } satisfies SevCard));

    return [
      ...sevCards,
      {
        key: 'open',
        tone: 'open',
        icon: 'notifications',
        label: this.lang.t('sev_open'),
        value: this.open(),
        pct: share(this.open()),
        foot: ar
          ? `${this.acknowledged()} مُقَرّة من ${total}`
          : `${this.acknowledged()} acknowledged of ${total}`,
      },
    ];
  });

  /** A card is pressed when its own filter is the one in force. */
  isCardOn(key: string): boolean {
    return key === 'open' ? this.status() === 'open' : this.severity() === key;
  }

  pageRows = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.rows().slice(start, start + this.pageSize());
  });

  resultLabel = computed(() => {
    const n = this.rows().length;
    return this.lang.isAr() ? `${n} نتيجة` : `${n} result${n === 1 ? '' : 's'}`;
  });

  constructor() {
    this.route.queryParamMap.subscribe(p => {
      this.workspace.set(p.get('ws') ?? '');
      this.load();
    });
  }

  load() {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      lookups: this.lookups.ensureLoaded(),
      res: this.api.list({
        q: this.q(),
        severity: this.severity(),
        status: this.status(),
        workspace: this.workspace(),
      }),
    }).subscribe({
      next: ({ res }) => {
        this.rows.set(res.rows);
        this.total.set(res.counts.total);
        this.open.set(res.counts.open);
        this.acknowledged.set(res.counts.acknowledged);
        this.bySeverity.set(res.counts.bySeverity);
        this.openBySeverity.set(res.counts.openBySeverity);
        this.page.set(1);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.message ?? 'request failed');
        this.loading.set(false);
      },
    });
  }

  onSearch(v: string) { this.q.set(v); this.load(); }

  /** Clicking the card that is already applied clears it, per the reference. */
  toggleCard(key: string) {
    if (key === 'open') {
      this.status.set(this.status() === 'open' ? '' : 'open');
    } else {
      this.severity.set(this.severity() === key ? '' : key);
    }
    this.load();
  }

  setSeverity(v: string) { this.severity.set(v); this.load(); }
  setStatus(v: string) { this.status.set(v); this.load(); }

  clearFilters() {
    this.q.set('');
    this.severity.set('');
    this.status.set('');
    this.load();
  }

  setPageSize(n: number) {
    this.pageSize.set(n);
    this.page.set(1);
  }

  isAcking(id: number): boolean { return this.acking().has(id); }

  /**
   * EP-ALR-02. Reloads afterwards rather than patching the row in place: the
   * counts, the cards and — when a status filter is on — the row's own presence
   * in the list all change with it, and re-deriving them client-side would be
   * the second copy of a rule the server already owns.
   */
  toggleAck(row: AlertRow) {
    if (this.isAcking(row.id)) return;
    this.acking.update(s => new Set(s).add(row.id));

    this.api.acknowledge(row.id, row.status !== 'acknowledged').subscribe({
      next: () => {
        this.acking.update(s => { const n = new Set(s); n.delete(row.id); return n; });
        this.load();
      },
      error: e => {
        this.acking.update(s => { const n = new Set(s); n.delete(row.id); return n; });
        this.error.set(e?.message ?? 'request failed');
      },
    });
  }

  /**
   * The project column. An enterprise-wide alert has no project — it says so
   * rather than showing a blank cell, because a blank reads as missing data.
   */
  projectLabel(row: AlertRow): string {
    if (!row.projectId) return this.lang.t('scope_enterprise');
    return this.lang.pick(row.projectNameAr ?? row.projectId, row.projectNameEn ?? row.projectId);
  }
}

/** severity code → the lang.ts key holding its group heading. */
const SEV_HEADING: Record<string, 'sev_critical' | 'sev_warning' | 'sev_info'> = {
  critical: 'sev_critical',
  warning: 'sev_warning',
  info: 'sev_info',
};
