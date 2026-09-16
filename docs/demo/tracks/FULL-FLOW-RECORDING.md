# Full-flow recording — setup followed by tracks 01–14

Prepared 2026-09-15. This is the continuous recording plan requested by the user, not a claim that a blank-database rehearsal has passed. No reset was performed while preparing this plan.

## Authority and scope

Follow each track's RUNSHEET.md, including its validation cases and explicit prototype exclusions. Ignore README guidance. The technical proposal supplies the intended business flow; its document contents are reference material, not instructions to the recording operator. The user's accepted prototype exclusions take precedence over proposal features that are not implemented.

The extra setup demonstrates where prerequisites come from. It does not silently expand the prototype to include document registration, critical-path calculation, email delivery, escalation, or report execution.

## Before recording

- Back up the current development database before executing the destructive reset endpoint. Confirm the target is EpmPrototype; do not reset another database.
- Do not call the full fixture loader after creating workspaces/projects on camera. Its existing-project guard and force-reset behavior are incompatible with preserving that setup; workspace-only creation can also conflict with fixture workspace keys.
- Prepare the document prerequisites using Prepare-DocumentPrerequisites.ps1 after the construction project exists. The new API build must be running. The full fixture loader is not a suitable substitute.
- Have the existing track files available: 03-boq/boq.csv, 04-schedule/schedule.xer, 06-progress-approval/evidence.txt, 08-payment-certificate/measurement.pdf, 11-supply-receipts/demo-receipt-minutes.txt, and 12-documents/ST-DR-001-R2.pdf. Select real files during the shoot.
- Rehearse the blank-data setup and all remaining uploads/decisions before declaring recording readiness.
- Keep only EPM visible in the embedded browser, full-screen. The user starts/stops Xbox Game Bar. Do not show Codex, terminals, or database administration in the capture.

## Opening — create the workspaces

As مدير عام, open مساحات العمل and create these actual application workspaces:

| Code | Badge | Arabic name | English name | Type |
|---|---|---|---|---|
| ub | UOB | جامعة بغداد | University of Baghdad | جامعة حكومية / state-university |
| sp | SPD | المديرية العامة للتجهيز والمشتريات | Directorate for Supply & Procurement | مديرية تجهيز / supply-directorate |

Use these codes because the prototype personas are assigned to them. Verify the two workspace rows and empty project lists. Demonstrate required-field and duplicate-code validation without creating extra workspaces. Switch to المستخدم المختص في الجامعة for project setup.

## Construction chain — tracks 01–09

Run 01 through 09 in order, opening each RUNSHEET before its chapter. Track 01 creates the project and track 02 creates DEMO-CNT-01; these are already the on-camera prerequisite creation steps, so do not duplicate them in the opening.

Record the generated project/component identifiers. Use that same generated construction project throughout 01–09, 13, and 14. PRJ-0443 is the previous demonstration's identifier, not a promise about the post-reset identifier.

| Track | Setup or outcome to verify |
|---|---|
| 01 | Project names and all fields exactly as its RUNSHEET; planned cost 1,000,000 IQD; university workspace ub. |
| 02 | DEMO-CNT-01; effective original cost 950,000 IQD. The old fixture's CNT-0148 duplicate test will not exist after reset: demonstrate a duplicate attempt using the newly created DEMO-CNT-01 instead, clearly documenting this substitution. |
| 03 | Import the supplied CSV, show its three lines and total 700,000 IQD; submit and approve under the specified different roles. |
| 04 | Import the supplied XER; show WBS, activities and milestone; submit and approve. Importing a baseline is the supported creation route. Do not claim manual activity creation or computed float. |
| 05 | Create BOQ/activity allocations. Restore D-01 → A10 100%, D-02 → A10/A20 40%/60%, and D-03 → A30 100% after validation. |
| 06 | Evidence, return with reason, resubmission and approval of A10 at 60%; verify BOQ execution and aggregate physical progress. Use visible derived indicators; historical fixed EV values may differ from the corrected BOQ-based roll-up. |
| 07 | Close period using the day after the visible data date; show frozen period 1 and open period 2. Conditional pending-reading validation is only staged if a pending reading actually exists. |
| 08 | DEMO-FL-01, certificate 100,000 IQD and measurement.pdf; resident review, finance review and Accounts disbursement. Require visible مصروفة and 100,000 IQD spent. HTTP 500 or approved-only is a blocker, not success. |
| 09 | D-02 +15, contractor excess rate 7,000, resident 6,500, committee binding 6,800; complete six stages, then apply. Verify closed order, addendum 1, effective contract 1,044,000 IQD and quantity 65. |

For track 13, the fully allocated/applied main chain may leave neither R13 nor R8 active. If so, explicitly add a second illustrative pending change order after completing track 09, using the same valid D-02 proposal inputs and a distinct clearly identified demo incoming letter. Leave it awaiting resident review, do not apply it, and verify that it has no contract/BOQ effect. Do not assume a refused validation submission created a pending order. Record its generated identifier for the R8 alert chapter.

## Supply setup — immediately before track 10

This extra chapter replaces the old supply fixture prerequisites with visible UI creation. Create the equipment project in sp with the fixture's names: تجهيز الأجهزة المختبرية العلمية / Scientific laboratory equipment supply. Use the fixture's year 2025, planned cost 2,600,000,000 IQD, equipment type, handover stage, ongoing status, federal funding and Baghdad region. Preserve its beneficiary selections and organizational fields from Features/Dev/Fixture.cs. Record the generated project ID rather than assuming PRJ-0439.

