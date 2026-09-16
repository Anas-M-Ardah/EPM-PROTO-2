# Change-order flow for the demo

Use this alongside the [video runsheet](change-order-video-runsheet.md). Walk the audience through one order from draft to contract effect; use the seeded records for close-ups rather than trying to complete every stage live.

## The story in one line

**Draft -> submit -> review through six listed stages -> approve -> apply -> closed.** Approval records the decision and projected impact; **only application changes the effective contract, BOQ, and schedule**. The UI may show *Submitted*, *Under Review*, and *Executed* as derived milestones; these do not require new stored lifecycle values.

## On-screen sequence

| Beat | Show | Explain |
| --- | --- | --- |
| 1. Start | Project -> Change Orders -> New change order | The project and selected contract determine whether this is a works/engineering or supply order. One order cannot span contracts. |
| 2. Build draft | Wizard details, BOQ lines or activities, contractor and RE department proposals, attachments | This is a proposal, not a contract amendment. Compare quantities, values, and days before submission. |
| 3. Guardrails | Required-field feedback and a line-level validation example | Empty orders, invalid decreases, and unbalanced redistribution cannot be submitted. For works, crossing the original line's 20% quantity threshold calls for an excess-rate decision. Supply rates remain fixed. |
| 4. Submit | Draft -> submitted/pending; open the Path tab | The order enters a six-stage, owner-controlled review. A return sends it back for correction with history retained; reject or cancel terminates it. |
| 5. Review | Path, current owner, available actions, external-party status, audit | Only the current stage owner makes its decision. A recorder may record an external letter but cannot approve the stage. Pending external responses block stage completion. |
| 6. Approve | Approved record, contractor / RE department / approved comparison, projected contract | The rate-fixing committee determines the approved value. The approved column, not either proposal, is what application will use. The existing contract remains unchanged. |
| 7. Apply | Optional reset-dependent take on an approved, unapplied record | Show effective contract before and after. Application creates the contract amendment and updates affected quantities, schedule, weights, and penalty baseline as applicable. A failed application is visible rather than silently treated as closed. |

## The six stages

| # | Stage | Owner on works orders | Recording point |
| --- | --- | --- | --- |
| 1 | Request study | Resident engineer department | Contractor request and consultant opinion are studied; incomplete material can be returned. |
| 2 | Change-order committee | Change-order committee | Committee reviews and prepares forms. |
| 3 | Rate fixing | Rate-fixing committee | **Always runs** to fix the approved value. A line above the 20% threshold also needs its excess rate fixed. |
| 4 | Endorsement and allocation | Change-order committee | Conditional. If not needed, show it explicitly skipped with a reason, not omitted. |
| 5 | Ministerial order and addendum | Change-order committee | Formal order and contract addendum. |
| 6 | Execution | Resident engineer department | Apply the approved change to the contract. |

For a **supply** order, the inspection and receipt committee owns stages **1 and 6** instead of the resident engineer department. The other stage owners remain the same. External parties are statuses within a stage, not extra stages.

## Cases to illustrate, without overloading the main cut

- **Works, approved but unapplied:** open `VO-05` in `PRJ-0279` to distinguish proposed, approved, projected, and effective values. Use its application only in a separate take, then reset the fixture.
- **Works, threshold:** open `VO-01` and its `BQ-006` line to explain the original-quantity 20% rule and the excess-rate tier.
- **Role handoff:** use `VO-02` to contrast a stage owner's decision with a recorder's limited external-letter action.
- **Supply:** open `VO-08` in `PRJ-0439` for redistribution between beneficiaries; do not imply that a supply contract allows a new unit rate.
- **Return or rejection:** if a safe fixture does not show the branch, explain it over the decision history rather than changing a seeded order for the main recording.

## Recording caveat

The current workflow code always plans stage 3. The seeded `VO-08` may display it as skipped because its fixture history reflects an older path. Treat that as fixture history, **not** the rule for a newly created supply order. Rehearse the live screens before final narration, and let the actual screen determine the spoken wording.
