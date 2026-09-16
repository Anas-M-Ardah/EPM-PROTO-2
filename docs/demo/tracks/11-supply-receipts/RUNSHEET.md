# المسار 11 — التجهيز والتوريد والاستلام الأولي والنهائي

**Start (proposal):** materials arrive at the warehouse.
**End (proposal):** a receipt documented with its minutes and papers, and closure of the line item's obligation.
**Target length:** 4 minutes. **Uses the fixture:** `PRJ-0439` / `CNT-0439`, item **`ITM-007`** «خزانة سلامة مختبرية»
(contracted 24, received 17 → **7 still owed**). Run track 10 first so ITM-007 is distributed to جامعة بغداد.
Capacity throughout: **عضو لجنة الفحص والاستلام**.

| Receipt | Qty | Party | Number (generated) |
|---|---|---|---|
| warehouse | 5 | المخزن `مخزن الوزارة المركزي` | `WR-0439-7-…` |
| preliminary | 5 | جامعة بغداد | `PR-0439-7-…` |
| **final** | 5 | جامعة بغداد | `FR-0439-7-1` |

## Take 1

| # | Proposal step | Action | Must appear | Hold on camera |
|---|---|---|---|---|
| 1 | إشعار الجاهزية وتوريد الكميات | `ITM-007` → «إشعار الجاهزية» → quantity `5`, receipt deadline `2026-08-02`, note `DEMO-RN-01 — supplier readiness notice`, attach `demo-receipt-minutes.txt` → «تسجيل الاستلام» | generated `RN-0439-7-1`; stock still `17/24` | notice card |
| 2 | تسجيل الاستلام المخزني | «الفقرات التجهيزية» → `ITM-007` → «استلام مخزني» → الكمية `5` (hint «المتبقي 7») · المخزن `مخزن الوزارة المركزي` · اللجنة as offered | the receipt number field reads «يُولَّد تلقائياً» | the hint |
| 3 | إرفاق محضر الاستلام | «إرفاق» any demo file → «حفظ» | toast; tab «الاستلامات» card `WR-0439-7-…` with the file chip | the card |
| 4 | تحقق: الكمية ≤ المتبقي | (validation V1) | — | — |
| 5 | تسجيل الاستلام الأولي | «استلام أولي» → quantity `5`, explicitly select جامعة بغداد, conformity «غير مطابق», note `DEMO-OBS-01 — inspection observations`, attach `demo-receipt-minutes.txt` → «تسجيل الاستلام» | original `PR-0439-7-1` retains nonconformity; distribution Baghdad received `5` | distribution row and original result |
| 6 | نتيجة المطابقة | show original preliminary card and final button | «غير مطابق»; final button disabled until documented conforming reinspection | original result |
| ٦أ | معالجة الملاحظات وإعادة العرض | original PR card → «معالجة الملاحظات وإعادة العرض»; quantity `5` and Baghdad locked; result «مطابق», note `DEMO-RES-01 — observations addressed and reinspected`, attach `demo-receipt-minutes.txt` → «تسجيل الاستلام» | `RI-0439-7-1` references original PR; original stays unchanged; stock `22/24`, preliminary total stays `5`; final enabled | original PR and linked RI |
| 7 | الاستلام النهائي بعد استيفاء الشروط | «استلام نهائي» (new, P-269) → الكمية `5` (hint shows 5) · الجهة المستلمة جامعة بغداد → attach the final minutes → «حفظ» | card `FR-0439-7-1` under «استلام نهائي» | the FR card |
| 8 | تحديث الكميات المستلمة والمتبقية وإنجاز المشروع | register row `ITM-007` and tab «الاستلامات» switch «مخزني / أولي / نهائي» | «24 / 22 · 92%»; the «استلام نهائي» button now disabled (nothing left to accept) | the register row |

## Validation takes

| # | Action on `ITM-007` | Must appear |
|---|---|---|
| V1 | «استلام مخزني» and type `9` when 7 are owed | the field caps at 7 as you type; the server message would be «الكمية تتجاوز المتبقي من الكمية المتعاقدة (7).» |
| V2 | «استلام نهائي» before any preliminary receipt | the button is disabled (nothing handed over yet) |
| V3 | «استلام نهائي» for «الجامعة التكنولوجية», quantity 1 | «الكمية تتجاوز ما استلمته الجهة أولياً ولم يُستلم نهائياً (0).» |
| V4 | switch to **مهندس مقيم** | refused — «لا تملك صلاحية الوصول إلى مساحة العمل هذه» (not assigned to the directorate) |

## Additional validation and alerts

- Readiness must have a receipt deadline and notice details; notice never changes warehouse quantity.
- Nonconforming preliminary receipt requires observations; final acceptance remains blocked until a conforming reinspection is recorded. Reinspection requires its minutes and cannot change the original quantity or receiving party.
- Final acceptance requires conformity and final minutes. Keep V3 after conforming reinspection, before valid Baghdad final acceptance.
- Show «فقرة لم يكتمل استلامها» on the item and central/project alerts. Two units remain owed after this five-unit example; final acceptance closes only the demonstrated batch.
- Fixture warehouse receipt has no attachment, so «نقص في مستندات الاستلام» is truthful. «إضافة مستند» on that receipt appends evidence and removes its active documentation alert; do not claim historical evidence is real.
- Late receipt evaluates the supplier's explicitly recorded deadline against the project data date, never today's wall clock. The main notice deadline `2026-08-02` is not late. A supplemental validation can use deadline `2026-08-01` on an additional illustrative notice to show «استلام متأخر»; label the validation as demo data.

## Prototype boundaries

- Supplier notice is recorded by the inspection committee as a delegate; no supplier login, email or SMS dispatch is added.
- Attachment metadata and archive chips are real records; file preview remains the existing prototype action, not a claim of stored file bytes.
- Track 11 extensions were explicitly requested on 2026-09-15; previous clips used the earlier exclusions.
