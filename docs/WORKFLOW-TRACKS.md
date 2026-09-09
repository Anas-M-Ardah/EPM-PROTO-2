# Workflow Tracks — translation of § 25, مسارات العمل

A direct translation of section 25 of the ministry's technical proposal
(`__العرض-الفني-لنظام-إدارة-المشاريع 1.html`, v1.0, 2026-08-11) — the fourteen swimlane
process diagrams (المسار 1–14) that define who does what, when, and under which authority.
Nothing here is invented: every step, lane, and closing note is carried over from the source
document, redrawn as a UML sequence diagram instead of the source's own swimlane boxes, so the
logic reads as a flow instead of a grid. Arabic terms are kept literal alongside the translation.

**Why this document exists.** The demo runsheet (`demo/runsheet.html`) narrates a build-from-zero
walkthrough of the app. This document is its source of truth for *what the ministry actually
specified* — so the remaining parts of the demo can be checked against the proposal's own words,
not against improvised narration.

A navigable version of the same fourteen diagrams is published at:
<https://claude.ai/code/artifact/PLACEHOLDER>

---

## How to read a diagram

- **Solid arrow (`->>`)** — a handoff: one actor's action moves the work to another actor (a
  submission, an approval passed forward, an escalation target).
- **Dashed arrow (`-->>`)** — an automatic or return-direction step: a system computation, a
  validation, an approval/rejection decision, an alert.
- **Note over an actor** — a manual step performed inside that actor's own lane, with nothing yet
  handed off.
- **`alt` / `else` blocks** — a genuine fork in the source diagram (a data-source choice, an
  approve/return decision, a threshold check with two outcomes). Every fork in these diagrams
  comes from an explicit branch step in the source (numbered `Nأ`) — none are inferred.
- Every message is prefixed with its original step number from the source, so any diagram line
  can be traced back to `المسار N` in the proposal HTML.
- **المرحلة N من M** phase boundaries are marked with a `Note` spanning the full diagram width.

### The three-way responsibility split

The source's own preamble to §25, translated in full (it governs all fourteen tracks):

> Workflow tracks are the core of this technical proposal, because they define who does what,
> when, and under what authority — and they draw a clear line between three responsibilities:
> what Projects Administration does, what the specialist user does, and what the system executes
> automatically. The tracks are designed as swimlanes: each horizontal row represents an entity
> or a role, steps advance right to left, and responsibility moves between rows as it changes
> hands.

| Responsibility | What it covers, across every track |
|---|---|
| **إدارة المشاريع** (Projects Administration) | reviewing submitted records and approving or returning them; managing contracts and addenda; leading the application of change orders; closing progress periods; following up escalated alerts |
| **المستخدم المختص** (The specialist user) | entering data at its source: defining the project, uploading the BOQ and the schedules, updating progress, recording payments and receipts, uploading documents, creating change orders |
| **النظام** (The system) | validating inputs; computing and deriving; creating versions; propagating impact to linked modules; evaluating alert rules; automatic escalation once a deadline is exceeded; recording every operation in the audit log |

---

## المسار 1 — Track 1 — Defining the Project and Linking It to the University

**Start:** the decision to include the project in the entity's plan.
**End:** an approved project record ready to receive contracts.

```mermaid
sequenceDiagram
    participant U as المستخدم المختص في الجامعة / University specialist
    participant SYS as النظام / System
    participant PA as إدارة المشاريع / Projects Administration

    Note over U,PA: المرحلة 1 من 2 — Phase 1
    U->>SYS: 1. فتح مساحة عمل الجهة وإنشاء سجل مشروع — Open workspace, create project record
    Note over U: 2. إدخال الهوية والموقع والتمويل والجهة المستفيدة — Enter identity, location, funding, beneficiary
    SYS-->>SYS: 3. تحقق: اكتمال الحقول والسنة والكلفة — Validate fields, year, cost
    SYS-->>SYS: 4. اشتقاق الرمز والمنطقة والفئة تلقائيًا — Auto-derive code, region, category
    U->>PA: 5. حفظ كمسودة وإرسال للمراجعة — Save draft, submit for review

    Note over U,PA: المرحلة 2 من 2 — Phase 2
    PA-->>PA: 6. قرار المراجعة — Review decision
    alt اعتماد — Approved
        PA->>SYS: 7. اعتماد المشروع — Approve the project
        SYS-->>U: 8. ظهور المشروع في السجل والمحفظة — End: appears in registry & ministry portfolio
    else إعادة — Returned
        PA-->>U: 6أ. إعادة بملاحظات، النسخة محفوظة — Return with comments, version kept
    end
```

**What the user enters:** the project name, its type, the inclusion year, the execution phase,
its status, the location and coordinates, the funding, the beneficiary entity, the organizational
structure, and the consultant.

