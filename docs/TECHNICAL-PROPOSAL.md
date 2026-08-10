# Technical Proposal — Engineering Projects Management (EPM)

**Ministry of Higher Education & Scientific Research — Republic of Iraq**
Reconstruction & Projects Department · دائرة الإعمار و المشاريع

| | |
|---|---|
| **Prepared for** | Department management |
| **Date** | 2026-08-10 |
| **Version** | 1.0 |
| **Design baseline** | **v1.1 design system** (`epm@design/system-revamp`) |
| **Status** | For approval |

---

## 1. Executive summary

EPM is the system of record for how the department contracts, builds and pays
for construction and equipment projects across Iraq's public universities. It
replaces spreadsheets and paper files for the department's highest-risk process:
**أمر الغيار** — the change order that legally modifies a contract's value and
duration.

**What we are asking for.** Approval to complete the system on the delivery plan
in §7, and decisions on the eleven items in §11 — eight business rules awaiting
confirmation and three design questions. Several of the business items directly
determine contract values and cannot be left to engineering judgement.

**Where the project stands.** The foundation is complete and verified: the
database, the API, the shared component library, and — most importantly — **all
fourteen business rules implemented as tested code**, with the department's own
worked examples passing as automated tests. One of twenty-four screens is built.

**What remains.** Twenty-three screens across five phases. The critical path is
**Contract → BOQ → Schedule → Change Orders**, which is sequential by nature:
each layer computes from the one beneath it.

**Estimate.** 180–255 engineer-days of build effort. With two engineers,
approximately **six to eight months**. Adding a third engineer compresses this
by roughly three weeks and no more — the schedule is governed by dependency, not
headcount (§8). This is a bottom-up estimate from a known deliverable list and
should be validated against the delivery team's measured velocity after Phase 2.

**Principal recommendation.** Adopt the **v1.1 design system now**, before the
remaining twenty-three screens are built. Adopting later means re-verifying every
screen already delivered; the cost of this decision grows with every week it is
deferred.

---

## 2. What the system does

The department administers many projects; each project runs several contracts;
each contract carries hundreds of bill-of-quantity lines and a Primavera
schedule. Changes to those contracts are frequent and consequential.

The system exists to prevent five specific, recurring failures:

| # | Failure today | What the system guarantees |
|---|---|---|
| 1 | Nobody can state what a contract is actually worth — the original award, applied amendments and approved-but-unapplied orders get conflated | One defensible, derivable contract value; approvals never counted as commitments |
| 2 | Quantity changes get re-priced without authority | Up to 20% of the original quantity holds the original rate; only **لجنة تثبيت الأسعار** may price the excess |
| 3 | Approval chains are invisible — nobody knows who is holding a file or for how long | Every change order's position, owner and elapsed time, with automatic escalation |
| 4 | Physical progress is a number somebody typed | Progress computed from the schedule, rolled up by weight |
| 5 | History is lost when quantities are overwritten | Original, requested, approved and applied all persist and remain queryable |

The full requirements are in [`docs/SRS.md`](SRS.md); the binding specification
is `docs/spec/01`–`07`.

---

## 3. Where the project stands today

This is measured, not asserted.

| Delivered | Evidence |
|---|---|
| Database, API and application skeleton | Runs; schema created on boot |
| **All 14 business rules as tested code** | **128 automated tests passing**, including the department's own worked examples |
| Live rules reference | Every rule executes its worked example on request at `/api/docs/rules` |
| Shared value lists (20 enumerations, 117 entries) | Verified: every stored code resolves to an Arabic and English label |
| Shared component library (7 primitives) | Built; 2 in production use |
| Projects list screen | Verified in browser, Arabic and English, at two breakpoints |

**Why the rules being finished first matters.** The business rules are the part
of the system where an error costs money. They are now fixed, tested, and
readable independently of any screen: a reviewer can open one file per rule, see
the department's worked example, and see it execute. The remaining work is
building screens on top of a settled foundation — a materially lower-risk
activity than deciding rules and drawing screens at the same time.

**Screens: 1 of 24 complete.**

---

## 4. The design baseline — v1.1

This proposal assumes the **v1.1 design system** on the `design/system-revamp`
branch as the visual and interaction baseline. That branch has been built,
run and inspected.

### What v1.1 provides

| | |
|---|---|
| **Visual identity** | Cool-grey canvas, EPM blue `#1F5CDB`, Inter for Latin, Cairo retained for Arabic |
| **Page architecture** | A named zone contract every page follows: global bar → identity bar (breadcrumb, title, one primary action) → toolbar → content → context panel |
| **Data grid standard** | Sticky header and identifier column, hierarchy with roll-up rows, right-aligned figures, saved views, real pagination |
| **Record standard** | Header → tabs → grouped body → sticky footer, with a workflow rail and an audit tab on every record |
| **States** | Skeleton, empty-with-action, error, permission-denied — specified, not improvised |
| **Dark theme** | Included |
| **Rebuilt BOQ module** | The department's densest screen, already designed and built |

