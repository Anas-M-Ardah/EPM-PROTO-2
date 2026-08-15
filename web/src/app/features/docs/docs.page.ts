import {
  Component, ViewEncapsulation, computed, effect, inject, signal, untracked,
} from '@angular/core';
import { IconComponent } from '../../core/icon.component';
import { SectionComponent } from '../../shared/section.component';
import { LangService } from '../../core/lang';
import { DocsApi } from './docs.api';
import { RuleRow, RulesResponse } from './docs.types';

/**
 * The rules reference — `/docs`, over `EP-DOCS-01`.
 *
 * ── DOCUMENTATION THAT CANNOT GO STALE ────────────────────────────────────
 * Every rule shows four things side by side: what the spec SAYS, the worked
 * example's INPUTS, what the spec says the answer IS, and what the real Domain
 * function RETURNED — executed on this request, never cached. If a rule changes
 * and its spec text does not, the two disagree on this page, in public, on
 * every load. That is the whole reason the page exists.
 *
 * ── THE PAGE JUDGES NOTHING ───────────────────────────────────────────────
 * `expect` is prose from `02-BUSINESS-RULES.md` and `result` is a JSON value;
 * no code can compare them, and none pretends to. There is no green tick here —
 * a tick this page computed would be the one claim on it that nothing checks.
 * The reader compares them, which is what a reference is for.
 *
 * ── IT READS NO TABLE ─────────────────────────────────────────────────────
 * The rules are code (`Domain/RuleCatalog.cs`), so this screen works on an
 * empty database. It is the one page that says what the system knows how to
 * compute rather than what it currently holds.
 */
@Component({
  selector: 'epm-docs-page',
  standalone: true,
  imports: [IconComponent, SectionComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './docs.page.html',
})
export class DocsPage {
  private api = inject(DocsApi);
  lang = inject(LangService);

  data = signal<RulesResponse | null>(null);
  loading = signal(true);
  error = signal<string | null>(null);

  q = signal('');
  /** `02` · `03` · `07` — the document a rule's section belongs to. */
  doc = signal('all');
  /** The open rule. One at a time: this is a reference, not a dashboard. */
  open = signal<string | null>(null);

  rules = computed(() => this.data()?.rules ?? []);

  /** «02» from «02.5», «07» from «07 §24». */
  docOf(section: string): string { return section.split(/[.\s]/)[0]; }

  docs = computed(() => {
    const seen = new Map<string, number>();
    for (const r of this.rules()) {
      const d = this.docOf(r.section);
      seen.set(d, (seen.get(d) ?? 0) + 1);
    }
    return [{ code: 'all', count: this.rules().length },
      ...[...seen].map(([code, count]) => ({ code, count }))];
  });

  docLabel(code: string): string {
    return code === 'all' ? this.lang.t('doc_r_all')
      : code === '02' ? this.lang.t('doc_r_d02')
      : code === '03' ? this.lang.t('doc_r_d03')
      : this.lang.t('doc_r_d07');
  }

  shown = computed(() => {
    const d = this.doc();
    const q = this.q().trim().toLowerCase();
    return this.rules().filter(r => {
      if (d !== 'all' && this.docOf(r.section) !== d) return false;
      if (q) {
        const hay = `${r.id} ${r.br} ${r.section} ${r.title} ${r.spec} ${r.source}`;
        if (!hay.toLowerCase().includes(q)) return false;
      }
      return true;
    });
  });

  filtered = computed(() => this.doc() !== 'all' || !!this.q().trim());

  clearFilters() {
    this.doc.set('all');
    this.q.set('');
  }

  toggle(id: string) { this.open.update(v => (v === id ? null : id)); }

  onCardKey(e: KeyboardEvent, id: string) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      this.toggle(id);
    }
  }

  /**
   * The example and the result are shapes the rule chose — a list of weights,
   * a split, a set of stages. Rendering them as formatted JSON keeps them
   * readable without this page having to know fifteen different shapes, and
   * without it quietly reformatting a figure the domain returned.
   */
  json(v: unknown): string { return JSON.stringify(v, null, 2); }

  /** A GitHub-less repo: the link is the PATH, which is what a reader greps. */
  sourcePath(r: RuleRow): string { return `api/Epm.Api/${r.source}`; }

  constructor() {
    effect(() => untracked(() => this.load()));
  }

  load() {
    this.loading.set(true);
    this.error.set(null);

    this.api.list().subscribe({
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
