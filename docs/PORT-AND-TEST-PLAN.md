# Plan — port the prototype's structure, and `test.md` to hold the line

## Context

`epm-fullstack` (Angular 19 + .NET 9) is the port of the client-validated React prototype at
`infinite-azaiton/epm`. `ROADMAP.md` marks every phase ✅ COMPLETE, but there is no single
document to walk the system by, and — as you spotted — the app does not look like the
prototype even though the stylesheets are identical.

**You were right, and here is the measurement.** The problem is not CSS. It is markup.

| Layer | Finding |
|---|---|
| Stylesheets | `web/src/styles/{tokens,components,app,desktop,public,boq}.css` are **byte-identical** to `design/system-revamp@065de12` — the branch GitHub Pages actually serves. Only `app-public.css` differs, by one mojibake em-dash in a comment (line 88). `mobile.css` is absent by decision (no mobile branch: `landing.page.ts:24`). |
| **Markup** | The prototype emits **385** `d-*` structural classes. The Angular app emits **266**. **138 classes are defined in the shipped CSS, used by the prototype, and never emitted by any Angular template.** That is ~36% of the prototype's DOM vocabulary sitting as dead CSS, waiting for markup that was never built. |
| Invented | Only **10** classes are genuinely Angular's own (`d-tabs`, `d-rpane-h/b/f`, `d-secnav-i`, `d-hbars`, `d-skel-row`, `d-inline-err`, `d-gantt-namegrip`, `d-vow-sub`) — most documented in `styles.css`. The drift is almost entirely *omission*, not invention. |

Method (reproducible): class inventory from `className=` in the branch's `app/*.jsx` vs
`class=` / `[class.x]` / `[ngClass]` across `web/src/app/**`, intersected with `.d-*`
selectors defined in `web/src/styles/*.css`; each candidate re-confirmed by a whole-app
`grep -rw`.

### Where the 138 land — the visible differences, by screen

| Cluster | Classes | Screen | Prototype source |
|---|---|---|---|
| `d-contract-card*` `d-contract-grid` `d-contract-mini` | 10 | **الشكل 6** سجل عقود المشروع — the prototype draws contract **cards in a grid**; the port draws a table | `project-modules.jsx` |
| `d-vo-reg` `d-vow-facets/filters/search/chip/cap/ed/f/prov/state` `d-vo-queue-b` `d-vo-qfall` | 12 | **الشكل 29** سجل الأوامر التغييرية — the facet/search register shell | `vo-record.jsx` · `supply-items.jsx` |
| `d-review-flow` `d-rf-dot/l/ret/step` | 5 | **الشكل 33** مسار الاعتماد — the six-stage flow visual | `project-modules.jsx` |
| `d-alloc*` `d-dist` `d-rcpt` `d-rcptlist` `d-yalloc` | 9 | **الأشكال 12 · 51–55** BOQ allocation, supply distribution, receipts | `project-modules.jsx` · `supply-items.jsx` |
| `d-l14*` `d-l18*` `d-pz3` `d-pz4` `d-l04-z8fall` | 9 | **page zone / layout skeletons** — whole zones absent | `vo-record.jsx` · `project-modules.jsx` |
| `d-edit-timeline` `d-edit-*` `d-feed*` `d-tl-mini*` | 16 | **الأشكال 11 · 19 · 45** activity log, financial change log, minutes | `project-modules.jsx` · `desktop-views.jsx` |
| `d-csum` `d-csum-bars` `d-costsplit` | 3 | **الشكل 7** تفصيل كلفة العقد | `project-modules.jsx` |
| `d-slastages` | 1 | **الشكل 17** مهل التدقيق | `project-modules.jsx` |
| `d-report-cat*` `d-report-shell` `d-report-view*` | 5 | **الشكل 49** التقارير | `project-modules.jsx` |
| `d-panel-body` `d-callout*` `d-legend*` `d-dl*` `d-check` `d-switch` `d-dot` `d-form-hint/ro/state` `d-openrow` | 17 | **shared primitives never adopted** — `styles.css` even admits pages hand-padded instead of using `.d-panel-body` | `desktop-views.jsx` · `desktop-workspace.jsx` |
| `d-model-*` `d-viewer*` `d-drawing-*` `d-img-*` `d-three` | ~22 | **الشكل 44** 3D model + drawings — **deliberately stubbed** (`07 §8`) | `model-module.jsx` |
| `d-ready` `d-tab-ready` | 2 | readiness dots — **deliberately not ported** (P-09) | — |

