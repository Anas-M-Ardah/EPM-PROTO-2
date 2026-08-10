# 03 — Change Order Process (A–Z)

The most heavily specified part of the system. Read `02-BUSINESS-RULES.md` §5–§9 first.

---

## 1. Before the system: inputs that precede entry

The contractor and the designer/checking consultant act **before** a change order exists. They are **not workflow stages and not system users**. Their letters are recorded as *inputs preceding entry*, each with an official letter number and date:

| Party | Input |
|---|---|
| المقاول (Contractor) | طلب إصدار أمر الغيار مع الكلفة والمدة المقترحة |
| الاستشاري المصمم والمدقق | الموافقة على الفقرات كلياً أو جزئياً |

The **RE department (دائرة المهندس المقيم)** then enters the order into the system. It is the author of record for creation, edits and submission.

---

## 2. The six stages

Exactly six system-owned stages. Each has one owning **system-user** party.

| # | Stage (AR) | Stage (EN) | Owner | Condition |
|---|---|---|---|---|
| 1 | دراسة الطلب | Request study | دائرة المهندس المقيم | always |
| 2 | لجنة أوامر الغيار | Change-order committee | لجنة أوامر الغيار | always |
| 3 | تثبيت الأسعار | Rate fixing | لجنة تثبيت الأسعار | only if a line exceeds 20% |
| 4 | المصادقة والتخصيص | Endorsement & allocation | لجنة أوامر الغيار | if endorsement or funding is needed |
| 5 | الأمر الوزاري وملحق العقد | Ministerial order & addendum | لجنة أوامر الغيار | always |
| 6 | التنفيذ | Execution | دائرة المهندس المقيم | always |

Stage notes shown in the UI:
1. *Entered by the resident engineer after the contractor's request and the consultant's opinion, then reviewed; returned to the contractor if incomplete.*
2. *Reviews the request and prepares the forms; returns it to the resident engineer if incomplete.*
3. *Fixes the rate for quantity beyond 20%, then returns the decision to the change-order committee.*
4. *Minute raised to the Minister, with the required external approvals.*
5. *Ministerial order issued, then the contract addendum.*
6. *Contract, BOQ and schedule updated.*

Skipped stages are listed explicitly with the reason ("no line exceeded 20%") — never silently omitted.

---

## 3. External parties are statuses, not stages

Parties that are **not system users** have their outcome recorded *inside* the owning stage by a delegated user, against an official letter.

| Stage | External party | Recorded outcome | Can cancel the order |
|---|---|---|---|
| 4 — المصادقة والتخصيص | لجنة المراجعة المصادقة | approval of added duration — **only when the extension exceeds a quarter of the contract duration** | yes |
| 4 — المصادقة والتخصيص | الدائرة الإدارية والمالية | securing the financial allocation | yes |
| 5 — الأمر الوزاري | الوزير / المفوَّض | endorsement and issuance of the ministerial order | — |
| 5 — الأمر الوزاري | قسم العقود الحكومية | issuance of the contract addendum | — |

External-party status values: `wait` بانتظار الجهة · `in` وردت · `back` أُعيد · `na` غير مطلوب.

A stage with pending external parties cannot be completed. Its counter reads **`n / m`** received.

---

## 4. Delegation

Every external party's outcome is recorded by **مقرّر لجنة أوامر الغيار** (the change-order committee rapporteur), a real system user acting as delegate.

**Attribution rule (client decision).** The decision is attributed to **the deciding party**; the delegate appears as **the recorder**. Render as: *لجنة المراجعة المصادقة — سُجِّل بواسطة مقرّر لجنة أوامر الغيار*.

Delegate scope:
- record an approval/rejection on behalf of a party
- return the order for revision on behalf of a party
- update the current stage without a decision
- cancel the order when an external party rejects

Every delegated record requires an **official letter number and date**. Multiple delegates are supported — one per party.

---

## 5. Decisions

Four decisions, available per stage to the owning party:

| Key | AR | Effect |
|---|---|---|
| `approve` | موافقة | advances to the next applicable stage |
| `reject` | رفض | terminates the order |
| `return` | إعادة للتعديل | sends it back to the previous stage; **full history and prior versions are preserved** |
| `cancel` | إلغاء الموضوع | terminates — used when an external party rejects |

---

## 6. Lifecycle — approved ≠ applied ≠ closed

```
draft → pending → [returned ⇄ pending] → approved
                                       → approved-applying → closed
                → rejected / cancelled
```

