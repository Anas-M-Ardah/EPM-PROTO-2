# CO-FE-04 — Change-order impact and proposal comparison UX

id: CO-FE-04
title: Change-order impact and proposal comparison UX
anchor: EP-CO-FE-04
status: DONE

## Scope

Improve the visual hierarchy of commercial, quantity, and schedule impact information in the existing change-order record and wizard surfaces.

- Present contractor, engineer, and approved values in a consistent comparison layout with units, signs, and delta labels.
- Show cost, duration, BOQ quantity, activity, penalty-baseline, and amendment effects only when supplied by the relevant response contract.
- Make threshold bands and exception chips explain why review or escalation is required.
- Keep approved-but-unapplied projections visually separate from effective project totals.
- Link each impact group to its supporting BOQ, schedule, contract, or audit detail where the current feature already supports drill-through.
- Match approved terminology and figures to `docs/spec/reference/app/vo-record.jsx`, `docs/spec/03-CHANGE-ORDER-PROCESS.md`, and the change-order DTO types.

## Acceptance criteria

- A reviewer can compare proposals and understand the net effect without mentally reconciling unrelated cards.
- Units, negative values, zero effects, unavailable values, and time-only orders have explicit presentation rules.
- No frontend arithmetic duplicates domain calculations or changes the meaning of pending versus applied values.
- The layout remains readable at the supported desktop widths and in RTL.

## Workflow

```txt
Workflow({
  name: "plan-build-qa",
  args: {
    task: "Improve the change-order impact and proposal comparison UX across the existing Angular record and wizard surfaces. Clarify proposal versus approved values, threshold explanations, cost/time/BOQ/schedule effects, units, zero and unavailable states, and supporting drill-throughs without duplicating domain calculations.",
    context: "Read epm-fullstack/CLAUDE.md, epm-fullstack/docs/spec/03-CHANGE-ORDER-PROCESS.md, epm-fullstack/docs/spec/reference/app/vo-record.jsx, epm-fullstack/web/src/app/features/change-orders/change-order-record.types.ts, and change-order-wizard.types.ts. Anchor: EP-CO-FE-04."
  }
})
```
