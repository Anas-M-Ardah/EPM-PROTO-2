import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { NEVER } from 'rxjs';
import { SupplyPage } from './supply.page';
import { SupplyApi } from './supply.api';
import { BoqApi } from '../boq/boq.api';
import { LookupsService } from '../../core/lookups';
import { ToastService } from '../../shared/toast.service';
import { SupplyItemDetailResponse } from './supply.types';

describe('Supply receipt displayed selection', () => {
  it('renders the eligible second beneficiary on opening and submits the displayed default', async () => {
    const recordReceipt = jasmine.createSpy('recordReceipt').and.returnValue(NEVER);
    await TestBed.configureTestingModule({
      imports: [SupplyPage],
      providers: [
        { provide: ActivatedRoute, useValue: { parent: { paramMap: NEVER }, paramMap: NEVER } },
        { provide: Router, useValue: {} },
        { provide: SupplyApi, useValue: { recordReceipt } },
        { provide: BoqApi, useValue: {} },
        { provide: LookupsService, useValue: {} },
        { provide: ToastService, useValue: {} },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(SupplyPage);
    const page = fixture.componentInstance;
    page.detail.set({
      item: { code: 'ITM-007', unit: 'جهاز' },
      beneficiaries: [
        { code: 'tu', nameAr: 'الجامعة التكنولوجية', nameEn: 'Technology', receivedQty: 0 },
        { code: 'ub', nameAr: 'جامعة بغداد', nameEn: 'Baghdad', receivedQty: 5 },
      ],
      remainingFinal: 5,
    } as SupplyItemDetailResponse);
    page.startReceipt('final');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const selects: NodeListOf<HTMLSelectElement> = fixture.nativeElement.querySelectorAll('select');
    const beneficiary = Array.from(selects).find(s => Array.from(s.options).some(o => o.value === 'ub'))!;
    expect(beneficiary.value).toBe('ub');
    expect(beneficiary.selectedOptions[0].textContent).toContain('بغداد');
    page.saveReceipt();
    expect(recordReceipt.calls.mostRecent().args[3].beneficiaryCode).toBe(beneficiary.value);
    expect(recordReceipt.calls.mostRecent().args[3].conformity).toBe(page.lang.t('sup_conform_yes'));
    page.saving.set(false);
    beneficiary.value = 'tu';
    beneficiary.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    page.saveReceipt();
    expect(recordReceipt.calls.mostRecent().args[3].beneficiaryCode).toBe('tu');
    fixture.destroy();
  });
});
