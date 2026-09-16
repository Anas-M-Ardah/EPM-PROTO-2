# المسار 8 — إنشاء المستخلص وتدقيقه واعتماده

**Start (proposal):** submission of the payment certificate (المستخلص) and work-measurement sheets (ذرعات الأعمال).
**End (proposal):** a certificate approved and disbursed ahead of the statutory deadline.
**Target length:** 5 minutes. **Needs:** contract `DEMO-CNT-01` (950,000; planned project cost 1,000,000) · the file [`measurement.pdf`](measurement.pdf).

Desks, in order: **دائرة المهندس المقيم** (7 days) → **الدائرة المالية** (7 days) → **الصرف / قسم الحسابات** (5 days).

## Take 1 — the refusals (nothing is registered)

Capacity **مهندس مقيم** → project → «الموقف المالي» → tab «الدفعات» → «تسجيل دفعة».

| # | Wizard entry | Must appear |
|---|---|---|
| V1 | Step 2: «المبلغ الإجمالي» `5000000`, «الإحالة» `5000000`; letter + measurement sheet filled; «تسجيل» | **Refused (fixed 2026-09-14, P-265):** «مجموع مستخلصات العقد يتجاوز قيمته النافذة — 5,000,000 مقابل 950,000 د.ع، بزيادة 4,050,000.» |
| V2 | Step 2: gross `100000`, «الإحالة» `90000` | the unallocated remainder shows 10,000 and the wizard will not continue; the server message is «توزيع المبلغ على بنود الكلفة لا يساوي صافي الدفعة.» |
| V3 | Step 4 with no file | «أرفق ذرعة الأعمال المنجزة — لا تُسجَّل دفعة بلا سند إنجاز.» — the step cannot be left |
| V4 | As **المستخدم المختص في الجامعة**, open «الدفعات» | no «تسجيل دفعة»; the page explains that raising a certificate belongs to دائرة المهندس المقيم or مدير المشروع |

## Take 2 — register and walk the desks

| # | Proposal step | Capacity | Action | Must appear | Hold on camera |
|---|---|---|---|---|---|
| 1 | اختيار العقود المشمولة بالدفعة | مهندس مقيم | «تسجيل دفعة» → step 1 → `DEMO-CNT-01` | the contract with its revised value | — |
| 2 | توزيع المبلغ على الإحالة والاحتياط والإشراف | same | step 2: النوع = مرحلية · الإجمالي `100000` · الإحالة `100000` | «الصافي 100,000»; «غير موزع 0» | the split |
| 3 | كتاب المالية وذرعات الأعمال | same | step 3: رقم كتاب المالية `DEMO-FL-01` · التاريخ = the project's data date · step 4: attach `measurement.pdf` | the file listed | the file row |
| 4 | تحقق: الصرف ≤ التخصيص والتراكمي ≤ الكلفة المعدلة | same | step 5 «المراجعة» → «تسجيل» | the certificate «قيد التدقيق · 100,000» in «سجل الدفعات» | the register row |
| 5 | تدقيق المهندس المقيم — سقف 7 أيام | same | tab «مهل التدقيق» → the route card **whose header reads `DEMO-FL-01`** → «إطلاق المعاملة» | desk 1 done; desk 2 «الدائرة المالية» now holding, «السقف 7 أيام · 0 يوم مضت» | the route card |
| 6 | هل تجاوزت المرحلة سقفها الزمني؟ | — | point at «السقف» and «يوم مضت» on the card | elapsed vs cap per desk | the deadline bar |
| 7 | تدقيق الدائرة المالية — سقف 7 أيام | **محللة موازنة (الدائرة المالية)** | same card → «إطلاق المعاملة» | desk 3 «الصرف» holding; status «مصادق» | — |
| 8 | تسجيل الدفعة واعتمادها | same | same card → «إطلاق المعاملة» | status «مصروفة» | — |
| 9 | تحديث المصروف السنوي والتراكمي ونسبة الصرف | same | tab «جدول الكلف» and the strip above it | «المصروف 100,000»; «نسبة الصرف» ≈ 10.5% of 950,000; the award component's spent column 100,000 | the spent figures |

## Validation takes on the route

| # | Capacity | Action | Must appear |
|---|---|---|---|
| V5 | مهندس مقيم | after step 5, try the finance desk | no button — the desk belongs to الدائرة المالية (server: «إطلاق المعاملة من مرحلة «الدائرة المالية» يخصّ تلك الجهة وحدها.») |
| V6 | الدائرة المالية | before step 5, try to release desk 2 | «هذه المرحلة لا تحمل المعاملة الآن — لا يمكن إطلاقها.» |

> Make sure you press «إطلاق المعاملة» on the card for **your** certificate — the desk view lists every
> certificate on the project.

## Not in this build — do not claim on camera

- **Automatic escalation** when a desk passes its cap (٦أ): the cap and elapsed days are shown, but
  nothing is escalated.
- One certificate covers **one contract**; the proposal's multi-contract certificate is not supported.
- The project-level ceilings use the revised cost, else the planned cost, and the annual allocation
  only when finance has entered one (P-265).
