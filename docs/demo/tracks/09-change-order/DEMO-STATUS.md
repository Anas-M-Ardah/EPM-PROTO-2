# Track 9 — recorded attempt, blocked

## Update — defects fixed, ready to resume

On 2026-09-15 the user requested fixes. Server approval validation now requires a positive excess rate when the approved quantity exceeds the original 20% tier; it also refuses duplicate/unknown codes and missing required line approvals before writing. Browser validation now checks the actual required figures and reports the runsheet's mandatory committee approval message.

Resubmission resets all applicable stage rows to a fresh cycle with only stage 1 active, clears stale approved figures and decision metadata, and appends a review-cycle audit snapshot. Original BOQ values and submitted proposals remain unchanged. The browser's forward preview now follows stage numbers instead of searching only pending statuses.

Verified 44 focused tests, successful Angular development build and TypeScript check. Live API blank/zero/unknown-line submissions returned 422 with no state advance or approved value written. Through normal workflow endpoints the existing order was returned/resubmitted and stages 1→2→3 were verified. In the embedded browser, blank excess rate was refused; entering 6800 approved exactly +94000 and advanced to stage 4.

Current state: VO-01 pending stage 4, approved value +94000, no application performed. Ready to resume stages 4–6 and application on camera. Historical recording defects below are preserved accurately; Track 9's required final end state is still not complete. Before/after record snapshots are in VO-01-before-repair.json and VO-01-after-repair.json.

Recording was started by the user on 2026-09-15. Project PRJ-0443 uses prepared contract DEMO-CNT-02 (a disclosed deviation from runsheet DEMO-CNT-01). Data date 2026-10-01.

## Demonstrated

- Empty order blocked at wizard step 2 by the earlier guard: `أضف بند كميات أو نشاطاً متأثراً واحداً على الأقل.` The runsheet's final-send empty-order message was not reachable.
- D-02 decrease 45 was refused for both contractor and resident engineer: quantity remaining 38; final send disabled.
- Correct increase +15, contractor excess 7000 and RE excess 6500. Visible threshold 10; split 10 at 6000 plus 5 at excess rate; totals +95000 / +92500.
- Attached DEMO-IN-01.txt, explicitly illustrative supporting evidence with runsheet inputs, without asserting a real consultant approval or signature.
- Registered VO-01 with reason زيادة كمية الخرسانة, incoming DEMO-IN-01, no activity.
- Committee stage 1 read-only ownership validation passed.
- Empty return comment refused with mandatory-comment message.
- Resident study approved with دراسة مكتملة; committee review approved; price fixing stage applicable.

## Defects visibly encountered

V4 failed: clearing the approved excess-rate field and approving did NOT produce the runsheet's required refusal. The UI advanced to stage 4 with approved +90000 IQD (blank rate fell back to the original rate in the resulting displayed values). This is an observation of behavior, not a verified code diagnosis.

The stage 4 owner returned the order with a note documenting the defect and required 6800 correction. It returned to price fixing, where the only decision offered was resubmission. Resubmission moved the current stage to study, retained previous approval state and +90000 value, and the study approval preview proposed referral directly to stage 4. No corrected price-fixing decision was reachable through this demonstrated path. No further approval was submitted.

## Verified final state

VO-01 is under review at study after resubmission, with displayed approved +90000. It has NOT been applied or closed. Required +94000 approved value, 1044000 effective contract, amendment 1, quantity 65 and final revised weights were NOT achieved.

Project contract screen visibly shows original and effective value 950000 IQD, amendment effect 0, zero addenda, paid 100000 and remaining 850000 from Track 8. The incorrect change-order value has not been applied.

Paused at the Track 9 boundary as requested. Track 9 is not complete. Prototype exclusions (no imported-schedule time extension, no external-party statuses, no separate final verification) remain as stated by the runsheet.

## Restarted recording — 2026-09-15

Demonstration end state achieved for VO-02 on PRJ-0443 / DEMO-CNT-02 (the previously disclosed prepared-contract substitution). Prior VO-01 remains unapplied in review for audit history.

Shown in the active recording:
- New engineering order, DEMO-IN-01 dated 2026-10-01, contractor responsible, justification زيادة كمية الخرسانة, official demo-letter attachment DEMO-IN-01.txt.
- D-02 +15: original 50 at 6,000; threshold 10; contractor excess 7,000 gives +95,000; resident excess 6,500 gives +92,500; binding excess 6,800 gives +94,000.
- All six stages approved with the specified roles; resident study note دراسة مكتملة. Before application the register showed approved pending application and the contract remained 950,000.
- Application succeeded: addendum 1 effective, VO-02 closed. Checklist steps 1–5 and 9 complete; 6–8 not required. Contract original 950,000 preserved, effective 1,044,000. D-02 original contractual quantity 50 preserved, effective quantity 65, value 394,000. Weights 25.19 / 49.62 / 25.19, total 100.00.
- V1: empty order blocked earlier at wizard step 2 with أضف بند كميات أو نشاطاً متأثراً واحداً على الأقل. The exact final-send wording in the runsheet was not reachable because this earlier guard prevents progression.
- V2: decrease 45 blocked for both proposals against remaining 38; sending disabled.
- V3: change-order committee at resident study stage showed read-only with no available decision.
- V4: cleared price-fixing excess rate refused with the required committee-value message, then 6,800 approved successfully.
- V5: return with blank note refused with the mandatory-comment message.

No blocker remains for the required end state. Prototype exclusions were observed: no activity/time change or invented external approval records; application closes the order automatically. Incidental UI inconsistencies visible after application: BOQ footer labels the BOQ sum 794,000 as contract/project value, although the contract register correctly shows effective 1,044,000; the BOQ card's remaining-quantity label displays 65 while executed progress exists; the contract card retains an 11% spending label while the aggregate correctly shows 10%. These do not alter the achieved change-order end state and were not hidden or repaired during recording.

Paused at Track 9 boundary. Xbox Game Bar clip is still user-controlled; video finalization and captured-window contents are not verified by the assistant.
