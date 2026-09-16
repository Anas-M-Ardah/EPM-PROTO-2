# docs/demo — the data plan

`runsheet.html` gives the exact data needed to click through all 14 of the ministry's workflow
tracks (`docs/WORKFLOW-TRACKS.md`) in the running app — persona, route, field values, nothing
else. It replaced an earlier prose-heavy, single-path version on 2026-09-08.

| File | What it is |
|---|---|
| [`runsheet.html`](runsheet.html) | the data plan — open it in a browser, sidebar navigates by track |
| [`change-order-video-runsheet.md`](change-order-video-runsheet.md) | Arabic narration cues, shot order, fixture anchors, and reset-safe optional takes for a change-order demo video |
| [`demo-boq.xlsx`](demo-boq.xlsx) | the works project's four BOQ lines as a workbook, for demoing the `Excel file` import door instead of typing them |
| [`demo-schedule.xer`](demo-schedule.xer) | the Primavera XER for the works project's schedule — four activities, costs matching the BOQ |
| [`../BOQ-PARITY-LEDGER.html`](../BOQ-PARITY-LEDGER.html) | companion sheet — where the BOQ and project-type flows still diverge from the source prototype |

Published copy: <https://claude.ai/code/artifact/bbffae9d-45dd-4667-adb9-9097e51ec00d>
(`runsheet.html` is the source of that page; edit here and republish, never the other way).

## Two scenarios, not ten steps

| Scenario | Command | Reaches |
|---|---|---|
| **Act A** — `المشاريع الإنشائية`, built live | `POST /api/dev/reset` | Tracks 1 2 3 4 5 6 8 9(works) 14 |
| **Act B** — `مشاريع التجهيز`, fixture | `reset` then `POST /api/dev/load-fixture` | Tracks 3(supply) 9(supply) 10 11 12 13 |

Never mix them in one sitting — `reset` drops the fixture's `PRJ-0439` along with everything
else. **Track 7 (closing a progress period) has no data plan** — the action does not exist in
the app; see the runsheet's own flagged section rather than approximating it.

## What's new since the prose version

The old runsheet only reached 8 of the 14 tracks (roughly steps 01–10 plus a supply-project
tour). Getting to full coverage needed:

- **A second contract**, `CNT-DEMO-02`, so a from-scratch works-side change order (Track 9)
  has somewhere to run without perturbing `CNT-DEMO-01`'s progress/certificate arithmetic.
- **Two new personas**, `co-committee` and `rate-committee` — Track 9's six stages are owned
  by three distinct parties, not one; `re-dept` alone can only clear stages 1 and 6.
- **A distribution step** on the fixture's `PRJ-0439` (Track 10) — the item `ITM-007` is left
  deliberately undistributed in the fixture for exactly this.
- **Documents and Alerts** (Tracks 12, 13) turned out to be real screens with only partial
  backends — read-only for documents (upload is a demo stub, no approve endpoint exists),
  view-and-acknowledge for alerts (no automatic rule evaluation or escalation exists). The
  runsheet says so plainly rather than promising a live create-and-approve flow that isn't there.
- **The portfolio dashboard** (Track 14) is real and derives live SPI/CPI from Act A's own
  data — the separate report *catalog* is mostly stub (3 of 12 reports wired, nothing can be
  "run"). The runsheet points at the dashboard, not the catalog.
- **Track 7 turned out not to exist at all** — no close/lock/open-next-period action anywhere
  in the codebase. Flagged as unavailable rather than worked around.

## Verification status

Tracks 1–6, 8, and Act B's 3/11/9(supply) carry over from a version that was run end to end
against the live app (see prior commits of this file for exact dates). **Track 9(works), 10,
12, 13, and 14 are new as of 2026-09-08** — verified against the source code (endpoint names,
domain rules, exact field names, persona IDs) but not yet click-tested end to end. The runsheet
flags each one; trust the screen over a figure if they disagree.

Figures throughout are illustrative, not ministry data.
