# Manual test scenarios

Nineteen scenarios a person can follow by hand, each with the figure it should
land on. **Every expected value below was read off the running fixture**, not
copied from a spec.

---

## Before you start

```bash
cd api/Epm.Api && dotnet run
```

```bash
cd web && npm start
```

API on **:5080**, web on **:4300**.

**Reset to a known state** — do this before any scenario that writes:

```bash
curl -X POST http://localhost:5080/api/dev/reset && curl -X POST http://localhost:5080/api/dev/load-fixture
```

Two things to hold on to while testing:

- **"Now" is the project data date — 2026-08-02** — never today. Anything
  reading "overdue" or "due today" is measured against that date (D-06).
- **The figures are illustrative, not ministry data.** The footer says so on
  every screen, and `Fixture.cs` says so at the top.

The scenarios below use **مجمع الكليات الطبية · PRJ-0279** unless they say
otherwise.

---

# A. «العرض بصفة» — the permission model

The switcher is on **two screens only**: the change-order register and an order
record (الشكل 29 · الشكل 30). The account menu states the capacity but does not
change it.

## A1 — The same register, five different answers

Open **المشاريع → مجمع الكليات الطبية → الأوامر التغييرية**. Use «العرض بصفة»
in the filter bar to switch, and read the banner and the «بانتظار إجرائي» chip
each time.

| Switch to | Banner reads | «بانتظار إجرائي» | Which orders it can act on |
|---|---|---|---|
| المستخدم المختص في الجامعة | لا أوامر بانتظار إجرائك | **0** | — |
| مهندس مقيم | 3 من الأوامر بانتظار إجرائك | **3** | VO-03 · VO-04 · VO-05 |
| عضو لجنة أوامر الغيار | 1 | **1** | VO-06 |
| مقرّر لجنة أوامر الغيار | 1 | **1** | VO-06 |
| عضو لجنة تثبيت الأسعار | 1 | **1** | VO-02 |

✅ **Pass** when the count changes with the capacity and the banner names the
new party. The page reloads on switch — that is deliberate: the relation is
resolved on the server, so every request re-asks under the new صفة.

## A2 — The same record, two different faces

As **مقرّر لجنة أوامر الغيار**, open **VO-02**.

- The relation pill reads **تم إجراؤك**, and the decision panel shows
  «لا إجراءات متاحة لهذه الصفة» — not a greyed-out button.

Now switch to **عضو لجنة تثبيت الأسعار** on that same record.

- The relation pill reads **بانتظار إجرائك** and the decision buttons appear.