**What the system validates:** mandatory fields are complete · the inclusion year is valid · the
approved cost is greater than zero · the project belongs to exactly one organizational unit.

**What the user sees:** the project card with its fields, the values the system derives
automatically from the classification and the entity, and an activity log of the edits.

**Reflection on other modules:** enables adding contracts · lists the project on the university's
and ministry's dashboards · feeds location data to the GIS.

**Alerts:** a new project added · a mandatory document is missing.

---

## المسار 2 — Track 2 — Creating Contracts and Linking Them to the Project

**Start:** issuance of the award (صدور الإحالة).
**End:** an effective contract ready to receive the BOQ, the schedule, and payments.

```mermaid
sequenceDiagram
    participant U as المستخدم المختص / Specialist user
    participant SYS as النظام / System
    participant PA as إدارة المشاريع / Projects Administration

    Note over U,PA: المرحلة 1 من 2 — Phase 1
    U->>SYS: 1. فتح وحدة العقود وإضافة عقد — Open Contracts module, add a contract
    Note over U: 2. إدخال هوية العقد والمكوّن وحالته — Enter identity, component, status
    Note over U: 3. إدخال المبالغ: الإحالة والاحتياط والإشراف والمراقبة — Enter amounts: award, reserve, supervision, monitoring
    U->>SYS: 4. إدخال تاريخي المباشرة والإنجاز وبيانات المقاول — Enter dates and contractor details

    Note over U,PA: المرحلة 2 من 2 — Phase 2
    SYS-->>SYS: 5. تحقق: عدم تكرار الرقم، تسلسل التواريخ، موجبية المبالغ — Validate: no duplicate number, dates in order, positive amounts
    PA->>SYS: 6. اعتماد العقد — Approve the contract
    SYS-->>SYS: 7. احتساب قيمة المشروع من مجموع قيم عقوده — End: compute project value from contract totals
```

**What the user enters:** the contract's name and code, its component and status, the award,
reserve, supervision, and monitoring amounts, the commencement and completion dates, the
contractor's name, the executing entity, and contact details.

**What the system validates:** the contract number is not duplicated within the organizational
unit · the dates are in sequence · the amounts are positive · the contract belongs to exactly one
project.

**What the user sees:** the contract card with its tabs (Overview · Details · Payments · Addenda
& Amendments · Activity log), and the cost broken down across its three components.

**Reflection on other modules:** the derived project value · enables uploading the BOQ and
importing the schedule · enables recording payments against the contract.

**Alerts:** a new contract added · the contract's duration is approaching its end.

---

## المسار 3 — Track 3 — Uploading the Bill of Quantities and Reviewing It

**Start:** the contractual BOQ becoming available.
**End:** an approved BOQ version linked to the contract.

```mermaid
sequenceDiagram
    participant U as المستخدم المختص / Specialist user
    participant PA as إدارة المشاريع / Projects Administration
    participant SYS as النظام / System

    Note over U,SYS: المرحلة 1 من 2 — Phase 1
    U->>SYS: 1. اختيار العقد في وحدة جدول الكميات — Select the contract in the BOQ module
    alt ملف Excel — Excel file
        Note over U: 2-3أ. رفع الملف ومطابقة الأعمدة — Upload the file, map the columns
    else إدخال يدوي — Manual entry
        Note over PA: 2-3ب. إدخال البنود يدويًا بندًا بندًا — Enter line items manually, one by one
    end
    SYS-->>SYS: 4. تحليل الملف والتحقق ثم المقارنة بالإصدار القائم — Parse, validate, compare vs. current version

    Note over U,SYS: المرحلة 2 من 2 — Phase 2
    SYS-->>SYS: 5. تحقق: صحة القيم ومجموع الأوزان 100.00% — Validate values, weights sum to 100.00%
    U->>PA: 6. تقديم النسخة للاعتماد — لا استبدال للإصدار السابق — Submit for approval (previous version kept)
    PA->>SYS: 7. اعتماد الإصدار الجديد — Approve the new version
    SYS-->>SYS: 8. حفظ الإصدار وتحديث الأوزان والقيمة المرجعية — End: save version, update weights & reference value
```

**What the user enters:** the BOQ file, or its line items entered manually: the code,
description, section, unit, quantity, and unit price.

**What the system validates:** the columns map correctly · the values are valid · the weights sum
to 100.00% · the line items belong exclusively to the selected contract.

**What the user sees:** a five-step import wizard (upload the file · parse · validate · compare ·
confirm and link), and the comparison result against the current version before submission.

**Reflection on other modules:** the line-item weights · the contract's reference value · enables
linking to activities · the basis for computing earned value.

**Alerts:** a project with no approved BOQ · unpriced line items.

