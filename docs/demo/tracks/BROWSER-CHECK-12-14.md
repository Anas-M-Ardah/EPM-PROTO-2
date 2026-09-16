# Browser readiness check — tracks 12–14

## Update — rollup blocker resolved

The fix was applied and verified in the embedded browser on 2026-09-15.
Physical WBS and cost-basis schedule rollups now use each activity's allocated
BOQ contribution value, consistent with BR-04 project physical progress.
Imported BR-02 allocation weights and activity budgets are preserved. Full-scope
rollups retain unassigned billed value in the denominator rather than inflating
progress by normalising incomplete allocation.

Visible PRJ-0443 results: project physical **27%**, WBS D **27%**, schedule
contract total **27%**, subtree D.1 **36%**, D.2 **0%**. The schedule label now
says contract rollup, matching its contract scope. WBS notes distinguish physical
BOQ contribution value from planned activity-budget weights. The runsheet's
current-number expectation was corrected without altering historical readings.

Backend tests: **597 passed** including contribution, subtree, and incomplete
allocation regression cases. API build and Angular development build passed.
The original findings below are retained as history; the Track 14 rollup is no
longer a blocker. Deferred uploads and decisions remain outside this check.

Checked 2026-09-15 in the embedded EPM browser. Individual RUNSHEET.md files were used; README was not used. Uploads and recording were deferred at the user's request. Existing decision and payment data were preserved.

## Track 12 — controls checked; full submission still deferred

- PRJ-0279 / ST-DR-001 remains R1 draft; ME-DR-002 remains R1 draft, ready for the recorded cases.
- Specialist has revision upload controls without approve/reject controls.
- Empty revision submission displays the required issuer/transmittal/file error and creates no revision.
- Historical revisions are searchable with latest-only disabled; AR-DR-002 shows R3 current and R2/R1 superseded.
- Resident has approve/reject controls on the current draft. Empty rejection reason disables confirmation; the runsheet reason enables confirmation. The form was cancelled without deciding the revision.
- New R2 upload, duplicate submission, approval persistence, and rejection persistence were not exercised in this browser check.

## Track 13 — controls checked; acknowledgement reserved for recording

- PRJ-0443 has 14 enabled rules and open AL-72 / R8 for pending VO-01 at data date 2026-10-01.
- Rules show severity, channels, recurrence and escalation ceiling.
- Disabling R8 removes the alert and drops the inbox count from 1 to 0. Re-enabling restores it. R8 was left enabled.
- Resident central inbox lists the demo alert and has only the Baghdad workspace in scope. Higher management exposes additional workspaces.
- Initial overview count was zero before visiting project alerts. After project alert evaluation and reloading the overview, it agrees at one. This follows the runsheet's documented evaluation-on-open limitation; do not imply background evaluation.
- AL-72 was not acknowledged, so it remains available for the recording. Automatic escalation and external delivery remain prototype exclusions.

## Track 14 — remaining recording blocker

- PRJ-0443 project, Baghdad workspace and ministry watchlist show rounded physical progress 27% and effective value 1,044,000 IQD.
- Current actual chart point is 27.02% at 2026-10-01; historical September point is 27.43%. The runsheet's exact 27.43% expectation is stale for this current state.
- Project PV = 896,090; EV = 282,117; AC = 100,000; SPI/CPI = 0.31 / 2.82. Finance drilldown opens PRJ-0443 with 100,000 disbursed and 944,000 remaining.
- Schedule drilldown opens the same project and DEMO-CNT-02 at the same data date.
- **Unresolved:** WBS root and schedule summary show 17% while the project physical headline shows 27%. Schedule/WBS aggregate Activities.BudgetedCost; physical headline aggregates BOQ executed value. Resolve or explicitly distinguish these measurement bases before recording the runsheet's claimed activity-to-project rollup.
- Report catalog has 12 definitions. Selecting PRJ-0443 narrows it to 9 project reports; category results are financial 2, schedule 2, progress 3, contracts 1, audit 1.
- Repaired report title/description width with a horizontally scrollable table at narrow widths, readable secondary text, and project IDs in the selector/scope bar to distinguish duplicate demo names. Verified visually in the browser.
- Report execution, exports and scheduling were not clicked, as specified by the runsheet.

## Validation

- Backend suite: 594 passed, 0 failed.
- Angular development build passed with existing warnings.
- Production build could not inline Google Fonts because the sandbox blocked the external request; it reached Angular compilation without new template errors.

The complete recording should wait for the Track 14 rollup discrepancy. This check does not claim full submission coverage for deferred uploads or decisions.
