# Continuous shoot chapter log

## Opening — workspace creation

User confirmed recording started. Recording is controlled by Xbox Game Bar; the assistant has not stopped it. Recording file and elapsed timestamps are not yet identified.

- Empty workspace screen shown as مدير عام.
- Missing-field submission refused with required-code message.
- Created ub / UOB / جامعة بغداد / University of Baghdad / state-university.
- Duplicate ub submission refused visibly; no duplicate workspace created.
- Created sp / SPD / المديرية العامة للتجهيز والمشتريات / Directorate for Supply & Procurement / supply-directorate.
- Verified both workspace rows with correct types, zero projects and zero effective value.
- Switched to المستخدم المختص في الجامعة; both assigned workspaces remained visible and workspace creation action was absent.
- Paused before track 01 on /projects; empty project list and new-project action visible.

Opening required state achieved. No blocker. No projects, contracts or full fixtures loaded during this chapter.

## Track 01 — project definition

- Read 01-project-definition/RUNSHEET.md before beginning.
- University specialist's workspace list showed only sp and ub.
- Empty save refused: choose a workspace before defining a project.
- Filled mandatory fields with planned cost 0; server refused with summary and greater-than-zero cost validation.
- Resident engineer role showed project definition unavailable; no save action.
- Returned to specialist and saved the exact construction project names, year 2026, construction type, design stage, ongoing status, Baghdad, federal funding, planned cost 1,000,000 IQD, beneficiary ub, university formation, engineering department and consultant specified in the runsheet.
- Generated identifiers: PRJ-0001 / PC-0001. Data date 2026-09-15.
- Verified suggested code/region/expenditure classification on the saved information screen and one creation activity entry by the university specialist.
- University register showed the project as its sole record. Senior management ministry portfolio showed 1 project, up from the empty starting state.
- Prototype project approval remains direct on save; no separate draft/review stages portrayed.
- Cost displays in the project register/overview and portfolio remain 0 before contracts exist; these screens show derived contract cost, not the definition's planned-cost input. Preserve this visible state; track 02 creates the first contract.
- The new-code form showed a placeholder code before save; the actual generated PC-0001 appeared after save, rather than a populated next-code value before save as stated in the runsheet. This is a visible runsheet/UI discrepancy, not a saving blocker.

Required saved-project end state achieved. Returned to PRJ-0001 information as the university specialist and paused before track 02. Recording was not stopped. Entire clip path/timestamps remain unidentified.

## Continuous continuation — tracks 02–08

User explicitly instructed “continue don't pause”; chapter confirmations are no longer requested. Recorder remains under user control.

- Track 02: created DEMO-CNT-01 with award 800,000, reserve 100,000, supervision 50,000, January 1–December 31 2026; original/effective contract and project cost 950,000 IQD. Zero award, equal dates and penalty 50% were refused. Entered 10% explicitly after automation's empty fill did not clear 50; the blank-default validation was therefore not demonstrated. The absent old CNT-0148 fixture was replaced by DEMO-CNT-01 for the duplicate-code refusal; cancelled without another contract.
- Track 03: imported boq.csv, mapped and validated all three rows, submitted and resident approved version 1. Approved bill 700,000 IQD; weights 28.57/42.86/28.57. Pending approval was unavailable to the submitter. Optional manual-import branch omitted.
- Track 04: imported schedule.xer, validated four activities including milestone M-99, resident approved baseline 1. Cost 700,000, man-hours 2,600; three activities carry weight and milestone is excluded. No critical-path calculation claimed.
- Track 05: D-01→A-10 100%; D-02→A-10/A-20 computed 40/60, manual 50/50 then restored 40/60; D-03→A-30 100%. Milestone absent from allocation picker. 80/50 sum 130 showed warning and disabled Save rather than sending the server refusal. Final three fully allocated, zero unallocated.
- Track 06: 150% refused; A-10 60% with evidence.txt submitted, resident returned with required reason, specialist resubmitted, resident approved. Project 27% (27.43% detailed), D-01 60% / EV 120,000, D-02 24% / EV 72,000. Lower 50 and unchanged 60 readings disabled submission; resident editing unavailable. Approved reading dated September 15.
- Track 07: specialist lacked closure authority; absent date and equal September 15 date refused. Resident closed period 1 and opened period 2 on September 16. Frozen period 1 retains physical 27%, financial 0%, SPI 0.33. Pending-readings refusal was conditional and not applicable because none remained.
- Track 08: registration action is on “البيانات المسجّلة”, not “الدفعات” as runsheet states. Unallocated 10,000 and missing measurement disabled Next. Fully documented 5,000,000 certificate refused with exact 950,000 ceiling / 4,050,000 excess. Corrected to 100,000 using DEMO-FL-01 dated September 16 and measurement.pdf. Registered one pending certificate. Specialist registration denied; Finance before resident release and resident after release had no release action. Resident → Finance → Accounts all released successfully. Final register “مصروف”; spending 100,000 IQD, UI rounded 11% (100000/950000=10.53%). No HTTP 500 occurred. Current default payment type label “مستخلص جارٍ” corresponds to the runsheet's interim certificate.