---

## المسار 4 — Track 4 — Importing the Schedule, or Building It Inside the System

**Start:** the work programme becoming available.
**End:** an approved schedule with a reference baseline and computed weights.

```mermaid
sequenceDiagram
    participant PT as فريق التخطيط / Planning team
    participant PA as إدارة المشاريع / Projects Administration
    participant SYS as النظام / System

    Note over PT,SYS: المرحلة 1 من 2 — Phase 1
    PT->>SYS: 1. فتح وحدة الجدول الزمني — Open the Schedule module
    alt ملف من أداة تخطيط — File from a planning tool
        Note over PT: 2-3أ. اختيار الصيغة (XER/XML/Excel) ورفع الملف — Choose format, upload the file
    else إنشاء داخل النظام — Built inside the system
        Note over PA: 2-3ب. بناء هيكل التجزئة وإضافة الأنشطة والمدد — Build the WBS, add activities & durations
    end
    PT->>SYS: 4. تحديد أساس احتساب الوزن: الكلفة أم ساعات العمل — Set weight basis: budgeted cost or man-hours

    Note over PT,SYS: المرحلة 2 من 2 — Phase 2
    SYS-->>SYS: 5. تحليل الملف والتحقق ثم تحليل الأثر — Parse, validate, analyze impact
    SYS-->>SYS: 6. احتساب الأوزان وتحديد المسار الحرج — Compute weights, identify critical path
    PA->>SYS: 7. مراجعة الجدول واعتماده — Review and approve the schedule
    SYS-->>SYS: 8. تثبيت خط الأساس وحفظ الإصدار — End: fix baseline, save version
```

**What the user enters:** the schedule file, or activities entered manually: the identifier, name,
its position in the WBS, the duration, the start and end dates, and the budgeted cost.

**What the system validates:** the WBS structure is sound · activities and milestones are
complete · the weight basis is valid · the dates are consistent.

**What the user sees:** a five-step import wizard ending in an impact analysis then confirmation;
and a Gantt chart compared against the baseline, with a status legend.

**Reflection on other modules:** enables linking BOQ lines to activities · the basis for computing
progress and planned value · identifies the critical path and float.

**Alerts:** no approved schedule exists · a key milestone approaching · an activity on the
critical path is delayed.

---

## المسار 5 — Track 5 — Linking BOQ Lines to Activities

**Start:** an approved BOQ and an approved schedule both being available.
**End:** full coverage that allows progress and earned value to be derived.

```mermaid
sequenceDiagram
    participant PT as فريق التخطيط / Planning team
    participant SYS as النظام / System

    Note over PT,SYS: المرحلة 1 من 2 — Phase 1
    PT->>SYS: 1. فتح تبويب الربط بالأنشطة — Open the Activity-Linking tab
    Note over PT: 2. اختيار البند وربط الأنشطة المؤثرة فيه — Select the line item, link the affecting activities
    SYS-->>SYS: 3. احتساب حصة كل نشاط من وزنه المطلق — Compute each activity's share from its absolute weight
    alt تجاوز يدوي مطلوب — Manual override needed
        Note over PT: 4-4أ. تعديل الحصة يدويًا مع حفظ الأثر — Adjust the share manually, effect kept on record
    else لا حاجة — No override needed
        Note over SYS: (المتابعة مباشرة — proceed directly)
    end

    Note over PT,SYS: المرحلة 2 من 2 — Phase 2
    SYS-->>SYS: 5. تقييم حالة التغطية لكل بند — Evaluate the coverage status of each line item
    alt تغطية غير مكتملة — Coverage incomplete
        SYS-->>PT: 5أ. إبراز البنود «غير المخصَّصة» أو «المتجاوزة» — Flag unassigned / over-allocated items
    else تغطية مكتملة — Coverage complete
        SYS-->>PT: 6. تغطية مكتملة — البنود جاهزة لاحتساب الإنجاز — End: ready for progress to be computed
    end
```

**What the user enters:** selecting the activities linked to each line item, and adjusting the
shares when needed.

**What the system validates:** the sum of the shares does not exceed the total · the line item and
the activity belong to the same contract · classifying the coverage status.

**What the user sees:** the "Activities" and "Allocated weight" columns in the BOQ register, and
the allocation status: fully allocated / partial / over-allocated / unassigned.

**Reflection on other modules:** converts activity progress into line-item completion percentages
· computes quantities executed and earned value · feeds the performance indicators.

**Alerts:** line items not allocated to activities · an over-allocation.

---

## المسار 6 — Track 6 — Updating Progress and Approving It

**Start:** the update period ending.
**End:** an approved progress reading, reflected onto quantities, values, and indicators.

