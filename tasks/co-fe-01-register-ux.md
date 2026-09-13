# CO-FE-01 — Change-order register UX refinement

id: CO-FE-01
title: Change-order register UX refinement
anchor: EP-CO-FE-01
status: DONE

## Scope

Improve the existing Angular change-order register at `web/src/app/features/change-orders/change-orders.page.ts` and its template without changing the established API contract.

- Make the register easier to scan by separating identity, stage, commercial effect, schedule effect, and next action.
- Make the active persona and relation scope visible at the top of the page, including read-only and no-permission states.
- Refine search, stage, order-type, and grouping controls so their current values remain obvious in Arabic and English.
- Keep pending orders visually distinct from applied contract totals and make the row-to-record interaction unmistakable.
- Provide intentional loading, empty, error, and filtered-empty states with useful next actions.
- Preserve the reference component behavior from `docs/spec/reference/app/vo-record.jsx` and the screen rules in `docs/spec/04-SCREENS.md` §10.

## Acceptance criteria

- A reviewer can identify status, owner, stage, value effect, time effect, and next action without opening every row.
- Every control works with keyboard focus and has an accessible name.
- Register rows open the record consistently and do not expose actions the current persona cannot perform.
- No new derived commercial or schedule values are calculated in the template.

## Workflow

```txt
Workflow({
  name: "plan-build-qa",
  args: {
    task: "Refine the existing change-order register UX in web/src/app/features/change-orders without changing the API contract. Match the reference component and screen specification, preserve persona gating, and cover loading, empty, error, filtered-empty, Arabic, English, keyboard, and responsive states.",
    context: "Read epm-fullstack/CLAUDE.md, epm-fullstack/TRACE.md, epm-fullstack/docs/spec/04-SCREENS.md §10, epm-fullstack/docs/spec/reference/app/vo-record.jsx, and the existing change-order Angular page, template, types, and API before editing. Keep derived values server-owned. Anchor: EP-CO-FE-01."
  }
})
```
