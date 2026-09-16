# المسار 4 — استيراد الجدول الزمني أو بناؤه داخل النظام

**Start (proposal):** the work programme becomes available.
**End (proposal):** an approved schedule with a reference baseline and computed weights.
**Target length:** 3–4 minutes. **Needs:** contract `DEMO-CNT-01` · the file [`schedule.xer`](schedule.xer).

| Activity | Name | WBS | Baseline | Budgeted cost | Absolute weight |
|---|---|---|---|---|---|
| A10 | حفريات | D.1 أعمال مدنية | 2026-01-05 → 2026-03-31 | 200,000 | 28.57% |
| A20 | هيكل خرساني | D.1 أعمال مدنية | 2026-04-01 → 2026-07-31 | 300,000 | 42.86% |
| A30 | إنهاءات | D.2 إنهاءات | 2026-08-01 → 2026-11-30 | 200,000 | 28.57% |
| M99 | تسليم المبنى (milestone) | D.2 إنهاءات | 2026-12-01 | 0 | 0 |

## Take 1 — import, submit, approve

| # | Proposal step | Capacity | Action | Must appear | Hold on camera |
|---|---|---|---|---|---|
| 1 | فتح وحدة الجدول الزمني | المستخدم المختص في الجامعة | Project → «الجدول الزمني» → `DEMO-CNT-01` | «لا جدول زمني لهذا العقد» | empty state |
| ٢-٣أ | اختيار الصيغة ورفع الملف | same | «استيراد P6» → «الصيغة» = Primavera XER → drop `schedule.xer` | step «تحليل الملف» lists four activities | the format selector |
| 4 | تحديد أساس احتساب الوزن | same | «أساس احتساب وزن هيكل التجزئة» = الكلفة المدرجة | — | the basis selector |
| 5 | تحليل الملف والتحقق ثم تحليل الأثر | same | «التالي» until «تحليل الأثر» | مضافة 4 · تحرّك 0 · غائبة 0; «نهاية الجدول الوارد 2026-12-01»; rows A10…M99 «مضاف» | the impact table |
| 6 | احتساب الأوزان وتحديد المسار الحرج | — | (shown after approval) | see step 8 | — |
| 7 | مراجعة الجدول واعتماده | المستخدم المختص → «تقديم للاعتماد»; then **مهندس مقيم** | Specialist submits; page shows «استُورد الجدول الزمني وينتظر الاعتماد» with no approve button. Switch to مهندس مقيم → «اعتماد الإصدار» | toast; the baseline label changes | both capacities' view of the bar |
| 8 | تثبيت خط الأساس وحفظ الإصدار | مهندس مقيم | — | «خط الأساس: جدول منقّح — الإصدار 1»; Gantt; WBS D 100.0% · D.1 71.4% · D.2 28.6%; «الأنشطة 3» | the relative / absolute weight columns |

## Validation takes

| # | Capacity | Action | Must appear |
|---|---|---|---|
| V1 | المستخدم المختص في الجامعة | Try to approve its own submitted version (no button is offered) | the bar explains that approval belongs to دائرة المهندس المقيم or مدير المشروع |

## Not in this build — do not claim on camera

- **Building the WBS and activities inside the system** (branch ٢-٣ب): only file import exists.
- **Critical path:** float is not computed on import, so «حرجة 0» and «أدنى عوم كلي 0 يوم» show for
  every schedule. Do not narrate the critical path from this screen. (Open gap; it also blocks time
  extensions in track 9.)
- The alerts «لا يوجد جدول معتمد» and «اقتراب معلم رئيسي» are evaluated from the project's alerts
  page (track 13), not on this screen.
