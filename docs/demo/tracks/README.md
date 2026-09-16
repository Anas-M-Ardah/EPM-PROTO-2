# Workflow-track video runsheets

One folder per track of the technical proposal's **مسارات العمل** (§25, translated in
[`../../WORKFLOW-TRACKS.md`](../../WORKFLOW-TRACKS.md)). Each folder holds a `RUNSHEET.md` you can
follow on camera to show that every step of that track works in the running app, plus any file
the track needs to upload.

| Folder | Track | Data it uses |
|---|---|---|
| [`01-project-definition`](01-project-definition/RUNSHEET.md) | المسار 1 — defining the project | creates the demo project |
| [`02-contract`](02-contract/RUNSHEET.md) | المسار 2 — contracts | demo project |
| [`03-boq`](03-boq/RUNSHEET.md) | المسار 3 — BOQ upload and approval | demo contract · `boq.csv` |
| [`04-schedule`](04-schedule/RUNSHEET.md) | المسار 4 — schedule import and approval | demo contract · `schedule.xer` |
| [`05-boq-activity-linking`](05-boq-activity-linking/RUNSHEET.md) | المسار 5 — linking BOQ lines to activities | tracks 3–4 |
| [`06-progress-approval`](06-progress-approval/RUNSHEET.md) | المسار 6 — progress update and approval | track 5 · `evidence.txt` |
| [`07-period-close`](07-period-close/RUNSHEET.md) | المسار 7 — closing the progress period | track 6 |
| [`08-payment-certificate`](08-payment-certificate/RUNSHEET.md) | المسار 8 — payment certificate | demo contract · `measurement.pdf` |
| [`09-change-order`](09-change-order/RUNSHEET.md) | المسار 9 — change order to addendum | demo contract |
| [`10-supply-distribution`](10-supply-distribution/RUNSHEET.md) | المسار 10 — distributing supply items | fixture `PRJ-0439` |
| [`11-supply-receipts`](11-supply-receipts/RUNSHEET.md) | المسار 11 — warehouse, preliminary and final receipt | fixture `PRJ-0439` |
| [`12-documents`](12-documents/RUNSHEET.md) | المسار 12 — documents and drawings | fixture `PRJ-0279` |
| [`13-alerts`](13-alerts/RUNSHEET.md) | المسار 13 — alerts | demo project + fixture |
| [`14-reporting`](14-reporting/RUNSHEET.md) | المسار 14 — performance and reporting | everything above |

## Order of recording

Tracks **1 → 9** build one demo chain — project → contract → BOQ → schedule → links → progress →
period → payment → change order — so record them in order, in one sitting, without resetting
between them. Tracks **10–12** use the fixture projects and can be recorded at any time.
Track 13 reads alerts raised by the earlier tracks; track 14 reads the result of all of them.

## Preflight, once before track 1 (off camera)

1. API on `http://localhost:5080`, web on `http://localhost:4300` (see `CLAUDE.md` §7). Browser at
   1440×900 or larger, 100% zoom, no developer tools, notifications off.
2. The database must contain the fixture (`PRJ-0279`, `PRJ-0439`). If the 2026-09-13 live-audit
   records are still present (`PRJ-0440`, `AUDIT-CNT-0440`, …) and you want a clean register, run the
   audit cleanup script from the audit session first. Do **not** run `POST /api/dev/reset` unless you
   intend to lose every record in the database.
3. Sign in with any password. Switch capacity from the account menu at the bottom of the side bar
   («العرض بصفة» on change-order screens). The capacities used are:

   | Persona id | Capacity shown in the app | Used for |
   |---|---|---|
   | `user.univ-specialist` | المستخدم المختص في الجامعة | defining, submitting |
   | `user.re-dept` | مهندس مقيم | approving, certificates, change-order stages 1 and 6 |
   | `user.co-committee` | عضو لجنة أوامر الغيار | change-order stages 2, 4, 5 |
   | `user.rate-committee` | عضو لجنة تثبيت الأسعار | change-order stage 3 |
   | `user.finance-dept` | محللة موازنة (الدائرة المالية) | payment finance and disbursement desks |
   | `user.inspection` | عضو لجنة الفحص والاستلام | supply receipts |
   | `user.senior-mgmt` | الإدارة العليا | ministry-level dashboards and alerts |

4. Every figure here is illustrative, not ministry data. If a screen shows a different figure than a
   runsheet, trust the screen and stop the take — do not narrate the runsheet's number over it.

## What each runsheet contains

- **Start / end state** — quoted from the proposal, so the video opens and closes on them.
- **Steps** — one row per proposal step (branches such as ٦أ are their own rows): capacity, click
  path, exactly what to type, what must appear, and what to hold on camera as proof.
- **Validation takes** — the refusals the track promises, each with the exact message to show.
- **Not in this build** — steps of the proposal the app does not do, stated so the video never
  implies them. See `DECISIONS.md` P-265 … P-269 for what changed on 2026-09-14.