**≈ 114 are real gaps; ≈ 24 are documented, intended omissions.**

### And the reference folder itself is stale

`CLAUDE.md` §1 makes `docs/spec/reference/` binding — *"Every screen already exists in
`docs/spec/reference/app/*.jsx`. Open it."* It currently mixes two design systems and is
missing the files the roadmap cites by name:

- `styles/tokens.css` and `styles/desktop.css` there are the **old `main`** (Autodesk-blue)
  sheets — 489 and 2,787 diff-lines from the branch the app ships. `boq.css` absent.
- **11 files missing**: `boq-register.jsx`, `boq-assign.jsx`, `boq-workspace.jsx`,
  `boq-data.js`, `supply-items.jsx`, `store.js`, `model.js`, and 4 `brand/` SVGs.
  `ROADMAP.md`/`TRACE.md` cite `boq-register.jsx:435` and `boq-assign.jsx:11` as SCR-W4's
  binding reference — files that are not there.
- The other 17 `.jsx` differ **only by CRLF** (verified: normalized diff = 0).

So a builder told to "open the reference" opens the wrong design and cannot find three
screens. That is why the structure drifted.

---

## Sources of truth, in order

1. **`docs/__العرض-الفني-...html`** — proposal: 28 sections, 14 مسارات, 12 alert rules
   R1–R12, 3 inviolable permission controls, the pricing / weighting / penalty rules.
2. **`docs/__ملحق-الشاشات-والوظائف-...html`** — appendix: **60 plates in 13 groups**, each
   with the same 9 attributes. The client's sign-off unit and the spine of the test list.
3. **`design/system-revamp@065de12`** — the running prototype: reference components, and the
   live site to compare against.

Repo docs (`TRACE.md`, `ROADMAP.md`, `docs/spec/`, `DECISIONS.md`, `TODO.md`) supply anchors
and known gaps only — never originate an expectation. Where they disagree with the client
documents, the client documents win and the disagreement goes in `test.md` §17.

---

## Work

### A. Port the reference — makes every trace line resolve

1. Add the 11 missing files to `docs/spec/reference/` from `@065de12`.
2. Replace its `styles/tokens.css` and `desktop.css` with the branch's; add `boq.css`. The
   folder then shows **one** design system — the one the app ships.
3. Fix the mojibake at `web/src/styles/app-public.css:88`. No other shipped CSS is touched.
4. Record as a `DECISIONS.md` P-entry — this repo records, it does not silently fix.

### B. `web/src/app/STRUCTURE-GAP.md` — the port backlog, measured

One row per missing class cluster: classes · screen + plate · prototype `file:line` · the
Angular template that should emit it · verdict — `rebuild` / `intended — 07 §8` /
`intended — P-09` / **`keep — improvement`** (the app's own shared components and the 10
Angular-only classes, which are recorded so nobody later mistakes them for drift). Generated
from the inventory above, then hand-verified against each prototype component. This is the
artifact that makes "port the design" a finite, checkable list rather than an impression.

### C. Rebuild the top clusters — the ones that change what you see

In order, each a self-contained change with the prototype component open beside it:

1. **الشكل 6** contracts register → `d-contract-grid` + `d-contract-card*` (cards, not a table)
2. **الشكل 29** CO register → `d-vo-reg` + the `d-vow-*` facet/search shell
3. **الشكل 33** approval path → `d-review-flow` + `d-rf-*`
4. **Shared primitives** → `d-panel-body`, `d-callout`, `d-legend`, `d-dl`, `d-form-hint/ro`
   — these repaint every screen at once and remove the hand-padding hacks in `styles.css`
