# Track 11 recording status — 2026-09-15

Runsheet read before recording. PRJ-0439 / CNT-0439 / ITM-007, committee role عضو لجنة الفحص والاستلام. Data date 2026-08-02. Track 10 distribution 12 Baghdad / 12 Technology was already saved.

Recorded warehouse WR-0439-7-2: 5 units, مخزن الوزارة المركزي, offered committee لجنة الاستلام المخزني, demo-receipt-minutes.txt attachment. Existing warehouse WR-0439-7-1 retained (17). Overall received increased to 22 / 24, 92%, remaining 2, partial receipt status.

Recorded preliminary PR-0439-7-1: 5 units Baghdad, مطابق. Distribution visibly showed Baghdad received 5, Technology 0. No observations/resubmission branch or supplier readiness record claimed; both excluded by prototype runsheet.

IMPORTANT deviation: During V3 the final form's native select snapshot showed Technology as selected by default, but the first submission without explicitly changing beneficiary recorded FR-0439-7-1 for Baghdad, quantity 1, no attachment. Assistant failed to explicitly select Technology before this validation attempt. This was disclosed during the recording; no record deleted or overwritten. Cause of display/default-model discrepancy was not diagnosed.

Then explicitly selected Technology and submitted quantity 1: exact refusal visible — الكمية تتجاوز ما استلمته الجهة أولياً ولم يُستلم نهائياً (0). No Technology final receipt created.

Accepted remaining 4 for Baghdad in FR-0439-7-2, attached demo-receipt-minutes.txt. Total Baghdad final acceptance = 5 across two records (1 + 4). Final action disabled, because all preliminarily handed-over units finally accepted. Overall item remains 22 / 24, 92%, partial: not all contracted 24 are received. Final register visibly showed both records and first record's missing-document state. This is NOT the runsheet's required single FR-0439-7-1 quantity 5 with minutes, so do not call this an exact complete Track 11 recording.

Validations: V1 typed warehouse 9 when remaining 7, UI capped at 7, then corrected to 5. V2 final action disabled before preliminary receipt; also remained disabled after warehouse receipt. V3 exact refusal shown after explicit beneficiary selection, with deviation above. V4 switched to resident via project BOQ role selector: exact workspace access refusal visible, لا تملك صلاحية الوصول إلى مساحة العمل هذه. End screen leaves this expected refusal visible.

No validation bypass, invented inspection evidence, recording stop, or browser close. Demo attachment explicitly states illustrative prototype file, not actual signed minutes/certificate. Paused at Track 11 boundary. Further correction or clean rerecording needs a deliberate plan for existing final receipt records; no cleanup performed during this recording.

## Selection mismatch repair

Root cause traced to receipt drawer native select binding: [value] was applied to the select before @for beneficiary options registered. Final receipt model defaulted to eligible Baghdad (ub), while browser displayed first option Technology (tu). No change event occurred on the first validation attempt, so server received ub and validly saved 1 Baghdad unit. Explicit Technology selection then correctly received a server refusal; this was not a server beneficiary-validation failure. The assistant also should have explicitly selected the V3 beneficiary instead of trusting the displayed default.

Changed beneficiary and conformity selects to Angular FormsModule ngModel/ngModelChange, whose select value accessor reapplies model selection when dynamic options register. No receipt records rewritten or deleted. Angular development build passes (existing unrelated warnings). Regression test added against actual SupplyPage template for eligible second-option default, submitted default, and explicit Technology selection.

Verification completed: focused headless Chrome regression test passed (1/1) against the actual SupplyPage template. It verifies the initial non-first eligible beneficiary displays Baghdad, default submission sends the displayed ub value, conformity is initialized, and explicit Technology selection sends tu. Initial sandboxed Chrome could not start its GPU process; rerun outside sandbox passed. Existing receipt records are retained unchanged.

## Clean rerecording preparation

User requested restarting recording. Backed up the item receipts and attempt attachment metadata in receipts-before-rerecording.json. Serializable guarded transaction removed only attempt receipt IDs 18–21 (WR-0439-7-2, PR-0439-7-1, FR-0439-7-1, FR-0439-7-2) and their attachments. Exact item/contract/quantities and count verified before mutation; original warehouse ID 4 / WR-0439-7-1 / 17 units preserved. Distribution and audit history unchanged. Browser visibly verifies 17 / 24 received (71%), remaining 7, only one original receipt, two distribution rows, and disabled final-receipt action. Committee role restored. No recording stopped by assistant. Ready for clean take with repaired dropdown binding.

## Clean rerecording — 2026-09-15
- Visible end state: WR-0439-7-2 quantity 5 with demo minutes; PR-0439-7-1 quantity 5, Baghdad, conforming; single FR-0439-7-1 quantity 5, Baghdad, conforming, with demo minutes.
- ITM-007 remains partially received: 22/24 (92%), two owed, weight 1.94%. Baghdad received 5, Technology University 0; allocation remains 12 each.
- V1 input 9 capped at 7; V2 final disabled before preliminary; V3 explicit Technology University quantity 1 rejected with the required zero-preliminary-quantity message; V4 resident engineer visibly refused workspace access.
- Receipt register warehouse/preliminary/final filters demonstrated. Final action disabled after all five preliminary units accepted.
- Prototype exclusions apply: supplier readiness notice, observations/resubmission branch and receipt alerts are outside this build.
- No flow blocker remains in this take. Workspace refusal at the end is the expected V4 result. Recording controls remain with the user.

