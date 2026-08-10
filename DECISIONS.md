# DECISIONS — business-rule questions resolved in the prototype

One entry per decision so the final build inherits the reasoning, not just the code.
Mirrors the handoff's open questions (`07-POC-BUILD-PLAN.md` §9). Items marked **CONFIRM** still need client sign-off before production.

| # | Question | Prototype decision | Source | Status |
|---|---|---|---|---|
| D-01 | Rate bands after several orders — does the second order's 20% threshold use the *original* or *current effective* quantity? | Uses the **original** contract quantity (`line.contractedQty`). | 07 §9.1 | **CONFIRM** |
| D-02 | Delay penalty rate | **0.1%/day, capped at 10%** of the effective contract value (`configuration.rules.penaltyPerDayPct/penaltyCapPct`). | 02 §10 | **CONFIRM** against contract template |
| D-03 | Per-stage SLA | Uniform **5 days** (`configuration.rules.slaDaysPerStage`); a stage past SLA is `overdue`, raises needs-action, and escalates. | 02 §12 | **CONFIRM** per committee |
| D-04 | Delegate authority to cancel | The rapporteur may record a cancellation only for external parties flagged `canCancel: true` (Endorsement Review Cmte, Admin & Financial Dept). | 03 §4 | **CONFIRM** |
| D-05 | Distribution vs. decrease | When a decrease would push distributed total above the revised quantity, the order **cannot be applied** until the distribution is revised. Revising party not yet fixed. | 02 §8 | **CONFIRM** (RE dept vs beneficiary) |
| D-06 | "Now" reference | Derived from the **project data date** (`configuration.time.dataDate = 2026-08-02`) in demo mode; real clock in production. Never `Date.now()`. | CLAUDE.md, 06 §12 | Resolved |
| D-07 | BOQ weight rounding | **Largest-remainder** to exactly 100.00%; `toFixed(2)` is a bug. Denominator is the **contract's** BOQ rows. | 02 §1 | Resolved |
| D-08 | Approved value authority | The **approved value** comes only from the pricing/rate-fixing committee, entered at financial review. The RE-dept proposal governs display; the contractor proposal is shown labelled until then. | 02 §6 | Resolved |
| D-09 | Approved ≠ Applied ≠ Closed | Approving changes nothing. Applying creates a contract amendment and moves quantities/dates/penalty baseline. Closing verifies the application. Approved-unapplied orders shown as a **projection**, never folded into effective figures. | 03 §6 | Resolved |
| D-10 | External parties | Statuses inside the owning stage (recorded by a delegate against an official letter number+date), **not** workflow stages. Attribution: deciding party, delegate as recorder. | 03 §3–§4 | Resolved |
| D-11 | Money type | Displayed as integer IQD; production must use `decimal`/integer minor units — never `float`. Tier splits and largest-remainder must be exact. | 07 §2 | Resolved (prototype), enforce in prod |
| D-12 | Contract scoping | A BOQ item / activity belongs to exactly one contract; the project is derived from the contract. One order may not span two contracts (validation gate `cross-contract`). | 01, 02 §7 | Resolved |

## Assumptions made to fill gaps

- **Seed figures.** Concrete BOQ/activity amounts were chosen to be internally consistent (`amount = qty × rate`) and to exercise the rules; they are illustrative, not real ministry data. The documented worked examples (56.13%/43.87%, the qty-100-add-30 tier split) run in the **Rules Reference** route from their own example inputs, independent of the seed.
- **Man-hours basis** is stubbed to fall back to `budgetedCost` where P6 man-hours are absent (the cost/man-hours toggle is present in the BOQ activity-assignment view).
- **3D/BIM viewer, standalone Claims, Quality (NCR/Lab), HSE, GIS** are out of Phase 1 (07 §8) — tabs are kept and stubbed.

---

# Full-stack port decisions (Angular + .NET + SQL Server)

Decisions taken while porting the React prototype. One entry per decision, with the reasoning,
so the next person inherits the *why* and not just the code.

| # | Question | Decision | Rationale | Status |
|---|---|---|---|---|
| P-01 | Storage shape | **Flat tables, plain ID columns.** No navigation properties, no foreign keys, no cascade rules, no indexes. | A normalised EF model needed ten `OnDelete(Restrict)` overrides purely to satisfy SQL Server's multiple-cascade-path rule — pure ceremony, first thing a reader hits. Relationships now live in the endpoint's `Where()` clause where they can be read. | Resolved |
| P-02 | Schema evolution | **No migrations.** `EnsureCreated()` on boot; `POST /api/dev/reset` to apply a change. | Migration files are the top merge-conflict source for parallel agents, and there is no production data to preserve. Cost: reset wipes anything typed in. | Resolved |
| P-03 | Seeding | **Nothing on boot.** The `06 §12` fixture loads only via `POST /api/dev/load-fixture`. | The reference figures are illustrative, not ministry data — the original `DECISIONS.md` says so itself. Making them opt-in stops invented numbers being mistaken for real ones. | Resolved |
| P-04 | Test isolation | Domain rule tests use **inline worked examples** from `02-BUSINESS-RULES.md` and never read the database. | If a fixture figure turns out wrong, no test starts lying. The spec, not the data, is the oracle. | Resolved |
| P-05 | Identity | **Persona header (`X-Epm-User`), no authentication.** | The permission *model* from `03 §7` is real and resolved server-side; only the identity is fake. `03 §7` itself asks for the persona switcher as the fastest way to review the model. | Resolved |
| P-06 | Build unit | **One page at a time, end to end** — table, endpoint, Angular trio, UML, TRACE row. | Building 30 tables up front from a spec was speculative: columns existed for screens nobody had built. Page-at-a-time means no column exists on a guess. | Resolved |
| P-07 | Design fidelity | **Copy the stylesheets verbatim** (2,947 lines) rather than re-derive tokens. | The reference JSX uses `className` strings, so porting a screen is mechanical and the design *matches* rather than approximates. | Resolved |
| P-08 | Canonical status keys vs reference CSS | API speaks `06 §1` canonical keys (`delayed`, `cancelled`); a `statusClass()` map translates to the stylesheet's older `stalled` / `withdrawn` classes. | The spec keys are correct and must not be bent to the CSS; editing the verbatim stylesheet would break the copied-not-re-derived guarantee. | Resolved |
| P-09 | Derived values not yet derivable | Return **null and render an em dash**, never a zero. | Physical % is weight-rolled BOQ progress (BR-04). Until the BOQ page exists it cannot be derived, and a 0% bar asserts something false. | Resolved |
| P-10 | Reference component vs written spec | **Open the reference component before writing a page.** | PAGE-01 was built from the written spec alone and had to be redone: it invented a column set, used the wrong CSS classes, and missed that the Workspace column is hidden when workspace-scoped. The spec gives the rules; the component gives the screen. | Resolved |

## Carried forward, still open

`07-POC-BUILD-PLAN.md §9` open questions D-01 … D-05 remain **CONFIRM** — rate bands after
several orders, the penalty rate, per-stage SLA, delegate cancellation authority, and who
revises a distribution when a decrease forces it. None are resolved by this port.