5. **Zones** → `d-pz3`, `d-pz4`, `d-l14*`, `d-l18*`
6. **الأشكال 11 · 19 · 45** logs and feeds → `d-edit-timeline`, `d-feed*`, `d-tl-mini*`

Clusters 7–11 (BOQ/supply allocation, الشكل 7 cost split, الشكل 17, الشكل 49) follow the
same pattern and are listed in `STRUCTURE-GAP.md` for the next pass. **The 3D/drawings and
readiness-dot clusters are not rebuilt** — they are documented decisions.

Constraint throughout (`CLAUDE.md` §3.7): no component-scoped CSS, no new rules. Every class
already exists in the shipped sheets — this is markup only.

#### Nothing the Angular app already has gets removed

The port is **additive**. The prototype is React with no component layer; the Angular app has
a shared-component layer that is a deliberate improvement, and rebuilding a screen's
structure means the *existing component emits the prototype's classes* — never that the
component is deleted in favour of inline markup. **Protected, all 30 selectors:**

`epm-select` · `epm-icon` · `epm-data-table` `[epmCell]` · `epm-drawer` · `epm-popover` ·
`epm-command-palette` · `epm-pager` · `epm-page-head` · `epm-section` · `epm-sec-nav` ·
`epm-module-bar` · `epm-field-grid` · `epm-field-group` · `epm-summary-strip` · `epm-tile` ·
`epm-status-pill` · `epm-sev-dot` · `epm-table-skeleton` · `epm-toast` · `epm-donut` ·
`epm-scurve` · `epm-dual-line` · `epm-bar-compare` · `epm-persona-switcher` ·
`epm-ministry-lockup` · `epm-amd-delta` · `epm-amd-mark` · `epm-amd-panel` · `epm-app-footer`

`epm-select` in particular stays: it is the app's one dropdown, it replaces the OS list the
prototype's native `<select>` opens, and its `bare` variant plus the `.d-ctxsel` focus-ring
contract are documented in `styles.css` (P-197, and the WCAG 2.2 target-size fix in P-204).
Same for the 10 genuinely Angular-only classes — `d-gantt-namegrip` (the resizable name
column `04 §5` asks for and the prototype does not have), `d-inline-err`, `d-skel-row`,
`d-rpane-*`, `d-tabs`, `d-secnav-i`, `d-hbars`, `d-vow-sub`. They are recorded in
`STRUCTURE-GAP.md` as **keep — improvement**, not as drift.

Also untouched: `routerLink` navigation in place of the prototype's `onNav()` buttons, the
`<bdi>` isolation the prototype omits, and the accessibility fixes already made (P-204).
Where an improvement and the prototype's structure genuinely conflict, the conflict is
written into `STRUCTURE-GAP.md` with both readings and left for your call — not resolved by
reverting.

### D. `D:\Projects\EPM\epm-fullstack\test.md`

**≈ 80 comprehensive cases, not 300.** Each covers a whole screen or a whole journey step
end to end. Fixed six-line block so a failure names its own suspects:

```
### T-BOQ-01 · جدول الكميات — السجل وبطاقة البند        ملحق الشكل 12 · SCR-W4
Route  /projects/PRJ-0279/boq/CNT-0279          API  EP-BOQ-01…08
Ref    docs/spec/reference/app/boq-register.jsx:435 (DBoqRegister)
Rule   Domain/BoqWeights · Domain/Allocation  →  BoqWeightsTests ✅ · AllocationTests ✅
Do     …in the order the plate's «الإجراءات المتاحة» lists them
Expect …every figure read off the running fixture, never off a spec
Status 🔨
```

**Route** reproduces it · **API** is one `grep -rn "EP-BOQ-03" api web` from every touchpoint
(`CLAUDE.md` §2) · **Ref** is the structure it must match · **Rule** is where a wrong number
comes from and whether a unit test already guards it. That is the traceability and
debuggability you asked for.

IDs `T-<AREA>-<nn>` on the existing `EP-*` families. Status `✅ ❌ 🔨 ⏸ ⚠️`. English prose,
Arabic UI labels — as `ROADMAP.md` and `TRACE.md` already read.

