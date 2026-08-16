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
import * as fmt from '../../core/format';
import { RisksApi } from './risks.api';
import { RiskRow, RisksResponse } from './risks.types';

/**
 * SCR-W9 — سجل المخاطر · **ملحق الشكل 43**.
 *
 * ── THE PLATE IS THE WHOLE SPECIFICATION ──────────────────────────────────
 * `01`–`06` never mention risk, so this screen is defined by its own figure:
 * the severity tabs with their counts, the collapsible register with a result
 * counter, one search field over number / description / party, the nine
 * columns, and the footer strip. Nothing has been added to it and nothing
 * dropped — including the rule printed beside the title, which is what the
 * severity column IS.
 *
 * ── SEVERITY IS NOT COMPUTED HERE ─────────────────────────────────────────
 * `Domain/RiskSeverity` bands probability × impact, server-side, and its tests
 * are the plate's own seven rows. A screen that recomputed it could disagree
 * with the rule it prints two lines above the table (CLAUDE.md §3.1).
 */
@Component({
  selector: 'epm-risks-page',
  standalone: true,
  imports: [IconComponent, SectionComponent, TableSkeletonComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './risks.page.html',
})
export class RisksPage {
  private api = inject(RisksApi);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  fmt = fmt;

  projectId = signal('');
  data = signal<RisksResponse | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);

  /** `all` plus one per band — الشكل 43's own tabs. */
  band = signal('all');
  /** «بحث بالرقم أو الوصف أو الجهة». */
  q = signal('');

  readonly colCount = 9;

  rows = computed(() => this.data()?.rows ?? []);
  bands = computed(() => this.data()?.bands ?? []);

  title(r: RiskRow): string { return this.lang.pick(r.titleAr, r.titleEn); }

  categoryLabel(code: string): string { return this.lookups.label('risk-category', code); }
  statusLabel(code: string): string { return this.lookups.label('risk-status', code); }
  bandLabel(code: string): string { return this.lookups.label('risk-level', code); }

  /** 1 · 2 · 3 → منخفض · متوسط · عالي, the same three the product bands onto. */
  levelLabel(level: number): string {
    return this.lookups.label('risk-level', level === 3 ? 'high' : level === 2 ? 'medium' : 'low');
  }

  /**
   * `05 §7.6` — severity is a labelled pill, never a bare colour. High is the
   * one that gets the attention colour; the other two carry their own label and
   * nothing more.
   */
  severityClass(band: string): string {
    return band === 'high' ? 'stalled' : band === 'medium' ? 'suspended' : 'completed';
  }

  statusClass(code: string): string {
    return code === 'mitigating' ? 'ongoing' : code === 'open' ? '' : 'suspended';
  }

  shown = computed(() => {
    const band = this.band();
    const q = this.q().trim().toLowerCase();

    return this.rows().filter(r => {
      if (band !== 'all' && r.severity !== band) return false;
      if (q) {
        const hay = `${r.code} ${r.titleAr} ${r.titleEn} ${r.owner}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  });

  filtered = computed(() => this.band() !== 'all' || !!this.q().trim());

  clearFilters() {
    this.band.set('all');
    this.q.set('');
  }

  /** The footer strip — «المخاطر 7 / 7 · عالية 1 · متوسطة 2». */
  highCount = computed(() => this.bands().find(b => b.band === 'high')?.count ?? 0);
  mediumCount = computed(() => this.bands().find(b => b.band === 'medium')?.count ?? 0);

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
