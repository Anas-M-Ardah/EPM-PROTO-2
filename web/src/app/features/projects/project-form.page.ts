import { Component, computed, inject, signal, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { IconComponent } from '../../core/icon.component';
import { PageHeadComponent, Crumb } from '../../shared/page-head.component';
import { SectionComponent } from '../../shared/section.component';
import { SelectComponent, SelectOption } from '../../shared/select.component';
import { PersonaSwitcherComponent } from '../../shared/persona-switcher.component';
import { LangService } from '../../core/lang';
import { LookupsService, LookupItem } from '../../core/lookups';
import { WorkspacesService } from '../../core/workspaces';
import { PersonaService, canDefineProjects } from '../../core/persona';
import { ProjectScopeService } from '../../core/project-scope';
import { ToastService } from '../../shared/toast.service';
import { ProjectsApi } from './projects.api';
import {
  ProjectDefinitionInput,
  ProjectEvent,
  ProjectSuggestion,
  ProjectViolation,
} from './projects.types';

/**
 * المسار 1 — تعريف المشروع وربطه بالجامعة. The definition card of الشكل 5.
 *
 * ── CREATE ONLY, SINCE الشكل 5 GAINED ITS OWN EDITOR ──────────────────────
 * `/projects/new?ws=ub` is the only route that reaches this component. Editing
 * an existing project happens IN PLACE on الشكل 5 (features/information), the
 * way the prototype does it, so there is no `/projects/:id/edit` any more.
 *
 * The `isNew()` branches below are kept because both screens still post the
 * SAME `ProjectDefinitionInput` to the SAME endpoints — `EP-PRJ-02` here,
 * `EP-PRJ-03` there — and a create that could not reuse the edit shape would be
 * the start of two definitions of one record.
 *
 * ── THE SIX SECTIONS ARE THE DOCUMENT'S ───────────────────────────────────
 * الشكل 5: «ستة أقسام قابلة للطي (هوية المشروع · الموقع · التمويل والموازنة ·
 * الوصف · الجهة · الاستشاري)؛ نجمة على الحقول الإلزامية؛ وسم «مقترح» على القيم
 * التي يقترحها النظام». All three of those are rendered, in that order, by
 * `<epm-section collapsible>` — a primitive that already existed.
 *
 * ── STYLING ───────────────────────────────────────────────────────────────
 * No component CSS. `.d-form-input`, `.epm-ws-f`, `.epm-ws-f2` are the classes
 * the workspace-create drawer already uses (entities.page.html) — this is the
 * app's one form vocabulary and it is reused verbatim.
 *
 * ── NO ARITHMETIC, NO RULES ───────────────────────────────────────────────
 * Completeness is judged by the SERVER (Domain/ProjectDefinition) and the 422
 * it returns is what paints the field errors below. The form does not
 * re-implement the four clauses — a second copy is a second thing to get out
 * of step with the documents.
 */
@Component({
  selector: 'epm-project-form-page',
  standalone: true,
  imports: [IconComponent, PageHeadComponent, SectionComponent, SelectComponent,
    PersonaSwitcherComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './project-form.page.html',
})
export class ProjectFormPage {
  private api = inject(ProjectsApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  workspaces = inject(WorkspacesService);
  persona = inject(PersonaService);
  scope = inject(ProjectScopeService);
  toast = inject(ToastService);

  /** Null while creating; the project id while editing. The whole mode switch. */
  id = signal<string | null>(null);
  isNew = computed(() => this.id() === null);

  /** Scope. On create it comes from `?ws=`; on edit the server states it. */
  workspace = signal('');

  /**
   * True when the workspace arrived WITH the route. Then it is context, not a
   * choice, and the form shows it in the breadcrumb rather than asking again.
   * False on `/projects/new` with no `?ws=` — reached from the ministry-wide
   * register — and there the form has to ask (P-147).
   */
  scopedWorkspace = signal(false);

  /**
   * The workspaces this capacity may open (BR-15). Offering one the server
   * would refuse turns a 403 into the user's problem.
   */
  /**
   * «يُحفظ المشروع ضمن مساحة العمل الحالية» is only true when there IS a
   * current one. Reached from the ministry-wide register there is not, and the
   * form asks instead — so the identity line must not claim otherwise.
   */
  subLine = computed(() => {
    if (!this.isNew()) return "";
    return this.scopedWorkspace() ? this.lang.t("prj_new_sub") : this.lang.t("prj_new_sub_pick");
  });

  workspaceOptions = computed<SelectOption[]>(() =>
    this.workspaces.list().map(w => ({ code: w.code, label: this.lang.pick(w.nameAr, w.nameEn) })));

  loading = signal(true);
  saving = signal(false);
  /** A load failure — distinct from a validation failure, which is `violations`. */
  error = signal<string | null>(null);

  /** The 422 body. Cleared on every save attempt so stale messages never linger. */
  violations = signal<ProjectViolation[]>([]);
  formError = signal<string | null>(null);

  suggestions = signal<ProjectSuggestion[]>([]);
  events = signal<ProjectEvent[]>([]);

  /** الشكل 5's two tabs. Only meaningful on edit — a new project has no history. */
  tab = signal<'details' | 'activity'>('details');

  /**
   * THE FORM STATE. One signal holding the whole definition rather than twenty
   * signals: it is what the api sends, what the server returns, and what the
   * violations point into, so keeping it in one shape means no mapping layer
   * in either direction.
   */
  form = signal<ProjectDefinitionInput>(empty());

  /** Bind one field without rewriting the object literal twenty times. */
  set<K extends keyof ProjectDefinitionInput>(key: K, value: ProjectDefinitionInput[K]) {
    this.form.update(f => ({ ...f, [key]: value }));
    // A field the user has just corrected should stop being red immediately —
    // waiting for the next round trip to clear it reads as the fix not working.
    if (this.violations().length) {
      this.violations.update(v => v.filter(x => x.field !== key));
    }
  }

  /** Text inputs go through here so an empty box is null, not "". */
  setText<K extends keyof ProjectDefinitionInput>(key: K, raw: string) {
    this.set(key, (raw.trim() === '' ? null : raw) as ProjectDefinitionInput[K]);
  }

  setNumber(key: 'registrationYear' | 'plannedCost', raw: string) {
    const n = Number(raw);
    this.set(key, raw.trim() === '' || Number.isNaN(n) ? null : n);
  }

  /**
   * The message for one field, or null. Drives both the invalid border and the
   * note beneath it.
   *
   * Takes a plain string, not `keyof ProjectDefinitionInput`: `workspaceCode`
   * is a violation the server can return and is NOT a member of the definition
   * — it rides on the create request, because the workspace is the context the
   * screen was opened in rather than a field anyone types.
   */
  errorFor(field: string): string | null {
    const v = this.violations().find(x => x.field === field);
    if (!v) return null;
    return this.lang.pick(v.messageAr, v.messageEn);
  }

  /** الشكل 5 — «وسم مقترح على القيم التي يقترحها النظام». */
  isSuggested(field: string): boolean {
    return this.suggestions().some(s => s.field === field);
  }

  /**
   * A lookup row as the shared dropdown wants it. `<epm-select>` takes
   * `{code,label}` and knows nothing about lookups or languages, which is what
   * lets the contract card and any register filter use the same control.
   */
  opt(rows: LookupItem[]): SelectOption[] {
    return rows.map(r => ({ code: r.code, label: this.lang.pick(r.nameAr, r.nameEn) }));
  }

  // ── lookups the selects are fed from (06, via EP-LKP-01) ────────────────
  types = computed(() => this.lookups.list('project-type'));
  stages = computed(() => this.lookups.list('execution-stage'));
  statuses = computed(() => this.lookups.list('project-status'));
  fundingTypes = computed(() => this.lookups.list('funding-type'));
  expenditureCategories = computed(() => this.lookups.list('expenditure-category'));
  // الشكل 5 renders both of these as value lists, so they are lookups like the
  // five above and not the free text they used to be.
  priorities = computed(() => this.lookups.list('priority'));
  regions = computed(() => this.lookups.list('region'));

  /**
   * §23 gives project definition to «المستخدم المختص». The server decides and
   * refuses; this only keeps the screen honest about it rather than letting
   * someone fill twenty fields and be told no at the end.
   */
  canDefine = computed(() => canDefineProjects(this.persona.current()));

  scopeName = computed(() => {
    const ws = this.workspaces.byCode(this.workspace());
    return ws ? this.lang.pick(ws.nameAr, ws.nameEn) : this.workspace();
  });

  /**
   * DERIVED, NOT ASKED FOR A SECOND TIME (§3.5). A project's beneficiary is its
   * own workspace unless someone says otherwise, so choosing «جامعة بغداد» above
   * should not be followed by typing it again below — that is data entry the
   * screen already has the answer to.
   *
   * It stays EDITABLE because a project may benefit more than the unit that owns
   * it, which is why the field is `beneficiaryCodes` and not `beneficiaryCode`.
   * So the seed only fires while the field is empty or still carries the previous
   * workspace's code: a deliberate edit is never overwritten.
   */
  private seedBeneficiary(next: string, previous: string) {
    const current = (this.form().beneficiaryCodes ?? '').trim();
    if (current !== '' && current !== previous) return;
    this.set('beneficiaryCodes', next === '' ? null : next);
  }

  setWorkspace(code: string) {
    const previous = this.workspace();
    this.workspace.set(code);
    this.seedBeneficiary(code, previous);
  }

  title = computed(() => this.lang.t(this.isNew() ? 'prj_new_title' : 'prj_edit_title'));

  crumbs = computed<Crumb[]>(() => {
    const ws = this.workspace();
    const trail: Crumb[] = [{ label: this.lang.t('ministry_short') }];
    if (ws) trail.push({ label: this.scopeName(), link: ['/workspace'], query: { ws } });
    trail.push({ label: this.lang.t('nav_projects'), link: ['/projects'], query: ws ? { ws } : {} });
    trail.push({ label: this.title() });
    return trail;
  });

  constructor() {
    // `:id` is absent on /projects/new and present on /projects/:id/edit, so
    // one subscription resolves the mode.
    const id = this.route.snapshot.paramMap.get('id');
    this.id.set(id);
    const fromRoute = this.route.snapshot.queryParamMap.get('ws') ?? '';
    // Opened already scoped (الشكل 3 is «مساحة العمل › المشاريع»), so the
    // beneficiary is known before the form is painted.
    this.setWorkspace(fromRoute);
    this.scopedWorkspace.set(fromRoute !== '');
    this.load();
  }

  load() {
    this.loading.set(true);
    this.error.set(null);

    const id = this.id();

    forkJoin({
      lookups: this.lookups.ensureLoaded(),
      workspaces: this.workspaces.ensureLoaded(),
      // Waiting for lookups means every select carries its labels on first
      // paint instead of showing raw codes for a frame.
      def: id ? this.api.definition(id) : of(null),
    }).subscribe({
      next: ({ def }) => {
        if (def) {
          this.form.set(def.definition);
          this.suggestions.set(def.suggestions);
          this.events.set(def.events);
          this.workspace.set(def.workspaceCode);
        this.scopedWorkspace.set(true);      // editing: the server stated it
        }
        this.loading.set(false);
      },
      error: e => {
        this.error.set(e?.error?.messageAr ?? e?.message ?? 'request failed');
        this.loading.set(false);
      },
    });
  }

  submit() {
    if (this.saving()) return;

    // Creating needs a workspace, and the enterprise register has none — the
    // documents put this screen at «مساحة العمل › المشاريع» (الشكل 3), so
    // there is always one when the flow is walked properly. Caught here rather
    // than 400-ing so the message names the fix.
    if (this.isNew() && !this.workspace()) {
      this.formError.set(this.lang.t('prj_no_workspace'));
      return;
    }

    this.saving.set(true);
    this.violations.set([]);
    this.formError.set(null);

    const id = this.id();
    const req = id
      ? this.api.save(id, this.form())
      : this.api.create({ workspaceCode: this.workspace(), definition: this.form() });

    req.subscribe({
      next: res => {
        this.saving.set(false);
        this.toast.show(this.lang.t(this.isNew() ? 'prj_saved' : 'prj_updated'));
        // The shell reads the project's name and its تشكيل from this list, and
        // it was loaded before the row existed. Refetch before navigating, or
        // the new project's own header shows its id and no workspace crumb.
        this.scope.reload().subscribe();
        // A saved project is live immediately — there is no draft and no
        // review — so the honest place to land is the project itself.
        this.router.navigate(['/projects', res.id, 'information'], {
          queryParams: this.workspace() ? { ws: this.workspace() } : {},
        });
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
            this.lang.pick(body?.messageAr ?? '', body?.messageEn ?? '') ||
            body?.message || e?.message || 'request failed');
        }
      },
    });
  }

  cancel() {
    const id = this.id();
    const q = this.workspace() ? { ws: this.workspace() } : {};
    if (id) this.router.navigate(['/projects', id, 'information'], { queryParams: q });
    else this.router.navigate(['/projects'], { queryParams: q });
  }

  /** Activity-log verbs. Workflow verbs are chrome, not business value lists (06). */
  actionLabel(action: string): string {
    return action === 'created' ? this.lang.t('prj_act_created') : this.lang.t('prj_act_updated');
  }
}

/** A blank definition. One place, so a new field cannot be forgotten here. */
function empty(): ProjectDefinitionInput {
  return {
    nameAr: null, nameEn: null, code: null, type: null, registrationYear: null,
    executionStage: null, status: null,
    coordinates: null, region: null,
    fundingType: null, priority: null, expenditureCategory: null,
    budgetApprovalNumber: null, plannedCost: null,
    description: null,
    formation: null, beneficiaryCodes: null, orgStructure: null, branch: null,
    consultantParty: null, designerParty: null, executor: null,
  };
}