| State | Meaning |
|---|---|
| `pending` | in the chain, awaiting a decision |
| `returned` | معاد للتعديل — sent back, history retained |
| `approved` | the values and changes were agreed. **The contract has not changed.** |
| `approved-applying` | application under way; some steps done, some pending or failed |
| `closed` | application verified and the order closed |

### Application checklist (7 steps)
Shown compactly; details only on expand or failure. States: `na · todo · wip · done · fail`.

1. تحديث قيمة العقد — update the contract value
2. تحديث كميات البنود — update BOQ quantities
3. تحديث أسعار الوحدات — update unit rates *(only if a rate changed)*
4. إعادة احتساب الأوزان — recalculate weights
5. تحديث الأنشطة — update activities
6. تحديث الجدول الزمني — update the schedule
7. التحقق النهائي — final verification

A failed step (e.g. weight recalculation) keeps the order in `approved-applying`, raises a **فشل التطبيق** flag in the register, and surfaces on the affected line.

### Weight-recalculation state
`none` لم يُحتسب · `review` محسوب للمراجعة · `approved` معتمد · `applied` مطبق · `fail` فشل التحقق.
Report the sum before, the sum after, whether it equals 100%, and the last recalculation date.

---

## 7. Roles, personas and action gating

### System users (real accounts)
دائرة المهندس المقيم · لجنة تثبيت الأسعار · لجنة أوامر الغيار · مدير المشروع · لجنة المراجعة المصادقة · المستوى الإداري الأعلى
Plus the delegate role: **مقرّر لجنة أوامر الغيار**.

### Not system users (recorded via delegate)
المقاول · الاستشاري المصمم والمدقق · الوزير / المفوَّض · الدائرة الإدارية والمالية · قسم العقود الحكومية

### Viewer relation
For any order and any viewer, resolve exactly one relation and drive the whole UI from it:

| Relation | Meaning | Actions |
|---|---|---|
| `awaiting` — بانتظار إجرائك | the viewer owns the current stage | **enabled** |
| `recorder` — تسجيل نيابة عن جهة خارجية | the viewer is the delegate and an external party is pending | **enabled** |
| `acted` — تم إجراؤك | the viewer's stage is done; it sits elsewhere | read-only |
| `upcoming` — سيصلك لاحقاً | the viewer owns a later stage | read-only |
| `none` — للاطلاع | not in this order's chain | read-only |

**Gating rule.** Approve / reject / return / cancel / resubmit / apply / advance-stage render **only** when the relation is `awaiting` or `recorder`. Otherwise show an explicit locked note — *لا إجراءات متاحة لهذه الصفة* — never a disabled button with no explanation.

The prototype exposes a **العرض بصفة** persona switcher for demonstration; in the POC this comes from the session identity, but keep the switcher behind an admin/demo flag — it is the fastest way to review the whole permission model.

---

## 8. The creation wizard (5 steps)

Contract is selected **first** and scopes everything: only that contract's BOQ items and activities are selectable, and its current value loads automatically. A read-only context header shows project name, contract number, contract name, current value and status.

### Step 1 — Type and official letter
- Type: **هندسي (كلفة / مدة)** or **تجهيز / إعادة توزيع كميات**. Only two; presented as selectable cards with icons and hover/selected states.
- **الأسباب الموجبة** — free textarea (min 92px, `rows` governs height). No preset reason list; the type of change is set per line later.
- Responsible party, incoming letter number, incoming date.

### Step 2 — Items and changes
Two tabs in one step — **BOQ Items** and **Activities** — each showing its selected count, because one order commonly contains both. Multi-selection, filter bar, and the existing register tables reused (no new card layouts).

**BOQ filters:** search (code or description), Division, Location, Category, Status. *No WBS filter.*
**BOQ columns:** select · code · description · unit · current quantity · unit rate · current amount · **BOQ weight** (fetched, never entered).

**BOQ change types** (one dropdown per selected line):
`Increase quantity · Decrease quantity · Change unit rate · Cancel item · Quantity redistribution`
**"Add new BOQ item" does not exist here** — new items are created in BOQ Management.

Only the fields relevant to the chosen change type are shown:

| Change type | Fields |
|---|---|
| Increase quantity | current qty · increase · revised qty *(+ excess-rate field if >20%)* |
| Decrease quantity | current qty · decrease · revised qty *(+ excess-rate field if >20%)* |
| Change unit rate | current rate · new rate · amount difference |
| Cancel item | remaining quantity · cancelled amount |
| Redistribution | source BOQ · target BOQ · transferred quantity |

