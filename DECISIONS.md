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
