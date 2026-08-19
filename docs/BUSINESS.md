# EPM — the business, and how to set it up

**نظام إدارة المشاريع الهندسية — وزارة التعليم العالي والبحث العلمي · دائرة الإعمار والمشاريع**

This is the working reference for what the system *is about* — the objects, the
rules that govern them, and the order data has to be entered in. It is written
against the running code, not from memory: every rule below is executed live by
`GET /api/docs/rules` on each request, so this document cannot quietly drift
from the implementation.

> **Database state: EMPTY.** `POST /api/dev/reset` has been run — the schema
> exists and every ministry table has zero rows. The lookup **vocabulary** is
> seeded with the schema, so the app is usable and waiting for data. See §6 for
> the order to enter it in.

---

## 1. What the business is

The ministry funds and supervises engineering projects across its universities
and formations. Three kinds of thing happen, and the system exists to keep them
consistent with each other:

1. **Money is committed** — a project is registered, budgeted and contracted.
2. **Work is measured** — a bill of quantities and a programme, executed and
   progressed against.
3. **Things change** — quantities move, durations slip, prices are re-fixed, and
   every one of those is a decision with an owner, a date and a paper trail.

The third is the reason the system exists. A change order (**أمر تغييري**) is
the flagship flow: six stages, several committees, and a strict separation
between *deciding* and *taking effect*.

### The one hierarchy

```
  Workspace (تشكيل / جامعة)
      └── Project (مشروع)                    ← belongs to exactly one workspace
             └── Contract (عقد)              ← belongs to exactly one project
                    ├── BOQ items (فقرات جدول الكميات)
                    ├── Activities (أنشطة الجدول الزمني)
                    ├── Payments (الدفعات)
                    └── Change orders (الأوامر التغييرية)
```

**The contract is the working context.** A BOQ item and an activity each belong
to exactly one contract. The project is *derived* from the contract and never
asked for again. **One change order may never span two contracts.**

### Two kinds of project

| Type | The bill is… | Notes |
|---|---|---|
| `construction` (تشييد) · `maintenance` (صيانة) | works measured on site | the default shape |
| `equipment` (تجهيز) | **devices delivered and received** | the الفقرات التجهيزية module; the rail swaps «جدول الكميات» for «الفقرات التجهيزية» and drops the 3D tab |

A supply project runs the *same* schedule and progress engines. What differs is
that its bill lines carry a device, a manufacturer, a serial range and
**receipts** — see §5.

---

## 2. The seven non-negotiables

From client review. These are the ones most likely to be "simplified" away.

1. **The contract is the working context.** One change order, one contract.
2. **Approved ≠ Applied ≠ Closed.** Approving a change order **changes
   nothing**. *Applying* it creates a contract amendment and moves quantities,
   dates and the penalty baseline. Closing verifies it. An approved-but-unapplied
   order is shown as a **projection** and is never folded into effective figures.
3. **The 20% rule is per BOQ line**, measured against the **original** quantity.
   Only the excess may be re-priced, and only **لجنة تثبيت الأسعار** sets the
   binding rate — never the person filling in the wizard.
4. **Two proposals, one decision.** The contractor and the resident-engineer
   department each propose; the RE department's figure governs *display*; the
   approved value comes only from the pricing committee at financial review.
5. **External parties are statuses, not stages.** Recorded inside the owning
   stage, against an official letter number and date, attributed to the deciding
   party with the delegate as recorder.
6. **Original values are never overwritten.** `original` / `before` /
   `requested` / `approved` / `applied` are separate columns that all persist.
7. **"Now" is the project data date**, never the wall clock.

Two more that govern the data itself:

- **Derived values are never stored.** Project value, BOQ weight, effective
  contract value, progress, penalties, received quantities — all computed at
  read time. If a figure can be derived, storing it creates a second place for
  it to be wrong.
- **Arabic RTL is primary**, not a translation layer.

---

## 3. The fifteen business rules

Executed live by `GET /api/docs/rules`. Worked figures below are the actual
output of the running code.

### Money and quantity