Each line collects **both proposals** (contractor and RE dept) side by side, and — when the 20% threshold is crossed — an **سعر الزائد** field per proposal. A sub-row states the split explicitly: *20 م3 بالسعر الأصلي 74,856 · 10 م3 زائدة عن 20% بسعر …* and names the rate-fixing committee as the final authority.

**Activity columns:** select · Activity ID · name · start · finish · progress · remaining duration. *No WBS, project, calendar, float or relationships.*

**Activity change type** — a single logical dropdown:
`Increase duration · Decrease duration · Change start date · Change finish date · Change start and finish dates`
Then only the matching inputs appear. The system computes the revised remaining duration and finish date. Values always render as **Current · Proposed change · Revised**.

Standing note: *تعديل مدة النشاط لا يُعد تعديلاً لمدة المشروع — الأثر النهائي يُحدَّد في مرحلة تحليل الجدول.*

### Step 3 — Impact summary
A summary, not a form. One section, no large cards: selected BOQs · selected activities · current contract value · **contractor proposal** · **RE dept proposal** · approved value (*يُحدَّد في التدقيق المالي*) · revised contract value (**تقديرية**) · requested days · lines beyond 20% · excess-quantity rate authority.

Then one changes table: item · item type · change type · current value · proposed value · impact. Plus a one-line BOQ weight-impact preview with the note *سيتم إعادة احتساب واعتماد أوزان BOQ بعد الموافقة النهائية*.

### Step 4 — Attachments
Existing upload area; simple list (file name · category · size · remove). Categories: كتاب رسمي · مخطط · كشف كميات · تحليل مالي أو زمني · صور موقع · مستند داعم.

### Step 5 — Review and submit
Read-only reprise using the same tables: order information · selected BOQs · selected activities · financial impact · time impact · attachments · **expected approval path** (rendered from the actual conditions — the rate-fixing stage appears only if a line exceeded 20%, the endorsement party only if the extension exceeds a quarter of the contract duration).

Two buttons only: **حفظ كمسودة** and **إرسال للمراجعة**. Submission is blocked by the gates in `02` §7, with the blocking lines listed.

### Wizard UI rules
Stepper fixed at the top with an icon per step; Back/Next fixed at the bottom; side panel for item detail; no persistent bottom summary bar; no interactive cards beyond the type choice; tables are the primary element.

---

## 9. The record page

**Header (sticky):** order number · title · lifecycle pill · type · contract number · request date · requested value · approved value · requested days · approved days · current stage · application status. No project name (the page opens inside the project), no repeated contract detail.

**Six tabs:**

1. **الملخص** — order information; *inputs preceding entry*; impact summary; contract before/order/after; decision summary (requested · approved · difference · reason for difference · decision date · approving authority); the 7-step application checklist.
2. **الكميات والكلفة** — one comparison table under grouped **Before / Requested / Approved / Applied** headers covering quantity, unit rate, value and weight, plus per-line application status. Only changed figures are marked, never whole rows. Below: the weight report (sum before, sum after, 100% validation, last recalculation, state) and, for supply orders, the redistribution table.
3. **الأثر الزمني** — affected activities, requested/analysis/approved days, project finish before / forecast / approved, critical-path and finish-date effect, then the activity comparison table.
4. **المسار** — current stage, owner, referral date, days elapsed, overdue flag, required action; then the six-stage timeline, each expanding to sent/actioned dates, duration, SLA, decision, external-party statuses and letters.
5. **المرفقات** — table with version and originating stage. Versions accumulate; files are never replaced.
6. **السجل** — audit trail: date/time · user · action · stage · previous value · new value · note · version.

**Excluded from the main tables:** project, WBS, location, linked activities inside the BOQ table, calendar, relationships, constraints, total float. Those belong in the side panel.

---

## 10. The register

Groups: بحاجة إلى إجراء · قيد الاعتماد · المعتمدة والمغلقة · المرفوضة, plus a **بانتظار إجرائي** filter driven by the viewer relation.

Five compact indicators only — net approved value · pending · needs action · overdue · average approval cycle. No large cards, no charts.

Per row: number · title · type · cost impact · time impact · **status** · current stage · current owner · last action date · attachment count.

Status column carries the lifecycle pill **plus** the exception chips (متأخر · يحتاج إجراء · فشل التطبيق) and the viewer-relation chip. Do not duplicate status information in the title column.
