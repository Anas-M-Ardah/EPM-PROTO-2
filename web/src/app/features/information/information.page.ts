import { Component, ViewEncapsulation, computed, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable, forkJoin, of } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { FieldGroupComponent } from '../../shared/field-group.component';
import { FieldGridComponent, Field } from '../../shared/field-grid.component';
import { TableSkeletonComponent } from '../../shared/table-skeleton.component';
import { LangService, StrKey } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import * as fmt from '../../core/format';
import { InformationApi } from './information.api';
import {
  InfoField, InfoGroup, InfoProject, ProjectEvent,
  ProjectDefinitionInput, ProjectDefinitionResponse, ProjectViolation,
} from './information.types';

/**
 * SCR-W2 — الشكل 5 «معلومات المشروع — التفاصيل».
 *
 * «بطاقة تعريف المشروع الكاملة، وهي المصدر الوحيد لبياناته التعريفية والمكانية
 * والتمويلية وجهته المستفيدة.»
 *
 * ── THE SCREEN IS THE PROTOTYPE'S, FIELD FOR FIELD ────────────────────────
 * Structure ported from `DModInformation` in the live prototype
 * (infinite-azaiton.github.io/epm · app/project-modules.jsx:280):
 *
 *     Z6   معلومات المشروع                              [تعديل]
 *     Z5   التفاصيل · سجل النشاط ⑥
 *     Z7   six .d-fgroup cards
 *     Z9   [إلغاء] [حفظ التعديلات]          ← edit mode only
 *
 * ── EDITING IS INLINE, ON THIS SCREEN ─────────────────────────────────────
 * «تعديل» flips a flag; each cell swaps its value for a control and the card
 * keeps its sections, its stars and its «مقترح» tags. There is no second route
 * and no second form — the prototype edits in place and so does this.
 *
 * It still writes through the ONE project update endpoint: `EP-PRJ-04` loads
 * the editable definition, `EP-PRJ-03` saves it, `Domain/ProjectDefinition`
 * judges it, and the existing `ProjectActivityEvents` row is what the log then
 * shows. Nothing about the write path is new.
 *
 * ── THE FIELDS ARE THE DOCUMENT'S SIXTEEN ─────────────────────────────────
 * The endpoint decides which they are and which carry a star or a tag; this
 * component only labels them (`inf_*` — a label is chrome) and pairs each with
 * its editable counterpart by KEY. A field the card shows but the definition
 * cannot write is therefore read-only by construction, not by a list kept here.
 *
 * ── NO ARITHMETIC, AND NOTHING DERIVED ────────────────────────────────────
 * Every value on this screen is a stored column.
 */