> This is the track behind the runsheet's two-desk step 07 (`P-238`/`P-239`) — a progress reading
> is *submitted* by القسم المصدر (the originating department) and *approved* by إدارة المشاريع,
> and nothing on the bill moves until that approval lands.

```mermaid
sequenceDiagram
    participant OD as القسم المصدر (تخطيط/مالية) / Originating dept.
    participant SYS as النظام / System
    participant PA as إدارة المشاريع / Projects Administration

    Note over OD,PA: المرحلة 1 من 2 — Phase 1
    OD->>SYS: 1. فتح النشاط في الجدول الزمني أو الكميات المنجزة — Open the activity
    Note over OD: 2. إدخال نسبة الإنجاز وإرفاق الأدلة — Enter the progress %, attach evidence
    SYS-->>SYS: 3. عرض أثر التحديث: المتبقي والتسليم والقيمة المكتسبة — Show impact: remainder, delivery date, earned value
    SYS-->>SYS: 4. تحقق: النسبة ضمن 0–100 ولا تقل عن السابقة — Validate: 0–100 range, no regression
    OD->>PA: 5. حفظ التحديث وإرساله للمراجعة — Save the update, submit for review

    Note over OD,PA: المرحلة 2 من 2 — Phase 2 (two-desk review, P-238/P-239)
    PA-->>PA: 6. قرار المراجعة — Review decision
    alt اعتماد — Approved
        PA->>SYS: 7. اعتماد القراءة وتسجيلها باسم القسم المصدر — Approve, record under originating dept.'s name
        SYS-->>OD: 8. ترحيل الإنجاز صعودًا إلى الهيكل والعقد والمشروع — End: roll up progress
    else إعادة — Returned
        PA-->>OD: 6أ. إعادة بملاحظات — القراءة السابقة محفوظة — Return with comments, previous reading kept
    end
```

**What the user enters:** the activity's progress percentage or the quantity executed, and the
supporting evidence.

**What the system validates:** the percentage limits · no regression below the previous reading ·
an activity link must exist before computation.

**What the user sees:** the remaining duration in days, the delivery impact on the project's
progress, the financial impact, the activity's cost and its earned value, and the remaining
budget.

**Reflection on other modules:** line-item completion percentages · quantities executed and
remaining · earned value · SPI and CPI · the university's and ministry's dashboards.

**Alerts:** no progress update recorded within the set period · an activity on the critical path
is delayed.

---

## المسار 7 — Track 7 — Closing the Progress Period and Moving to the Next Period

**Start:** approval of the period's reading.
**End:** a closed, comparable period and a new open period.

```mermaid
sequenceDiagram
    participant PA as إدارة المشاريع / Projects Administration
    participant SYS as النظام / System
    participant CP as الجهات المعنية / Concerned parties

    Note over PA,CP: المرحلة 1 من 2 — Phase 1
    PA->>SYS: 1. اعتماد قراءة الفترة الحالية — Approve the current period's reading
    SYS-->>SYS: 2. تثبيت القيم السابقة والحالية والتراكمية — Fix previous / current / cumulative values
    SYS-->>SYS: 3. تحقق: اكتمال الأدلة والوثائق الإلزامية — Validate mandatory evidence & documents
    PA->>SYS: 4. إغلاق الفترة — Close the period

    Note over PA,CP: المرحلة 2 من 2 — Phase 2
    SYS-->>SYS: 5. تحويل الفترة إلى سجل مقفل غير قابل للتحرير المباشر — Convert to a locked, non-editable record
    PA->>SYS: 6. فتح الفترة التالية — Open the next period
    Note over CP: 6أ. أي تعديل لاحق يقتضي إجراءً معتمدًا لا تحريرًا مباشرًا — Standing rule: later edits need an approved action
    SYS-->>PA: 7. تحديث تاريخ البيانات ومرجع المقارنة — End: update the data date & comparison reference
```

**What the user enters:** confirming the period's closure once its readings and evidence are
complete.

**What the system validates:** the period's readings are complete · evidence exists · no pending
actions block the closure.

**What the user sees:** the approved data date, the "previous reading" comparison reference, and
the log of updates received from the departments.

**Reflection on other modules:** stability of historical comparisons · accuracy of the indicators
· closing the fiscal-year record in the Financial Status module.

**Alerts:** a period not closed on time · an attempt to edit a locked period.

---

## المسار 8 — Track 8 — Creating the Payment Certificate, Reviewing It, and Approving It

**Start:** submission of the المستخلص (payment certificate) and ذرعات الأعمال (work-measurement
sheets).
**End:** a payment certificate approved and disbursed ahead of the statutory deadline.

