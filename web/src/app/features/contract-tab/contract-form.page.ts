import { Component, computed, inject, signal, ViewEncapsulation } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { IconComponent } from '../../core/icon.component';
import { SectionComponent } from '../../shared/section.component';
import { LangService } from '../../core/lang';
import { LookupsService } from '../../core/lookups';
import { PersonaService, canDefineProjects } from '../../core/persona';
import { ToastService } from '../../shared/toast.service';
import { ContractTabApi } from './contract.api';
import { ContractDefinitionInput, ContractEvent, ContractViolation } from './contract.types';
import { PersonaSwitcherComponent } from '../../shared/persona-switcher.component';
import { SelectComponent, SelectOption } from '../../shared/select.component';

/**
 * المسار 2 — إنشاء العقود وربطها بالمشروع.
 *
 * ── ONE COMPONENT, TWO ROUTES ─────────────────────────────────────────────
 * `contract/new` and `contract/:contractId/edit`, the same shape the project
 * form takes for المسار 1. Same five sections over the same seventeen fields,
 * so two components would be two places to add a field to.
 *
 * ── IT IS A MODULE PAGE, NOT AN ENTERPRISE ONE ────────────────────────────
 * A contract belongs to exactly one project («انتماء العقد إلى مشروع واحد»),
 * and المسار 2 step 1 is «فتح وحدة العقود وإضافة عقد» — so this lives INSIDE
 * the project workspace and renders the module frame: `.d-pframe` with its Z6
 * toolbar and `.d-pz7`, which is the only scrolling region in that layout.
 * The project form is the opposite case and sits on the enterprise canvas,
 * because the workspace it belongs to is not a screen you stand inside.
 *
 * ── NO RULES HERE ─────────────────────────────────────────────────────────
 * The four clauses of step 5 are the server's (Domain/ContractDefinition) and
 * the 422 it returns is what paints the field errors. Notably the duplicate
 * check CANNOT be done here: «عدم تكرار رقم العقد داخل التشكيل» spans every
 * project in the entity, which this screen has never loaded.
 */
@Component({
  selector: 'epm-contract-form-page',
  standalone: true,
  imports: [IconComponent, SectionComponent, PersonaSwitcherComponent, SelectComponent],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './contract-form.page.html',
})
export class ContractFormPage {
  private api = inject(ContractTabApi);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  lang = inject(LangService);
  lookups = inject(LookupsService);
  persona = inject(PersonaService);
  toast = inject(ToastService);

  projectId = signal('');
  /** Null while creating; the contract id while editing. The whole mode switch. */
  contractId = signal<string | null>(null);
  isNew = computed(() => this.contractId() === null);

  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);

  violations = signal<ContractViolation[]>([]);
  formError = signal<string | null>(null);
  events = signal<ContractEvent[]>([]);
  tab = signal<'details' | 'activity'>('details');

  form = signal<ContractDefinitionInput>(empty());

  set<K extends keyof ContractDefinitionInput>(key: K, value: ContractDefinitionInput[K]) {
    this.form.update(f => ({ ...f, [key]: value }));
    // A field just corrected should stop being red at once; waiting for the
    // next round trip reads as the fix not having worked.
    if (this.violations().length) {
      this.violations.update(v => v.filter(x => x.field !== key));
    }
  }

  setText<K extends keyof ContractDefinitionInput>(key: K, raw: string) {
    this.set(key, (raw.trim() === '' ? null : raw) as ContractDefinitionInput[K]);
  }

  setNumber(
    key: 'awardAmount' | 'reserveAmount' | 'supervisionAmount' | 'monitoringAmount',
    raw: string,
  ) {
    const n = Number(raw);
    this.set(key, raw.trim() === '' || Number.isNaN(n) ? null : n);
  }

  errorFor(field: string): string | null {
    const v = this.violations().find(x => x.field === field);
    return v ? this.lang.pick(v.messageAr, v.messageEn) : null;
  }

  statuses = computed(() => this.lookups.list('contract-status'));

  /** The same list in `<epm-select>`'s shape — code + the label for this language. */
  statusSelectOptions = computed<SelectOption[]>(() =>
    this.statuses().map(s => ({ code: s.code, label: this.lang.pick(s.nameAr, s.nameEn) })));

  /** §23 — contract entry is the specialist's, the same capacity as المسار 1. */
  canDefine = computed(() => canDefineProjects(this.persona.current()));

  title = computed(() => this.lang.t(this.isNew() ? 'con_new_title' : 'con_edit_title'));

  constructor() {
    // `:id` is on the PARENT route (the project workspace) and the parent
    // OUTLIVES this component, so the subscription must be torn down with it —
    // P-42, measured: without this a destroyed module keeps re-fetching.
    this.route.parent!.paramMap
      .pipe(takeUntilDestroyed())
      .subscribe(pm => {
        this.projectId.set(pm.get('id') ?? '');
        this.contractId.set(this.route.snapshot.paramMap.get('contractId'));
        this.load();
      });
  }

  load() {
    const pid = this.projectId();
    if (!pid) return;

    this.loading.set(true);
    this.error.set(null);
    const cid = this.contractId();

    forkJoin({
      lookups: this.lookups.ensureLoaded(),
      def: cid ? this.api.definition(pid, cid) : of(null),
    }).subscribe({
      next: ({ def }) => {
        if (def) {
          this.form.set(def.definition);
          this.events.set(def.events);
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
    this.saving.set(true);
    this.violations.set([]);
    this.formError.set(null);

    const pid = this.projectId();
    const cid = this.contractId();
    const req = cid
      ? this.api.save(pid, cid, this.form())
      : this.api.create(pid, this.form());

    req.subscribe({
      next: res => {
        this.saving.set(false);
        this.toast.show(this.lang.t(this.isNew() ? 'con_saved' : 'con_updated'));
        // A saved contract is live at once — no approval — so the honest place
        // to land is the contract card it just became.
        this.router.navigate(['/projects', pid, 'contract', res.id], {
          queryParams: this.wsQuery(),
        });
      },
      error: e => {
        this.saving.set(false);
        const body = e?.error;
        if (body?.violations?.length) {
          this.violations.set(body.violations);
          this.formError.set(this.lang.t('con_fix_errors'));
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
    const cid = this.contractId();
    const path = cid
      ? ['/projects', this.projectId(), 'contract', cid]
      : ['/projects', this.projectId(), 'contract'];
    this.router.navigate(path, { queryParams: this.wsQuery() });
  }

  /** `?ws=` rides along so the chrome stays inside the entity you came from. */
  private wsQuery() {
    const ws = this.route.snapshot.queryParamMap.get('ws');
    return ws ? { ws } : {};
  }

  actionLabel(action: string): string {
    return action === 'created' ? this.lang.t('con_act_created') : this.lang.t('con_act_updated');
  }
}

/** A blank contract. One place, so a new field cannot be forgotten here. */
function empty(): ContractDefinitionInput {
  return {
    id: null, nameAr: null, nameEn: null, component: null, status: 'ongoing',
    awardAmount: null, reserveAmount: null, supervisionAmount: null, monitoringAmount: null,
    start: null, finish: null,
    contractor: null, executingParty: null, consultant: null, contactInfo: null,
    incomingNo: null, incomingDate: null,
  };
}
