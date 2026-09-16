# المسار 10 — توزيع فقرات مشاريع التجهيز على الجامعات

**Start (proposal):** approval of the supply contract and its items.
**End (proposal):** an approved distribution, measurable against receipts.
**Target length:** 3 minutes. **Uses the fixture:** `PRJ-0439` «تجهيز الأجهزة المختبرية العلمية» · contract `CNT-0439`.
**Item:** `ITM-007` «خزانة سلامة مختبرية» — contracted **24**, left undistributed by the fixture for this track.

> Run this track **before** track 11's final-receipt take on `ITM-007`, so the distribution is in place first.

## Take 1

| # | Proposal step | Capacity | Action | Must appear | Hold on camera |
|---|---|---|---|---|---|
| 1 | إضافة الفقرة التجهيزية وبياناتها الفنية | المستخدم المختص في الجامعة | `PRJ-0439` → «الفقرات التجهيزية» → click `ITM-007` → tab «عام» | device, manufacturer (Esco), model (Airstream), country, serial range, warranty | the technical data (**show, do not add a new item** — see below) |
| 2 | الكمية المتعاقدة وسعر الوحدة والكفالة والتسلسلات | same | same panel | «المتعاقد 24», unit rate, amount, weight | — |
| 3 | تحديد الجهات المستفيدة وتوزيع الكميات | same | «جدول الكميات» → contract `CNT-0439` → row `ITM-007` → «التوزيع» → «جامعة بغداد» `12`, «الجامعة التكنولوجية» `12` → «حفظ» | toast; distribution state «كامل» | the two rows summing to 24 |
| 4 | تحقق: مجموع التوزيع ≤ الكمية ولا تكرار للجهة | same | (validation takes below) | — | — |
| 5 | احتساب وزن الفقرة وحالة التوزيع | same | back to «الفقرات التجهيزية» → `ITM-007` → «التوزيع» | «المخصص» 12 / 12, «المستلم» per beneficiary, weight 1.94% | the table |
| 6 | اعتماد التوزيع | — | — | **Not in this build** — a saved distribution is in force immediately. Say so. | — |
| 7 | متابعة التجهيز لكل جهة | same | tab «التوزيع» | «المستلم» column per beneficiary (fills in track 11) | the column |
| 8 | تحديث المخصَّص والمجهَّز والمتبقي | same | register row `ITM-007` | «24 / 17 · 71%»; the «استلام جزئي» status | the row |

## Validation takes

| # | Action on `ITM-007` distribution | Must appear |
|---|---|---|
| V1 | «جامعة بغداد» `20` + «الجامعة التكنولوجية» `10` (30 > 24) → «حفظ» | «مجموع التوزيع (30) يتجاوز كمية البند (24) بمقدار 6 — عدّل الكميات قبل الحفظ.» |
| V2 | two rows for «جامعة بغداد» → «حفظ» | «الجهة ub مكرّرة — لكل جهة سطر واحد.» |

## Not in this build

- **Approving the distribution** (step 6).
- Adding a brand-new supply item on camera is possible through «إضافة فقرة» → the BOQ's manual entry,
  but it changes every item's weight on the fixture — keep it out of this take.
- The alerts «تأخر التجهيز», «نقص في الكميات المخصصة», «فقرة لم تُجهّز».
