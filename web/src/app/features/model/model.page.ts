import {
  Component, ViewEncapsulation, computed, effect, inject, signal, untracked,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconComponent } from '../../core/icon.component';
import { LangService } from '../../core/lang';
import * as fmt from '../../core/format';
import { ModelApi } from './model.api';
import { ModelResponse } from './model.types';
import { ApsViewerComponent } from './aps-viewer.component';
import { SelectComponent, SelectOption } from '../../shared/select.component';

/**
 * SCR-W10 — النموذج ثلاثي الأبعاد · **ملحق الشكل 44**.
 *
 * Autodesk APS renders the derivative linked to each model version. Token
 * exchange stays in the API; this page receives only a URN and the viewer's
 * short-lived, viewables-only token. The Autodesk viewer owns the model
 * hierarchy and selection behavior, matching the PPlus implementation.
 */
@Component({
  selector: 'epm-model-page',
  standalone: true,
  imports: [IconComponent, ApsViewerComponent, SelectComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './model.page.html',
})
export class ModelPage {
  private api = inject(ModelApi);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);
  fmt = fmt;

  projectId = signal('');
  data = signal<ModelResponse | null>(null);

  loading = signal(true);
  error = signal<string | null>(null);

  versionCode = signal<string | null>(null);

  versions = computed(() => this.data()?.versions ?? []);

  current = computed(() => this.versions().find(v => v.isCurrent) ?? null);
  selectedVersion = computed(() =>
    this.versions().find(v => v.code === this.versionCode()) ?? this.current());
  versionOptions = computed<SelectOption[]>(() => this.versions().map(v => ({
    code: v.code,
    label: `${this.versionLabel(v)} · ${this.fmt.date(v.issuedOn)}`,
  })));

  versionLabel(v: { labelAr: string; labelEn: string }): string {
    return this.lang.pick(v.labelAr, v.labelEn);
  }

  constructor() {
    this.route.parent!.paramMap.pipe(takeUntilDestroyed()).subscribe(pm => {
      this.projectId.set(pm.get('id') ?? '');
      this.versionCode.set(null);
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

    this.api.get(pid).subscribe({
      next: model => {
        this.data.set(model);
        this.versionCode.set(model.versions.find(v => v.isCurrent)?.code ?? model.versions[0]?.code ?? null);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.error?.message ?? e?.message ?? 'request failed');
        this.loading.set(false);
      },
    });
  }

  chooseVersion(code: string) {
    this.versionCode.set(code || null);
  }
}