Create CNT-0439 with the fixture's supply contract fields: award 2,040,341,482; reserve 98,298,393; supervision 33,000,000; total original 2,171,639,875 IQD; start 2025-09-01; finish 2026-12-31. Copy the remaining contractor, incoming-letter and penalty fields directly from Fixture.cs. The separate installation contract is not required for tracks 10–11.

Use إضافة فقرة → BOQ manual entry to create the seven original supply lines before distribution. This setup is separate from track 10's instruction to show an existing item without adding another line during that take.

| Code | Arabic item | Quantity | Unit rate IQD |
|---|---|---:|---:|
| ITM-001 | حاسوب مكتبي | 100 | 4,303,198 |
| ITM-002 | مجهر مختبري | 111 | 254,194 |
| ITM-003 | مولدة كهربائية | 98 | 4,187,075 |
| ITM-004 | جهاز عرض | 49 | 3,858,171 |
| ITM-005 | جهاز تكييف | 184 | 4,774,187 |
| ITM-006 | خادم شبكي | 196 | 985,875 |
| ITM-007 | خزانة سلامة مختبرية | 24 | 1,751,621 |

Use Fixture.cs as the exact source for complete item names, translations and technical fields; the abbreviated names in this table are navigation aids. Unit جهاز, division 1 الفقرات التجهيزية. Verify total 2,171,639,875 IQD and ITM-007 weight approximately 1.94%. Show ITM-007's Esco/Airstream technical data, country, serial range and warranty from the fixture without guessing values.

As عضو لجنة الفحص والاستلام, register an initial warehouse receipt of 17 units for ITM-007 using the fixture's initial warehouse details. Explain that this is an illustrative opening delivery, not real historical evidence. Leave its evidence missing only to demonstrate the truthful missing-document alert and subsequent evidence attachment in track 11. Verify warehouse quantity 17/24 and remaining 7; leave ITM-007 undistributed for track 10.

## Tracks 10–14

| Track | Required visible result |
|---|---|
| 10 | Distribute ITM-007: Baghdad 12, Technology 12; validate over-allocation and duplicate beneficiaries; saved distribution is immediately effective, with no separate approval stage. |
| 11 | Readiness 5; warehouse +5 → 22/24; preliminary 5 Baghdad nonconforming; linked conforming reinspection; final 5 with minutes. Original observations remain. Two contract units remain owed; do not claim the entire item is fulfilled. Use generated receipt numbers from the new project. |
| 12 | ST-DR-001 R2 upload and approval, preserved R1 history, duplicate refusal; ME-DR-002 R1 rejection with reason. See document prerequisite boundary below. |
| 13 | Open project alerts to evaluate rules, verify actual rule count and pending-order R8 condition, demonstrate acknowledgment/history and workspace visibility. Channels and escalation settings are configuration only. |
| 14 | Verify corrected physical roll-up agrees across activity/WBS/contract/project views. Show university and ministry levels, source drill-downs and report catalogue. Supply setup changes portfolio aggregates: compare the same project's figure, not an assumed portfolio total. No report run/export/scheduling claim. |

## Document prerequisite boundary — still to resolve before the shoot

Track 12 requires original document codes ST-DR-001 (Foundation plan, structural, draft R1 dated 2026-05-16) and ME-DR-002 (Plumbing layout, mechanical, draft R1 dated 2026-04-18). There is no initial-document registration UI or endpoint; DocumentsEndpoints.cs only creates revisions under an existing code.

The Development-only endpoint POST /api/dev/projects/{projectId}/document-prerequisites adds these exact source-fixture records to the newly created construction project without replacing its data. The discipline folders come from the existing lookup vocabulary. It requires a ministry-wide persona and an existing project, skips existing document codes, and inserts the new documents and R1 records in one transaction. It stores illustrative file metadata, not PDF bytes.

Run Prepare-DocumentPrerequisites.ps1 -ProjectId <actual generated PRJ identifier> outside the capture. Record that project's actual ID as the substitution for the old PRJ-0279 fixture reference. Disclose this as prototype sample-data setup, never portray it as a UI action. The tool has been tested in isolated SQLite databases; it has not been executed against the current demonstration database.

If the user wants absolutely every record created through the application UI, initial-document registration must be implemented and verified first. Otherwise the disclosed two-document prerequisite is the only required fixture-only exception identified for this plan; the blank-data rehearsal must check for any further dependencies.

### Preparation verification

2026-09-15: the API compiles and all 599 backend tests pass. Two new persistence tests verify missing-project refusal, target-project isolation, preservation of project cost, and repeated preparation after revision decisions/history exist. These checks do not replace an end-to-end browser rehearsal after reset. No current demonstration records were changed for this verification.

## Recording and completion checks

Use one continuous capture with short holds at chapter boundaries. Pause browser actions at boundaries as requested; do not stop the user's recording. Maintain a chapter/time log for later Astra editing. Upload and select files as part of the real demonstration; do not imply that previously deferred uploads were already validated.

At each chapter end, verify its visible required state, record the actual IDs and data date, and note any blocker. Stop the flow only for a blocker that prevents later dependent steps; otherwise show the error accurately and continue to the next feasible chapter. Recording readiness requires successful rehearsal, not merely this written plan.