```mermaid
sequenceDiagram
    participant SUB as مقدّم المستخلص / Certificate submitter
    participant SYS as النظام / System
    participant RE as المهندس المقيم / Resident Engineer
    participant FIN as الدائرة المالية / Finance Directorate

    Note over SUB,FIN: المرحلة 1 من 2 — Phase 1
    SUB->>SYS: 1. اختيار العقود المشمولة بالدفعة — Select the contracts covered by the payment
    Note over SUB: 2. توزيع المبلغ على الإحالة والاحتياط والإشراف والمراقبة — Distribute the amount
    Note over SUB: 3. إدخال كتاب المالية وإرفاق ذرعات الأعمال — Enter the finance letter, attach measurement sheets
    SYS-->>SYS: 4. تحقق: الصرف ≤ التخصيص والتراكمي ≤ الكلفة المعدلة — Validate ceilings
    SUB->>RE: 5. تدقيق المهندس المقيم — سقف 7 أيام — Resident Engineer review, 7-day ceiling

    Note over SUB,FIN: المرحلة 2 من 2 — Phase 2
    SYS-->>SYS: 6. هل تجاوزت المرحلة سقفها الزمني؟ — Has the stage exceeded its time ceiling?
    alt تجاوزت — Ceiling exceeded
        SYS-->>FIN: 6أ. تصعيد تلقائي إلى المستوى الإداري الأعلى — Automatic escalation
    else ضمن المهلة — Within the ceiling
        RE->>FIN: 7. تدقيق الدائرة المالية — سقف 7 أيام — Finance Directorate review, 7-day ceiling
    end
    FIN->>SYS: 8. تسجيل الدفعة واعتمادها — Record and approve the payment
    SYS-->>SYS: 9. تحديث المصروف السنوي والتراكمي ونسبة الصرف — End: update disbursement figures
```

**What the user enters:** the contracts covered, the amounts per line item, the finance letter and
its date, the work-measurement sheets, and the supporting documents.

**What the system validates:** the disbursement ceilings against the allocation and the adjusted
cost · the finance letter and measurement sheets are complete · computing the time consumed at
each review stage.

**What the user sees:** a five-step recording wizard ending in a review, a review-deadline bar
showing each stage's status, and the statutory disbursement deadline with the time remaining.

**Reflection on other modules:** the cumulative disbursement · the disbursement percentage ·
financial progress · the financial-changes log · the performance indicators.

**Alerts:** the review deadline exceeded, with escalation · the disbursement approaching the
allocation · the cumulative disbursement exceeding the cost.

---

## المسار 9 — Track 9 — Creating the Change Order, Approving It, and Reflecting It onto the Contract, the BOQ, and the Schedule

**Start:** the contractor's or supplier's request and the consultant's approval (prior inputs, not
stages).
**End:** an effective contract addendum and a closed order.

> The same six-stage process documented in `spec/03-CHANGE-ORDER-PROCESS.md` — that file gives
> the stage owners, the conditions that skip stage 3 and stage 4, and the external-party rules;
> this diagram is the source proposal's own rendering of the same process, including the input
> steps before entry and the application steps after the ministerial order.

```mermaid
sequenceDiagram
    participant RE as دائرة المهندس المقيم / Resident Engineer Dept.
    participant SYS as النظام / System
    participant CC as لجان الاعتماد / Approval committees
    participant RFC as لجنة تثبيت الأسعار / Rate-Fixing Committee
    participant AA as الجهة المعتمدة / Approving authority

    Note over RE,AA: المرحلة 1 من 3 — Phase 1 (سابق للإدخال: طلب المقاول وموافقة الاستشاري)
    RE->>SYS: 1. المعالج: العقد ونوع الأمر والكتاب الرسمي — The wizard: contract, order type, official letter
    Note over RE: 2. اختيار البنود والأنشطة وإدخال المقترحَين — Select items/activities, enter the two proposals
    SYS-->>SYS: 3. احتساب حد 20% وتقسيم الكمية بين السعرين — Compute the 20% threshold, split the quantity
    Note over RE: 4. مراجعة ملخص الأثر وإرفاق المستندات — Review the impact summary, attach documents
    SYS-->>SYS: 5. تحقق: الموانع تحجب الإرسال — Check: any blockers prevent submission

    Note over RE,AA: المرحلة 2 من 3 — Phase 2
    RE->>CC: 6. دراسة الطلب — Study the request
    CC-->>CC: 7. لجنة التغيير — Change-order committee
    SYS-->>SYS: 8. هل تجاوز أي بند حد 20%؟ — Did any line item exceed 20%?
    alt نعم — Exceeds 20%
        CC->>RFC: (إحالة — refer)
        RFC-->>CC: 9. تثبيت الأسعار — Rate fixing
    else لا — No line exceeds
        Note over CC: (تُتخطى المرحلة 3 — stage 3 skipped)
    end
    CC->>AA: 10. المصادقة والتخصيص — Endorsement and allocation

    Note over RE,AA: المرحلة 3 من 3 — Phase 3
    AA->>RE: 11. الأمر الوزاري وملحق العقد — The ministerial order and contract addendum
    Note over RE: 12. التنفيذ — بدء تطبيق الأثر — Execution begins
    SYS-->>SYS: 13. تحديث قيمة العقد والكميات والأسعار وإعادة احتساب الأوزان — Update contract value/quantities/prices, recompute weights
    SYS-->>SYS: 14. تحديث الأنشطة والجدول وإعادة احتساب الغرامات — Update activities/schedule, recompute penalties
    SYS-->>RE: 15. إصدار الملحق والتحقق النهائي وإغلاق الأمر — End: issue addendum, final check, close order
```