### Why adopt it now

The migration was measured rather than estimated. v1.1 **re-skins the existing
component contract rather than renaming it**: 50 of the 54 style classes the
application uses survive unchanged, and every design token it references still
exists. Two of the four exceptions are our own additions that v1.1 supersedes
correctly.

The consequence is a straightforward timing argument:

| Adopt at | Screens requiring re-verification |
|---|---|
| **Now** | **1** |
| After Phase 2 | 7 |
| After Phase 3 | 9 plus the workspace shell |
| After Phase 6 | 25+ |

Adopting now also **de-risks the BOQ screen** — the hardest single item in the
plan — because v1.1 has already designed and built it.

### What adoption obliges us to fix

Two items must be handled deliberately, not inherited silently:

1. **The binding design specification becomes inaccurate.** `05-DESIGN-SYSTEM.md`
   documents the previous palette and is the most-cited design document in the
   project. It must be re-baselined as part of adoption.
2. **Two colour values fall below the accessibility floor.** The project's
   accessibility contract — the product of a formal audit — requires graphical
   elements to meet a 3:1 contrast ratio. Two v1.1 tokens measure **2.16:1**,
   where the previous values were chosen to sit exactly at 3.03:1. These are used
   for chart baselines and the schedule's data-date line. The correction is
   small (darkening two values) but must be an explicit decision.

Full technical detail: [`docs/PROPOSAL-design-system-v1.1.md`](PROPOSAL-design-system-v1.1.md).

---

## 5. Scope

### In scope

Projects · contracts and amendments · bill of quantities · quantity distribution
to beneficiaries · schedule and activities · progress · financials and payments ·
**change orders end to end** · risk · meetings · documents · alerts · reports ·
audit history · administration · bilingual Arabic/English throughout ·
role-based action gating.

### Out of scope (agreed, `07 §8`)

Standalone claims management · quality (inspection, NCR, laboratory, material
approval) · HSE · resource and ERP integration · GIS mapping · full mobile
parity for newer modules · **real BIM/IFC rendering** (the tab is retained with
a placeholder) · **real Primavera and Excel file parsers** (the validation rules
are built; the file readers are not).

### Deferred, and requiring a decision before production

**Authentication.** The system currently identifies users by a switcher, not a
login. The permission *model* is real and enforced server-side; the *identity*
is not. **No deployment carrying ministry data can proceed until real
authentication is added.** This is the single hard blocker in the plan and is
not included in the estimate below, because its size depends on which
authentication provider the ministry mandates.

---

## 6. Technical approach

### 6.1 Architecture

| Layer | Choice | Rationale |
|---|---|---|
| Web application | Angular 19 | Arabic RTL and bilingual support are first-class |
| Server | .NET 9 minimal APIs | One file per feature; the queries behind a screen are readable in one place |
| Database | SQL Server | Ministry-standard; exact decimal arithmetic for money |
| Business rules | An isolated, framework-free layer | The specification as executable code |

**The one architectural rule.** All business arithmetic lives in the rules
layer. Screens and endpoints may filter, sort and display; they may not compute
a weight, a price split, a penalty or an approval transition. This is enforced
by review and is checkable automatically.

**Money is never floating-point.** The 20% price splits and the percentage
rounding must be exact to the dinar.

### 6.2 Traceability — the governance property

Every screen, endpoint, business rule and database table is indexed, and every
endpoint shares a marker with the code that calls it. A single search returns
every place a given figure is produced or displayed.

This is what makes the system auditable: when a contract value is questioned,
the path from the number on screen to the rule that computed it and the rows it
read can be produced in minutes.

### 6.3 Documentation as code

Every business rule carries its specification text and the department's worked
example. That example is simultaneously an automated test and is executed live
on a rules-reference page. **A rule cannot be changed without its documentation
visibly disagreeing with it.** This is already working today.

---

## 7. Delivery plan

Work proceeds one screen at a time, end to end — database, endpoint, screen,
documentation and index entry — so nothing is built speculatively.

