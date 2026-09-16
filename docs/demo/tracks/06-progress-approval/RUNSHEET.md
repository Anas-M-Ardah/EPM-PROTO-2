# المسار 6 — تحديث الإنجاز واعتماده

**Start (proposal):** the update period ends.
**End (proposal):** an approved progress reading, reflected onto quantities, values and indicators.
**Target length:** 5 minutes. **Needs:** track 5 with D-01 → A10 100% and D-02 → A10 40% / A20 60% · the file [`evidence.txt`](evidence.txt).

Two desks: the reading is **submitted** by القسم المصدر (المستخدم المختص في الجامعة) and **decided** by
إدارة المشاريع (مهندس مقيم). Nothing on the bill moves until the approval.

## Take 1 — submit, return, resubmit, approve

| # | Proposal step | Capacity | Action | Must appear | Hold on camera |
|---|---|---|---|---|---|
| 1 | فتح النشاط | المستخدم المختص في الجامعة | Project → «الإنجاز» → «تحديث نسبة الإنجاز» → «تعديل» on A10 | editor with «الإنجاز المُبلَّغ», «ملاحظة القسم المصدر», «إرفاق دليل», «إرسال للمراجعة»; A10 weight 28.6% and fed lines «D-01 · D-02» | the fed lines |
| 2 | إدخال نسبة الإنجاز وإرفاق الأدلة | same | «الإنجاز المُبلَّغ» `60` · attach `evidence.txt` · note `قراءة شهر العرض` | the attached file name | — |
| 3 | عرض أثر التحديث | same | — | the weight and the fed BOQ lines on the row | — |
| 4 | تحقق: النسبة ضمن 0–100 ولا تقل عن السابقة | same | (see validation takes) | — | — |
| 5 | حفظ التحديث وإرساله للمراجعة | same | «إرسال للمراجعة» | toast «A10 — أُرسلت القراءة للمراجعة — لم تتغيّر أي نسبة بعد»; row «قيد المراجعة 60%»; headline «المادي 0%» unchanged | the unchanged headline |
| 6 | قرار المراجعة | **مهندس مقيم** | switch capacity → «تحديث نسبة الإنجاز» | group «قراءات بانتظار القرار (1)»: A10 · 0% ← 60% · الجامعة / التشكيل · the evidence file | the card |
| ٦أ | إعادة بملاحظات — القراءة السابقة محفوظة | مهندس مقيم | «إعادة بملاحظات» → leave the reason empty (the send button stays disabled) → reason `يرجى إرفاق ذرعة موقّعة` → «إعادة بملاحظات» | toast «A10 — أُعيدت القراءة بملاحظات»; A10 still 0% | the disabled button, then the toast |
| 5 (again) | resubmit | المستخدم المختص في الجامعة | «تعديل» A10 → `60` + evidence → «إرسال للمراجعة» | pending again | — |
| 7 | اعتماد القراءة وتسجيلها باسم القسم المصدر | مهندس مقيم | «اعتماد القراءة» | toast «A10 — انعكس على 2 من بنود الكميات» | the toast |
| 8 | ترحيل الإنجاز صعودًا | مهندس مقيم | «العودة إلى القراءة»; then «جدول الكميات» → «السجل» | «الإنجاز» headline **27%**; «تحديثات الإنجاز (واردة من الأقسام)» row by الجامعة / التشكيل; BOQ: D-01 التنفيذ 60% · القيمة المكتسبة 120,000; D-02 24% · 72,000; «PV / EV» shows EV 260,571 | the BOQ execution column |

## Validation takes (capacity المستخدم المختص في الجامعة unless stated)

| # | Action | Must appear |
|---|---|---|
| V1 | Type `150` → «إرسال للمراجعة» | «نسبة الإنجاز بين صفر ومئة.»; nothing sent |
| V2 | After step 7, type `50` on A10 → submit | «القراءة 50% أقل من القراءة السابقة 60% — لا يُسجَّل تراجع في الإنجاز.» |
| V3 | After step 7, type `60` on A10 → submit | «القراءة تساوي القراءة السابقة 60% — لا جديد لإرساله.» |
| V4 | As مهندس مقيم, open «تعديل» on an activity | the page states that recording a reading belongs to the source department |

## Notes

- SPI and planned % depend on the project's data date; read them from the screen, do not quote a figure.
- The alert «لم يُسجَّل تحديث إنجاز خلال الفترة» is raised from the alerts page (track 13).