@Component({
  selector: 'epm-information-page',
  standalone: true,
  imports: [IconComponent, FieldGroupComponent, FieldGridComponent, TableSkeletonComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './information.page.html',
})
export class InformationPage {
  private api = inject(InformationApi);
  private route = inject(ActivatedRoute);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  toast = inject(ToastService);

  project = signal<InfoProject | null>(null);
  groups = signal<InfoGroup[]>([]);
  events = signal<ProjectEvent[]>([]);
  /** Resolved server-side (§23 «المستخدم المختص»); the button never decides. */
  canEdit = signal(false);

  loading = signal(true);
  error = signal<string | null>(null);

  /** الشكل 5's two tabs. */
  tab = signal<'details' | 'activity'>('details');

  // ── edit state ──────────────────────────────────────────────────────────
  editing = signal(false);
  saving = signal(false);
  /** The 422 body. Cleared on every save attempt so stale messages never linger. */
  violations = signal<ProjectViolation[]>([]);
  formError = signal<string | null>(null);

  /**
   * The editable definition, loaded from `EP-PRJ-04` when «تعديل» is pressed
   * and sent back by `EP-PRJ-03`. It carries every column the definition owns —
   * including the ones الشكل 5 does not show — so saving this card cannot blank
   * a field it never displayed.
   */
  private form = signal<ProjectDefinitionInput | null>(null);

  /** What the read card was showing when editing began — Cancel restores it. */
  private snapshot = signal<ProjectDefinitionInput | null>(null);

  /**
   * Each group with its title, its caption and its fields in the shared
   * primitive's shape. One pass, so the template holds no logic.
   */
  sections = computed(() =>
    this.groups().map(g => ({
      id: g.id,
      title: this.lang.t(('inf_group_' + g.id) as StrKey),
      sub: this.lang.t(('inf_group_' + g.id + '_sub') as StrKey),
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

  // ── projection ──────────────────────────────────────────────────────────

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
            : f.kind === 'coords'
              // الشكل 5 prints «33.33°N, 44.33°E» over ONE stored "lat,lon"
              // column. A display format, not a second representation.
              ? fmt.coords(f.value)
              : f.value;

    const options = f.lookupKind
      ? this.lookups.list(f.lookupKind).map(o => ({
          code: o.code,
          label: this.lang.pick(o.nameAr, o.nameEn),
        }))
      : undefined;

    return {
      key: f.key,
      label: this.lang.t(('inf_' + f.key) as StrKey),
      value,
      // The control binds to the STORED value, not the formatted one — the
      // form is what the server will receive.
      raw: this.editValue(f),
      mono: f.kind === 'date' || f.kind === 'money' || f.kind === 'coords'
        || f.key === 'code',
      required: f.required,
      proposed: f.proposed,
      long: f.kind === 'long',
      numeric: f.key === 'registrationYear',
      options,
      error: this.errorFor(f.key),
    };
  }

  /**
   * The raw value the control shows. It comes from the FORM once editing has
   * started, so a keystroke survives the next change-detection pass.
   *
   * `beneficiaryCodes` is the one field whose read value and edit value differ
   * in kind: the card shows resolved NAMES («جامعة بغداد»), the definition
   * stores CODES. Showing the names in the input would save them as codes.
   */
  private editValue(f: InfoField): string | null {
    const form = this.form();
    if (!form) return f.value;
    const v = (form as unknown as Record<string, unknown>)[f.key];
    return v === null || v === undefined ? '' : String(v);
  }

  private errorFor(key: string): string | null {
    const v = this.violations().find(x => x.field === key);
    return v ? this.lang.pick(v.messageAr, v.messageEn) : null;
  }

  // ── load ────────────────────────────────────────────────────────────────

  load(id: string) {
    if (!id) return;
    this.loading.set(true);
    this.error.set(null);
    this.editing.set(false);
    this.form.set(null);
    forkJoin({
      lookups: this.lookups.ensureLoaded(),
      res: this.api.get(id),
    }).subscribe({
      next: ({ res }) => {
        this.project.set(res.project);
        this.groups.set(res.groups);
        this.events.set(res.events);
        this.canEdit.set(res.can.edit);
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.error?.message ?? e?.message ?? 'request failed');
        this.loading.set(false);
      },
    });
  }

  reload() {
    this.load(this.projectId());
  }

  private projectId() {
    return this.route.parent?.snapshot.paramMap.get('id') ?? '';
  }

  // ── «تحرير البيانات» ────────────────────────────────────────────────────

  /**
   * The definition has to be FETCHED before the first edit: the read card
   * carries resolved labels and beneficiary names, not the codes a save needs.
   * `EP-PRJ-04` is the endpoint that already returns exactly that shape.
   */
  edit() {
    if (this.editing()) return;
    const id = this.projectId();
    this.formError.set(null);
    this.violations.set([]);

    // Fetched once. A second «تعديل» in the same visit reuses what is already
    // in hand — the card was re-read after the last save, so it is current.
    const req: Observable<ProjectDefinitionResponse | null> =
      this.form() ? of(null) : this.api.definition(id);

    req.subscribe({
      next: def => {
        if (def) this.form.set(def.definition);
        this.snapshot.set(this.form());
        this.editing.set(true);
      },
      error: e => this.formError.set(
        e?.error?.messageAr ?? e?.message ?? 'request failed'),
    });
  }

  /** One field, without rewriting the object literal twenty times. */
  set(change: { key: string; value: string }) {
    const raw = change.value;
    // سنة الإدراج is the one numeric member of the definition; every other
    // field on الشكل 5 is a string or a code. An empty box is null, not "" —
    // "not recorded" and "recorded as blank" are the same thing to the rule,
    // and null is what the server's own read shape uses.
    const value: string | number | null = change.key === 'registrationYear'
      ? (raw.trim() === '' || Number.isNaN(Number(raw)) ? null : Number(raw))
      : (raw.trim() === '' ? null : raw);

    this.form.update(f => (f
      ? { ...f, [change.key]: value } as ProjectDefinitionInput
      : f));

    // A field the user has just corrected should stop being red immediately —
    // waiting for the next round trip reads as the fix not working.
    if (this.violations().length) {
      this.violations.update(v => v.filter(x => x.field !== change.key));
    }
  }

  save() {
    const form = this.form();
    if (this.saving() || !form) return;

    this.saving.set(true);
    this.violations.set([]);
    this.formError.set(null);

    // [EP-PRJ-03] — the one project update endpoint. Saving الشكل 5 and saving
    // the create form are the same call.
    this.api.save(this.projectId(), form).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.toast.show(this.lang.t('prj_updated'));
        // Re-read rather than patch the card locally: the server re-derives the
        // «مقترح» tags, re-resolves the beneficiary names and appends the
        // activity row, and none of those can be guessed here.
        this.form.set(null);
        this.reload();
      },
      error: e => {
        this.saving.set(false);
        const body = e?.error;
        if (body?.violations?.length) {
          // المسار 1 step 3 came back. Every clause at once, each on its field.
          this.violations.set(body.violations);
          this.formError.set(this.lang.t('prj_fix_errors'));
          this.tab.set('details');
        } else {
          this.formError.set(
            this.lang.pick(body?.messageAr ?? '', body?.messageEn ?? '')
            || body?.message || e?.message || 'request failed');
        }
      },
    });
  }

  /** DISCARDS: the edits live only in `form`, so restoring the snapshot is the discard. */
  cancel() {
    this.form.set(this.snapshot());
    this.violations.set([]);
    this.formError.set(null);
    this.editing.set(false);
  }

  /**
   * الشكل 5's «تعديل» sits on the Details tab only — the prototype passes
   * `actions` to its frame just for that tab, because there is nothing on the
   * activity log to edit.
   */
  showEditButton = computed(() =>
    !this.loading() && !this.error() && this.canEdit()
    && this.tab() === 'details' && !this.editing());

  openTab(t: 'details' | 'activity') {
    // Leaving Details while editing would hide the controls without resolving
    // them, so the tab strip does not steal an unsaved edit.
    if (this.editing()) return;
    this.tab.set(t);
  }

  /** Activity-log verbs. Workflow verbs are chrome, not business value lists (06). */
  actionLabel(action: string): string {
    return action === 'created' ? this.lang.t('prj_act_created') : this.lang.t('prj_act_updated');
  }
}
