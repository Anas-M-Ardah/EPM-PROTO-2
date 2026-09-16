# المسار 3 — رفع جدول الكميات ومراجعته

**Start (proposal):** the contractual BOQ becomes available.
**End (proposal):** an approved BOQ version linked to the contract.
**Target length:** 4 minutes. **Needs:** contract `DEMO-CNT-01` from track 2 · the file [`boq.csv`](boq.csv).

| Line | Description | Unit | Qty | Rate | Amount | Weight |
|---|---|---|---|---|---|---|
| D-01 | أعمال حفريات | m3 | 100 | 2,000 | 200,000 | 28.57% |
| D-02 | خرسانة مسلحة | m3 | 50 | 6,000 | 300,000 | 42.86% |
| D-03 | لبخ وإنهاءات | m2 | 200 | 1,000 | 200,000 | 28.57% |
| | | | | | **700,000** | **100.00%** |

## Take 1 — import, submit, approve

| # | Proposal step | Capacity | Action | Must appear | Hold on camera |
|---|---|---|---|---|---|
| 1 | اختيار العقد في وحدة جدول الكميات | المستخدم المختص في الجامعة | Project → «جدول الكميات» → contract `DEMO-CNT-01` | «لا بنود كميات لهذا العقد» | the empty register |
| ٢-٣أ | رفع الملف ومطابقة الأعمدة | same | «استيراد» → choose `boq.csv` | Step «تحليل Excel»: الرمز/الوصف/القسم/الوحدة/الكمية/سعر الوحدة already mapped; three rows previewed | the mapping |
| 4 | تحليل الملف والتحقق ثم المقارنة | same | «التالي» | «التحقق»: «لا ملاحظات على الملف»; «التالي» → «المقارنة»: مضاف 3 · معدل 0 · محذوف 0 · 0 → 700,000 | the comparison |
| 5 | صحة القيم ومجموع الأوزان | same | (validation is step 4's result) | — | — |
| 6 | تقديم النسخة للاعتماد — لا استبدال | same | «التالي» → «تأكيد وربط» shows «يُقدَّم للاعتماد ولا يُستبدل الجدول السابق — يُحفَظ كإصدار.» → «تقديم للاعتماد» | «قُدِّمت النسخة للاعتماد · إصدار رقم 1 · 3 صفوف · 700,000»; after «إغلاق» the bar «بانتظار الاعتماد — 1» above the still-empty register, with the note that this capacity may not approve | the pending bar with no approve button |
| 7 | اعتماد الإصدار الجديد | **مهندس مقيم** | Switch capacity; the same page | The pending bar now carries «اعتماد» — **on the empty register** (fixed 2026-09-14, P-267). Press it. | the button, then the toast |
| 8 | حفظ الإصدار وتحديث الأوزان والقيمة المرجعية | same | — | «السجل 3»; D-01 28.57 · D-02 42.86 · D-03 28.57; «الإجمالي 700,000 · 100.00»; «قيمة العقد 700,000»; every line «غير مخصص» | the weights column and total |

## Take 2 — the manual-entry branch (٢-٣ب), optional

Capacity **المستخدم المختص في الجامعة** → «إدخال يدوي». Enter description `بند تجريبي`, unit `m2`,
quantity `0`, rate `100` → the save is refused: «الكمية وسعر الوحدة يجب أن يكونا أكبر من صفر».
Cancel; do not save a real manual line, or the weights above change.

## Validation takes

| # | Capacity | Action | Must appear |
|---|---|---|---|
| V1 | المستخدم المختص في الجامعة | On the pending bar before step 7 | no «اعتماد» button — separation of duties |
| V2 | مهندس مقيم | After step 7, nothing left to approve | the bar is gone; importing the same file again creates version 2 for approval, never overwriting version 1 |

## Not in this build

- The alerts «مشروع بلا جدول كميات معتمد» and «بنود غير مسعّرة».
