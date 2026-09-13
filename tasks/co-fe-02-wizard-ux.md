# CO-FE-02 — Change-order creation wizard UX refinement

id: CO-FE-02
title: Change-order creation wizard UX refinement
anchor: EP-CO-FE-02
status: DONE

## Scope

Improve the existing Angular wizard at `web/src/app/features/change-orders/change-order.wizard.ts` and its template while keeping draft, preview, submit, and attachment behavior on the existing endpoints.

- Make the stepper communicate where the user is, what remains incomplete, and whether the current step is valid.
- Improve the selection experience for contract, BOQ lines, and activities without losing already-entered values.
- Present contractor and engineer proposal values side by side with clear units and an explicit server preview step.
- Explain threshold, pricing, schedule-only, and proposed-item behavior at the point where each choice matters.
- Make draft save, preview, submit, cancel, and retry states explicit and safe against duplicate submission.
- Match `docs/spec/reference/app/vo-wizard-parts.jsx`, `docs/spec/03-CHANGE-ORDER-PROCESS.md`, and the wizard endpoint DTOs.

## Acceptance criteria

- Users can move backward without losing valid input or changing the selected contract unexpectedly.
- Invalid steps identify the exact missing or conflicting fields in both languages.
- Preview values are clearly distinguished from submitted values and are not recomputed in the browser.
- Submission feedback identifies the resulting order number or the recoverable failure.

## Workflow

```txt
Workflow({
  name: "plan-build-qa",
  args: {
    task: "Refine the existing change-order creation wizard UX in web/src/app/features/change-orders while preserving the current draft, preview, submit, and attachment contracts. Improve step clarity, validation, proposal comparison, threshold guidance, and duplicate-submit protection.",
    context: "Read epm-fullstack/CLAUDE.md, epm-fullstack/TRACE.md, epm-fullstack/docs/spec/03-CHANGE-ORDER-PROCESS.md, epm-fullstack/docs/spec/reference/app/vo-wizard-parts.jsx, and the existing wizard TypeScript, HTML, types, and API. Keep calculations server-owned. Anchor: EP-CO-FE-02."
  }
})
```
