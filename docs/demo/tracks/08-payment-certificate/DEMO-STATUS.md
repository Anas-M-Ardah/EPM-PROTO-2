# Track 08 continuation status

The demonstration resumed on PRJ-0443, payment certificate DEMO-FL-01, using the existing contract DEMO-CNT-02 and amount 100,000 IQD. The runsheet specifies DEMO-CNT-01; the prepared project's contract code is a recorded deviation, not silently substituted.

Visible state before and after the Accounts action:

- Resident-engineer review: completed.
- Finance review: completed.
- Current desk: قسم الحسابات.
- Certificate: مصادق عليه (approved for payment), not disbursed.
- Spending: 0 IQD; spending percentage: 0%.

The finance persona (UI label محلل موازنة) pressed إطلاق المعاملة on the DEMO-FL-01 route. The application displayed:

`Http failure response for http://localhost:5080/api/projects/PRJ-0443/financials/payments/11/release: 500 Internal Server Error`

The required disbursed end state was not achieved. No duplicate certificate was registered. Earlier validation takes were not repeated during this continuation.

Recording is controlled by the user with Xbox Game Bar. Recording start, full desktop framing, and the resulting video file have not been independently verified. This file is a demonstration status note, not a recording.

At the user's request, pause at each track boundary for separate clips. Do not stop the recorder through automation.

## Backend fix applied after the failed take

The diagnostic response identified `System.InvalidOperationException: The binary operator NotEqual is not defined for the types 'System.Int32' and 'System.Nullable`1[System.Int32]'` in `FinancialsEndpoints.Ceilings`, at the committed-payment sum. EF 9 failed to parameterize `x.Id != (excludingPaymentId ?? 0)` when the optional exclusion was populated for disbursement.

The optional ID is now resolved to a non-nullable integer before constructing the query. All 38 isolated payment/audit-route and read-only live-database checks passed. The regression invokes the actual Ceilings method with payment 11 excluded and confirms other commitments still count. The existing main test project cannot currently compile because ChangeOrderAuditPersistenceTests references a missing SQLite dependency; it was not changed as part of this fix.

The local API was rebuilt and restarted on port 5080, and its financial endpoint responded successfully. No database reset occurred. Payment 11 remains certified and unpaid so its successful final action can be recorded. The full release endpoint has not yet been executed after the restart.

## Clean restart preparation (supersedes the payment state above)

The user explicitly approved removal of only the unpaid DEMO-FL-01 certificate and its related rows to restart track 8. The cleanup checked all rows against `payment-11-before-restart.json` and removed payment 11, its three audit stages, and its one attachment metadata row in a verified transaction. The original measurement.pdf and backup remain intact. No project, contract, or other payment was removed; project and contract counts were verified unchanged.

The financial API and visible payment register now confirm zero payments and zero spending. The browser is prepared on PRJ-0443, resident-engineer capacity, under البيانات المسجّلة with تسجيل دفعة available. In this build the registration button is on that tab, rather than الدفعات as the runsheet says. The prepared project still uses DEMO-CNT-02 (not the runsheet's DEMO-CNT-01); this existing contract-code deviation remains explicit. The new recording has not started and no replacement certificate has been registered.

## Restarted take — visible disbursement succeeded

After the user said recording started, the demonstration showed:

- V1: 5,000,000 IQD refused against the 950,000 effective contract value, excess 4,050,000.
- V2: gross 100,000 with award 90,000 produced an unallocated 10,000 and disabled Next; corrected to award 100,000.
- V3: no measurement attachment prevented proceeding; measurement.pdf (177 bytes) was then attached through the UI.
- V4: university-specialist view had no registration button and displayed the resident-engineer/project-manager restriction on البيانات المسجّلة.
- V6 UI restriction: Finance before resident-engineer release saw the first desk holding the certificate, Finance not started, and no release action. The runsheet's exact server refusal cannot be triggered through this UI because no button is offered; it was not fabricated or staged through a hidden request.
- Correct registration: DEMO-CNT-02, DEMO-FL-01, data date 2026-10-01, interim certificate, gross/net/award component 100,000, measurement.pdf. Register visibly showed pending review.
- Resident-engineer release completed the first review; Finance became current. V5: resident-engineer view had no Finance release button and showed the restriction.
- Finance persona (UI محلل موازنة) released Finance, then Accounts as specified by the prototype runsheet.
- Accounts succeeded without HTTP 500. The toast stated the payment was disbursed and cumulative spending updated.
- Register visibly showed DEMO-FL-01, مصروف, 100,000. Expanded details confirmed resident-engineer attribution and award-component allocation 100,000.
- Final 2026 cost table: annual spending 100,000, cumulative spending 100,000, award-component spending 100,000, remaining 850,000. UI rounds spending percentage to 11% (100,000 / 950,000 is approximately 10.53%).

The disbursed end state is visibly achieved on the prepared contract. No statutory due date was recorded, so meeting a specific legal due date was not claimed. Automatic escalation remains an accepted prototype exclusion. The browser was left on the final 2026 cost table at the track boundary. The user controls recording start/stop and clip saving; video contents still require verification.
