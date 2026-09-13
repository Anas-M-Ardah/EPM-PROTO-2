# CO-FE-05 — Change-order responsive, RTL, and accessibility pass

id: CO-FE-05
title: Change-order responsive, RTL, and accessibility pass
anchor: EP-CO-FE-05
status: TODO

## Scope

Perform a focused quality pass over the existing change-order register, record, and wizard rather than introducing a new design system.

- Verify Arabic RTL layout, bidirectional identifiers, dates, currency, percentages, and negative values.
- Ensure tables, timelines, stepper controls, dialogs, drawers, and action groups remain usable at the project's supported desktop and tablet widths.
- Add visible focus states, logical tab order, keyboard operation, semantic labels, and announced validation or async status changes.
- Normalize loading, empty, permission-denied, error, retry, and success feedback across all change-order screens.
- Reuse established EPM components and CSS tokens; do not add page-scoped duplicated component systems.
- Record any API contract gap as a follow-up instead of silently working around it in the browser.

## Acceptance criteria

- The three change-order surfaces remain usable in Arabic and English without clipped or overlapping content.
- All primary workflows are keyboard operable and have visible focus.
- Async actions expose progress and result messages without relying only on color or toast timing.
- The pass does not alter lifecycle decisions, permission enforcement, or domain calculations.

## Workflow

```txt
Workflow({
  name: "plan-build-qa",
  args: {
    task: "Run a focused frontend quality pass across the existing change-order register, record, and wizard. Fix RTL, bidi, responsive, keyboard, focus, semantic labeling, async feedback, and state consistency issues using the established EPM design system without changing workflow rules or API contracts.",
    context: "Read epm-fullstack/CLAUDE.md, epm-fullstack/TRACE.md, epm-fullstack/docs/spec/04-SCREENS.md §10, the existing change-order Angular templates and styles, and the reference components before editing. Anchor: EP-CO-FE-05."
  }
})
```