Each executed runsheet was read before its chapter. Required final states for tracks 02–08 were visibly verified. The discrepancies and conditional omissions above are retained for editing; recording file and elapsed timestamps remain unidentified.

## Track 09 — change order

- Empty wizard blocked at step 2 with “أضف بند كميات أو نشاطاً متأثراً واحداً على الأقل”, rather than reaching the server's empty-order message.
- D-02 decrease 45 reached review, which blocked both contractor and resident proposals against remaining quantity 38; Send disabled. No order was created by either invalid case.
- Created VO-01, DEMO-IN-01 dated September 16, reason زيادة كمية الخرسانة, engineering/contractor, D-02 +15, rates 7000/6500, measurement.pdf supporting demo document, zero activities. Preview showed 10×6000 and 5×new rate, exact +95000/+92500, weights total 100%.
- Committee at stage 1 had no decision action. Empty resident return comment produced required refusal. Resident approved with دراسة مكتملة, committee approved stage 2.
- Selecting price approval prefilled the resident rate 6500. The initial attempted missing-rate validation therefore actually approved that prefilled proposal (92500); it was not a missing-field refusal. This remained unapplied. Stage 4 committee returned with a documented correction reason; price committee resubmitted, restarting stages 1–3. Original return and decisions remain in audit history.
- At reopened stage 3, automation empty fill did not clear the numeric field. Explicit rate 0 produced “يجب إدخال القيمة المعتمدة من لجنة تثبيت الأسعار قبل اعتماد هذه المرحلة”. Entered 6800 and approved, giving 94000. This is an invalid-zero validation, not a blank-field take.
- Completed stages 4–6; visibly approved/unapplied, contract still 950000. Applied through المسار → الإجراء → تطبيق الأمر وإصدار الملحق.
- Verified application toast, closed VO-01, addendum 1 effective, 950000→1044000; checklist 1–5 and 9 complete, 6–8 not required. Contract register original 950000, effective1044000. BOQ D-02 65, amount394000, bill794000, weights25.19/49.62/25.19; original source values preserved in order detail.
- Contract register aggregate spending rounds 10% against revised value, but its individual card still displays 11% against original value. This visible presentation discrepancy is retained for later correction; no false agreement claimed.

Required main order end state visibly achieved, with correction return included in the continuous take. No second pending illustrative order has yet been created for track 13.

## Supply prerequisite creation and track 10