| # | Rule | The formula | Worked example |
|---|---|---|---|
| **BR-01** | **BOQ weight** | An item's share of its **contract's** total BOQ value, largest-remainder rounded so the column sums to exactly 100.00% | 56,131,000 / 43,869,000 → **56.13% + 43.87% = 100.00%** |
| **BR-05** | **The 20% rule** | The portion up to 20% of the **original** quantity keeps the original rate. Only the excess may carry a new one | original 100, new 130 → threshold 20; 20 at the old rate, **10 excess** at the new; trips the pricing committee |
| **BR-06** | **Two proposals** | RE department's figure governs display; neither is the approved value until financial review | governing **11,400,000** (RE dept), divergence −600,000, marked **تقديرية** |
| **BR-08** | **Distribution** | A line's quantity split across the beneficiaries **assigned to that project**; inputs capped at what is left | qty 120, distributed 90 → remaining 30, state `partial` |
| **BR-09** | **Amendment** | On **apply**: `value += approvedValue`, `finish += approvedDays`. The last applied amendment *is* the effective contract | amendment no 1 → value **105,000,000**, finish **2026-08-14** |
| **BR-10** | **Delay penalty** | `perDay = value ÷ durationDays × 10%`; `cap = value × 10%`; `amount = min(perDay × days, cap)` | 587,673,564 over 364 days → **161,449 د.ع/day** |

> **BR-10 is the client's own formula** (العرض الفني §11, الشكل 10), not the
> 0.1%/day the earlier written spec carried. The cap is reached after exactly
> one contract duration of delay.

### Schedule and progress

| # | Rule | The formula | Worked example |
|---|---|---|---|
| **BR-02** | **Activity weight** | Basis is budgeted **cost or man-hours**, chosen at import. `absolute = value / Σ all`; `relative = value / Σ parent WBS node`. Milestones get 0 | A1 absolute **36%**, relative **60%** |
| **BR-03** | **Allocation share** | **Never typed by a user.** `share = absoluteWeight / Σ(absolute weights of activities linked to this BOQ) × 100`. Overridable, and reset restores the computed value | A5 **52.7%**, A8 **47.3%** |
| **BR-04** | **Progress reflection** | BOQ progress is the allocation-weighted mean of its linked activities' progress | progress **52.6%** → achieved 14,059,980 |
| **BR-11** | **Earned value** | `CPI = EV/AC`, `SPI = EV/PV`, `EAC = budget/CPI`, `VAC = budget − EAC` | CPI ≈ **0.945**, SPI ≈ **0.867** |

> BR-11's indices are **diagnostics** — never headline figures, and never
> coloured by threshold.

### Process and access

| # | Rule | What it does | Worked example |
|---|---|---|---|
| **BR-07** | **Change-order gates** | Submission is **blocked**, not warned: a decrease beyond remaining, an unbalanced or targetless redistribution, an empty order, or anything outside the selected contract | 1 blocker — decrease 30 exceeds remaining 10 |
| **BR-12** | **Lead time / SLA** | `leadDays = dataDate − officialIncomingDate`. 5 days per stage; past that is overdue and auto-escalates | leadDays **22**, overdue |
| **BR-13** | **Six-stage workflow** | Exactly six system-owned stages. Rate fixing only if a line trips 20%; endorsement/allocation only if needed. **Skipped stages are listed with their reason**, never silently dropped | stages 3 and 4 skipped with reasons |
| **BR-14** | **Viewer relation** | Exactly one of `awaiting · recorder · acted · upcoming · none`. Actions render only for the first two; otherwise an explicit locked note | `upcoming` — read-only |
| **BR-15** | **Workspace access** | A user's scope is the **union** of their assignments. Outside it is **refused**, not silently emptied. Ministry-centre users are the documented exception | visible `[ub, tu]`; `nu` refused |

---

## 4. The change-order flow

The six stages (BR-13), in order. Two are conditional.

