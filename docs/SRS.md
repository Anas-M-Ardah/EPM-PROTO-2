# Software Requirements Specification

**Engineering Projects Management (EPM)**
Ministry of Higher Education & Scientific Research — Republic of Iraq
Reconstruction & Projects Department · دائرة الإعمار و المشاريع

| | |
|---|---|
| **Version** | 1.1 |
| **Date** | 2026-08-10 |
| **Status** | Derived from the binding handoff; consolidates `docs/spec/01`–`07` |
| **Design baseline** | **v1.1 design system**, adopted at Phase 1.5 |
| **Prototype data date** | 2026-08-02 (`06 §12`) |

> **Changes in 1.1** — the v1.1 design system was adopted (§11.1a), the Contracts
> screen was delivered, and **BR-00 now receives effective contract values**,
> which closes the gap this document previously recorded. Two new open questions
> arrived with the design adoption (§12).

---

## How to read this document

> **This SRS is not the source of truth.** The binding specification is
> `docs/spec/01-DOMAIN-MODEL.md` through `07-POC-BUILD-PLAN.md`, which the
> client reviewed. This document is a consolidated *reading* of those files,
> written so the business can be understood end to end without reading seven
> documents in sequence. **Where this document and `docs/spec/01`–`07`
> disagree, `01`–`07` wins** and this file is the one that gets corrected.

