import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { ProjectFormPage } from './project-form.page';
import { ProjectsApi } from './projects.api';
import { LookupsService } from '../../core/lookups';
import { WorkspacesService } from '../../core/workspaces';
import { PersonaService } from '../../core/persona';
import { ProjectScopeService } from '../../core/project-scope';
import { ToastService } from '../../shared/toast.service';

/**
 * A GUARD, not a feature test. The layout of المسار 1's definition form was
 * reworked visually (12-column grid, width classes) and the runsheets — which
 * are this repo's only e2e — assert on exactly two things a layout change can
 * silently break:
 *
 *   1. every field is present, in the document's order (الشكل 5's six sections);
 *   2. a refusal states WHY, UNDER the control, and MARKS the control
 *      (05 §7.6 — never colour alone).
 *
 * Nothing here asserts a width, a gap or a class name that carries only
 * appearance: those are meant to change. It asserts the contract underneath.
 */

/** الشكل 5's fields, in the order the document lists them. */
const FIELD_ORDER = [
  // 1 — هوية المشروع
  'inf_nameAr', 'inf_nameEn', 'inf_workspace', 'inf_code', 'inf_registrationYear',
  'inf_type', 'inf_executionStage', 'inf_status',
  // 2 — الموقع
  'inf_coordinates', 'inf_region',
  // 3 — التمويل والموازنة
  'inf_fundingType', 'inf_plannedCost', 'inf_expenditureCategory',
  'inf_budgetApprovalNumber', 'inf_priority',
  // 4 — الوصف
  'inf_description',
  // 5 — الجهة
  'inf_workspaceCode', 'inf_beneficiaryCodes', 'inf_branch', 'inf_formation', 'inf_orgStructure',
  // 6 — الاستشاري
  'inf_consultantParty', 'inf_designerParty', 'inf_executor',
] as const;

const SPECIALIST = {
  id: 'p-spec', nameAr: 'المستخدم المختص', nameEn: 'Specialist',
  party: 'الجامعة / التشكيل', roleAr: 'مستخدم مختص', roleEn: 'Specialist',
  isDelegate: false, workspaces: ['ub'], ministryWide: false,
};

async function makeForm() {
  await TestBed.configureTestingModule({
    imports: [ProjectFormPage],
    providers: [
      {
        provide: ActivatedRoute,
        useValue: {
          snapshot: { paramMap: convertToParamMap({}), queryParamMap: convertToParamMap({}) },
        },
      },
      provideRouter([]),
      { provide: ProjectsApi, useValue: {} },
      {
        provide: LookupsService,
        useValue: { ensureLoaded: () => of(undefined), loaded: signal(true), list: () => [] },
      },
      {
        provide: WorkspacesService,
        useValue: { ensureLoaded: () => of(undefined), loaded: signal(true),
          list: signal([]), byCode: () => undefined },
      },
      { provide: PersonaService, useValue: { current: signal(SPECIALIST) } },
      { provide: ProjectScopeService, useValue: { reload: () => of(undefined) } },
      { provide: ToastService, useValue: { show: () => {} } },
    ],
  }).compileComponents();

  const fixture = TestBed.createComponent(ProjectFormPage);
  fixture.detectChanges();
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture;
}

/** The label a field group carries, with the required star and any «مقترح» tag stripped. */
function labelOf(group: Element): string {
  const span = group.querySelector(':scope > span')!;
  const clone = span.cloneNode(true) as Element;
  clone.querySelectorAll('i, .d-proposed').forEach(n => n.remove());
  return (clone.textContent ?? '').replace(/\s+/g, ' ').trim();
}

describe('Project definition form — field inventory and refusal placement', () => {
  it('renders every field of الشكل 5, in the document order', async () => {
    const fixture = await makeForm();
    const page = fixture.componentInstance;

    const groups = Array.from(
      fixture.nativeElement.querySelectorAll('.epm-ws-form .epm-ws-f') as NodeListOf<Element>,
    );

    expect(groups.map(labelOf)).toEqual(FIELD_ORDER.map(k => page.lang.t(k)));
    fixture.destroy();
  });

  it('marks the refused control and states the reason under it, inside the same field', async () => {
    const fixture = await makeForm();
    const page = fixture.componentInstance;

    page.violations.set([{
      field: 'plannedCost',
      messageAr: 'الكلفة المقررة يجب أن تكون أكبر من صفر.',
      messageEn: 'Planned cost must be greater than zero.',
    }]);
    fixture.detectChanges();

    const groups = Array.from(
      fixture.nativeElement.querySelectorAll('.epm-ws-form .epm-ws-f') as NodeListOf<Element>,
    );
    const cost = groups.find(g => labelOf(g) === page.lang.t('inf_plannedCost'))!;
    expect(cost).withContext('the الكلفة المقررة field is still on the form').toBeTruthy();

    // The control is marked — and it is marked IN ADDITION to the message,
    // which is what keeps this off colour alone.
    const control = cost.querySelector('.d-form-input')!;
    expect(control.classList).toContain('epm-invalid');

    // The message is inside the SAME field group and comes AFTER the control,
    // so it reads as a refusal of that field rather than a caption of the next.
    const message = cost.querySelector('small.epm-f-err')!;
    expect(message).withContext('the reason is rendered').toBeTruthy();
    expect(message.textContent).toContain('أكبر من صفر');
    expect(control.compareDocumentPosition(message) & Node.DOCUMENT_POSITION_FOLLOWING)
      .withContext('the message follows the control it refuses').toBeTruthy();

    // And it clears the moment the field is edited.
    page.setNumber('plannedCost', '1000');
    fixture.detectChanges();
    expect(cost.querySelector('small.epm-f-err')).toBeNull();
    fixture.destroy();
  });
});
