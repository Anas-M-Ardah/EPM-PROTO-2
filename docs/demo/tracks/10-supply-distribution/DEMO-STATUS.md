# Track 10 demonstration status — 2026-09-15

Required prototype end state achieved and visibly verified: PRJ-0439 / CNT-0439 / ITM-007 has a saved distribution of 12 to جامعة بغداد (ub) and 12 to الجامعة التكنولوجية (tu), totaling contracted quantity 24. Reopened supply-item panel confirmed both persisted beneficiary rows and received columns 0 / 0. Existing fixture overall receipts remain 17 of 24 (71%), status استلام جزئي. Item weight remains 1.94%, unit rate 1,751,621 IQD and value 42,038,904 IQD.

Demonstrated existing technical data: خزانة سلامة مختبرية, Esco, Airstream, Singapore, serial range SN-4000 to SN-4017, warranty 24 months. No new item created. Used المستخدم المختص في الجامعة role throughout.

Distribution edited via BOQ, saved, and verified in supply-item distribution panel. A separate approval action is explicitly excluded by this runsheet/build: saved distributions take effect immediately. No approval or alert generation was claimed.

Validation differences from RUNSHEET.md:
- V1 attempted Baghdad 20 and Technology 10. UI capped Technology to 4, showing total 24 and remaining 0, with visible explanation that each field is constrained by other allocations. The specified 30 > 24 save-time error could not be reached without bypassing UI validation. This temporary 20 / 4 allocation was not saved; corrected to 12 / 12 before saving.
- V2 Add beneficiary dropdown excluded Baghdad and Technology after adding them; only Mustansiriya remained. Duplicate Baghdad cannot be added through this UI, so the specified duplicate-save error was not reached. No validation bypass was performed.
- Editor initially displayed beneficiary codes ub / tu; persisted rows displayed university names. Final save toast was not positively verified; persisted distribution was verified after navigation and reopening.

No blocker remains for the prototype distribution end state. Exact validation-error takes differ because the current UI prevents invalid input earlier. Paused at Track 10 boundary; did not start Track 11, close browser, or stop user-controlled recording.