**What the user enters:** the contract, the order type, the justification and the official
letter, the affected line items and activities, the amount of change, the excess quantity's rate
as proposed by the contractor and by the Resident Engineer Department, and the attachments.

**What the system validates:** the order is confined to a single contract · an order with no line
items is blocked · a decrease beyond the remaining quantity is blocked · computing the 20%
threshold and splitting the pricing · re-validating that the weights sum to 100%.

**What the user sees:** an explicit comparison between the contractor's proposal, the Resident
Engineer Department's proposal, and the value approved by the pricing committee; the approval
path with its six stages and their deadlines; and the list of the nine application steps.

**Reflection on other modules:** the contract's effective value and its addenda · the line items'
quantities, prices, and weights · the activities' durations and dates · the delay penalties · the
adjusted cost and the performance indicators.

**Alerts:** an order awaiting a decision · a stage deadline exceeded, with escalation · one of the
application steps failing.

---

## المسار 10 — Track 10 — Distributing Supply-Project Line Items Across Universities

**Start:** approval of the supply contract and its items.
**End:** an approved distribution, measurable against receipts.

> The equipment/supply fork's own track — compare against the runsheet's Act three (`S1`–`S4`),
> which walks `PRJ-0439` through the equivalent works-side steps.

```mermaid
sequenceDiagram
    participant SO as مسؤول التجهيز / Supply officer
    participant SYS as النظام / System
    participant BEN as الجهات المستفيدة / Beneficiary entities

    Note over SO,BEN: المرحلة 1 من 2 — Phase 1
    SO->>SYS: 1. إضافة الفقرة التجهيزية وبياناتها الفنية — Add the supply line item, its technical data
    Note over SO: 2. إدخال الكمية المتعاقدة وسعر الوحدة والكفالة والتسلسلات — Enter contracted qty, price, warranty, serials
    Note over SO: 3. تحديد الجهات المستفيدة وتوزيع الكميات عليها — Identify beneficiaries, distribute the quantities
    SYS-->>SYS: 4. تحقق: مجموع التوزيع ≤ الكمية المتعاقدة ولا تكرار للجهة — Validate: total ≤ contracted qty, no duplicate entity

    Note over SO,BEN: المرحلة 2 من 2 — Phase 2
    SYS-->>SYS: 5. احتساب وزن الفقرة من قيمة العقد وحالة التوزيع — Compute the item's weight, distribution status
    SO->>SYS: 6. اعتماد التوزيع — Approve the distribution
    Note over BEN: 7. متابعة التجهيز لكل جهة — Track the supply for each entity
    SYS-->>SO: 8. تحديث المخصَّص والمجهَّز والمتبقي وحالة الفقرة — End: update allocated/supplied/remaining
```

**What the user enters:** the item's code, the device, the manufacturer, the model, the country of
origin, the unit, the contracted quantity, the unit price, the warranty, and the serial-number
range; and the beneficiary entities and each entity's quantity.

**What the system validates:** the contracted quantity is not exceeded · an entity is not
duplicated on the item · computing the item's weight and the receipt percentage.

**What the user sees:** the distribution table, with "Allocated" and "Received" columns per
entity plus the total, a receipt-percentage progress bar, and an "incomplete receipt" warning
stating the remaining count.

**Reflection on other modules:** the item's progress and the project's progress · the receipts log
· the item-lookup service · redistribution orders.

**Alerts:** the supply is delayed · a shortfall in the allocated quantities · an item not yet
supplied.

---

## المسار 11 — Track 11 — Supply, Delivery, and Preliminary and Final Receipt

**Start:** materials arriving at the warehouse.
**End:** a receipt documented with its minutes and papers, and closure of the line item's
obligation.