| # | Stage | Owner | Conditional? |
|---|---|---|---|
| 1 | تدقيق المهندس المقيم | دائرة المهندس المقيم | always |
| 2 | لجنة أوامر الغيار | لجنة أوامر الغيار | always |
| 3 | لجنة تثبيت الأسعار | لجنة تثبيت الأسعار | **only if a line trips 20%** |
| 4 | المصادقة والتخصيص | لجنة المراجعة المصادقة | **only if endorsement or funding is needed** |
| 5 | المراجعة المالية | الدائرة المالية | always |
| 6 | التطبيق | مدير المشروع | always |

**Approving at stage 2 with 3 and 4 skipped advances straight to stage 5** — and
the skipped stages are recorded with their reasons.

Applying (stage 6) is the only thing that moves money: it creates the contract
amendment, re-prices the excess into a second rate band, moves activity dates
and resets the penalty baseline. Until then, nothing has changed.

### The supply variant

A change order on an equipment contract has **no 20% tier and no rate-fixing
committee**. Its step 2 instead redistributes quantity **between beneficiaries
within one item** — and its net effect on the contract value is **zero**. That
is the point of the screen: a redistribution is a quantity move, not a financial
one.

---

## 5. الفقرات التجهيزية — the supply module

For `equipment` projects. The bill line gains a device half and two kinds of
receipt, recorded as **events** (المسار 11).

| | |
|---|---|
| **استلام مخزني** | the devices arriving at the ministry's store, against a محضر and a receiving committee |
| **استلام أولي** | a beneficiary taking delivery of some of what arrived, against a conformity finding |

**They are not the same event and do not net against each other:**

```
  warehouse   ≤ contracted − Σ warehouse          (what is still owed)
  preliminary ≤ Σ warehouse − Σ preliminary       (arrived, not yet handed over)
```

A beneficiary cannot take delivery of something that never reached the store.
The received quantity is **Σ the warehouse receipts** — it is not a stored
column. Receipt numbers (`WR-…` / `PR-…`) are **generated, never typed**.

> **Open with the client (P-168):** a receipt is capped against the *contracted*
> quantity, not against what the supplier actually delivered, so an item can
> reach «مستلم بالكامل» above its recorded `SuppliedQty`. الشكل 53's own
> «المتبقي 16» can only be contracted-based, so the plate settles the formula —
> but whether supplied should be a second ceiling is unanswered.

---

## 6. Setting it up — the order that works

Nothing is seeded automatically. Each step below depends on the one above it.

### Step 0 — the vocabularies (**automatic**)

**42 lookup categories** define every enum in the app — statuses, types,
categories, stages. They live in code (`Features/Lookups/LookupCatalog.cs`) and
are written to the `Lookups` table **whenever a schema is created**: on boot
after `EnsureCreated()`, and again at the end of `POST /api/dev/reset`. The
seeder is idempotent — it writes only into an empty table, so an existing
database is never touched.

> They are **not** demo data. CLAUDE.md §4's «nothing is seeded automatically»
> is about the `06 §12` scenario — the projects and figures that are
> «illustrative, not ministry data». These rows are the system's own vocabulary,
> and without them every lookup-backed select renders blank and the first
> تشكيل cannot be created at all.

The largest ones to review against ministry vocabulary:

| Category | Values | Category | Values |
|---|---|---|---|
| `execution-stage` | 12 | `contract-status` | 9 |
| `region` | 11 | `co-lifecycle` | 8 |
| `funding-type` | 10 | `risk-category` | 7 |
| `project-status` · `expenditure-category` · `amendment-state` | 5 each | `project-type` · `workspace-kind` | 3 · 4 |

`workspace-kind` is the one Step 1 needs: **جامعة حكومية · جامعة تقنية · وحدة
مركزية · مديرية تجهيز**.

### Step 1 — Workspaces (التشكيلات)

The top of the hierarchy and the basis of **all access control** (BR-15).
Nothing else can be created until at least one exists.

> **Defining a workspace is a ministry-level capacity** (`07 §24` puts it in the
> admin plane). Only **مدير عام** and **عضو لجنة المراجعة المصادقة** — the two
> ministry-wide personas — get «مساحة عمل جديدة». A university specialist
> facing an empty register is not doing anything wrong and is told which صفة
> can, rather than handed a button that would be refused on submit.
>
> **So the very first action on an empty database is to switch to a
> ministry-wide persona and define the first تشكيل.** Everything else follows
> from it: مشروع requires a `workspaceCode`, عقد requires a project, and the
> bill and the programme require a contract.

