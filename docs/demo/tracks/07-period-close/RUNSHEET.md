# المسار 7 — إغلاق فترة الإنجاز والانتقال للفترة التالية

**Start (proposal):** approval of the period's reading.
**End (proposal):** a closed, comparable period and a new open period.
**Target length:** 2–3 minutes. **Needs:** track 6 approved (reading with evidence). Capacity: **مهندس مقيم**.

## Take 1

| # | Proposal step | Action | Must appear | Hold on camera |
|---|---|---|---|---|
| 1 | اعتماد قراءة الفترة الحالية | (done in track 6) — show «تحديثات الإنجاز» row | the approved row | the row |
| 2 | تثبيت القيم السابقة والحالية والتراكمية | Project → «الإنجاز» → «فترات الإنجاز» | dialog «إغلاق فترة الإنجاز»: «الفترة المفتوحة · الفترة 1 · فُتحت في …», «سجل الفترات المقفلة — لا فترات مقفلة بعد» | the open period |
| 3 | تحقق: اكتمال الأدلة | (enforced on close — see V2) | — | — |
| 4 | إغلاق الفترة | «تاريخ البيانات الجديد» = **the day after the data date shown in the page footer** → «إغلاق الفترة» | the dialog refreshes | — |
| 5 | تحويل الفترة إلى سجل مقفل | reopen «فترات الإنجاز» | «سجل الفترات المقفلة»: «الفترة 1 · أقفلها دائرة المهندس المقيم» with المادي · المالي · CPI · SPI frozen at close | the frozen values |
| 6 | فتح الفترة التالية | — | «الفترة المفتوحة · الفترة 2 · فُتحت في <new data date>» | period 2 |
| 7 | تحديث تاريخ البيانات ومرجع المقارنة | close the dialog | footer «البيانات حتى <new data date>»; SPI and planned % recalculated at the new date | the footer |

## Validation takes

| # | Capacity | Action | Must appear |
|---|---|---|---|
| V1 | مهندس مقيم | «إغلاق الفترة» with no date | the button does nothing until a date is chosen; a date on or before the current data date is refused: «تاريخ البيانات الجديد يجب أن يكون بعد تاريخ البيانات الحالي» |
| V2 | مهندس مقيم | Record only if a reading is still pending: «إغلاق الفترة» | «توجد قراءات إنجاز بانتظار المراجعة — لا يمكن إغلاق الفترة قبل البتّ فيها» |
| V3 | المستخدم المختص في الجامعة | open «فترات الإنجاز» → «إغلاق الفترة» | refused — closing a period belongs to إدارة المشاريع |

## Not in this build — do not claim on camera

- **Locked-period enforcement elsewhere** (٦أ «أي تعديل لاحق يقتضي إجراءً معتمدًا») and the alert
  «محاولة تعديل فترة مقفلة»: no other screen checks whether a period is closed.
- The closed period's own closing date is not stored for a project that had no data date before
  (open gap); the log shows the closer and the frozen values, not a close date.