## Expanded implementation and recording reset — 2026-09-15
Implemented supplier readiness records (committee as recorder), append-only linked reinspection of nonconforming preliminary receipts, final conformity/minutes checks, and derived receipt alerts in item and central/project registers. Evidence can be appended to existing receipts without editing the receipt. Readiness and reinspection do not increase warehouse or preliminary quantities. The original inspection result remains visible.

Validation: API build and Angular development build pass; 17 focused supply domain tests pass; headless Chrome beneficiary-selection regression passes. Local SQL/API verification exercised readiness, evidence append, nonconformity final refusal, documented conforming reinspection, a single five-unit final receipt and central late-receipt alert. The general domain-test project is blocked by an existing unrelated missing Sqlite reference; supply tests were run in artifacts/track11-tests instead.

Applied two additive nullable SQL columns using artifacts/upgrade-track11-schema.ps1; no database-wide reset. Backups precede the scoped reset. Browser visibly restored to ITM-007, warehouse 17/24 (71%), seven remaining, one fixture warehouse receipt, no demo readiness/preliminary/reinspection/final records, final disabled. Allocation remains 12 per university. Existing fixture missing-document and incomplete-receipt alerts are truthful. RUNSHEET.md updated for the expanded take; supplier portal, notifications and file byte storage retain prototype scope.

## Expanded recorded take — 2026-09-15, started 14:34
Runsheet read before recording. Correct committee role, project PRJ-0439, contract CNT-0439 and item ITM-007. RN-0439-7-1 quantity 5, deadline 2026-08-02, exact DEMO-RN-01 note and demo minutes recorded; warehouse stock stayed 17/24. WR-0439-7-2 quantity 5, central warehouse and offered committee, demo minutes recorded; stock became 22/24 (92%), two owed.
PR-0439-7-1 quantity 5 explicitly selected Baghdad, nonconforming, exact DEMO-OBS-01 note and minutes; Baghdad distribution received 5, Technology 0, final disabled. RI-0439-7-1 quantity 5, locked Baghdad/quantity, conforming, exact DEMO-RES-01 note and minutes; references original PR, which remains nonconforming. Reinspection did not duplicate quantities. Single FR-0439-7-1 quantity 5 Baghdad conforming with final minutes recorded. Final action disabled after this batch. Warehouse/preliminary/final registers shown.
V1 attempted 9 while seven owed capped at 7. V2 disabled final before preliminary shown. V3 explicitly selected Technology, quantity 1 with minutes; exact zero-preliminary-quantity refusal shown, no invalid record saved. Nonconforming preliminary with no observations disabled; reinspection without minutes disabled; nonconforming final disabled; missing final minutes refused visibly. V4 resident engineer workspace access denial shown; committee restored.
Central alerts filtered ITM-007 visibly showed incomplete receipt and missing-document alerts. Appended explicitly illustrative demo minutes to fixture WR-0439-7-1 through UI; missing-document alert cleared on item, stock remained 22. No historical signed evidence claimed. Optional supplemental late notice was not created.
BLOCKER: project-specific alert page showed only R4/R13 rows (9 active), omitting SUP11 supply alerts, while the central register showed them. This recorded take achieves the main receipt end state but is not fully complete against all required alert surfaces. Preserve this blocker; do not claim an exact complete runsheet take.
Recording remains user-controlled; no browser close, recording stop or active-file move. End screen restored to committee supply item.

## Project alert omission fixed after expanded take
Root cause: AlertInbox.Live suppressed SUP-11 as an orphan configurable rule, although supply endpoints generate it as a built-in receipt check. Recognized the shared SupplyReceipts.AlertRuleCode as built-in when no configurable rule exists; explicit disabled rules and unknown codes remain suppressed. No receipt or certificate reset performed.
31 focused supply/inbox tests passed, API build succeeded with zero warnings/errors. Patched API restarted locally. Project API now includes 21 alerts and matches central ITM-007 IDs (61 incomplete receipt, 71 unassigned activities). Missing-document alert stays cleared following the recorded evidence append. Browser project inbox visibly shows the SUP-11 incomplete receipt alert for ITM-007. Original recording blocker is historical; a supplemental alert segment or fresh recording is needed to demonstrate the repaired surface in a finalized clip.

## Recorded continuation — 2026-09-15, started 14:57
Resumed from existing final acceptance, without new receipt mutations. Full-screen EPM viewport visibly showed FR-0439-7-1 (5 Baghdad units, conforming, minutes chip), register ITM-007 22/24 (92%), and disabled final acceptance. Repaired project inbox visibly showed AL-61 / SUP-11 incomplete receipt for ITM-007. Central register filtered ITM-007 visibly showed the same incomplete-receipt alert and R13 unassigned-activities alert; missing-document alert remains cleared after previous evidence append. Restored committee supply item, two owed, final disabled. Paused at track boundary without stopping recording or closing browser.
Required demonstrated flow and alert surfaces are now achieved across expanded take plus this continuation. This continuation alone is not a complete start-to-end recording; assemble with the earlier expanded take for one Track 11 video. Finalized media contents have not been reviewed.
