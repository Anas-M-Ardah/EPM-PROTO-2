# المسار 2 — إنشاء العقود وربطها بالمشروع

**Start (proposal):** issuance of the award (صدور الإحالة).
**End (proposal):** an effective contract ready to receive the BOQ, the schedule and payments.
**Target length:** 3 minutes. **Needs:** the project from track 1.

## Take 1 — the refusals

Capacity: **المستخدم المختص في الجامعة**. Project from track 1 → «العقود» → «إضافة عقد جديد».

| # | Enter | Press | Must appear |
|---|---|---|---|
| V1 | «رمز العقد» = `CNT-0148` (an existing code in جامعة بغداد), any name/component, award `800000`, start `2026-08-30`, finish `2026-08-30`, contractor and executing party filled | «حفظ العقد» | «تعذّر الحفظ. راجع الحقول أدناه.» · «رمز العقد «CNT-0148» مستخدم بالفعل ضمن هذا التشكيل.» · «تاريخ الإنجاز يجب أن يكون بعد تاريخ المباشرة.» |
| V2 | «مبلغ الإحالة» = `0` | «حفظ العقد» | «مبلغ الإحالة يجب أن يكون أكبر من صفر.» |
| V3 | «نسبة الغرامة التأخيرية» = `50` | «حفظ العقد» | the penalty must fall within the legal range 10%–25% |

## Take 2 — create the contract

| # | Proposal step | Enter exactly | Must appear |
|---|---|---|---|
| 1 | فتح وحدة العقود وإضافة عقد | «العقود» → «إضافة عقد جديد» | the form «إضافة عقد جديد» |
| 2 | هوية العقد والمكوّن وحالته | رمز العقد = `DEMO-CNT-01` · المكوّن = `المكوّن المدني` · اسم العقد = `عقد إنشاء مبنى القاعات` · حالة العقد = مستمر | — |
| 3 | المبالغ | الإحالة `800000` · الاحتياط `100000` · الإشراف `50000` · المراقبة `50000` · نسبة الغرامة empty (defaults to 10%) | — |
| 4 | تاريخا المباشرة والإنجاز وبيانات المقاول | المباشرة `2026-01-01` · الإنجاز التعاقدي `2026-12-31` · اسم المقاول `شركة الرافدين للمقاولات` · الجهة المنفّذة `قسم الشؤون الهندسية` | — |
| 5 | تحقق: عدم التكرار، تسلسل التواريخ، موجبية المبالغ | «حفظ العقد» | the contract card opens |
| 6 | اعتماد العقد | — | **Not in this build** — the contract is in force on save. Say so. |
| 7 | احتساب قيمة المشروع من مجموع قيم عقوده | Open the contract card | «القيمة الأصلية» and «القيمة النافذة» **950,000 د.ع**; «تفصيل كلفة العقد»: الإحالة 800,000 · الاحتياط 100,000 · الإشراف والمراقبة 50,000 (+ monitoring 50,000 in the total) |

**Proof to hold:** the card's tabs — نظرة عامة · التفاصيل · الدفعات 0 · الملاحق والتعديلات 0 ·
سجل النشاط 1 — and, on «كل المشاريع», the project's cost column now showing 950,000.

Optional: click «تعديل», change the contractor name, save, and show the «سجل النشاط» entry with
the old value struck through and the new value beside it.

## Write down

- Contract `DEMO-CNT-01`, value 950,000.

## Not in this build

- Projects Administration approval of the contract (step 6).
- The alert «اقتراب انتهاء مدة العقد».
