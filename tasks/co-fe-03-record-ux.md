# CO-FE-03 — Change-order record and workflow UX refinement

id: CO-FE-03
title: Change-order record and workflow UX refinement
anchor: EP-CO-FE-03
status: DONE

## Scope

Improve the existing Angular record view at `web/src/app/features/change-orders/change-order.page.ts` and its template without weakening workflow or persona rules.

- Turn the record header into a clear decision summary: order identity, current stage, responsibility, deadline, and next permitted action.
- Make the six-stage lifecycle and external-party status visible as a compact timeline with current, completed, blocked, and upcoming states.
- Separate proposal, approval, application, and closure states so users do not confuse an approved-but-unapplied order with an effective amendment.
- Make approval, rejection, external response, apply, and close actions explain their consequence before confirmation.
- Improve audit and application-progress presentation, including partial failure and retry messaging.
- Match the record behavior in `docs/spec/reference/app/vo-record.jsx` and `docs/spec/03-CHANGE-ORDER-PROCESS.md` §9.

## Acceptance criteria

- The record makes the current state and the next legal action obvious for every supported persona.
- Applying an order is visually distinct from approving it and clearly communicates downstream contract, BOQ, and schedule effects.
- Workflow actions remain disabled or hidden according to the existing server-provided permissions.
- Audit and application-step information remains traceable to the response DTOs and is not invented in the UI.

## Workflow

```txt
Workflow({
  name: "plan-build-qa",
  args: {
    task: "Refine the existing change-order record and workflow UX in web/src/app/features/change-orders. Make lifecycle, responsibility, proposal versus approval versus application, audit history, confirmations, and failure recovery clear while preserving all server-side workflow gates.",
    context: "Read epm-fullstack/CLAUDE.md, epm-fullstack/TRACE.md, epm-fullstack/docs/spec/03-CHANGE-ORDER-PROCESS.md §9, epm-fullstack/docs/spec/reference/app/vo-record.jsx, and the existing record page, template, types, and API. Anchor: EP-CO-FE-03."
  }
})
```