| Phase | Contents | Depends on |
|---|---|---|
| **0 · Foundation** ✅ | Platform, design system, shell, first screen | — |
| **1 · Rules & primitives** ✅ | 14 business rules + 128 tests, value lists, component library | 0 |
| **1.5 · v1.1 adoption** | Re-baseline the design spec, swap the system, add the new page primitives, correct the two contrast values | 1 |
| **2 · Enterprise screens** | Contracts, Beneficiaries, Executive Portfolio, Alerts Centre, Schedule Control, Reports | 1.5 |
| **3 · Workspace shell** | Three-pane workspace, project detail, Overview, Project Information | 1.5 |
| **4 · Business core** | Contract & amendments → **BOQ** → Schedule → Progress & Financials | 3 |
| **5 · Change orders** | Register → record page → creation wizard → workflow & application | 4 |
| **6 · Remaining tabs** | Risk, meetings, documents, alerts, reports, audit, 3D placeholder | 3 |
| **7 · Closeout** | Rules documentation route, visual fidelity, responsive, accessibility and bilingual passes | 5, 6 |

**Contract before BOQ; BOQ before everything else.** BOQ weights feed the
allocation to schedule activities, which feeds progress, which feeds earned
value and the change-order impact. This ordering is a property of the business,
not a preference.

---

## 8. Effort, schedule, and why headcount has a ceiling

### 8.1 Estimate

Bottom-up, from the known deliverable list, sized by complexity tier. Each
figure includes database, endpoint, screen, tests, documentation, and browser
verification in both languages, both themes and four screen widths.

| Phase | Engineer-days |
|---|---|
| 1.5 · v1.1 adoption | 8 – 12 |
| 2 · Enterprise screens (6) | 31 – 44 |
| 3 · Workspace shell (3) | 18 – 26 |
| 4 · Business core (6) | 46 – 65 |
| 5 · Change orders (4) | 46 – 64 |
| 6 · Remaining tabs (7) | 20 – 26 |
| 7 · Closeout | 12 – 18 |
| **Total** | **181 – 255** |

Excludes authentication (§5) and any scope arising from the eleven decisions in
§11.

### 8.2 The headcount ceiling — the most important scheduling fact

Phases 3, 4 and 5 are **sequential**: each builds on the output of the one
before it. Only Phases 2 and 6 parallelise usefully.

```
critical path:   3 → 4 → 5 → 7        ≈ 122–173 engineer-days
parallel track:  2, 6                 ≈  51– 70 engineer-days
```

| Team | Calendar estimate | Effect |
|---|---|---|
| 1 engineer | 9 – 12 months | Everything on one track |
| **2 engineers** | **6 – 8 months** | Second engineer absorbs Phases 2 and 6 |
| 3 engineers | 5.5 – 7.5 months | **Marginal** — third has little to do after Phase 2 |
| 4+ engineers | No further gain | Critical path is dependency-bound |

**Adding people will not compress this project materially beyond two engineers.**
Presenting a shorter date with a larger team would be misleading. What *does*
compress the schedule is reducing scope or resolving the §11 decisions early.

### 8.3 Confidence

- **Phases 1.5, 2, 6** — good confidence; well-understood, similar to work already done.
- **Phase 4 (BOQ, Schedule)** — moderate; the two densest screens. BOQ risk is reduced by v1.1 having built it.
- **Phase 5 (change orders)** — **widest uncertainty**. The most heavily specified area, and the one most exposed to the §11 decisions.

Recommend re-forecasting after Phase 2, when the team's actual velocity on this
codebase is measurable.

---

## 9. Team

| Role | Allocation | Responsibility |
|---|---|---|
| Full-stack engineer (lead) | Full-time | Critical path: workspace, BOQ, schedule, change orders |
| Full-stack engineer | Full-time | Enterprise screens, remaining tabs, closeout passes |
| Design/UX | Part-time | v1.1 conformance, screen review |
| Business analyst — department | **Part-time, essential** | Resolves §11; validates against real contracts |
| QA | Part-time, from Phase 4 | Acceptance, bilingual and accessibility passes |

The business analyst is not optional. Eight of the eleven open items are
questions only the department can answer, and each one blocks or reworks part of
the change-order module.

---

## 10. Quality and acceptance

| Level | Coverage |
|---|---|
| Business rules | Every worked example from the specification, automated. **Already passing: 128 tests** |
| Integration | Applying a change order updates contract value, dates, quantities, weights and penalty |
| Permissions | Every role against every change-order state sees the correct available actions |
| End-to-end | Create → submit → return → resubmit → approve → apply → close, in Arabic |
| Accessibility | Automated audit on every screen against the binding contract |
| Bilingual | Every screen in both languages, no untranslated text, no misrendered figures |

**Definition of done for a screen:** its table, endpoint, screen, documentation
and index entry all exist and agree; all four data states handled; verified in
the browser at 1440 and 1024, both languages.

**Acceptance for the system** is the twelve criteria in [`docs/SRS.md §14`](SRS.md).
Four are already met.

---

## 11. Decisions required from management