### Step 2 — Beneficiaries (الجهات المستفيدة)

The universities and units that receive quantities. Referenced **by code**, and
a project may only distribute to the beneficiaries assigned to *it*.

### Step 3 — Users and their assignments

Access is the **union of a user's workspace assignments**. The nine reference
roles:

| Role | Scope |
|---|---|
| المستخدم المختص في الجامعة | assigned workspaces |
| مهندس مقيم (دائرة المهندس المقيم) | assigned workspaces |
| عضو / مقرّر لجنة أوامر الغيار | assigned workspaces |
| عضو لجنة الفحص والاستلام | assigned workspaces |
| عضو لجنة تثبيت الأسعار | assigned workspaces |
| مدير مشروع | assigned workspaces |
| عضو لجنة المراجعة المصادقة | **ministry-wide** |
| مدير عام | **ministry-wide** |

Capacities worth knowing, because they are enforced server-side and are *not*
just UI:

- Approving a BOQ or schedule import — **دائرة المهندس المقيم or مدير المشروع**,
  and **never the person who submitted it**.
- Registering a payment — **دائرة المهندس المقيم or مدير المشروع**.
- Recording a supply receipt — **لجنة الفحص والاستلام or مدير المشروع**.

### Step 4 — Projects

Required to save (`Domain/ProjectDefinition`):

`nameAr` · `type` · `registrationYear` · `executionStage` · `status` ·
`fundingType` · `formation` · `beneficiaryCodes` · `orgStructure` ·
`consultantParty` — plus `plannedCost` and `workspaceCode`, which the save
enforces even though the card does not star them.

Registration year must be between **1900 and the data date's year** (2026) —
the ministry's own range. A year that has not begun is refused.

### Step 5 — Contracts

Required: `nameAr` · `start` · `finish` · `contractor` · `executingParty` —
plus `id`, `component`, `status`, `awardAmount` and `projectId`.

**Contract code uniqueness is scoped to the تشكيل**, not to the project.

### Step 6 — The bill

Either enter lines directly, or use the **BOQ import wizard** (CSV/TSV/`.xlsx`)
— which validates, compares against what exists, and writes a *version* that a
second person must approve before it becomes the live bill.

### Step 7 — The programme

Either enter activities, or use the **P6 import wizard** — Primavera XER, P6
XML or Excel. Choose the weight basis (**cost or man-hours**) at import; that
choice is BR-02's basis and is stored with the version.

Approving a schedule import is the **only** route that writes a baseline. It
never touches execution: an activity 82% built stays 82% built.

### Step 8 — Link the two

BOQ↔Activity links drive BR-03 and BR-04. Once linked, **progress flows one way
only**: you record progress on activities, and the bill reflects it.

### Then

Distributions (BR-08), payments, change orders, risks, meetings and documents
can be entered in any order.

---

## 7. Running it

```bash
cd api/Epm.Api && dotnet run
```

```bash
cd web && npm start
```

API on **:5080**, web on **:4300**.

| Endpoint | Does |
|---|---|
| `POST /api/dev/reset` | drops and recreates the schema, **empty of ministry data**, with the lookup vocabulary seeded — how a schema change is applied |
| `POST /api/dev/load-fixture` | loads the `06 §12` demo scenario |
| `GET /api/docs/rules` | runs all fifteen rules and returns their worked examples — the live version of §3 |
| `GET /api/dev/personas` | the nine reference roles |

There are **no migrations**. A schema change means editing the entity and
running `reset`.

> The fixture's figures are **illustrative, not ministry data**.

---

## 8. Where to look next

| Question | File |
|---|---|
| What screen calls what endpoint, reading what table? | `TRACE.md` |
| Why was something decided this way? | `DECISIONS.md` |
| How does one feature fit together? | `docs/uml/<feature>.md` |
| What are the rules, formally? | `docs/spec/02-BUSINESS-RULES.md` |
| What is still open with the client? | `DECISIONS.md` — the open rows, and `TODO.md` |