```mermaid
sequenceDiagram
    participant SUP as المجهّز / Supplier
    participant WRC as لجنة الاستلام المخزني / Warehouse receiving committee
    participant BEN as الجهة المستفيدة / Beneficiary entity
    participant SYS as النظام / System

    Note over SUP,SYS: المرحلة 1 من 2 — Phase 1
    SUP->>WRC: 1. إشعار الجاهزية وتوريد الكميات — Readiness notice, delivery of the quantities
    Note over WRC: 2. تسجيل الاستلام المخزني: الكمية والمخزن واللجنة — Record the warehouse receipt
    Note over WRC: 3. إرفاق محضر الاستلام أو الذرعة — Attach the receiving minutes or measurement sheet
    SYS-->>SYS: 4. تحقق: الكمية ≤ المتبقي من الفقرة — Validate: quantity ≤ the item's remainder
    WRC->>BEN: 5. تسجيل الاستلام الأولي: الكمية والجهة المستلمة — Record the preliminary receipt

    Note over SUP,SYS: المرحلة 2 من 2 — Phase 2
    BEN-->>BEN: 6. نتيجة المطابقة — هل توجد ملاحظات؟ — Inspection result — observations?
    alt توجد ملاحظات — Observations exist
        BEN-->>SUP: 6أ. معالجة الملاحظات وإعادة العرض — Address observations, resubmit
    else لا توجد ملاحظات — No observations
        BEN->>SYS: 7. الاستلام النهائي بعد استيفاء الشروط — Final receipt once conditions are met
    end
    SYS-->>BEN: 8. تحديث الكميات المستلمة والمتبقية وإنجاز المشروع — End: update received/remaining quantities & progress
```

**What the user enters:** the receipt number (generated by the system), the date, the quantity,
the warehouse or the receiving entity, the committee, the inspection result, the observations,
and the receiving documents.

**What the system validates:** the remaining quantity is not exceeded · the quantity and the
warehouse or the receiving entity are mandatory · generating a sequential receipt number.

**What the user sees:** the warehouse-receipt and preliminary-receipt cards, and the item's
archive with its versions, and a "remaining" hint while entering data.

**Reflection on other modules:** the received and remaining quantities · the item's status · the
supply project's progress · the receipts log at the contract level · the documents archive.

**Alerts:** a delayed receipt · a shortfall in the receiving documents · an item whose receipt is
incomplete.

---

## المسار 12 — Track 12 — Managing Documents and Drawings

**Start:** the document or drawing becoming available.
**End:** an approved revision saved in the record without replacing what preceded it.

```mermaid
sequenceDiagram
    participant IE as الجهة المُصدِرة / Issuing entity
    participant SYS as النظام / System
    participant PA as إدارة المشاريع / Projects Administration

    Note over IE,PA: المرحلة 1 من 2 — Phase 1
    IE->>SYS: 1. رفع الوثيقة وتصنيفها حسب التخصص — Upload the document, classify by discipline
    Note over IE: 2. ربطها بالمشروع أو العقد أو الأمر أو الفقرة — Link it to the project/contract/order/item
    SYS-->>SYS: 3. تحقق: الصيغة مقبولة ولا تكرار في الاسم والإصدار — Validate: format accepted, no duplication
    SYS-->>SYS: 4. إنشاء مراجعة جديدة وتعليم السابقة «ملغاة» — Create a new revision, mark the previous "superseded"

    Note over IE,PA: المرحلة 2 من 2 — Phase 2
    PA-->>PA: 5. قرار الاعتماد — Approval decision
    alt اعتماد — Approved
        PA->>SYS: 6. اعتماد المراجعة — Approve the revision
        SYS->>IE: 7. إتاحة الوثيقة للبحث والاسترجاع بتاريخها الكامل — End: available for search, full history
    else رفض — Rejected
        PA-->>IE: 5أ. رفض المراجعة مع بيان السبب — Reject the revision, stating the reason
    end
```

**What the user enters:** the file, the document number, its title, its discipline, the issuing
entity, the transmittal number, and the reason for the revision.

**What the system validates:** the format is accepted · duplication is blocked · the sequence and
the versions are kept · the uploader and the date are recorded.

**What the user sees:** the documents register with the document and revision counts, a details
panel with Preview / Revisions / Markups / Details tabs, and a "latest revision only" toggle.

**Reflection on other modules:** the project's mandatory documents being complete · the
attachments of change orders, payments, and receipts · the project's readiness to move between
phases.

**Alerts:** a mandatory document awaiting approval · a phase missing documents.

---

## المسار 13 — Track 13 — Issuing Alerts and Escalation

**Start:** an alert rule's condition being met at the data date.
**End:** an alert acknowledged and closed, or escalated to the higher level.