Each of these will harden into contract values if left unanswered.

### Business — the department must decide

| # | Question | Current assumption | Consequence if wrong |
|---|---|---|---|
| 1 | When a second change order adds quantity beyond 20%, is the threshold measured against the **original** or the **current** quantity? | Original | Changes the price of every re-priced quantity after the first amendment |
| 2 | Is the delay penalty **0.1% per day, capped at 10%**? | Yes | Directly changes penalty amounts — must be checked against the contract template |
| 3 | What is the real time limit per approval stage? | 5 days uniformly | Drives overdue flags and automatic escalation |
| 4 | May the committee rapporteur record a **cancellation** for any external body, or only two of them? | Only two | Determines who can terminate a change order |
| 5 | When a quantity decrease forces a distribution revision, **who revises it**? | Undecided | Blocks the order from being applied |
| 6 | Which **execution-stage list** is correct? Two incompatible lists exist in the source material | The 12 construction stages | Wrong stage labels on every project |
| 7 | Two change-order states are missing from the data dictionary but required by the process | Added, with our Arabic wording | Without them, "approved ≠ applied" cannot be represented |
| 8 | Confirm the Arabic wording for the two states above | Ours | Terminology appears throughout the interface |

### Design and platform

| # | Question | Recommendation |
|---|---|---|
| 9 | Adopt the **v1.1 design system** now? | **Yes — now.** Cost grows with every screen built |
| 10 | Correct the two colour values that fall below the accessibility floor? | **Yes.** Small change; the contract is binding |
| 11 | Is the **dark theme** in scope? | Decide explicitly — it arrives free but doubles visual verification for every screen |

### And one gating item

**Authentication** (§5) is excluded from this estimate. The ministry must
nominate the identity provider before production planning can complete.

---

## 12. Risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| §11 business decisions arrive late | Medium | **High** — reworks change orders, the largest phase | Resolve items 1–5 before Phase 4 begins; they are already documented with options |
| Change-order module underestimated | Medium | High | Most heavily specified area; re-forecast after Phase 2; sequence register → record → wizard → workflow so value lands incrementally |
| Design system adopted late or partially | **High if deferred** | Medium, rising | Adopt at Phase 1.5 as proposed |
| Accessibility contract quietly breached | Medium | Medium — it is a binding commitment | Correct the two values at adoption; automated audit in the closeout pass |
| Primavera/Excel import expected in Phase 1 | Medium | Medium | Explicitly out of scope; validation rules are built, parsers are not — confirm with stakeholders |
| Authentication treated as small | Medium | **High** — blocks production | Decide the provider now; size separately |
| Real ministry data reveals rule gaps | Medium | Medium | Business analyst validates against real contracts from Phase 4 |

---

## 13. Assumptions

1. The binding specification (`docs/spec/01`–`07`) remains authoritative except
   where v1.1 supersedes the design document, which will be re-baselined.
2. `design/system-revamp` is intended to become the reference of record. **It is
   currently unmerged and 27 commits ahead** — this should be confirmed before
   Phase 1.5 starts.
3. Demonstration figures are illustrative, not ministry data. Real data is
   required from Phase 4 for meaningful validation.
4. The department provides a business analyst for §11 and for review at each
   phase exit.
5. Effort excludes authentication, data migration from existing spreadsheets,
   production infrastructure, training and support.
6. Estimates are bottom-up from a known deliverable list, to be validated against
   measured velocity after Phase 2.

---

## 14. Recommendation

1. **Approve the delivery plan** in §7 on a two-engineer team, targeting six to
   eight months for the scope in §5.
2. **Approve v1.1 adoption at Phase 1.5**, before the remaining twenty-three
   screens are built. This is the lowest-cost moment available and the cost rises
   every week.
3. **Correct the two accessibility values** as part of that adoption.
4. **Assign a departmental business analyst now** and resolve business decisions
   1–5 before Phase 4 begins.
5. **Decide the authentication provider** and commission a separate estimate.
6. **Re-forecast after Phase 2**, when velocity on this codebase is measurable.

---

### Supporting documents

| Document | Contents |
|---|---|
| [`docs/SRS.md`](SRS.md) | Full requirements, business context, glossary |
| [`docs/PROPOSAL-design-system-v1.1.md`](PROPOSAL-design-system-v1.1.md) | Technical detail of the design migration |
| [`ROADMAP.md`](../ROADMAP.md) | Phase-by-phase build checklist |
| [`DECISIONS.md`](../DECISIONS.md) | Every decision taken, with its reasoning |
| [`TRACE.md`](../TRACE.md) | Screen → endpoint → rule → table index |
| `docs/spec/01`–`07` | The binding specification |
