# المسار 5 — ربط بنود الكميات بالأنشطة

**Start (proposal):** an approved BOQ and an approved schedule are both available.
**End (proposal):** full coverage that allows progress and earned value to be derived.
**Target length:** 3 minutes. **Needs:** tracks 3 and 4. Capacity throughout: **المستخدم المختص في الجامعة**.

| Line | Link to | Share | Why |
|---|---|---|---|
| D-01 حفريات | A10 | 100% | one activity delivers the line |
| D-02 خرسانة مسلحة | A10 + A20 | 40% + 60% | the rule's computed split, then a manual override and reset |
| D-03 لبخ وإنهاءات | — (A30 at the end) | — | left unassigned first, to show the flag |

## Take 1

| # | Proposal step | Action | Must appear | Hold on camera |
|---|---|---|---|---|
| 1 | فتح تبويب الربط بالأنشطة | «جدول الكميات» → `DEMO-CNT-01` → tab «الربط بالأنشطة» | counters «الكل 3 · مخصص بالكامل 0 · مخصص جزئياً 0 · تخصيص زائد 0 · غير مخصص 3»; the note «الحصة المحسوبة = وزن النشاط المطلق ÷ مجموع أوزان الأنشطة المرتبطة…» | the counters |
| 2 | اختيار البند وربط الأنشطة المؤثرة فيه | Select D-01 → «إضافة نشاط» | the picker lists A10 28.57% · A20 42.86% · A30 28.57% — the milestone M99 is **not** offered | the picker |
| 2 (cont.) | | pick A10 → «حفظ» | D-01 chip «مخصص بالكامل» | the chip |
| 3 | احتساب حصة كل نشاط من وزنه المطلق | Select D-02 → add A10, add A20 → «توزيع» | shares 40.0 / 60.0 (28.57 ÷ 71.43 and 42.86 ÷ 71.43). If the boxes do not change, type 40 and 60 | the two share boxes and «المجموع 100.0%» |
| ٤-٤أ | تعديل الحصة يدويًا مع حفظ الأثر | change to 50 / 50 → «حفظ» | D-02 «مخصص بالكامل»; the line is marked as a manual override | the override marker |
| ٤-٤أ (reset) | | «استعادة» (reset to computed) | shares back to 40 / 60, links kept | the restored shares |
| 5 | تقييم حالة التغطية لكل بند | back to the counters | «مخصص بالكامل 2 · غير مخصص 1» | counters |
| ٥أ | إبراز البنود غير المخصصة أو المتجاوزة | — | D-03 «غير مخصص» (and on the «السجل» tab the «حالة التخصيص» column) | the flag |
| 6 | تغطية مكتملة — جاهزة لاحتساب الإنجاز | Select D-03 → add A30 → «حفظ» | «مخصص بالكامل 3 · غير مخصص 0» | full coverage |

## Validation takes

| # | Action | Must appear |
|---|---|---|
| V1 | On D-02 type 80 and 50 | the total shows 130% and «حفظ» refuses: «مجموع الحصص 130% يتجاوز 100% — صحّح التخصيص قبل الحفظ.» |
| V2 | Try to find M99 in the picker | not offered — a milestone has no weight to allocate |

> Record V1 **before** the final step-6 save, then undo it (cancel) so D-02 stays at 40 / 60 — track 6's
> figures depend on it.

## Not in this build

- The alerts «بنود غير مخصصة» and «تجاوز في التخصيص» are raised from the project's alerts page (track 13).
