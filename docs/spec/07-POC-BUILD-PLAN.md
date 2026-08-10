# 07 — POC Build Plan

## 1. Objective

A running system that is simultaneously the **reference documentation** for the final build. Success is not "it demos well" — it is *"a developer joining the final build can read the rule, see it execute, and trust that the code matches."*

## 2. Recommended stack

Nothing here is mandatory except the separation of the domain layer.

| Layer | Recommendation | Why |
|---|---|---|
| Runtime | **TypeScript** end-to-end | the domain is arithmetic-heavy and money-sensitive |
| Frontend | **Next.js (App Router) + React** | RTL, i18n and routing are first-class |
| UI | Headless components (Radix / shadcn) + **custom tokens from `05`** | the design system is specific; do not adopt a themed kit |
| State/data | Server components + TanStack Query for interactive tables | |
| DB | **PostgreSQL** + Prisma or Drizzle | needs real referential integrity and history tables |
| Money | integer minor units or `decimal` — **never floats** | 20%-rule splits and largest-remainder rounding must be exact |
| i18n | `next-intl` or similar, **AR default**, `dir` from locale | |
| Charts | a primitive library (visx / Recharts) driven by the `--viz-*` ramp | |
| Testing | Vitest (domain) + Playwright (flows) | |

## 3. Architecture — the one rule that matters

```
domain/            ← pure, framework-free, fully tested. THE specification.
  boq/weights.ts           § 02.1
  schedule/weights.ts      § 02.2
  allocation/index.ts      § 02.3, 02.4
  changeorder/tier.ts      § 02.5   ← the 20% rule
  changeorder/validate.ts  § 02.7
  distribution/index.ts    § 02.8
  contract/amendments.ts   § 02.9
  contract/penalty.ts      § 02.10
  evm/index.ts             § 02.11
  workflow/machine.ts      § 03.2, 03.5, 03.6
  workflow/permissions.ts  § 03.7
app/               ← routes and UI, no business arithmetic
db/                ← schema + repositories
docs/              ← rendered from domain/, see §5
```

Nothing in `app/` may compute a weight, a share, a penalty or a tier split. If a component needs a number, it calls the domain.

## 4. Milestones

### M1 — Foundation (domain + data)
- Schema for every entity in `01`, with history tables.
- Every rule in `02` implemented as a pure function with its worked example as a test.
- Seed the `06` §12 scenario.
- **Exit:** `pnpm test` runs every worked example green; seeding produces the six orders in their six states.

### M2 — Contract context & BOQ
- Contract selector; contract-scoped BOQ register with weights summing to exactly 100.00%.
- Manual entry + Excel import with the documented validation gates.
- Quantity distribution drawer with capped inputs; distribution import with pre-apply validation results.
- **Exit:** switching contracts re-scopes everything; no BOQ row exposes project or WBS.

### M3 — Schedule & allocation
- P6 XER/XML import → WBS tree + activities + budgeted cost/man-hours; basis prompt.
- Relative and absolute weights displayed in the tree.
- BOQ↔activity assignment with auto allocation, manual override + save + reset, coverage statuses.
- Progress reflection: change an activity's progress, watch BOQ progress, achieved quantity and achieved amount update.
- **Exit:** the `02` §3 and §4 worked examples reproduce in the UI.

### M4 — Change-order wizard
- Five steps exactly as `03` §8, contract-first.
- Two proposals per line; the 20% tier split with per-party excess-rate fields and the explicit split sub-row.
- Validation gates blocking submission with a listed reason per line.
- Draft save + submit.
- **Exit:** the client's own case — original 100, add 30 → 20 at the original rate, 10 at the new rate — is reproducible, and a decrease beyond the remaining quantity cannot be submitted.

### M5 — Workflow
- Six-stage machine with conditional stages; external parties as recorded statuses with letter number/date; delegate attribution.
- Four decisions including return-with-history.
- Persona-based gating; the *awaiting me* queue and focus mode.
- SLA, overdue, escalation.
- **Exit:** every persona in `03` §7 sees the correct relation and exactly the permitted actions on all six seeded orders.

### M6 — Apply & amendment
- Apply produces a contract amendment; the 7-step checklist with a genuinely failable step.
- Effective vs pending vs projected contract figures.
- Penalty before/after with the waived amount.
- Amendment badges and the shared history drawer on BOQ items and activities.
- **Exit:** approving changes nothing; applying changes the contract, quantities, dates and penalty baseline; a failed step holds the order in *applying* and surfaces on the affected line.

### M7 — Running documentation
- `/docs` route (see §5), decision log, README, seeded walkthrough.
- **Exit:** a reviewer can read every rule and see it executed on live data in the same page.

## 5. The `/docs` route

Generate, do not hand-write:

```ts
// domain/changeorder/tier.ts
/**
 * @rule 20% pricing tier
 * @spec Quantity change up to 20% of the ORIGINAL quantity is valued at the
 *       original unit rate. Only the excess may carry a new rate, proposed by
 *       the contractor and the RE department and fixed by the rate-fixing
 *       committee.
 * @example increase  { originalQty: 100, delta: 30, rate: 1000, newRate: 1200 }
 *          → { atRate: 20, excessQty: 10, amount: 132000 }
 */
export function tierSplit(input: TierInput): TierResult { … }
```

The route lists each rule with: the `@spec` text, its inputs, the `@example` executed **by the real function** at request time, and a link to the source. Same annotations drive the unit tests, so documentation and behaviour cannot diverge.

## 6. Test strategy

| Level | Coverage |
|---|---|
| Unit (domain) | every worked example in `02`; property test: BOQ weights always sum to exactly 100.00 for any input set |
| Integration | apply a change order → assert contract value, finish date, BOQ quantities, rate bands, weights, penalty |
| Workflow | for each of the 6 seeded orders × 7 personas, assert the relation and the permitted action set |
| E2E | create → submit → return → resubmit → approve → apply → close, in Arabic RTL |
| Visual/a11y | axe on every screen; assert the `05` §7 contract (no text below 11px, no `--outline` as text, focus-visible everywhere) |

## 7. Acceptance criteria for "documentation-grade"

1. Every rule in `02` maps to exactly one exported function, named in `/docs`.
2. No business arithmetic in `app/`.
3. Every worked example is a passing test.
4. `/docs` renders live results from the real functions.
5. The seed scenario reaches all six lifecycle states.
6. Both languages render every screen; no untranslated key; no unisolated bidi number.
7. Original / before / requested / approved / applied values are all queryable for any amended BOQ item or activity.
8. `DECISIONS.md` records every business-rule question resolved during the build.

## 8. Explicitly out of Phase 1

Standalone Claims · Quality (Inspection/NCR/Lab/Material Approval) · HSE · Resource/ERP integration · GIS map · full mobile parity for the newer modules · real BIM/IFC rendering (keep the tab, stub the viewer).

## 9. Open questions for the client

1. **Rate bands after several orders** — if two orders each add quantity beyond 20%, does the second order's threshold use the *original* quantity or the current effective quantity? The prototype uses the original; confirm.
2. **Penalty rate** — 0.1%/day capped at 10% is the prototype's assumption. Confirm against the contract template.
3. **SLA per stage** — currently a uniform 5 days. Confirm real values per committee.
4. **Delegate authority limits** — may the rapporteur record a *cancellation* on behalf of any external party, or only the two flagged as `cancels: true`?
5. **Distribution vs. decrease** — when a decrease forces a distribution revision, who revises it: the RE department or the beneficiary?