**Sections** (journey order; case budget):

```
 0 Setup 4 · 1 Public 2 · 2 Shell 5 · 3 Enterprise 7 · 4 المسار 1 2 · 5 Workspace 2
 6 Contract 6 (الأشكال 6–11) · 7 BOQ 3 · 8 Supply 4 · 9 Schedule 4 · 10 Progress 4
11 Financials 7 (الأشكال 14–20) · 12 Change orders 8 · 13 Remaining tabs 7
14 Rules & scope 8   20% · weights=100 · معتمد≠مطبَّق≠مغلق · originals kept · penalty
                     · the 3 inviolable controls (negatives) · R1–R12 · الاشتقاق لا الإدخال
15 Structure fidelity 3   per screen vs the prototype, using STRUCTURE-GAP.md as the instrument
16 Non-functional 5   RTL/bidi · bilingual · responsive 1440/1280/1024/768 · a11y · bundle
17 Known gaps —   a table, not cases: expected failures so nobody files them as bugs
```

Sections 3–13 convert the appendix's own 9-row schema: `الوظائف والخصائص الظاهرة` →
presence · `الإجراءات المتاحة للمستخدم` → interaction · `البيانات التي تعرضها` → data
binding · `انعكاس الإجراءات على الوحدات الأخرى` → cross-module · `علاقتها بالمسار الرئيسي` →
which of the 14 مسارات it closes.

The 19 scenarios in `docs/MANUAL-TEST-SCENARIOS.md` are **absorbed, not duplicated** — each
becomes the body of the case it belongs to; that file gets a pointer to `test.md`.

A progress table heads the file: per section `Cases · ✅ · ❌ · 🔨 · ⏸ · ⚠️ · %`, plus a total,
and one sentence naming which sections were **executed** versus only written. A ✅ must have
been observed, never inferred.

Constants every case honours: **"now" is the data date 2026-08-02**, never today (D-06);
money is `decimal`; fixture figures are illustrative, not ministry data.

### E. Seed real statuses

1. `cd api && dotnet test` — true pass/fail for the ~469 facts; fills every `Rule` line.
   Stop any running API first; it locks its own exe (`CLAUDE.md` §7).
2. `cd web && npm run build` — the only typecheck this project has.
3. Start both from `.claude/launch.json` (api :5080, web :4300) via `preview_start`, then
   `POST /api/dev/reset` + `POST /api/dev/load-fixture`.
4. Walk the built screens once; mark real ✅/❌ and write observed figures into `Expect`.
5. §15 — the live prototype in a second tab, compared zone for zone against the rebuilt
   screens. Re-run the class inventory; the gap count must have dropped by exactly what C
   claims.
6. Wizards, the 9 apply steps and all 12 alert rules stay `🔨` with steps written.

**Out of scope:** Playwright/CI (cases needing one say `E2E-TODO`), the mobile layer, the
3D/drawings clusters, and fixing `docs/SRS.md` §16.3 — which still claims "Screens: 4 of 24"
and is recorded in §17 as a doc defect.

---

## Verification

- `grep -c '^### T-' test.md` equals the header's total; per-section counts sum to it.
- All 60 plates covered:
  `for n in $(seq 1 60); do grep -q "الشكل $n" test.md || echo "plate $n uncovered"; done`
- Every `Ref` path resolves after step A:
  `grep -oE 'docs/spec/reference/app/[a-z-]+\.jsx?' test.md | sort -u | while read p; do [ -f "$p" ] || echo "missing $p"; done`
- Every xUnit file named in a `Rule` line exists in `api/Epm.Domain.Tests/`.
- **The structural claim is re-measurable**: re-run the class inventory after C and confirm
  the never-emitted count fell from 138 to the residual `STRUCTURE-GAP.md` documents as
  intended. This is the objective check that the design actually got ported.
- **No shared component was lost**: all 30 `epm-*` selectors still resolve, and
  `grep -rc '<epm-select' web/src/app` is ≥ its count before the rebuild.
- `cd api && dotnet test` totals still match §0; reproduce three ✅ cases by hand.