```mermaid
sequenceDiagram
    participant SYS as النظام / System
    participant CE as الجهة المعنية / Concerned entity
    participant HL as المستوى الإداري الأعلى / Higher administrative level

    Note over SYS,HL: المرحلة 1 من 2 — Phase 1
    SYS-->>SYS: 1. تقييم القواعد الاثنتي عشرة عند تاريخ البيانات — Evaluate the twelve rules at the data date
    SYS-->>SYS: 2. هل تحقق شرط الإطلاق؟ — Is the trigger condition met?
    alt نعم — Condition met
        SYS-->>CE: 3. إصدار التنبيه بدرجة خطورته وقنواته — Issue the alert (severity + channels)
        SYS->>CE: 4. إشعار الجهة وبيان الإجراء المطلوب — Notify the entity, state the required action
    else لا — Condition not met
        Note over SYS: (لا تنبيه هذه الدورة — no alert this cycle)
    end

    Note over SYS,HL: المرحلة 2 من 2 — Phase 2
    SYS-->>SYS: 5. اتُّخذ الإجراء خلال مهلة التصعيد؟ — Was the action taken within the escalation deadline?
    alt لا — Not taken in time
        SYS-->>HL: 5أ. تصعيد تلقائي إلى المستوى الإداري الأعلى — Automatic escalation
    else نعم — Taken in time
        CE->>SYS: 6. معالجة السبب وإقرار التنبيه — Address the cause, acknowledge the alert
    end
    SYS-->>SYS: 7. إقفال التنبيه مع بقائه في السجل — End: close the alert, kept in the record
```

**What the user enters:** acknowledging the alert or reopening it, and addressing the cause in its
original module.

**What the system validates:** evaluating the rules' conditions · computing the delay duration ·
applying each rule's escalation deadline · stopping alerts as soon as their rule is disabled.

**What the user sees:** the alerts center, with severity cards (critical / medium / low) and their
status (open / closed), and the text of the required action and the escalation destination.

**Reflection on other modules:** highlighting the record that caused the alert · listing the
action in the required-actions list · feeding the alerts-and-escalation report.

**Alerts:** the alert itself is the output; it recurs at its rule's frequency until addressed.

---

## المسار 14 — Track 14 — Performance Display and Reporting at the Project, University, and Ministry Levels

**Start:** BOQ, schedule, progress, and disbursement data being complete.
**End:** a run report, or an updated indicator dashboard, at all three levels.

```mermaid
sequenceDiagram
    participant SYS as النظام / System
    participant U as المستخدم المختص / Specialist user
    participant EX as الإدارة التنفيذية / Executive Management

    Note over SYS,EX: المرحلة 1 من 2 — Phase 1
    SYS-->>SYS: 1. اشتقاق المؤشرات من الوحدات المصدر — Derive the indicators from the source modules
    SYS-->>SYS: 2. تجميع الإنجاز من النشاط إلى الهيكل فالعقد فالمشروع — Aggregate progress up to project level
    SYS-->>SYS: 3. تجميع مؤشرات المشروع على مستوى الجامعة ثم الوزارة — Aggregate at university, then ministry level
    U->>SYS: 4. اختيار نطاق التقرير وتصنيفه وصيغته — Choose the report's scope, category, format

    Note over SYS,EX: المرحلة 2 من 2 — Phase 2
    U->>SYS: 5. تشغيل التقرير أو جدولته دوريًا — Run the report, or schedule it periodically
    EX-->>EX: 6. قراءة المؤشر — هل يستدعي إجراءً؟ — Reading the indicator — does it call for action?
    alt نعم — Calls for action
        EX->>SYS: 6أ. الانتقال من المؤشر إلى مصدره لاتخاذ القرار — Drill from the indicator to its source
    else لا — No action needed
        Note over EX: (لا إجراء إضافي — no further action)
    end
    SYS-->>EX: 7. تقرير صادر ولوحة مؤشرات محدّثة عند تاريخ البيانات — End: report issued, dashboard updated
```

**What the user enters:** the report's scope (project or portfolio), its category, its format, and
its frequency.

**What the system validates:** the source data is complete · the computation rules are consistent
· the indicators match across the levels.

**What the user sees:** the reports library with its categories, frequencies, and last-run date,
and the indicator dashboards at the project, university, and ministry levels.

**Reflection on other modules:** the system modifies no data in this track; its function is
display, aggregation, and drilling to the source.

**Alerts:** indicators falling below the acceptable threshold · delayed or high-risk projects on
the monitoring dashboard.

---

## Source

Translated from `docs/__العرض-الفني-لنظام-إدارة-المشاريع 1.html`, §25 (مسارات العمل), v1.0,
2026-08-11. Every step, lane, and closing note above is carried over from that document —
nothing here was generated from the running app or from the demo runsheet. Where the app's
current behaviour diverges from a track (a table not yet built, a rule not yet enforced), that is
a gap to note against this document, not a reason to edit the translation.
