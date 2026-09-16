# المسار 1 — تعريف المشروع وربطه بالجامعة

**Start (proposal):** the decision to include the project in the entity's plan.
**End (proposal):** an approved project record ready to receive contracts.
**Target length:** 3–4 minutes.

> In this build a saved project is the approved record: the draft → review → approve / return
> half of the track was removed at the client's instruction and is recorded as an accepted
> deviation (`DECISIONS.md` P-266). Say so on camera; do not imply a review step.

## Take 1 — the refusals (record first, nothing is saved)

| # | Capacity | Action | Must appear | Hold on camera |
|---|---|---|---|---|
| V1 | المستخدم المختص في الجامعة | Side bar «كل المشاريع» → «تعريف مشروع جديد» (route `/projects/new`). Open «مساحة العمل». | Only the workspaces assigned to this capacity: «المديرية العامة للتجهيز والمشتريات» and «جامعة بغداد». | The open list — BR-15 scope. |
| V2 | same | Press «حفظ المشروع» with the form empty. | «اختر مساحة عمل قبل تعريف مشروع» and the field outlined; no project is created. | The message. |
| V3 | same | Fill every mandatory field as in Take 2, but «الكلفة المقررة» = `0`. Press «حفظ المشروع». | «تعذّر الحفظ. راجع الحقول أدناه.» and under the cost «الكلفة المقررة يجب أن تكون أكبر من صفر.» | Both lines. |
| V4 | مهندس مقيم | Switch capacity and open `/projects/new`. | The page states that defining projects belongs to the university specialist; saving is refused. | The refusal. |

## Take 2 — define the project

Capacity: **المستخدم المختص في الجامعة**. Route `/projects/new`.

| # | Proposal step | Enter exactly | Must appear |
|---|---|---|---|
| 1 | فتح مساحة عمل الجهة وإنشاء سجل مشروع | «مساحة العمل» = جامعة بغداد | «رمز المشروع» shows the next code (e.g. `PC-0441`) — generated, not typed. |
| 2 | إدخال الهوية والموقع والتمويل والجهة المستفيدة | اسم المشروع = `مشروع العرض — مبنى القاعات الدراسية` · English = `Demo — Lecture Hall Building` · سنة الإدراج = `2026` · نوع المشروع = المشاريع الإنشائية · مرحلة التنفيذ = تصميم · حالة المشروع = مستمر · المنطقة = بغداد · نوع التمويل = الموازنة الاتحادية · الكلفة المقررة = `1000000` · الجامعة / الجهة المستفيدة = `ub` · اسم التشكيل = `رئاسة جامعة بغداد` · الهيكل التنظيمي = `قسم الشؤون الهندسية` · اسم الشركة الاستشارية = `المكتب الاستشاري الهندسي` | Every starred field filled. |
| 3 | تحقق: اكتمال الحقول والسنة والكلفة | (shown in Take 1) | — |
| 4 | اشتقاق الرمز والمنطقة والفئة تلقائيًا | Press «حفظ المشروع». | The app opens `/projects/PRJ-xxxx/information`; region, priority and expenditure category carry the «مقترح» badge. |
| 5–7 | حفظ كمسودة · قرار المراجعة · اعتماد | — | **Not in this build (P-266).** Narrate: «الحفظ هنا يُنشئ السجل المعتمد مباشرة بقرار من الجهة المستفيدة». |
| 8 | ظهور المشروع في السجل والمحفظة | Side bar «كل المشاريع»; then switch to **الإدارة العليا** and open «الرئيسية». | The project in the register for جامعة بغداد; the portfolio's project count is one higher than before the take. |

**Proof to hold:** the project card's «سجل النشاط» tab showing one «أُنشئ» entry by
«المستخدم المختص في الجامعة», and the header's data date («البيانات حتى …») — a new project now
joins the portfolio at its current data date (P-268).

## Write down for the next tracks

- The project id (`PRJ-xxxx`) and code (`PC-xxxx`) shown in the header.

## Not in this build

- Draft, submit for review, approve and return with comments (steps 5–7, ٦أ) — P-266.
- The alert «وثيقة إلزامية ناقصة» — no mandatory-document list exists.