Every requirement carries a **source reference** to the binding document and
section it comes from. Nothing here is invented; where a question is genuinely
unresolved it appears in [§12 Open questions](#12-open-questions-requiring-a-client-decision)
rather than being silently decided.

**Status column** on each requirement:

| Mark | Meaning |
|---|---|
| ✅ | Built and verified in the current prototype |
| 🔨 | Specified and scheduled — see [ROADMAP.md](../ROADMAP.md) |
| ⏸ | Explicitly out of Phase 1 (`07 §8`) |
| ❓ | Blocked on a client decision (§12) |

Arabic terms are given in Arabic with an English gloss on first use, and all of
them are collected in [§15 Glossary](#15-glossary). The Arabic is not
decoration — it is the language the business is conducted in, and several terms
have no clean English equivalent.

---

## Table of contents

1. [Purpose and scope](#1-purpose-and-scope)
2. [The business problem](#2-the-business-problem)
3. [Actors](#3-actors)
4. [Domain model](#4-domain-model)
5. [The five non-negotiables](#5-the-five-non-negotiables)
6. [Functional requirements — enterprise](#6-functional-requirements--enterprise)
7. [Functional requirements — project workspace](#7-functional-requirements--project-workspace)
8. [Functional requirements — change orders](#8-functional-requirements--change-orders)
9. [Business rules](#9-business-rules)
10. [Data requirements](#10-data-requirements)
11. [Non-functional requirements](#11-non-functional-requirements)
12. [Open questions requiring a client decision](#12-open-questions-requiring-a-client-decision)
13. [Out of scope](#13-out-of-scope)
14. [Acceptance criteria](#14-acceptance-criteria)
15. [Glossary](#15-glossary)
16. [Traceability](#16-traceability)

---

## 1. Purpose and scope

### 1.1 Purpose

The Reconstruction & Projects Department procures and supervises construction,
rehabilitation and equipment projects on behalf of Iraq's public universities
and higher-education institutions. EPM is the system of record for that work:
what was contracted, what has been built, what has changed, what it now costs,
and who decided each change.

The system is **a legal and financial record**, not a reporting dashboard. A
contract value in EPM is the value the ministry is committed to. A wrong
assumption in a rule propagates into a contract value, which is why this
document is explicit about what is decided and what is not.

### 1.2 Scope of this specification

| In scope | Out of scope (`07 §8`) |
|---|---|
| Projects, contracts, BOQ, schedule, progress, financials | Standalone claims management |
| **Change orders (أوامر الغيار) — the flagship** | Quality: inspection, NCR, lab, material approval |
| Contract amendments and effective values | HSE |
| Quantity distribution to beneficiaries | Resource / ERP integration |
| Risk, meetings, documents, alerts, reports, audit | GIS mapping |
| Bilingual AR/EN, Arabic RTL primary | Real BIM / IFC rendering (tab kept, viewer stubbed) |
| Role-based action gating | Full mobile parity for newer modules |

### 1.3 Current delivery status

The current build is a **prototype**, ported from a client-validated React
prototype onto Angular 19 + .NET 9 + SQL Server. Its purpose (`07 §1`) is:

> *"A running system that is simultaneously the reference documentation for the
> final build. Success is not 'it demos well' — it is: a developer joining the
> final build can read the rule, see it execute, and trust that the code matches."*

**Delivered so far:** the shared value lists, all fourteen business rules with
their worked examples as passing tests, a live rules-reference endpoint, the
shared UI primitives, the **v1.1 design system**, and two cross-portfolio
screens — Projects and Contracts.

**Screens: 2 of 24 complete.** The Contracts screen matters out of proportion to
its size: it is the first screen to display an **effective contract value**, so
it is where `BR-09` — *approving changes nothing, applying does* — becomes
visible rather than theoretical.

---

## 2. The business problem

### 2.1 What goes wrong today

The department administers many projects, each with several contracts, each
contract with hundreds of bill-of-quantity lines and a Primavera schedule.
Changes to those contracts — **أمر الغيار**, a change order — are frequent,
consequential, and currently tracked on paper and in spreadsheets.

Five specific failures this system exists to prevent:

**1. Nobody can say what a contract is actually worth.** The original award,
plus every applied amendment, minus the ones that were approved but never
applied. These are three different numbers and they get conflated. A department
that reports approved-but-unapplied change orders inside its committed value
overstates what it owes.

**2. Quantity changes get re-priced without authority.** Iraqi contracting
practice allows a quantity to move up to **20% of the originally contracted
amount at the original unit rate**. Only the excess beyond 20% may carry a new
price, and only **لجنة تثبيت الأسعار** (the rate-fixing committee) may set it.
When this is done in a spreadsheet, the contractor's proposed rate quietly
becomes the paid rate.

**3. Approval chains are invisible.** A change order passes through up to six
committees, some conditional. Without a system, no one can answer "where is it,
who is holding it, and how long have they had it" — so nothing is ever
escalated on time.

**4. Progress is asserted, not derived.** Physical completion is reported as a
percentage somebody typed. It should fall out of the schedule: activity
progress rolls into BOQ progress by allocation weight, and BOQ progress rolls
into project completion by value.

**5. History is lost.** When a quantity changes, the original is overwritten.
Nobody can reconstruct what was contracted, what was requested, what was
approved, and what was finally applied — which are four different numbers that
must all survive.

### 2.2 What the system is asked to guarantee

| # | Guarantee | Enforced by |
|---|---|---|
| G-1 | The contract value on screen is derivable and defensible | BR-09, BR-00 |
| G-2 | No quantity is re-priced without the rate-fixing committee | BR-05, BR-13 |
| G-3 | Every change order's position and holder is visible and timed | BR-12, BR-13, BR-14 |
| G-4 | Completion is computed from the schedule, never typed | BR-02, BR-03, BR-04 |
| G-5 | Original, requested, approved and applied all persist | §5 NN-6 |

---

## 3. Actors

`03 §7`. The distinction between a *system user* and an *external party* is
structural and drives the whole permission model — it is not an implementation
detail.

### 3.1 System users — real accounts

| Actor (AR) | English | Role in the process |
|---|---|---|
| دائرة المهندس المقيم | Resident Engineer (RE) Department | Author of record. Enters, edits and submits change orders; executes the application at the end |
| لجنة أوامر الغيار | Change-Order Committee | Reviews requests, prepares forms, carries the order through endorsement and the ministerial order |
| لجنة تثبيت الأسعار | Rate-Fixing Committee | **Sole authority** for the price of quantity beyond 20% |
| مدير المشروع | Project Manager | Oversight |
| لجنة المراجعة المصادقة | Endorsement Review Committee | Approves added duration when it exceeds a quarter of the contract duration |
| المستوى الإداري الأعلى | Senior Management | Escalation target for overdue stages |

Plus one delegate role:

| مقرّر لجنة أوامر الغيار | Change-Order Committee Rapporteur | Records external parties' decisions on their behalf, against an official letter |

### 3.2 External parties — not system users

These bodies make binding decisions but never log in. Their outcomes are
**recorded inside the owning stage by the rapporteur** (`03 §3`, `03 §4`).

| Party (AR) | English | Decision recorded | May cancel the order |
|---|---|---|---|
| المقاول | Contractor | Requests the change, with proposed cost and duration | — |
| الاستشاري المصمم والمدقق | Designer / checking consultant | Approves the items wholly or partly | — |
| لجنة المراجعة المصادقة | Endorsement review committee | Approves added duration (only when > ¼ of the duration) | Yes |
| الدائرة الإدارية والمالية | Administrative & Financial Dept. | Secures the financial allocation | Yes |
| الوزير / المفوَّض | Minister or delegate | Endorses and issues the ministerial order | — |
| قسم العقود الحكومية | Government Contracts Dept. | Issues the contract addendum | — |

> **FR-ACT-01** ✅ Every externally recorded decision is attributed to the
> **deciding party**, with the delegate shown as the **recorder** — rendered as
> *«لجنة المراجعة المصادقة — سُجِّل بواسطة مقرّر لجنة أوامر الغيار»*. It must never
> appear as the delegate's own decision. *(`03 §4`)*

> **FR-ACT-02** ✅ Every delegated record requires an **official letter number
> and date**. *(`03 §4`)*

### 3.3 Identity in the prototype

> **FR-ACT-03** ✅ The prototype has **no authentication**. A persona switcher
> (*العرض بصفة*) selects the current user. The permission *model* is real and
> resolved server-side; only the identity is simulated. `03 §7` itself requests
> the switcher as the fastest way to review the permission model. *(P-05)*

---

## 4. Domain model

### 4.1 Hierarchy

```
Ministry
└── Beneficiary              university · department · campus · site · facility · other
    └── Project              may serve several beneficiaries
        └── Contract         a project has MANY contracts; a contract has ONE project
            ├── BOQ Item     belongs to exactly ONE contract
            └── Activity     belongs to exactly ONE contract
```

### 4.2 The invariants (`01 §1`)

> **FR-DOM-01** ✅ **Contract scoping.** BOQ items and activities belong to
> exactly one contract. The project is **derived** from the contract and must
> never be asked for again inside a BOQ row, an activity row or a change-order
> form. *(`01 §1`, D-12)*

> **FR-DOM-02** ✅ A change order may **not** contain BOQ items or activities
> from more than one contract. Submission is blocked. *(`02 §7`, BR-07)*

> **FR-DOM-03** 🔨 **No beneficiary column on a BOQ row.** A BOQ item's
> quantity may be split across several beneficiaries, so the relationship is its
> own table, never a column. *(`01 §1`)*

> **FR-DOM-04** 🔨 **BOQ ↔ Activity is many-to-many.** One BOQ item may be
> delivered by several activities; one activity may deliver several BOQ items.
> *(`01 §1`)*

> **FR-DOM-05** 🔨 A BOQ item's quantity may only be distributed to
> beneficiaries **assigned to that project** — never the whole master list, and
> never an inactive beneficiary. *(`01 §2.1`, `02 §8`)*

### 4.3 Derived values — never stored (`01 §3`)

> **FR-DOM-06** ✅ The following are **computed on read and never stored**.
> Adding a column for any of them is a defect.

| Value | Formula | Rule |
|---|---|---|
| Project value | Σ contract **effective** values | BR-00 |
| Contract effective value | original + Σ **applied** amendment deltas | BR-09 |
| Contract effective finish | original finish + Σ applied amendment days | BR-09 |
| BOQ amount | qty × rate, or Σ rate-band amounts | BR-05 |
| BOQ weight | amount ÷ contract BOQ total, to exactly 100.00% | BR-01 |
| Activity weights | from budgeted cost or man-hours | BR-02 |
| BOQ progress | Σ (allocation share × activity progress) | BR-04 |
| Delay penalty | f(effective value, effective finish, forecast finish) | BR-10 |

> **FR-DOM-07** ✅ Where a derived value **cannot yet be derived**, the system
> renders an em dash — never a zero. A 0% progress bar asserts something false.
> *(P-09)*

### 4.4 Core entities

Summarised; full field lists in `01 §2`.

| Entity | Key | Notes |
|---|---|---|
| Beneficiary | `code` | Self-referencing tree. Generic — not hard-coded to "university" |
| Project | `PRJ-####` | Value is derived, not stored |
| Contract | `CNT-####` | `original_value` and `original_finish` **never** overwritten |
| BOQ Item | `BQ-###` per contract | Carries `rate_bands[]` once amended |
| Activity | Primavera ID, e.g. `A1050` | `budgeted_cost` / `budgeted_man_hours` are the weight basis |
| BOQ Distribution | (`boq_id`, `beneficiary_code`) | No duplicate pairs |
| BOQ↔Activity assignment | (`boq_id`, `activity_id`) | `share_pct` auto, overridable, `is_manual` flag |
| Change Order | `VO-##` | Contract selected first, scopes everything |
| Contract Amendment | `no` 0..n | Created **only** on apply |

---

## 5. The five non-negotiables

These came out of client review. They are the requirements most likely to be
"simplified" by mistake, and each one has cost money in the real process.

### NN-1 — The contract is the working context

> **FR-NN-01** ✅ A BOQ item and an activity each belong to exactly one
> contract. The project is derived and never asked for again. One change order
> may never span two contracts. *(`01 §1`, D-12)*

*Why:* a project may run civil and electromechanical contracts with different
contractors, values and dates. A quantity moved between them is a transfer
between two legal agreements, not an edit.

### NN-2 — Approved ≠ Applied ≠ Closed

> **FR-NN-02** ✅ **Approving a change order changes nothing.** Applying it
> creates a contract amendment and moves quantities, dates and the penalty
> baseline. Closing verifies the application. *(`03 §6`, BR-09, D-09)*

> **FR-NN-03** ✅ *(Contracts list; 🔨 elsewhere)* Approved-but-unapplied orders
> are shown as a **projection**, clearly labelled and visually separated. They
> are **never** folded into effective figures. *(`02 §9`)*
>
> Verified on the Contracts screen: `CNT-0279` displays **250,000,000** — the
> awarded 240,000,000 plus one *applied* amendment of 10,000,000 — with a
> separate note reading *بانتظار التطبيق +3,000,000* for the approved-but-unapplied
> second amendment. The 3,000,000 is **not** in the figure.

*Why:* this is the difference between what the ministry has agreed and what it
owes. Folding the two together overstates committed value across the portfolio.

### NN-3 — The 20% rule

> **FR-NN-04** ✅ For a quantity **increase or decrease**, the portion up to
> **20% of the ORIGINAL quantity** is valued at the **original unit rate**.
> Only the portion beyond 20% may carry a new rate. Applied **per BOQ line**,
> to change types `increase` and `decrease` only. *(`02 §5`, BR-05)*

> **FR-NN-05** ✅ The new rate is a **proposal** wherever it is entered. The
> binding rate is set only by **لجنة تثبيت الأسعار**, at its own stage. The
> wizard never sets it. *(`02 §5`)*

> **FR-NN-06** 🔨 When any line trips the threshold, the rate-fixing stage is
> **inserted into that order's approval chain**. *(`03 §2`, BR-13)*

### NN-4 — Two proposals, one decision

> **FR-NN-07** ✅ Each affected line carries **two proposals**: مقترح المقاول
> (contractor) and مقترح د.م.م (RE department). The RE department's figure
> **governs display** once entered; before that the contractor's is shown and
> labelled as such. Divergence is shown explicitly. *(`02 §6`, BR-06)*

> **FR-NN-08** ✅ **Neither is the approved value.** The approved value comes
> only from the pricing committee at financial review. Until then every
> approved-value field reads *يُحدَّد في التدقيق المالي* and the revised contract
> value is labelled **تقديرية** (indicative). *(`02 §6`, D-08)*

### NN-5 — External parties are statuses, not stages

> **FR-NN-09** ✅ Bodies that are not system users have their outcome recorded
> **inside the owning stage**, by the rapporteur, against an official letter
> number and date. They are not workflow stages. *(`03 §3`, D-10)*

> **FR-NN-10** 🔨 A stage with pending external parties **cannot be completed**.
> Its counter reads **n / m** received. *(`03 §3`)*

### NN-6 — Original values are never overwritten

> **FR-NN-11** ✅ `original`, `before`, `requested`, `approved` and `applied`
> are separate persisted values. All of them survive. Any amended BOQ item or
> activity must be able to answer *"which change orders amended me, in what
> order, and what did each one do."* *(`01 §4`, `07 §7.7`)*

---

## 6. Functional requirements — enterprise

Eight cross-portfolio screens (`04 §2`).

| ID | Screen | Contents | Status |
|---|---|---|---|
| FR-ENT-01 | Executive Portfolio | KPI band (one hairline band, auto-fit), contract-status donut with legend, effective value by entity, and the approved-but-unapplied projection stated separately | ✅ |
| FR-ENT-01a | Portfolio progress & EVM | Physical %, financial %, SPI, CPI and the S-curve. **Rendered as "unavailable + reason" tiles**, not as zeroes — each names the input it waits for (BR-04 / payments / BR-11). Becomes real in Phase 4 | ✅ *as unavailable* |
| FR-ENT-02 | Projects | Cross-portfolio list, search + status filters, workspace scoping | ✅ |
| FR-ENT-03 | Contracts | Cross-portfolio contract list showing the **effective** value, the applied-amendment delta, and the approved-but-unapplied projection as a separate labelled note | ✅ |
| FR-ENT-04 | Entities | Dense sortable master table of the universities and units that own projects — code · name · type · active · projects · effective value · completion | ✅ |
| FR-ENT-04a | Beneficiaries master list | **WITHDRAWN (P-174).** There is no second register: a beneficiary is a workspace playing a role on a project, so `Workspaces` (FR-ENT-04) is the list, and the BOQ drawer ticks rows of it. The `01 §2.1` parent tree went with it | ❌ Withdrawn |
| FR-ENT-05 | Schedule Control | Portfolio schedule health: baseline (the **effective** contractual finish, BR-09) vs recorded forecast, worst-contract delay (BR-10) naming the contract that drives it, and three states — delayed · on track · **no schedule position**. Critical-activity count renders "unavailable + reason" until Activities exists | ✅ |
| FR-ENT-06 | Alerts Center | Severity band of four filter cards (count · share · what the count means), searchable and filterable register, and **acknowledgement as a persisted write** attributed to the acting persona. Severity is a glyph + colour + name, never colour alone | ✅ |
| FR-ENT-07 | Reports & Analytics | Trend, by status, by workspace, by branch, period + export | 🔨 |
| FR-ENT-08 | Administration | Control centre, users, roles, permission matrix, master data, audit log | 🔨 |

> **FR-ENT-09** ✅ The Projects list is **workspace-scopable**. When scoped to
> one workspace the heading, subtitle and column set all change, and the
> Workspace column is **hidden** — inside one workspace every row would repeat
> the same value. *(`04 §2`, reference `DProjectsAll`)*

> **FR-ENT-10** 🔨 The contract-status donut is **the single place** status
> colours are used to encode data. Everywhere else status colour means status.
> *(`05 §1`)*

---

## 7. Functional requirements — project workspace

### 7.1 Shell

> **FR-WS-01** 🔨 Three panes: **queue** (project list) · **detail** (tabs) ·
> **context** (contextual actions, parties, per-tab edit history). *(`04 §3`)*

> **FR-WS-02** 🔨 Fifteen tabs: Overview · Project Information · Contract ·
> BOQ · Schedule · Progress · Financials · **Change Orders** · Risk · 3D Model ·
> Meetings & Actions · Documents & Drawings · Alerts · Reports · Audit History.
> **Only tabs that exist appear** — a tab leading to a blank pane is worse than
> no tab. *(`04 §3`)*

### 7.2 Contract tab

| ID | Requirement | Source | Status |
|---|---|---|---|
| FR-CON-01 | Identity/dictionary section and cost breakdown (award, reserve, supervision) | `04 §7` | 🔨 |
| FR-CON-02 | **Amendments (ملاحق)**: version chain original → n, each with source order, delta value, delta days, resulting value/finish, state pill | `04 §7` | 🔨 |
| FR-CON-03 | Approved-but-unapplied orders listed **separately** with the projection | `02 §9` | 🔨 |
| FR-CON-04 | **Penalties**: per-day rate, cap, delay days, amount — **before vs after** the applied amendments, with the waived amount | `04 §7`, BR-10 | 🔨 |
| FR-CON-05 | Payments register | `04 §7` | 🔨 |

### 7.3 BOQ tab — the densest screen in the system

> **FR-BOQ-01** 🔨 A **contract selector comes first**. Nothing renders until a
> contract is chosen — the empty state reads *«اختر عقداً للبدء»*. Switching
> contracts re-scopes everything. *(`04 §4`)*

> **FR-BOQ-02** 🔨 Three views: **السجل** (register) · **توزيع الكميات**
> (distribution) · **الربط بالأنشطة** (activity assignment). *(`04 §4`)*

**Register** (`04 §4`):

| ID | Requirement | Status |
|---|---|---|
| FR-BOQ-03 | Columns: code (+ amendment badge) · description · unit · quantity (+ signed delta) · unit rate · amount · weight · نسبة التنفيذ · distribution status · row actions | 🔨 |
| FR-BOQ-04 | Weights sum to **exactly 100.00%** in the footer (BR-01) | 🔨 |
| FR-BOQ-05 | Inline row editing with a live amount; delete confirms in-row and **clears that item's distribution** | 🔨 |
| FR-BOQ-06 | **No BOQ row exposes project, WBS or location** — derived or belonging elsewhere | 🔨 |

**Distribution drawer** (`04 §4`, `02 §8`):

| ID | Requirement | Status |
|---|---|---|
| FR-BOQ-07 | Header: code, description, unit, total quantity. Editable table: beneficiary · site · quantity · remove | 🔨 |
| FR-BOQ-08 | Summary of total / distributed / remaining-or-excess with the state pill | 🔨 |
| FR-BOQ-09 | Each input is **capped** at the remaining quantity, with an inline explanation of the cap — prevention, not post-hoc validation | 🔨 |

**Activity assignment** (`04 §4`, `02 §3`):

| ID | Requirement | Status |
|---|---|---|
| FR-BOQ-10 | Cost / man-hours basis toggle | 🔨 |
| FR-BOQ-11 | Per BOQ item: linked activities with absolute weight, allocation %, assigned amount and status | 🔨 |
| FR-BOQ-12 | Allocation is **manually overridable and saved per item**, with a reset that restores the computed value | 🔨 |
| FR-BOQ-13 | Coverage counters for full / partial / over / unassigned | 🔨 |

### 7.4 Schedule tab

| ID | Requirement | Source | Status |
|---|---|---|---|
| FR-SCD-01 | Gantt with a **resizable** pinned column block — drag handle, floor 160px, default 320px | `04 §5` | 🔨 |
| FR-SCD-02 | Nine info columns on an explicit grid; headers **wrap, never truncate** | `04 §5` | 🔨 |
| FR-SCD-03 | Bars carry **status as fill**; the **critical path is a 2px ring, not a colour** — the colour channel belongs to status | `04 §5` | 🔨 |
| FR-SCD-04 | Data-date line and milestone diamonds as graphic tokens | `04 §5` | 🔨 |
| FR-SCD-05 | WBS tree shows **both** relative and absolute weight per node | `04 §5`, BR-02 | 🔨 |
| FR-SCD-06 | Below 1280px a column picker defaults to 4 essential columns | `04 §5` | 🔨 |

### 7.5 Progress and Financials

| ID | Requirement | Source | Status |
|---|---|---|---|
| FR-PRG-01 | Changing an activity's progress updates BOQ progress, achieved quantity and achieved amount **live** | `02 §4`, BR-04 | 🔨 |
| FR-FIN-01 | Budget / disbursed / advances / retention / due, and a payments register | `04 §3` | 🔨 |
| FR-FIN-02 | EVM (CPI/SPI/EAC/VAC) presented as **diagnostics** — never headline figures, never coloured by threshold | `02 §11`, `05 §7.9` | 🔨 |

### 7.6 Amendment disclosure — shared by BOQ and Schedule

> **FR-AMD-01** 🔨 An **amendment badge** on the code/ID cell showing the count
> of amending orders in three states: all applied · all pending · **mixed**. The
> badge is the control that opens the history panel. *(`04 §6`)*

> **FR-AMD-02** 🔨 **Cell delta**: the effective figure plus a compact signed
> delta, coloured settled vs pending. **No strikethrough.** *(`04 §6`)*

> **FR-AMD-03** 🔨 An identical drawer for BOQ items and activities showing the
> effective position, the applied amendment sequence, approved-pending changes
> **visually separated with a warning that they are excluded from effective
> figures**, and the rate-band breakdown with the 20%-rule explanation.
> *(`04 §6`)*

### 7.7 Remaining tabs

| ID | Tab | Requirement | Status |
|---|---|---|---|
| FR-RSK-01 | Risk | Register + 5×5 severity grid + issues | 🔨 |
| FR-MTG-01 | Meetings & Actions | Meetings with action items | 🔨 |
| FR-DOC-01 | Documents & Drawings | Versioned register with approval status | 🔨 |
| FR-ALR-01 | Alerts | Project-scoped alert feed | 🔨 |
| FR-RPT-01 | Reports | Project-scoped reports | 🔨 |
| FR-AUD-01 | Audit History | Full entity history | 🔨 |
| FR-MDL-01 | 3D Model | **Stub** — tab kept, massing placeholder + object list, no BIM viewer | ⏸ |

---

## 8. Functional requirements — change orders

The most heavily specified part of the system. **أمر الغيار** — a change order —
is the instrument by which a contract is legally modified.

### 8.1 Before the system

> **FR-CHG-01** 🔨 The contractor's request and the consultant's opinion are
> recorded as **inputs preceding entry**, each with an official letter number
> and date. They are **not** workflow stages and those parties are **not**
> system users. *(`03 §1`)*

### 8.2 The register (`03 §10`)

| ID | Requirement | Status |
|---|---|---|
| FR-CHG-02 | Four groups: **بحاجة إلى إجراء** · **قيد الاعتماد** · **المعتمدة والمغلقة** · **المرفوضة** | 🔨 |
| FR-CHG-03 | A **بانتظار إجرائي** filter driven by the viewer relation (BR-14) | 🔨 |
| FR-CHG-04 | **Five compact indicators only** — net approved value, pending, needs action, overdue, average approval cycle. No large cards, no charts | 🔨 |
| FR-CHG-05 | Per row: number · title · type · cost impact · time impact · status · current stage · current owner · last action date · attachment count | 🔨 |
| FR-CHG-06 | The status column carries the lifecycle pill **plus** exception chips (متأخر · يحتاج إجراء · فشل التطبيق) **plus** the viewer-relation chip. Status is not duplicated in the title column | 🔨 |

### 8.3 The creation wizard — five steps (`03 §8`)

> **FR-WIZ-01** 🔨 **The contract is selected FIRST** and scopes everything:
> only that contract's BOQ items and activities are selectable, and its current
> value loads automatically. A read-only context header shows project name,
> contract number, contract name, current value and status.

| Step | ID | Requirement | Status |
|---|---|---|---|
| 1 | FR-WIZ-02 | **Two type cards only**: هندسي (cost/duration) or تجهيز (supply/redistribution). **الأسباب الموجبة** as a free textarea — no preset reason list. Responsible party, incoming letter number and date | 🔨 |
| 2 | FR-WIZ-03 | BOQ items **and** activities in one step as two tabs, each showing its selected count — one order commonly contains both. Existing register tables reused; no new card layouts | 🔨 |
| 2 | FR-WIZ-04 | BOQ columns: select · code · description · unit · current quantity · unit rate · current amount · **BOQ weight (fetched, never entered)**. Filters: search, division, location, category, status — **no WBS filter** | 🔨 |
| 2 | FR-WIZ-05 | Only the fields relevant to the chosen change type are shown (see table below) | 🔨 |
| 2 | FR-WIZ-06 | **Both proposals side by side per line**, with an excess-rate field per proposal when the 20% threshold is crossed | 🔨 |
| 2 | FR-WIZ-07 | An explicit **split sub-row** stating the tier in words — *«20 م3 بالسعر الأصلي 74,856 · 10 م3 زائدة عن 20% بسعر …»* — naming لجنة تثبيت الأسعار as the final authority | 🔨 |
| 2 | FR-WIZ-08 | **"Add new BOQ item" does not exist here.** New items come from BOQ Management | 🔨 |
| 2 | FR-WIZ-09 | Activity columns: select · ID · name · start · finish · progress · remaining duration. **No WBS, project, calendar, float or relationships.** Values render as **Current · Proposed change · Revised** | 🔨 |
| 3 | FR-WIZ-10 | Impact summary — one section, no large cards. Includes contractor proposal, RE dept proposal, approved value (*يُحدَّد في التدقيق المالي*), revised contract value (**تقديرية**), lines beyond 20%, and the excess-rate authority | 🔨 |
| 4 | FR-WIZ-11 | Attachments with six categories | 🔨 |
| 5 | FR-WIZ-12 | Review with the **expected approval path rendered from the actual conditions** — rate-fixing appears only if a line exceeded 20%; endorsement only if the extension exceeds ¼ of the duration. **Two buttons only**: حفظ كمسودة, إرسال للمراجعة | 🔨 |

**Change-type fields** (`03 §8`):

| Change type | Fields shown |
|---|---|
| Increase quantity | current qty · increase · revised qty *(+ excess-rate if > 20%)* |
| Decrease quantity | current qty · decrease · revised qty *(+ excess-rate if > 20%)* |
| Change unit rate | current rate · new rate · amount difference |
| Cancel item | remaining quantity · cancelled amount |
| Redistribution | source BOQ · target BOQ · transferred quantity |

> **FR-WIZ-13** 🔨 Standing note on activity changes: *«تعديل مدة النشاط لا يُعد
> تعديلاً لمدة المشروع — الأثر النهائي يُحدَّد في مرحلة تحليل الجدول.»* *(`03 §8`)*

### 8.4 The six-stage workflow (`03 §2`)

| # | Stage (AR) | English | Owner | Condition |
|---|---|---|---|---|
| 1 | دراسة الطلب | Request study | RE Department | always |
| 2 | لجنة أوامر الغيار | Change-order committee | CO Committee | always |
| 3 | تثبيت الأسعار | Rate fixing | Rate-Fixing Committee | **only if a line exceeds 20%** |
| 4 | المصادقة والتخصيص | Endorsement & allocation | CO Committee | **only if endorsement or funding is needed** |
| 5 | الأمر الوزاري وملحق العقد | Ministerial order & addendum | CO Committee | always |
| 6 | التنفيذ | Execution | RE Department | always |

> **FR-WFL-01** ✅ **Skipped stages are listed explicitly with the reason**
> ("no line exceeded 20%") — never silently omitted. *(`03 §2`, BR-13)*

> **FR-WFL-02** ✅ Four decisions per stage, available to the owning party:
> **approve** advances to the next applicable stage · **reject** terminates ·
> **return** sends it back to the previous stage **with full history and prior
> versions preserved** · **cancel** terminates when an external party rejects.
> *(`03 §5`)*

> **FR-WFL-03** ✅ **Action gating.** Approve / reject / return / cancel /
> resubmit / apply / advance-stage render **only** when the viewer relation is
> `awaiting` or `recorder`. Otherwise the system shows an explicit locked note —
> *«لا إجراءات متاحة لهذه الصفة»* — **never a disabled button with no
> explanation**. *(`03 §7`, BR-14)*

> **FR-WFL-04** ✅ Per-stage SLA. A stage past its SLA is `overdue`, raises the
> order's needs-action flag, and **auto-escalates to senior management**.
> Measured from the **project data date**, never the wall clock. *(`02 §12`,
> BR-12, D-06)*

### 8.5 Lifecycle and application

```
draft → pending → [returned ⇄ pending] → approved
                                       → approved-applying → closed
                → rejected / cancelled
```

> **FR-WFL-05** 🔨 **Applying** an approved order creates a contract amendment
> and moves: the contract value, the contract finish and duration, BOQ effective
> quantities and rate bands, schedule effective dates, and the penalty baseline.
> *(`02 §9`, BR-09)*

> **FR-WFL-06** 🔨 A **seven-step application checklist**, shown compactly with
> details only on expand or failure:
> 1. تحديث قيمة العقد — update the contract value
> 2. تحديث كميات البنود — update BOQ quantities
> 3. تحديث أسعار الوحدات — update unit rates *(only if a rate changed)*
> 4. إعادة احتساب الأوزان — recalculate weights
> 5. تحديث الأنشطة — update activities
> 6. تحديث الجدول الزمني — update the schedule
> 7. التحقق النهائي — final verification

> **FR-WFL-07** 🔨 A **failed step** keeps the order in `approved-applying`,
> raises a **فشل التطبيق** flag in the register, and surfaces on the affected
> line. Step 4 must be **genuinely failable**. *(`03 §6`)*

> **FR-WFL-08** 🔨 Weight-recalculation reporting: the sum before, the sum
> after, whether it equals 100%, and the last recalculation date. *(`03 §6`)*

### 8.6 The record page — six tabs (`03 §9`)

> **FR-REC-01** 🔨 Sticky header: order number · title · lifecycle pill · type ·
> contract number · request date · requested value · approved value · requested
> days · approved days · current stage · application status. **No project name**
> (the page opens inside the project) and **no repeated contract detail**.

| Tab | ID | Contents | Status |
|---|---|---|---|
| 1 الملخص | FR-REC-02 | Order information · inputs preceding entry · impact summary · contract before/order/after · decision summary · the 7-step checklist | 🔨 |
| 2 الكميات والكلفة | FR-REC-03 | **One** comparison table under grouped **Before / Requested / Approved / Applied** headers, covering quantity, unit rate, value and weight, plus per-line application status. **Only changed figures are marked, never whole rows.** Then the weight report and, for supply orders, the redistribution table | 🔨 |
| 3 الأثر الزمني | FR-REC-04 | Affected activities, requested/analysis/approved days, project finish before/forecast/approved, critical-path effect, activity comparison table | 🔨 |
| 4 المسار | FR-REC-05 | Current stage, owner, referral date, days elapsed, overdue flag, required action; then the six-stage timeline, each expanding to dates, duration, SLA, decision, external-party statuses and letters | 🔨 |
| 5 المرفقات | FR-REC-06 | Table with version and originating stage. **Versions accumulate; files are never replaced** | 🔨 |
| 6 السجل | FR-REC-07 | Audit trail: date/time · user · action · stage · **previous value → new value** · note · version | 🔨 |

> **FR-REC-08** 🔨 Excluded from the main tables and confined to the side panel:
> project, WBS, location, linked activities inside the BOQ table, calendar,
> relationships, constraints, total float. *(`03 §9`)*

---

## 9. Business rules

Each rule is **exactly one pure function** in `api/Epm.Api/Domain/`, with its
worked example as a unit test and executed live at `GET /api/docs/rules`.
All fourteen are implemented and tested (128 tests).

| ID | Rule | Plain statement | Source | Status |
|---|---|---|---|---|
| BR-00 | Project value | Σ of the contracts' **effective** values | `01 §3` | ✅ receives effective values as of Phase 2.1 |
| BR-01 | BOQ weight | An item's share of its **contract's** BOQ total, summing to exactly 100.00% by largest-remainder rounding | `02 §1` | ✅ |
| BR-02 | Schedule weights | Absolute = share of the whole schedule; relative = share of the parent WBS node. Basis is budgeted cost or man-hours | `02 §2` | ✅ |
| BR-03 | Allocation | The user **never types an allocation %** — it derives from activity absolute weight, overridable per item | `02 §3` | ✅ |
| BR-04 | Progress reflection | BOQ progress is the allocation-weighted mean of its activities' progress | `02 §4` | ✅ |
| BR-05 | **The 20% rule** | Up to 20% of the **original** quantity at the original rate; only the excess may be re-priced | `02 §5` | ✅ |
| BR-06 | Two proposals | RE dept governs display; approved value comes only from the pricing committee | `02 §6` | ✅ |
| BR-07 | Validation gates | Five conditions that **block** submission | `02 §7` | ✅ |
| BR-08 | Distribution | Quantity split across the **project's** beneficiaries, inputs capped | `02 §8` | ✅ |
| BR-09 | Amendments | Approving changes nothing; **applying** creates an amendment | `02 §9` | ✅ |
| BR-10 | Delay penalty | 0.1% of contract value per day, capped at 10% | `02 §10` | ✅ |
| BR-11 | Earned value | PV/EV/AC → CPI/SPI/EAC/VAC, as **diagnostics** | `02 §11` | ✅ |
| BR-12 | Lead time & SLA | Measured from the official letter against the **project data date** | `02 §12` | ✅ |
| BR-13 | Workflow machine | Six stages, two conditional, skips shown with reasons | `03 §2,5,6` | ✅ |
| BR-14 | Viewer relation | Exactly one of awaiting/recorder/acted/upcoming/none drives all gating | `03 §7` | ✅ |

### 9.1 Worked examples that must always hold

These are the client's own figures. They are unit tests, and they run live on
the rules endpoint.

| Rule | Example | Expected |
|---|---|---|
| BR-01 | Amounts 56,131,000 and 43,869,000 | **56.13% / 43.87%**, sum exactly 100.00% |
| BR-02 | Value 36 of 100, parent 60 | absolute 36%, relative 60% |
| BR-03 | Weights 5.8 / 5.2 on 26,730,000 | shares 52.7% / 47.3%, assigned **14,094,000 / 12,636,000**, coverage full |
| BR-04 | Share 52.6% at 100% progress, 26,730,000 | progress 52.6% → achieved **14,059,980** |
| BR-05 | Original 100, add 30 | threshold 20 → **20 at the original rate, 10 at the new rate** |
| BR-07 | Decrease 30 with 10 remaining | **blocked**, one blocker per proposal |
| BR-08 | Qty 120, rows 40 + 50 | distributed 90, remaining 30, **partial** |
| BR-09 | +5,000,000 / +45 days on 100,000,000 | amendment 1, value **105,000,000**, finish **2026-08-14** |
| BR-10 | 100,000,000, finish 2026-06-30, forecast 2026-08-30 | 61 days → **6,100,000**; after the order **1,680,000**, **waived 4,420,000** |
| BR-12 | Data date 2026-08-02, letter 2026-07-11 | 22 days, **overdue** |
| BR-13 | No line over 20%, no endorsement | stages 3 and 4 **skipped with reasons**; approving at 2 advances to **5** |

> **Note on BR-03.** `02 §3`'s prose states 14,092,710 / 12,637,290, which does
> not match its own rule applied to the weights it states — the spec computed
> from unrounded weights while quoting them to 1 decimal, and `02 §4` admits the
> same of its own example. The delta is 1,290 IQD (0.005%). **The rule is
> binding, not the illustration** (P-15).

### 9.2 The five validation gates (BR-07)

Submission is **blocked**, not warned:

| Gate | Condition |
|---|---|
| Decrease exceeds remaining | `deltaQty > (contractedQty − executedQty)` — checked for **each proposal separately** |
| Redistribution without target | type is redistribution and no target BOQ item is selected |
| Redistribution unbalanced | Σ quantity drawn ≠ Σ quantity distributed |
| Empty order | no BOQ lines **and** no activities |
| Cross-contract | any line or activity outside the selected contract |

> **FR-VAL-01** ✅ Prefer **preventing** invalid input — cap the field at the
> maximum and explain the cap — over flagging it afterwards. Blockers are shown
> as a list on the review step **with a link to the offending line**. *(`02 §7`)*

---

## 10. Data requirements

### 10.1 Value lists

Twenty enumerations (`06 §1`–`§11`), all bilingual with **Arabic as the primary
label**. Maintained as data, not code, because business users own them.

| List | Count | Examples |
|---|---|---|
| Project status | 5 | مستمر · منجز · متأخر · متوقف · ملغى |
| Execution stage | 12 | تصميم … الاستلام والتسليم |
| Project type | 8 | بناء وتشييد · تأهيل · بنى تحتية … |
| Contract status (extended) | 9 | the 5 + لم يباشر به · موقوف بأمر إداري · تسوية حسابات · سحب عمل |
| Funding type | 10 | الموازنة الاتحادية · منحة · صندوق الإعمار … |
| Beneficiary type | 6 | جامعة · دائرة · حرم جامعي · موقع · منشأة · أخرى |
| Change-order type | **2** | هندسي · تجهيز |
| BOQ change type | 5 | زيادة · نقص · تعديل السعر · إلغاء · إعادة توزيع |
| Activity change type | 5 | زيادة/تقليل المدة · بداية · نهاية · كليهما |
| Order lifecycle | 8 | مسودة … مغلق · مرفوض · ملغى |
| Decisions | 4 | موافقة · رفض · إعادة للتعديل · إلغاء الموضوع |
| Application-step status | 5 | غير مطلوب · لم يبدأ · قيد التنفيذ · مكتمل · فشل |
| Weight-recalc state | 5 | لم يُحتسب · محسوب للمراجعة · معتمد · مطبق · فشل التحقق |
| External-party state | 4 | بانتظار الجهة · وردت · أُعيد · غير مطلوب |
| Viewer relation | 5 | بانتظار إجرائك · تسجيل نيابة · تم إجراؤك · سيصلك لاحقاً · للاطلاع |
| Attachment category | 6 | كتاب رسمي · مخطط · كشف كميات · تحليل · صور موقع · مستند داعم |
| Amendment state | 5 | العقد الأصلي · مُستبدَل · النافذ · بانتظار التطبيق · قيد التطبيق |
| Activity status | 5 | لم يبدأ · قيد التنفيذ · متقدّم · متأخر · مكتمل |
| Distribution state | 4 | غير موزّعة · جزئياً · كلياً · تتجاوز الكمية |
| Allocation coverage | 4 | غير مخصص · بالكامل · جزئياً · زائد |

> **FR-DAT-01** ✅ Other tables store the **code**, never the label. Changing a
> code to fix a label breaks every row that stores it.

> **FR-DAT-02** ❓ **"Add new BOQ item" is deliberately absent** from the
> change-order wizard's BOQ change types. New items are created in BOQ
> Management. *(`06 §7`)*

### 10.2 Money and precision

> **FR-DAT-03** ✅ Money is `decimal` (or integer minor units) — **never
> float**. The 20%-rule splits and largest-remainder rounding must be exact.
> Iraqi Dinar is displayed as an integer. *(`07 §2`, D-11)*

> **FR-DAT-04** ✅ Quantities and percentages carry four decimal places.

### 10.3 Time

> **FR-DAT-05** ✅ **"Now" is the project's data date** in demo mode
> (2026-08-02) and the real clock in production. **Never a hard-coded date and
> never the wall clock in demo mode** — a fixed "today" made every seeded change
> order look years late once dates became contract-relative. *(D-06)*

### 10.4 Audit

> **FR-DAT-06** 🔨 Every entity a change order can touch keeps its history:
> **who, when, previous value, new value, source order, stage, version**.
> *(`01 §4`)*

### 10.5 Demo data

> **FR-DAT-07** ✅ The database **starts empty**. The `06 §12` scenario loads
> only on demand. Its figures are **illustrative, not ministry data**, and are
> labelled as such in the code. *(P-03)*

> **FR-DAT-08** ✅ Because empty is the default, **every screen needs a real
> empty state**, and "empty database" and "a filter excluded everything" are two
> different states with two different messages and two different buttons.
> *(`04 §9`)*

The seed scenario (`06 §12`) is one project with **two contracts** and **six
change orders** spanning every lifecycle state — including one pending and past
SLA, one pending and inside SLA (proving *pending* and *overdue* are different
sets), one returned, and one approved-but-applying with the weight step failed.

---

## 11. Non-functional requirements

### 11.1a Design system — v1.1

> **NFR-DS-01** ✅ The interface is built on the **v1.1 design system**, adopted
> at Phase 1.5 before any further screens were built. Cool-grey canvas, EPM blue
> as the single interactive colour, Inter for Latin and Cairo for Arabic.
> *(`05 §1`, re-baselined)*

> **NFR-DS-02** ✅ Every page follows the **zone contract**: global bar →
> identity bar (breadcrumb, title, at most three secondary actions plus one
> primary) → toolbar → content → context panel. Page actions live in the
> identity bar, never in the global bar. *(v1.1 design language)*

> **NFR-DS-03** ✅ Every register is **one bordered card** containing a toolbar
> strip, the table, and a pager strip. Filters live above the grid — never in the
> global bar, never overlaying the grid — and the result count is always visible.

> **NFR-DS-04** ✅ A **dark theme** is available. See §12 item 11: it is
> delivered, but whether it is formally in scope needs confirming, because it
> doubles the visual verification surface for every screen.

> **NFR-DS-05** ⚠️ Two v1.1 colour values were corrected on adoption to satisfy
> `NFR-A11Y-01` — `--outline` and `--viz-base`, which ship at 2.16:1 against a
> binding 3:1 floor. **The correction was REVERTED at Phase 2.9 on the client's
> instruction** that the screens match the signed-off prototype exactly. They
> now render at v1.1's own values. *(`05 §1.6`, DECISIONS.md "REVERTED")*

### 11.1 Language and direction

> **NFR-LNG-01** ✅ **Arabic RTL is primary, not a translation layer.** Arabic
> is the default language and the document starts in RTL. *(`05 §5.1`)*

> **NFR-LNG-02** ✅ Logical CSS properties only (`inset-inline-start`, not
> `left`). *(`05 §5`)*

> **NFR-LNG-03** ✅ **Every number, date, ID, duration, currency amount and
> reference string is bidi-isolated** (`<bdi>`). Unisolated values are a defect
> even when they happen to look right — "0.92 / 1.05" renders with the slash
> leading the line without isolation. *(`05 §5.2`)*

> **NFR-LNG-04** 🔨 Every screen renders in **both** languages with no
> untranslated key. *(`07 §7.6`)*

### 11.2 Accessibility — binding

`05 §7` came out of a formal adversarial audit. These are **requirements, not
preferences**.

> ⚠️ **`NFR-A11Y-01` is NOT met in the current build, by client decision.**
> Four measured breaches are shipped deliberately so the screens are
> indistinguishable from the signed-off prototype: `--outline`/`--viz-base` at
> 2.16:1, `--fg-subtle` used as text at 3.07:1, `--fs-100` at 10px, and the
> threshold-coloured delay figure on SCR-E5. Each was corrected and then
> reverted; the measurements and exact restoring values are in DECISIONS.md
> under "REVERTED". **This needs an explicit production decision** — `05 §7` is
> written as binding, and a government system is the likeliest place for that
> to be tested. See §12 P-37.

| ID | Requirement |
|---|---|
| NFR-A11Y-01 | Text ≥ 4.5:1; borders, icons and graphics ≥ 3:1 |
| NFR-A11Y-02 | `--outline` and `--viz-base` are **graphic tokens** — using them as text colour is a defect |
| NFR-A11Y-03 | Fill hues are never text colours; use the `-tx` variants |
| NFR-A11Y-04 | `18px/700` does **not** qualify as large text |
| NFR-A11Y-05 | **No colour carries two meanings** — status colour never on a button or link; interactive colour never as a data series |
| NFR-A11Y-06 | **Status is never colour-only** — every pill carries a label |
| NFR-A11Y-07 | `:focus-visible` on **every** interactive element |
| NFR-A11Y-08 | Criticality and coverage use non-colour channels (rings, dots, icons) so the colour channel stays free for status |
| NFR-A11Y-09 | **Never colour a magnitude by threshold** with a status hue — green on an ordinary number reads as "approved". The neutral branch is `--on-surface` |
| NFR-A11Y-10 | Disabled state uses explicit colour values, never opacity |
| NFR-A11Y-11 | Type scale is exactly 11 / 11.5 / 12 / 13 / 15 / 18 / 21 / 24. Nothing below 11px |
| NFR-A11Y-12 | **No uppercase, no letter-spacing** — Arabic has no case and letter-spacing breaks its shaping |

### 11.3 Layout

| ID | Requirement | Source |
|---|---|---|
| NFR-UI-01 | Sections are **label + space**, never nested boxes | `04 §3` |
| NFR-UI-02 | **Nothing floats** — separation is hairlines and plane changes, never shadows | `05` |
| NFR-UI-03 | Summary strips use `repeat(auto-fit, minmax(120px,1fr))` — **never** a pinned column count, never `flex: 1 1 <basis>` | `05 §8` |
| NFR-UI-04 | Registers are dense tables with sticky headers and tabular numerals. **Tables are the primary element, not cards** | `04 §3` |
| NFR-UI-05 | Secondary detail goes in a **drawer**, not an in-place expander | `04 §3` |
| NFR-UI-06 | Count-up animations **seed the settled value** and respect `prefers-reduced-motion` | `05 §6` |

### 11.4 Responsive

> **NFR-RSP-01** 🔨 Breakpoints **1440 / 1280 / 1024 / 768**. At all four: no
> table header may truncate, the Gantt must remain inside its pane, and KPI
> strips reflow 5 → 5 → 3 → 2. *(`04 §10`)*

### 11.5 Architecture and traceability

> **NFR-ARC-01** ✅ **All business arithmetic lives in the domain layer.** An
> endpoint may filter, join, sort and project; it may not compute a weight, a
> share, a tier split, a penalty or a lifecycle transition. The UI computes
> nothing but display formatting. *(`07 §3`)*

> **NFR-ARC-02** ✅ Every rule in `02` maps to **exactly one** exported
> function. *(`07 §7.1`)*

> **NFR-ARC-03** ✅ Every endpoint and its UI caller share a traceability
> anchor, so one search returns every touchpoint across both stacks.

> **NFR-ARC-04** ✅ **Documentation as code**: every rule carries its spec text
> and a worked example that is both a unit test **and** executed live on the
> rules route. Documentation and behaviour cannot diverge silently. *(`07 §5`)*

> **NFR-ARC-05** ✅ **Domain tests never read the database.** Worked examples
> stay inline from the specification, so a wrong fixture figure cannot make a
> test lie. *(P-04)*

### 11.6 Security

> **NFR-SEC-01** ⏸ The prototype has **no authentication** — a persona header
> stands in. The permission model is real and server-resolved; the identity is
> not, and the header is trivially spoofable. **Production requires real
> authentication before any deployment carrying ministry data.** *(P-05)*

---

## 12. Open questions requiring a client decision

These are unresolved. Each will harden into contract values if it is left
undecided, so each needs an explicit answer from the department.

| # | Question | Current assumption | Impact if wrong |
|---|---|---|---|
| **D-01** | When two orders each add quantity beyond 20%, does the **second** order's threshold use the **original** quantity or the current effective one? | Original (`line.contractedQty`) | Changes the price of every re-priced quantity after the first amendment |
| **D-02** | Is the delay penalty really **0.1%/day capped at 10%**? | Yes, per the prototype | Directly changes penalty amounts; must be confirmed against the contract template |
| **D-03** | What is the real **SLA per stage**? | A uniform 5 days | Drives overdue flags and automatic escalation to senior management |
| **D-04** | May the rapporteur record a **cancellation** on behalf of *any* external party, or only the two flagged as able to cancel? | Only the endorsement committee and the administrative & financial department | Determines who can terminate an order |
| **D-05** | When a decrease forces a distribution revision, **who revises it** — the RE department or the beneficiary? | Not fixed | Blocks application until resolved |
| **P-12** | Which **execution-stage list** does the client mean? `06 §2` names 12 construction stages, but the reference data carries a different administrative lifecycle list (دراسة · إعلان وإحالة · سحب عمل · تسوية حسابات) | The 12 construction stages | Wrong stage labels on every project; the two lists may both be needed as separate fields |
| **P-13** | `06 §7`'s **order lifecycle** omits `approved` and `cancelled`, but `03 §5`–`§6` require both | Added, with our Arabic labels | Without `approved`, "approved ≠ applied" cannot be represented at all |
| **P-18** | Should **field grids** show 3–4 columns on wide panes, or stay at the reference's 2? | 2, per the reference component | Cosmetic, but changing it requires rewriting the cell border rules |
| **P-21** | v1.1 shipped `--outline` / `--viz-base` at **2.16:1**, below the binding 3:1 floor for graphics | Corrected, then **REVERTED** — ships at v1.1's value | Restoring it is two lines (`#858E9C` / `#6B7484`). As shipped, the Gantt data-date line and chart baselines breach `NFR-A11Y-01` |
| **P-22** | **`--tertiary` now carries two meanings.** v1.1 sets it to the same blue as `ongoing` status text; the Redwood-red accent is gone from the palette | Flagged, not used as an accent anywhere yet | `05 §7.5` forbids one colour meaning two things. Nothing is broken in the two screens built — but any new screen could introduce it. **Audit before Phase 2 fans out** |
| **P-23** | Is the **dark theme** in scope? | Delivered and working | It doubles the visual verification surface for every screen. Needs an explicit yes/no, not a default |
| **P-24** | `04 §2` calls SCR-E4 "**Entities / Beneficiaries**", but the reference component named for it (`DSpaces`) is the **workspaces** register, and the reference has no beneficiaries screen at all | Built `DSpaces` as **Entities**; beneficiaries first built as a separate list in Phase 4.2, then **merged back into `Workspaces` by P-174** | **CLOSED by P-174.** The department confirmed ONE screen. The separate list had put the same university in two registers under two codes with two active flags and nothing reconciling them; the cost of the merge is that sub-university bodies (a faculty, a site) can no longer receive quantity |
| **P-25** | The reference's `DSpaces` uses `arrow_upward` / `arrow_downward`, which **its own `icons.js` does not define** — so its sort arrows render as a fallback glyph | Used the ported `expand_less` / `expand_more`, which are directional and read the same | Cosmetic, and a defect in the reference rather than a decision. Worth reporting upstream |
| **P-26** | `06` defines **no value lists for alerts**, yet `Alerts.Severity` and `Alerts.Kind` are stored codes that need AR/EN labels like every other enum | Four lists added to `LookupCatalog.cs` in a marked **ADDENDUM** (`alert-severity`, `alert-kind`, `alert-status`, `schedule-import-status`), with our Arabic wording | Eleven labels the department has not seen. `06` should adopt the four sections so the lists have one home; until then the addendum marker is what keeps "`06` verbatim" honest for everything above it |
| **P-32** | v1.1 uses **`--fg-subtle` as text** in ~100 rules at **3.07:1** on white, below the binding 4.5:1 | Corrected, then **REVERTED** — ships at v1.1's value | Affects `.d-stat-foot` and `.d-table td.d-cell-sub` on **every register**. Restoring it is two lines (`#666F7F` / `#8D97A3`) |
| **P-33** | v1.1's **`--fs-100` is 10px**, below the 11px floor of the binding type scale | Corrected, then **REVERTED** — ships at 10px | Every filter-chip count in the app is below the minimum. Restoring it is one line |
| **P-37** | **`NFR-A11Y-01` is not met, by client decision.** Four measured breaches of `05 §7` are shipped deliberately so the screens match the signed-off prototype exactly | Fidelity chosen over the floors; all four recorded in DECISIONS.md "REVERTED" with their restoring values | This is the one open item that is a *choice* rather than a gap. It needs an explicit production decision before deployment — `05 §7` is written as binding and a government system is the likeliest place for that to be tested |

### 12.1 Resolved since version 1.0

| # | Question | Resolution |
|---|---|---|
| — | Adopt the v1.1 design system, and when? | **Adopted at Phase 1.5**, before any further screens — when it cost one screen to re-verify rather than twenty-five |
| — | BR-00 was summing **original** contract values | **Closed at Phase 2.1.** Project value is now Σ *effective* contract values. `PRJ-0279` moved from 340,000,000 to 350,000,000 once the applied amendment was counted |

---

## 13. Out of scope

Explicitly deferred (`07 §8`), with the tab kept and stubbed where one exists:

- Standalone Claims management
- Quality — inspection, NCR, laboratory, material approval
- HSE
- Resource / ERP integration
- GIS mapping
- Full mobile parity for the newer modules
- **Real BIM / IFC rendering** — the 3D Model tab is kept with a massing
  placeholder and object list
- **Real Primavera P6 and Excel import parsers** — the validation gates are
  specified and implemented; the file parsers are not

---

## 14. Acceptance criteria

From `07 §7`, plus the exit criteria of each delivery phase.

| # | Criterion | Status |
|---|---|---|
| AC-1 | Every rule in `02` maps to exactly one exported function, named in the rules reference | ✅ |
| AC-2 | No business arithmetic outside the domain layer | ✅ |
| AC-3 | Every worked example is a passing test | ✅ 128 tests |
| AC-4 | The rules route renders **live** results from the real functions | ✅ |
| AC-5 | The seed scenario reaches all six lifecycle states | 🔨 |
| AC-6 | Both languages render every screen; no untranslated key; no unisolated bidi number | 🔨 |
| AC-7 | Original / before / requested / approved / applied are all queryable for any amended BOQ item or activity | 🔨 |
| AC-8 | Every business-rule question resolved during the build is recorded with its reasoning | ✅ |
| AC-9 | Switching contracts re-scopes everything; no BOQ row exposes project or WBS | 🔨 |
| AC-10 | Original 100 + 30 → 20 at the original rate, 10 at the new; a decrease beyond the remaining quantity cannot be submitted | ✅ rule · 🔨 UI |
| AC-11 | Every persona sees the correct relation and exactly the permitted actions on all six seeded orders | ✅ rule · 🔨 UI |
| AC-12 | Approving changes nothing; applying changes the contract, quantities, dates and penalty baseline; a failed step holds the order in *applying* | ✅ rule · 🔨 UI |

---

## 15. Glossary

The Arabic terms are the business vocabulary. Several have no clean English
equivalent and are used in Arabic throughout the interface.

### Process

| Arabic | Transliteration | Meaning |
|---|---|---|
| **أمر الغيار** | amr al-ghiyār | **Change order** — the instrument that legally modifies a contract |
| **ملحق العقد** | mulḥaq al-ʿaqd | **Contract amendment / addendum** — created only when an order is applied |
| **الأسباب الموجبة** | al-asbāb al-mūjiba | **Justification** — the free-text case for the change. No preset list |
| **الكشف المسعّر** | al-kashf al-musaʿʿar | The **priced estimate** prepared by the resident engineer |
| **كشف الكميات** | kashf al-kammiyyāt | **Bill of quantities (BOQ)** |
| **تثبيت الأسعار** | tathbīt al-asʿār | **Rate fixing** — setting the binding price for quantity beyond 20% |
| **المصادقة والتخصيص** | al-muṣādaqa wa-l-takhṣīṣ | **Endorsement & allocation** — approval plus securing the funding |
| **الأمر الوزاري** | al-amr al-wizārī | **Ministerial order** — the instrument that authorises the addendum |
| **إعادة للتعديل** | iʿāda li-l-taʿdīl | **Return for revision** — sent back with history retained |
| **إلغاء الموضوع** | ilghāʾ al-mawḍūʿ | **Cancel** — terminate, used when an external party rejects |
| **فشل التطبيق** | fashal al-taṭbīq | **Application failure** — an apply step failed; the order is stuck mid-application |
| **بانتظار إجرائك** | bi-intiẓār ijrāʾik | **Awaiting your action** |
| **تقديرية** | taqdīriyya | **Indicative** — a value not yet approved by the pricing committee |
| **يُحدَّد في التدقيق المالي** | — | *"To be determined at financial review"* — the placeholder for an unapproved value |

### Parties

| Arabic | Meaning |
|---|---|
| **دائرة المهندس المقيم** (د.م.م) | Resident Engineer Department — author of record |
| **لجنة أوامر الغيار** | Change-Order Committee |
| **مقرّر لجنة أوامر الغيار** | Committee **rapporteur** — the delegate who records external parties' decisions |
| **لجنة تثبيت الأسعار** | Rate-Fixing Committee — sole authority on excess-quantity pricing |
| **لجنة المراجعة المصادقة** | Endorsement Review Committee |
| **الدائرة الإدارية والمالية** | Administrative & Financial Department |
| **قسم العقود الحكومية** | Government Contracts Department |
| **المقاول** | Contractor |
| **الاستشاري المصمم والمدقق** | Designer / checking consultant |
| **الجهة المستفيدة** | Beneficiary — the university, campus or facility receiving the work |

### Concepts

| Term | Meaning |
|---|---|
| **Effective value** | Original contract value **plus applied amendments only** |
| **Projection** | What the contract *would* become if every approved-but-unapplied order were applied. Shown separately, never folded in |
| **Rate band** | After the 20% rule, one BOQ line legitimately carries more than one unit rate; the bands are stored and a blended rate is displayed |
| **Absolute weight** | An activity's share of the whole schedule. Drives allocation and earned value |
| **Relative weight** | An activity's share of its parent WBS node. Display only |
| **Allocation share** | How much of a BOQ item an activity is responsible for, derived from absolute weight |
| **Coverage** | Whether a BOQ item's allocation shares total 100%. **Not** the BOQ financial weight |
| **Data date** | The project's own "now". All ages and SLAs are measured from it, never the wall clock |
| **Viewer relation** | The single value — awaiting/recorder/acted/upcoming/none — that drives every action-gating decision |
| **Largest remainder** | The rounding method that makes percentages sum to exactly 100.00% |

---

## 16. Traceability

### 16.1 Source documents

| Document | Content |
|---|---|
| `docs/spec/01-DOMAIN-MODEL.md` | Entities, invariants, derived values, audit |
| `docs/spec/02-BUSINESS-RULES.md` | BR-01…BR-12 with worked examples |
| `docs/spec/03-CHANGE-ORDER-PROCESS.md` | Stages, delegation, decisions, lifecycle, wizard, record page, register, BR-13/BR-14 |
| `docs/spec/04-SCREENS.md` | Every screen, layout system, states, responsive |
| `docs/spec/05-DESIGN-SYSTEM.md` | Tokens, type scale, **binding accessibility contract** |
| `docs/spec/06-DATA-DICTIONARY.md` | The 20 value lists + the seed scenario |
| `docs/spec/07-POC-BUILD-PLAN.md` | Architecture, milestones, test strategy, acceptance, open questions |
| `docs/spec/reference/app/*.jsx` | The React reference — **the specification of what each screen looks like** |
| `DECISIONS.md` | Every business-rule and port decision, with reasoning |
| `TRACE.md` | Screen → endpoint → rule → table index |
| `ROADMAP.md` | Build order and per-phase checklists |

### 16.2 Rule → implementation → test

Every rule is traceable in three hops. `TRACE.md` holds the live index; the
current state is fourteen rules, fourteen test files, 128 passing tests, all
executed live at `GET /api/docs/rules`.

### 16.3 Requirement coverage summary

Indicative counts of the requirements as written in this document — not an
independently audited total.

| Area | Requirements | ✅ | 🔨 | ⏸ / ❓ |
|---|---|---|---|---|
| Domain & non-negotiables | 18 | 14 | 4 | — |
| Enterprise screens | 12 | 6 | 6 | — |
| Project workspace | 30 | — | 29 | 1 |
| Change orders | 32 | 6 | 26 | — |
| Business rules | 15 | 15 | — | — |
| Data | 8 | 7 | 1 | — |
| Non-functional | 32 | 23 | 8 | 1 |
| **Open questions** | **13** | — | — | **13** |

**Screens: 4 of 24.** Portfolio (SCR-E1), Entities (SCR-E4), Projects (SCR-E2)
and Contracts (SCR-E3).

---

*End of document. Corrections belong here; changes to the underlying
requirements belong in `docs/spec/01`–`07` first.*
