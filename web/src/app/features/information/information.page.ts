import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { forkJoin } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { SectionComponent } from '../../shared/section.component';
import { FieldGridComponent, Field } from '../../shared/field-grid.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { LangService, StrKey } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import * as fmt from '../../core/format';
import { InformationApi } from './information.api';
import { InfoField, InfoGroup, InfoProject } from './information.types';

/**
 * SCR-W2 — the project workspace Information module (`04 §3`).
 *
 * PORTED from DModInformation (v1.1) —
 * ../epm@design/system-revamp app/project-modules.jsx:280.
 *
 * ── THE LABELS ARE HERE, THE GROUPING IS NOT ──────────────────────────────
 * The server sends a key, a value and which lookup labels it. This component
 * turns the key into a label from `core/lang.ts`, because a field label is UI
 * chrome and every other label in this app comes from there. What it does NOT
 * do is decide which group a field belongs to — that is semantic, it belongs
 * with the data, and the endpoint owns it.
 *
 * The reference assigned groups with a regex over each field's ENGLISH label,
 * which meant the grouping silently did nothing in Arabic. See the endpoint.
 *
 * ── NO ARITHMETIC, AND NOTHING DERIVED ────────────────────────────────────
 * Every value on this screen is a stored column.
 */
@Component({
  selector: 'epm-information-page',
  standalone: true,
  imports: [IconComponent, SectionComponent, FieldGridComponent, TableSkeletonComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './information.page.html',
})
export class InformationPage {
  private api = inject(InformationApi);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);
  lookups = inject(LookupsService);

  project = signal<InfoProject | null>(null);
  groups = signal<InfoGroup[]>([]);

  loading = signal(true);
  error = signal<string | null>(null);

  /**
   * Each group with its label and its fields already turned into the shared
   * primitive's shape. One pass, so the template holds no logic.
   */
  sections = computed(() =>
    this.groups().map(g => ({
      id: g.id,
      title: this.lang.t(('inf_group_' + g.id) as StrKey),
      fields: g.fields.map(f => this.toField(f)),
    })));

  constructor() {
    // The module is a child route, so its :id lives on the PARENT — which
    // outlives this component. takeUntilDestroyed is load-bearing here, not
    // hygiene: without it the subscription survives leaving the module and
    // re-fetches for a component that is gone (P-42).
    this.route.parent?.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe(p => this.load(p.get('id') ?? ''));
  }

  private toField(f: InfoField): Field {
    // A code is labelled through EP-LKP-01, exactly like every other enum in
    // the app. Free text is already readable and passes straight through.
    const value = f.value === null
      ? null
      : f.lookupKind
        ? this.lookups.label(f.lookupKind, f.value)
        : f.kind === 'date'
          ? fmt.date(f.value)
          : f.kind === 'money'
            ? fmt.money(Number(f.value))
            : f.value;

    return {
      label: this.lang.t(('inf_' + f.key) as StrKey),
      value,
      // IDs, codes, money and dates get tabular numerals so they align down
      // the column.
      mono: f.kind === 'date' || f.kind === 'money'
        || f.key === 'id' || f.key === 'code' || f.key === 'workspaceCode',
      // الشكل 5's «مقترح». The server decides which values are suggestions —
      // it is the only side that knows what it derived.
      proposed: f.proposed,
    };
  }

  load(id: string) {
    if (!id) return;
    this.loading.set(true);
    this.error.set(null);
    forkJoin({
      lookups: this.lookups.ensureLoaded(),
      res: this.api.get(id),
    }).subscribe({
      next: ({ res }) => {
        this.project.set(res.project);
        this.groups.set(res.groups);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.error?.message ?? e?.message ?? 'request failed');
        this.loading.set(false);
      },
    });
  }

  reload() {
    this.load(this.route.parent?.snapshot.paramMap.get('id') ?? '');
  }
}
