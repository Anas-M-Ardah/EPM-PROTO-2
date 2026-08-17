# 06 — Data Dictionary

All labels are bilingual. Arabic is the primary label; English is the fallback and the LTR label.

## 1. Project / contract status (5-state canonical set)
| Key | AR | EN |
|---|---|---|
| `ongoing` | مستمر | Ongoing |
| `completed` | منجز | Completed |
| `delayed` | متأخر | Delayed |
| `suspended` | متوقف | Suspended |
| `cancelled` | ملغى | Cancelled |

## 2. Execution stages (12)
Design · tender · award · mobilisation · foundations · structure · envelope · MEP first fix · finishes · MEP second fix · testing & commissioning · handover.
*(Client value list, minutes §2.2 — carry the client's exact Arabic wording from `reference/app/data.jsx`.)*

## 3. Project types (3)
| Key | AR | EN |
|---|---|---|
| `construction` | المشاريع الإنشائية | Construction |
| `equipment` | مشاريع التجهيز | Equipment supply |
| `design-studies` | مشاريع التصنيف (التصاميم والدراسات الفنية) | Design & technical studies |

*(Client value list, replacing the earlier inferred eight — new build · extension ·
rehabilitation · maintenance · equipment supply · infrastructure · studies & design ·
consultancy. See D-13.)*

## 4. Extended contract status (9)
The 5-state set plus: awarded-not-started · suspended by administrative order · under settlement · terminated.

## 5. Funding types (10)
Federal budget · regional budget · loan · grant · self-funding · investment · reconstruction fund · emergency allocation · carry-over allocation · other.

## 6. Beneficiary types (6)
| Key | AR | EN |
|---|---|---|
| `university` | جامعة | University |
| `department` | دائرة | Department |
| `campus` | حرم جامعي | Campus |
| `site` | موقع | Site |
| `facility` | منشأة | Facility |
| `other` | أخرى | Other |

## 7. Change-order enumerations

### Type (only two)
| Key | AR | EN |
|---|---|---|
| `engineering` | هندسي — كلفة / مدة | Engineering — cost / duration |
| `supply` | تجهيز / إعادة توزيع كميات | Supply / quantity redistribution |

### BOQ change type
| Key | AR | EN |
|---|---|---|
| `inc` | زيادة كمية | Increase quantity |
| `dec` | نقص كمية | Decrease quantity |
| `rate` | تعديل السعر | Change unit rate |
| `del` | إلغاء بند | Cancel item |
| `redist` | إعادة توزيع | Quantity redistribution |

> `Add new BOQ item` is deliberately **absent** — new items come from BOQ Management.

### Activity change type
| Key | AR | EN |
|---|---|---|
| `inc` | زيادة المدة | Increase duration |
| `dec` | تقليل المدة | Decrease duration |
| `start` | تعديل تاريخ البداية | Change start date |
| `finish` | تعديل تاريخ النهاية | Change finish date |
| `both` | تعديل البداية والنهاية | Change start and finish dates |

### Order lifecycle
| Key | AR | EN |
|---|---|---|
| `draft` | مسودة | Draft |
| `pending` | قيد الاعتماد | Pending |
| `returned` | معاد للتعديل | Returned |
| `applied_partial` | معتمد — قيد التطبيق | Approved — applying |
| `closed` | مغلق | Closed |
| `rejected` | مرفوض | Rejected |

### Decisions
`approve` موافقة · `reject` رفض · `return` إعادة للتعديل · `cancel` إلغاء الموضوع

### Application-step status
| Key | AR | EN |
|---|---|---|
| `na` | غير مطلوب | Not required |
| `todo` | لم يبدأ | Not started |
| `wip` | قيد التنفيذ | In progress |
| `done` | مكتمل | Complete |
| `fail` | فشل | Failed |

### Weight-recalculation state
`none` لم يُحتسب · `review` محسوب للمراجعة · `approved` معتمد · `applied` مطبق · `fail` فشل التحقق

### External-party state
`wait` بانتظار الجهة · `in` وردت · `back` أُعيد · `na` غير مطلوب

### Viewer relation
`awaiting` بانتظار إجرائك · `recorder` تسجيل نيابة عن جهة خارجية · `acted` تم إجراؤك · `upcoming` سيصلك لاحقاً · `none` للاطلاع

### Attachment categories
كتاب رسمي · مخطط · كشف كميات · تحليل مالي أو زمني · صور موقع · مستند داعم

## 8. Amendment state
| Key | AR | EN |
|---|---|---|
| `original` | العقد الأصلي | Original contract |
| `superseded` | مُستبدَل | Superseded |
| `effective` | النافذ | Effective |
| `pending` | معتمد — بانتظار التطبيق | Approved — awaiting application |
| `partial` | قيد التطبيق | Applying |

## 9. Activity status
`notstarted` لم يبدأ · `inprogress` قيد التنفيذ · `ahead` متقدّم · `delayed` متأخر · `completed` مكتمل

## 10. Distribution state
`none` غير موزّعة · `partial` موزّعة جزئياً · `full` موزّعة كلياً · `over` تتجاوز الكمية

## 11. Allocation coverage
`unassigned` غير مخصص · `full` مخصص بالكامل · `partial` مخصص جزئياً · `over` تخصيص زائد

---

## 12. Seed scenario (keep as demo data **and** test fixture)

One project with **two contracts** (`CNT-0279` civil, `CNT-0279-EM` electromechanical) so contract scoping is visible everywhere.

**Six change orders**, deliberately spanning every state:

| No. | Age (days before data date) | Status | Exercises |
|---|---|---|---|
| VO-01 | 180 | approved → **closed** | full apply path, contract amendment no. 1 |
| VO-02 | 22 | **pending, past SLA** | overdue flag, needs-action, escalation |
| VO-03 | 60 | **returned** | return-for-revision with history retained; extension > ¼ of the contract duration → endorsement review committee |
| VO-04 | 120 | approved → **applying, weight step failed** | approved ≠ applied, فشل التطبيق |
| VO-05 | 9 | approved | recent approval, not yet applied → pending amendment + projection |
| VO-06 | 5 | **pending, inside SLA** | proves *pending* and *overdue* are different sets |

Quantity factors per order: `1.55, 1.15, 1.30, 1.22, 1.12, 1.18` — so several lines cross the 20% threshold and one does not, making the rate-fixing stage conditional in a visible way.

**Time reference.** All ages are measured back from the project's **data date** (`buildScheduleData(...).dataDate`), never from wall-clock time. A hard-coded "today" made every order look years late once the dates became contract-relative — the POC must derive "now" from the project data date in demo mode and from the real clock in production.
