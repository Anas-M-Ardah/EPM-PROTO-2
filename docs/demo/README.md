# docs/demo — the build-from-zero demo

A manual runsheet: start from an empty database and build one project up to recorded
progress and a disbursed payment certificate, so every figure on screen has a visible
origin. Nothing is loaded from a fixture; nothing is typed twice.

| File | What it is |
|---|---|
| [`runsheet.html`](runsheet.html) | the runsheet itself — open it in a browser, or read it as source |
| [`demo-schedule.xer`](demo-schedule.xer) | the Primavera XER imported at step 05 — four activities, costs matching the BOQ |

Published copy: <https://claude.ai/code/artifact/f62cfe20-b73c-4e8c-8ac6-22b085995bb0>
(`runsheet.html` is the source of that page; edit here and republish, never the other way).

## The shape of it

Ten steps in two acts, across four personas:

```
01 workspace     senior-mgmt
02 project       univ-specialist
03 contract      univ-specialist
04 BOQ           univ-specialist
05 schedule      univ-specialist
06 approve+link  re-dept
07 progress      re-dept            → lands on 55%
                 ─────────────────────────────────
08 budget        finance-dept       switches the ceilings on
09 certificate   re-dept            net 495,000,000, still pending
10 three desks   re-dept → finance-dept → finance-dept
                                    → CPI resolves to 1.11
```

The demo's whole argument is that both landing figures are checkable in the head:
`(40 × 100%) + (30 × 50%) = 55%`, and `550,000,000 ÷ 495,000,000 = 1.11`.

## Verification status — read this before presenting

- **Steps 01–07** carry the original sheet's claim that the sequence was run end to end.
  **01–03 were independently re-run** against the API on 2026-09-02 and behaved as written.
- **Steps 08–10 have not been run.** Their fields, personas, refusals and arithmetic are
  read from `EP-FIN-02` / `EP-FIN-03` / `EP-FIN-04`, `Domain/PaymentCertificate.Ceilings`
  and `Domain/EarnedValue` — the rules say those figures should appear, but nobody has
  watched them appear.

Rehearse the finance act once, and correct the sheet from the screen rather than the
other way round.

## Two things that will bite

1. **Use workspace code `ub` or `sp`.** Which workspaces `univ-specialist` holds is fixed
   in code, because the screen that would assign them is the Administration module, which
   is out of scope (`07 §8`). A workspace with a fresh code has nobody able to create a
   project in it.
2. **Do not run `load-fixture`.** It is the opposite of this demo — `POST /api/dev/reset`
   only, and let the audience watch the data appear.

Figures throughout are illustrative, not ministry data.