- Created PRJ-0002 / PC-0002 via project definition UI, source fixture equipment names/year2025/planned2600000000/typeequipment/handover/ongoing/Baghdad/federal/high priority/BA-2547/coordinates33.31,44.39; exact source organizational fields, branch, executor, consultant, description and beneficiary string ub,nu,tu. Visible data date September16, rather than old fixture August2.
- Created CNT-0439 via UI with exact fixture contract fields, award2040341482/reserve98298393/supervision33000000, total2171639875; September1 2025–December31 2026; 15% penalty; incoming4118 dated August3 2025; source contractor/consultant/component/executing party/contact. Creation form offers no forecast finish, so fixture February15 2027 forecast was not entered. Separate installation contract omitted as planned.
- Blank supply manual form omitted device unit. Added device unit to supply-only unit selector (boq.page.ts); hot reload discarded only the unsaved first form. Reentered it and saved all seven source rows with exact Arabic descriptions, quantities, prices and technical details. UI auto-generates BQ-001..BQ-007 rather than fixture ITM codes; the seventh is the identical Esco cabinet. No code was fabricated or forced. Form has no English item-description or HPE warranty-end-date field, so those fixture-only fields were not entered.
- Verified seven-line bill2171639875; BQ-007 quantity24, rate1751621, amount42038904, weight1.94%, Esco/Singapore/Airstream/SN4000→SN4017/warranty24/months/supplied20.
- Inspection committee registered illustrative opening warehouse delivery17 dated March16 2026, source central warehouse/warehouse committee, explicit demo note, no attachment. Stock17/24, remainder7, incomplete and missing-document alerts visible.
- Technology/Mustansiriyah absent after reset; only Baghdad resolved in picker. Created source nu/MU/الجامعة المستنصرية/Al-Mustansiriyah University/state-university and tu/UOT/الجامعة التكنولوجية/University of Technology/technical-university through workspace UI as director. Specialist remains limited to its assigned ub/sp workspaces; beneficiary picker now resolves all three project beneficiaries.
- Track10 read before execution. Showed BQ-007 technical/general data. Attempt20+10 was automatically capped20+4 with quantity-cap toast; selected beneficiaries disappeared from add picker, preventing duplicates. Therefore runsheet's server 30-total and duplicate-row messages were not reached through this UI. No invalid/alternate distribution saved.
- Saved exact ub12/tu12. Verified supply distribution two named rows12/0 each, total24/0; stock17/24 (71%), partial receipt, weight1.94. Saved distribution effective immediately, no approval claimed.

Track10's effective distribution end state visibly achieved using actual generated BQ-007. Track11 notice August2 will be late against actual September16 date; do not repeat runsheet's old-fixture “not late” claim.

## Track 11 — documented acceptance batch

- Read runsheet before execution. Inspection delegate created RN-0002-7-1 qty5, deadlineAugust2, September16 notice, exact DEMO-RN-01 note and demo-receipt-minutes.txt; stock remained17. Late indicator truthful against actual date.
- Warehouse9 attempt capped7. Corrected5, source central warehouse/warehouse committee, minutes attachment; saved WR-0002-7-2, stock22/24 (92%), remainder2. Final button disabled before preliminary receipt.
- Preliminary5 explicitly Baghdad/nonconforming/exactDEMO-OBS-01 note+file saved PR-0002-7-1. Missing observations disabled submission. Baghdad distribution12/5, Technology12/0; final disabled.
- Original PR action created RI-0002-7-1 conforming, exactDEMO-RES-01 note+file; Baghdad disabled/locked, originalqty5. Missing minutes disabled submission. Original PR remains nonconforming, RI references it; stock22 and preliminarytotal5 unchanged. Final enabled.
- Fully documented Technology final1 refused exact zero-preliminary-balance message. Corrected Baghdad5 and saved FR-0002-7-1 with final minutes. Final button disabled again; stock22 and remainder2. Original PR and RI preserved.
- Appended supplied demo file to opening WR-0002-7-1 via its third “إضافة مستند” action; archive6, file chip on original WR, missing-document alert cleared. No historical evidence claimed real.
- Opened project and central alerts. Central visibly contains incomplete BQ-007 and late receipt records, without missing-document record. It also shows supply BOQ unallocated-activity R13 records despite activity allocation being inapplicable in supply; retain this implementation discrepancy for later correction.
- Resident role switch automatically returned to entities with Baghdad as sole permitted workspace; no explicit forbidden error text was shown, so runsheet's exact error message was not claimed.

Required documented five-unit batch end state visibly achieved. Two contract units still owed; item obligation not fully closed. No recorder stop or chapter confirmation requested.

## Track 12 — drawing revisions

- Read runsheet. Disclosed selective two-document preparation on PRJ-0001; helper returned added2/existing records preserved/no file bytes. Old fixture PRJ-0279 replaced with actual construction project, as planned.
- Specialist structural folder → ST-DR-001 → uploaded supplied R2 PDF, issuer قسم التصميم — الجامعة, transmittal TR-DEMO-01, description تعديل أبعاد القواعد, issueSeptember16. Verified R2 currentdraft/R1 superseded with originalMay16/TR2412; no specialist decision controls.
- Repeated same fully filled transmittal/file refused exact duplicate message. Cancelled; total3 revisions across2 documents, no extra revision.
- Resident only R2 had approve/reject controls. Approved R2; current approved count1/draft1. Closed/reopened approvedR2; no further decision controls. Latest-only off + ST search showed R2September16/TRDEMO01 and preserved supersededR1May16/TR2412.
- Mechanical ME-DR-002 R1 rejection blank reason kept Confirm disabled. Exact reason المخطط لا يطابق مسار الأنابيب المنفّذ saved; rejected count1, draft0/current pending0; originalApril18/TR2436 preserved and decision reason visible.