✅ **Pass** when the actions appear and disappear with the صفة and the
read-only state always *explains itself* (`03 §7`'s gating rule).

## A3 — The picker and the two filters (الشكل 29 · 30)

On the register: the toolbar has search, three attention chips, **المرحلة**,
«مسح الفلاتر», **العرض بصفة**, **نوع الأمر**, «أمر تغييري جديد».

- **المرحلة** offers only stages orders are actually sitting in — 1 دراسة
  الطلب · 2 لجنة أوامر الغيار · 3 تثبيت الأسعار · 6 التنفيذ. Pick «3 · تثبيت
  الأسعار» → one row, VO-02.
- **نوع الأمر** offers هندسي and تجهيز.

On a record: the header has **منتقي الأمر** listing all six orders, opening on
the one you are reading.

✅ **Pass** when the picker jumps between records and the browser back button
walks the orders you actually opened.

---

# B. The change-order lifecycle — معتمد ≠ مطبَّق ≠ مغلق

## B1 — What approving does NOT do

As **مهندس مقيم**, open **VO-05** (معتمد).

| Read | Expect |
|---|---|
| Contract value **before** | 250,000,000 |
| This order's value | +3,000,000 |
| Value **after** | 253,000,000 |
| Amendment state | **معلّق** (pending), amendment no. 2 |
| Finish after | 2026-08-26 |

Now open **العقود → CNT-0279**. The effective contract value still reads
**250,000,000**.

✅ **Pass** when an approved order shows its effect as a *projection* and the
contract has not moved. That is CLAUDE.md §5.2, and it is the single most
important behaviour in this system.

## B2 — What applying does

Still on VO-05, as **مهندس مقيم** (it owns التنفيذ), press **تطبيق الأمر**.

| Read after | Expect |
|---|---|
| VO-05 lifecycle | مطبَّق |
| Nine apply steps | all done except step 4, which reads **لا ينطبق** |
| Contract CNT-0279 value | **253,000,000** |
| Contract finish | **2026-08-26** |
| Pending amendments on the contract tab | **0** |

✅ **Pass** when the contract moves only now, and the amendment **flips** from
pending to applied rather than a second row appearing (P-111).

Reset afterwards.

## B3 — The two proposals and the approved value

Open **VO-05 → الملخص**, «ملخص القرار».

| | Value | Days |
|---|---|---|
| مقترح المقاول | 3,738,000 | 15 |
| مقترح دائرة المهندس المقيم | 3,375,000 | 15 |
| **القيمة المعتمدة** | **3,000,000** | **12** |
| سبب الفرق | −375,000 | −3 |

✅ **Pass** when all three persist side by side. None overwrites another
(§5.6), and only the pricing committee's figure is the approved one (BR-06).

## B4 — The 20% rule, per line, against the ORIGINAL quantity

Open **VO-01 → الكميات والكلفة**. Read the row **BQ-006 خرسانة الأسس المسلحة**.

| | Before | Threshold (20%) |
|---|---|---|
| Quantity | 1,400 م³ | **280** |
| Rate | 24,000 | |
| Amount | 33,600,000 | |

Three party columns, each split at the same threshold:

| Party | Qty after | Excess over 280 | Rate on the excess | Amount after |
|---|---|---|---|---|
| المقاول | 1,800 | **120** | 28,800 | 43,776,000 |
| دائرة المهندس المقيم | 1,780 | **100** | 26,800 | 43,000,000 |
| **المعتمد** | **1,710** | **30** | **26,000** | **41,100,000** |

✅ **Pass** when the threshold is **280 in all three columns** — it is 20% of
the *original* quantity (D-01), not of each party's proposal — and only the
excess carries the new rate. Net approved on the order: **10,000,000**.

## B5 — A decision you may not take

As **عضو لجنة تثبيت الأسعار**, open **VO-06** (sitting at لجنة أوامر الغيار).

✅ **Pass** when the relation reads **سيصلك لاحقاً** and the panel says so in
words. `03 §7`: never a bare disabled button.

---

# C. The registers Phase 6 built

Open the project rail's «السجلات والوثائق» and «الرقابة» groups.

## C1 — المخاطر (الشكل 43)

| Read | Expect |
|---|---|
| Rows | **7** |
| Severity chips | عالية **1** · متوسطة **2** · منخفضة **4** |
| The rule, printed on the title | الخطورة = الاحتمالية × التأثير |
| Columns | 9, ending الحالة |

✅ **Pass** when a band with zero in it still shows its chip (disabled), and
every severity pill carries its word as well as its colour.

## C2 — الوثائق والمخططات (الشكل 46)

| Read | Expect |
|---|---|
| Counter | **14 وثيقة · 21 مراجعة** |
| Folders | معماري 3 · إنشائي 2 · كهربائي 3 · ميكانيكي 2 · مدني 2 · تقارير 2 |
| Status chips | معتمد **8** · مسوّدة **6** · مرفوض **0** |
| Footer | الوثائق 14 / 14 · المراجعات 21 · قيد المراجعة **6** |

Click **ST-DR-002**. The panel shows:

- **R2** · 2026-05-31 · TR-2416 · **الحالية**
- **R1** · 2026-02-19 · TR-2417 · **ملغاة**

✅ **Pass** when the superseded revision keeps its date, transmittal and file —
«المراجعات لا تُحذف». Turn «آخر مراجعة فقط» off and the register lists every
issue instead of every document.

## C3 — التنبيهات (الشكل 47), and the rule that proves itself

| Read | Expect |
|---|---|
| Title | **3 تحتاج إجراءً الآن** |
| القواعد card | **12 مفعّلة من 12** |
| Footer | التنبيهات 8 / 8 · تحتاج إجراءً **3** · حرجة **1** |
| R1's escalation | 48 ساعة · R2's | 5 أيام · R3's | بلا تصعيد |

**Now switch rule R5 off.** The footer becomes **7 / 7 · تحتاج إجراءً 2**, and
the card reads **11 مفعّلة من 12**. Switch it back on: both restore, and the
alert's acknowledgement is still there.

✅ **Pass** when this works, because it is the plate's own notice made real:
«إيقاف قاعدة يوقف التنبيهات التي أنتجتها فورًا».

## C4 — النموذج ثلاثي الأبعاد (الشكل 44)

| Read | Expect |
|---|---|
| Version | الإصدار الحالي · 2026-06-01 |
| Filters | الكل 6 · إنشائي 4 · كهربائي 1 · ميكانيكي 1 |
| Colour key | مكتمل 3 · قيد التنفيذ 2 · متأخر 1 · **حرج 3** |
| Tree | مبنى A → L00 · L01 · L02 |

Select **COL-L1**: إنشائي · L01 · Zone A · 68 عمود · R2 · 100%, with links to
**BQ-007** and **A4**.

Click the BOQ link → it lands on `/projects/PRJ-0279/boq/CNT-0279`.
Select **DUCT-L2-01** and click its link → `…/boq/CNT-0279-EM`.

✅ **Pass** when the two elements land on **different contracts**. That is why
the element stores its contract: BOQ codes repeat across contracts.

The scene itself is a placeholder that says `07 §8` puts BIM rendering out of
Phase 1. That is correct behaviour, not a missing feature.

## C5 — محاضر الاجتماعات (الشكل 45)

3 minutes, 3 actions. On إجراءات المتابعة, **ACT-01 reads «متأخر» and ACT-02
reads «قيد التنفيذ» although both are past their due date**.

✅ **Pass** when that is exactly what you see. Lateness here is a stored
judgement of whoever keeps the minutes, not a date comparison (P-116) — the
plate itself shows this.

## C6 — سجل التدقيق

| Read | Expect |
|---|---|
| Total | **45** |
| Sources | المشروع **4** · العقود **11** · الأوامر التغييرية **30** |
| Footer | أحداث آلية **10** |

Filter to **العقود** — some rows are attributed to **النظام · حدث آلي** rather
than to a person.

✅ **Pass** when a system row is never dressed as a persona (P-83), and when
opening **العقود → CNT-0279 → سجل النشاط** shows *the same rows*. This screen
owns no table (P-122).

## C7 — التقارير

| Read | Expect |
|---|---|
| Title | **8 من 9 قابلة للإنتاج على هذا المشروع** |
| RPT-12 | **غير متاح** — «ينقصه: الفقرات التجهيزية — غير مُنمذَجة بعد» |

✅ **Pass** when every row lists its sources with **this project's** row count,
so a zero is the whole explanation. Compare with the enterprise
**التقارير والتحليلات** screen: same catalogue, different question.

---

# D. Scope, language and the rules page

## D1 — BR-15, workspace scope

Each capacity is assigned to particular workspaces, and its scope is the
**union** of those assignments:

| Capacity | Workspaces |
|---|---|
| مهندس مقيم · مدير مشروع · المستخدم المختص | `ub` only |
| لجنة أوامر الغيار (عضو and مقرّر) | `ub` · `nu` |
| لجنة تثبيت الأسعار | `ub` · `tu` · `sp` |
| لجنة المراجعة المصادقة · المستوى الإداري الأعلى | ministry-wide |

The fixture's projects: PRJ-0148 · PRJ-0159 · PRJ-0279 in `ub`, PRJ-0207 in
`nu`, PRJ-0277 in `tu`.

As **مهندس مقيم** (`ub` only), request a project outside it:

```bash
curl -i http://localhost:5080/api/projects/PRJ-0207/change-orders -H "X-Epm-User: user.re-dept"
```

| Request | Expect |
|---|---|
| PRJ-0207 (`nu`) as مهندس مقيم | **403** |
| PRJ-0277 (`tu`) as مهندس مقيم | **403** |
| PRJ-0207 (`nu`) as مقرّر لجنة أوامر الغيار | **200** — `nu` is in its union |

✅ **Pass** when it is a **refusal**, not an empty list. An empty result would
read as "this project has no change orders", which is a different and untrue
statement. Note that scope follows the same capacity the change-order screens
switch — one session identity.

## D2 — Both languages

Switch to English from the account menu, then walk any three screens.

✅ **Pass** when no chrome is left in Arabic and every number, ID and date
still reads left-to-right inside right-to-left text. Titles and issuer names
stay Arabic — those are **data**, not chrome.

## D3 — `/docs`, the rules page

Open the **قواعد النظام** link in the footer.

Expand **BR-05 (TIER-20)**:

- «ما تنص عليه الوثيقة»: threshold 20; 20 at the original rate; 10 excess at
  the new rate; newAmount 132,000; trips
- «ما حسبه النظام الآن»: `{threshold: 20, atRate: 20, excessQty: 10,
  newAmount: 132000, tripsThreshold: true}`

✅ **Pass** when the two agree. Every example on that page is executed through
the same `Domain/` function the screens call, on every request — so if a rule
ever changes and its text does not, this is where you will see it.

## D4 — The empty-database state

```bash
curl -X POST http://localhost:5080/api/dev/reset
```

Walk the screens without reloading the fixture.

✅ **Pass** when every screen says *which* empty it is — "no rows recorded"
rather than "no results" — and **`/docs` still works**, because the rules are
code and read no table.

Reload the fixture afterwards.

---

# E. Known gaps — these are expected, not bugs

Each of these is recorded with its reasoning; a tester finding them has found
something already known.

| Screen | What you will notice | Where it is recorded |
|---|---|---|
| **الإنجاز** | Three tabs, not الشكل 25's four; no «كيف تُحتسب», no «مرشح مرجع المقارنة» | `TODO.md` · the fidelity round |
| **جدول الكميات** | «الأعمدة» exists, «العروض» does not | `TODO.md` |
| **جدول الكميات · الجدول الزمني** | No amendment badge on a moved cell | `TODO.md` — Phase 4.5 was never built |
| **النموذج** | The 3D scene is a placeholder | `07 §8` · P-120 |
| **التنبيهات** | «ضبط قواعد التنبيه» toasts «تجريبي» | P-129 — the editor is fixture data |
| **الوثائق** | Uploads toast; المعاينة and التأشيرات are named in a notice | P-118 |
| **الفقرات التجهيزية** | The whole module is absent | P-110 — no table |
| Accessibility | Some text is below 11px and some hairlines are low-contrast | `DECISIONS.md`'s REVERTED table — a client decision |
