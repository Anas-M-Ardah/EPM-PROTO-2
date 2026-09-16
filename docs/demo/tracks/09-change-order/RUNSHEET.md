# المسار 9 — إنشاء الأمر التغييري واعتماده وعكسه على العقد والكميات والجدول

**Start (proposal):** the contractor's request and the consultant's approval (prior inputs, not stages).
**End (proposal):** an effective contract addendum and a closed order.
**Target length:** 7–8 minutes. **Needs:** contract `DEMO-CNT-01` with BOQ line D-02 (50 m3 @ 6,000; 12 m3 executed after track 6 → **38 remaining**).

The order: **D-02 +15 m3**. The 20% threshold is 20% of the ORIGINAL 50 = **10**: 10 m3 stay at 6,000,
5 m3 are excess and need a rate.

| | Contractor | RE department | Rate-fixing committee |
|---|---|---|---|
| Excess rate | 7,000 | 6,500 | **6,800** (binding) |
| Order value | +95,000 | +92,500 | **+94,000** |

Stages and owners: 1 دراسة الطلب — مهندس مقيم · 2 لجنة أوامر الغيار · 3 تثبيت الأسعار — لجنة تثبيت الأسعار ·
4 المصادقة والتخصيص · 5 الأمر الوزاري وملحق العقد — لجنة أوامر الغيار · 6 التنفيذ — مهندس مقيم.

## Take 1 — the wizard (capacity مهندس مقيم)

| # | Proposal step | Action | Must appear | Hold on camera |
|---|---|---|---|---|
| 1 | المعالج: العقد ونوع الأمر والكتاب الرسمي | Project → «الأوامر التغييرية» → «أمر تغييري جديد» → العقد `DEMO-CNT-01` · النوع هندسي · الأسباب الموجبة `زيادة كمية الخرسانة` · الجهة المسؤولة المقاول · رقم الوارد `DEMO-IN-01` · التاريخ = data date | step 1 complete | — |
| 2 | اختيار البنود وإدخال المقترحَين | step 2 → add D-02 → نوع التغيير زيادة → مقترح المقاول `+15` @ excess `7000` · مقترح د.م.م `+15` @ excess `6500`. **Do not add an activity** (see below) | both proposals on the line | the two proposals |
| 3 | احتساب حد 20% وتقسيم الكمية | step 3 (server preview) | «حد 20% = 10»; «ضمن 20%» 10 @ 6,000 = 60,000; «أكثر من 20%» 5 → 35,000 (contractor) / 32,500 (RE); «بنود تجاوزت 20% 1» | the split table |
| 4 | مراجعة ملخص الأثر وإرفاق المستندات | step 4 → attach any demo letter | «+95,000 / +92,500»; weights «100% → 100%» | the impact summary |
| 5 | تحقق: الموانع تحجب الإرسال | step 5 → «إرسال للاعتماد» | order «قيد الاعتماد · دراسة الطلب · بانتظار إجرائك» in the register | the register row |

## Take 2 — the six stages

| # | Proposal step | Capacity («العرض بصفة») | Action on the order record | Must appear |
|---|---|---|---|---|
| 6 | دراسة الطلب | مهندس مقيم | «اعتماد» (note `دراسة مكتملة`) | stage 2 active |
| 7 | لجنة التغيير | عضو لجنة أوامر الغيار | «اعتماد» | stage 3 active |
| 8 | هل تجاوز أي بند حد 20%؟ | — | tab «المسار» | stage 3 «تثبيت الأسعار» **applicable** because D-02 trips the threshold |
| 9 | تثبيت الأسعار | عضو لجنة تثبيت الأسعار | enter the approved excess rate `6800` for D-02 → «اعتماد» | «القيمة المعتمدة (لجنة التسعير) +94,000» |
| 10 | المصادقة والتخصيص | عضو لجنة أوامر الغيار | «اعتماد» | stage 5 active |
| 11 | الأمر الوزاري وملحق العقد | عضو لجنة أوامر الغيار | «اعتماد» | stage 6 active |
| 12 | التنفيذ — بدء تطبيق الأثر | مهندس مقيم | «اعتماد» | «اكتمل المسار — الأمر معتمد ولم يُطبَّق بعد»; register «معتمد — بانتظار التطبيق»; **contract still 950,000** (open `DEMO-CNT-01` to show it) |

## Take 3 — apply (capacity مهندس مقيم)

| # | Proposal step | Action | Must appear | Hold on camera |
|---|---|---|---|---|
| 13 | تحديث قيمة العقد والكميات والأسعار والأوزان | order record → «تطبيق الأمر» → confirm | «طُبِّق الأمر وصدر ملحق العقد رقم 1 — تغيّرت قيمة العقد والكميات» | the toast |
| 14 | تحديث الأنشطة والجدول والغرامات | tab «الملخص» → «حالة تطبيق الأمر التغييري» | steps 6–8 «غير مطلوب» (no time change in this order) | the nine steps |
| 15 | إصدار الملحق والتحقق النهائي وإغلاق الأمر | same | steps 1–5 and 9 «مكتمل»; order «مغلق»; «قيمة العقد قبل 950,000 → بعد 1,044,000»; «ملحق العقد: صدر وأصبح نافذاً · 1» | the before/after and «مغلق» |

Then show `DEMO-CNT-01`: «القيمة الأصلية 950,000» · «القيمة النافذة 1,044,000»; BOQ D-02 quantity 65,
weights D-01 25.19 · D-02 49.62 · D-03 25.19. The original 50 m3 is still recorded — nothing original is overwritten.

## Validation takes

| # | Capacity | Action | Must appear |
|---|---|---|---|
| V1 | مهندس مقيم | new order with no line and no activity → «إرسال للاعتماد» | «الأمر فارغ — لا بنود ولا أنشطة» |
| V2 | مهندس مقيم | new order: D-02 **decrease 45** (remaining 38) → «إرسال للاعتماد» | «مقترح المقاول يتجاوز الكمية المتبقية (38)» and the same for د.م.م — blocked whichever sign is entered (fixed 2026-09-14, P-267) |
| V3 | عضو لجنة أوامر الغيار | on stage 1, try to decide | no decision panel — the stage belongs to دائرة المهندس المقيم |
| V4 | عضو لجنة تثبيت الأسعار | «اعتماد» at stage 3 without the rate | «يجب إدخال القيمة المعتمدة من لجنة تثبيت الأسعار قبل اعتماد هذه المرحلة» |
| V5 | any stage owner | «إعادة» with an empty note | «التعليق إلزامي عند الإعادة أو الرفض أو الإلغاء» |

## Not in this build — do not claim on camera

- **Time extensions on an imported schedule:** float is not computed (track 4), so adding an activity
  delay is blocked with «تأخير النشاط يمس المسار الحرج…». Keep this order to quantities.
- External-party statuses are not created for new orders (the fixture's orders carry them).
- Applying the order closes it in the same action; there is no separate final-verification click.