Required approved revision/history end state and reasoned rejection visibly achieved. No new-document registration, preview, markup or stored-byte claims.

## Track 13 — alerts

- Read runsheet; continued without chapter pauses per latest user instruction.
- Created clearly labeled illustrative VO-02 / DEMO-IN-02 dated September16 through the UI, D-02 increase15 / contractor7000 / resident6500 and supplied measurement PDF. Submitted for review only. No approval, application or addendum; actual contract1,044,000 unchanged. Wizard displays original50 baseline rather than applied65; example not applied.
- Resident project alerts evaluated R5 for rejected ME drawing and R8 for pending VO-02. Rules14 enabled of14, R8 medium/in-app+email/weekly/five-day escalation metadata visible. Only current-day bucket contained records; did not fabricate other buckets.
- Acknowledged AL-19/R8; visible status مُقَر and needs-action fell2→1. Resident central center listed only2 Baghdad records. Director central center listed18 across both projects with1 acknowledged; VO-02 record persisted. Filtered acknowledged history.
- Optional rule toggle omitted. Acknowledgment does not resolve pending VO or approve rejected drawing. No automatic escalation, email/SMS delivery or inaccessible by-id validation staged.

## Track 14 — performance and report catalogue

- Read runsheet. Resident construction progress27%, planned82%, financial10%, PV859,112 / EV282,117 / AC100,000 and SPI0.33 / CPI2.82. Current S-curve point27.02%, September16 data date. WBS D27%, D.1 36%, D.2 0% visible.
- Director entered Baghdad via workspace list: project27%, current chart27.02%, effective1,044,000, spent100,000. Ministry watch-list same PRJ-0001 figure27%; ministry total2% includes large supply project and is not the construction-project comparison.
- Catalogue12 definitions, category/scope/format columns, last-run dashes. PRJ-0001 filter9 definitions, financial filter2. No run/export/schedule clicked. Catalogue header misleadingly claims automatic scheduling, and RPT-12 description says supply receipts unmodeled despite now implemented; these remain presentation discrepancies.
- Schedule drill-down opened same construction project/DEMO-CNT-01, WBS27% and September16 date. Finance drill-down same project shows actual100,000 spending / effective1,044,000 / remaining944,000. Table original950,000 +94,000 is correct; top equation incorrectly labels1,044,000 as original plus0 changes, a remaining presentation defect.
- Returned to updated project progress dashboard for closing shot. Browser and user's recorder left running; no recording path verified or file-saving claim made.

Implemented prototype end states for13/14 demonstrated. Remaining alert/presentation discrepancies above prevent a claim of a completely bug-free application or exact execution of every validation branch. Recording footage is owned by Xbox Game Bar; this log identifies chapters, not finalized video files.

Final visual verification: full-screen EPM1920x912 only, no chat or side-by-side; current dashboard27.02% September16 and neutral person avatar visible. Development Angular build passed for supply device-unit change. Production build failed fetching Google Fonts due sandbox network EACCES; no compilation error reported. Existing unused-import/optional-chain warnings remain.

Edited delivery: original Captures/ChatGPT 2026-09-15 15-48-42.mp4 identified (1,471,727,837 bytes, 79m51.50s), preserved. Final docs/demo/EPM-full-flow-edited-ar-final.mp4 verified at 51m02.07s /1920x1080 /15fps /119,829,559 bytes. English chapter cards and Arabic explanations,16 chapter entries,32 decoded boundary samples. Browser chrome and detected Codex sidebar/composer exposures removed; collapsed footer handle masked only in blank center. Arabic subtitles and review notes supplied. Each track now has EDITED-RECORDING.json pointing to its chapter in the single edited video. Interim unclean edit moved into artifacts/video-edit, not delivered as final.
