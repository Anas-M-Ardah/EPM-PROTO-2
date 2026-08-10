# CLAUDE.md — EPM POC

Standing instructions for Claude Code on this repository. Copy to the repo root.

## What this project is

A POC for the **Ministry of Higher Education & Scientific Research (Iraq) — Reconstruction & Projects Department** enterprise project management system. It is also the **running documentation** for the final build: the specification and the running system must never drift apart.

The full specification lives in `design_handoff_epm_poc/`. Read `README.md` there first, then `01`–`07`. The HTML prototype in `reference/` is a **behaviour and design reference, not code to copy**.

## Non-negotiable rules

1. **Contract is the working context.** A BOQ item and an activity each belong to exactly one contract. The project is derived from the contract, never asked for again. A change order may never span two contracts.
2. **Approved ≠ Applied ≠ Closed.** Approving changes nothing. Applying creates a contract amendment and moves quantities, dates and the penalty baseline. Closing verifies it.
3. **The 20% rule is per BOQ line.** Up to 20% of the *original* quantity at the original rate; only the excess may be re-priced, and only the rate-fixing committee sets the binding rate.
4. **Two proposals, one decision.** Contractor and RE department propose; the RE department's figure governs display; the approved value comes only from the pricing committee.
5. **External parties are statuses, not stages.** Recorded inside the owning stage by a delegated user, against an official letter number and date. Attribution: the deciding party, with the delegate as recorder.
6. **Never overwrite original values.** Original, before, requested, approved and applied all persist.
7. **Arabic RTL is primary.** Logical CSS properties only; bidi-isolate every number, date, ID and currency string.

## Architecture rule

```
domain/   pure, framework-free, fully tested — THE specification
app/      routes and UI — NO business arithmetic
db/       schema + repositories
docs/     rendered from domain/ annotations
```

If a component needs a computed number, it calls a domain function. Never inline a formula in a component, a query or a report.

## Documentation-as-code

Every domain function carries `@rule`, `@spec` and `@example` annotations. The `@example` becomes a unit test **and** is executed live on the `/docs` route. Changing a rule without updating its spec must fail CI.

## Money and rounding

- Never floats for money — integer minor units or `decimal`.
- BOQ weights use **largest-remainder** rounding so they sum to exactly 100.00%. `toFixed(2)` produces 100.01% and is a bug.
- The weight denominator is the **contract's** BOQ rows, not the project's.

## Time

"Now" comes from the project's **data date** in demo mode and the real clock in production. Never hard-code a date literal — a fixed "today" made every seeded order look years overdue.

## Design system

Tokens, type scale and the accessibility contract are in `design_handoff_epm_poc/05-DESIGN-SYSTEM.md` §1–§7. The audit rules there are **binding**:

- Text ≥ 4.5:1; borders/icons/graphics ≥ 3:1. `18px/700` is not large text.
- `--outline` and `--viz-base` are graphic tokens — never text colour.
- Fill hues are never text colour; use the `-tx` status variants.
- No colour carries two meanings: status colour never on a button or link; interactive colour never as a data series.
- Status is never colour-only.
- `:focus-visible` on every interactive element.
- Type scale is exactly 11 / 11.5 / 12 / 13 / 15 / 18 / 21 / 24. Nothing below 11px.
- No uppercase or letter-spacing — Arabic has no case.
- Disabled state uses explicit colour values, never opacity.

## UI conventions

- Sections are label + space, never nested boxes. Nothing floats — hairlines and plane changes, not shadows.
- Summary figures are one hairline-divided band; use CSS grid `auto-fit`, never a pinned inline column count, never `flex: 1 1 <basis>`.
- Registers are dense tables with sticky headers and tabular numerals. Tables are the primary element — not cards.
- Secondary detail goes in a drawer, not an in-place expander.
- Prevent invalid input (cap the field, explain the cap) rather than flagging it afterwards.
- Empty states say what to do; permission-denied states name the persona and say why.

## Testing

Run `pnpm test` before proposing any change to `domain/`. Every worked example in `02-BUSINESS-RULES.md` must stay green. Add a property test whenever you add a rounding or distribution rule.

## When something is ambiguous

Check `design_handoff_epm_poc/07-POC-BUILD-PLAN.md` §9 (open questions) first. If it is not there, add it there and to `DECISIONS.md` rather than guessing — this system is a legal/financial record and a wrong assumption propagates into contract values.
