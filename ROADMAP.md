# ROADMAP

The build order for the EPM full-stack prototype, and the checklist each agent works from.

**Read [CLAUDE.md](CLAUDE.md) first.** It holds the rules that don't change. This file holds
the work that does.

---

## How this project is built

**One page at a time, end to end.** A page is not done when its screen renders — it is done
when its table, its endpoint, its Angular trio, its UML doc and its `TRACE.md` row all exist
and agree. Nothing is built ahead of a page that needs it.

**Every page has a reference component.** The React prototype in `docs/spec/reference/app/`
is the specification of what the screen looks like and how it behaves. The table below names
the exact file and line for every page. **Open it before you write anything.**

> This is the single most expensive mistake made so far. PAGE-01 was first built from the
> written spec alone; it invented a column set and reached for the wrong CSS classes, and had
> to be redone against `DProjectsAll`. The written spec tells you the *rules*. The reference
> component tells you the *screen*. You need both.

**Three files are shared and APPEND-ONLY.** Add your line at the marked comment; never
reorder or rewrite what is there.

| File | What you append |
|---|---|
| `api/Epm.Api/Data/EpmDb.cs` | one `DbSet` per table your page reads |
| `api/Epm.Api/Program.cs` | one `app.MapXxxEndpoints();` |
| `web/src/app/app.routes.ts` | one route |
| `web/src/app/shell/shell.component.ts` | one nav item — only if the page is a nav destination |
| `api/Epm.Api/Features/Dev/Fixture.cs` | rows your page needs, at the marked comment |

Everything else a page touches, it owns.

---

## Definition of done

A page is not complete until every box is ticked. Do not open a PR with unticked boxes;
move the box to "Known gaps" in the UML doc with a reason instead.

- [ ] Reference component opened and its structure followed — classes, column order, conditionals
- [ ] Entity columns added (only what the page shows) and `DbSet` registered
- [ ] `POST /api/dev/reset` run after any schema change
- [ ] Endpoints file with a `[EP-…]` anchor comment on every endpoint
- [ ] DTO record whose member names match the TypeScript interface exactly
- [ ] Angular trio: `*.page.ts` + `*.page.html`, `*.api.ts`, `*.types.ts`
- [ ] All four states handled: loading · error · empty-because-empty-db · empty-because-filtered (`04 §9`)
- [ ] Every number, date, ID wrapped in `<bdi>` (`05 §5.2`)
- [ ] No business arithmetic outside `Domain/` — check the endpoint and the component
- [ ] No new CSS unless `grep` of `web/src/styles/` proves the class does not exist
- [ ] `docs/uml/<feature>.md` with its diagrams (see `docs/uml/README.md`)
- [ ] `TRACE.md` row added
- [ ] `dotnet build` and `ng build` both clean
- [ ] Screen checked in the browser at 1440 **and** 1024 (`04 §10`)

---

## Reference component map

Every screen, and the file that defines it. Paths are under `docs/spec/reference/app/`.

> ⚠️ **`docs/spec/reference/` is the PRE-v1.1 copy.** It was never re-synced when
> the v1.1 design system was adopted at Phase 1.5, so the line numbers below are
> stale for every screen v1.1 rewrote, and some components differ in kind — the
> pre-v1.1 `DAlertsCenter` is a card feed, the v1.1 one is a full register.
>
> **The v1.1 components live in the sibling `epm` repo on `origin/design/system-revamp`.**
> Get one with:
>
> ```bash
> git -C ../epm show origin/design/system-revamp:app/enterprise-areas.jsx
> ```
>
> Rows already built carry their corrected v1.1 line in the phase checklist below.
> **Check the sibling repo before starting any remaining row.**

### Enterprise screens

| ID | Screen | Reference component |
|---|---|---|
| SCR-E1 | Executive Portfolio | `DDashboard` — `desktop-views.jsx:45` + charts in `desktop-charts.jsx` |
| SCR-E2 | Projects | `DProjectsAll` — `enterprise-areas.jsx:112` |
| SCR-E3 | Contracts | `DContractsAll` — `enterprise-areas.jsx:160` |
| SCR-E4 | Entities / Beneficiaries | `DSpaces` — `desktop-views.jsx:255` |
| SCR-E5 | Schedule Control | `DScheduleControl` — `enterprise-areas.jsx:8` |
| SCR-E6 | Alerts Center | `DAlertsCenter` — `enterprise-areas.jsx:106` *(v1.1, sibling repo)* |
| SCR-E7 | Reports & Analytics | `DReports` — `desktop-reports.jsx:58` *(v1.1, sibling repo — the pre-v1.1 component of the same name is a different screen entirely; see P-37)* |

### Workspace shell

| Part | Reference component |
|---|---|
| 3-pane workspace | `DWorkspace` — `desktop-workspace.jsx:12` |
| Project detail + tab bar | `DProjectDetail` — `desktop-workspace.jsx:130` |
| Context pane (3rd pane) | `DProjectContext` — `desktop-workspace.jsx:217` |
| Workspace overview | `DWorkspaceOverview` — `desktop-workspace.jsx:284` |

### Project workspace tabs

| ID | Tab | Reference component |
|---|---|---|
| SCR-W1 | Overview | `DModOverview` — `project-modules.jsx:1461` |
| SCR-W2 | Project Information | `DModInformation` — `project-modules.jsx:157` |
| SCR-W3 | Contract | `DModContractNew` — `project-modules.jsx:194` · `DContractAmendments` — `contract-amendments.jsx:301` |
| SCR-W4 | BOQ | *(v1.1 moved this module into its own files, sibling repo)* `DBoqWorkspace` — `boq-workspace.jsx:16` · `DBoqRegister` — `boq-register.jsx:435` · `DBoqAssign` — `boq-assign.jsx:11` · `DBoqDistDrawer` — `contract-context.jsx:101` |
| SCR-W5 | Schedule | `DModSchedule` — `schedule-module.jsx:432` · `DGantt` — `:81` · `DSchedTable` — `:252` |
| SCR-W6 | Progress | `DModProgress` — `project-modules.jsx:668` |
| SCR-W7 | Financials | `DModFinancialNew` — `project-modules.jsx:485` · `DPaymentWizard` — `:416` |
| SCR-W8 | Change Orders — register | `DModVO` — `project-modules.jsx:1142` |
| SCR-W8 | Change Orders — record | `DModVO` — `vo-record.jsx:436` · `DVORecordPanel` — `:372` |
| SCR-W8 | Change Orders — wizard | `DVOCreateWizard` — `vo-wizard.jsx:6` + `vo-wizard-parts.jsx` |
| SCR-W9 | Risk | `DModRisk` — `project-modules.jsx:1693` |
| SCR-W10 | 3D Model *(stub, 07 §8)* | `model-module.jsx` |
| SCR-W11 | Meetings & Actions | `DModMeetings` — `project-modules.jsx:1365` |
| SCR-W12 | Documents & Drawings | `DModDrawings` — `project-modules.jsx:1396` |
| SCR-W13 | Alerts | `DModAlerts` — `alerts-module.jsx:20` |
| SCR-W14 | Reports | `DModReports` — `project-modules.jsx:1579` |
| SCR-W15 | Audit History | `DModAudit` — `project-modules.jsx:1727` |

### Shared components worth porting once

| Component | Reference | Used by |
|---|---|---|
| `DPill` status pill | `desktop-shell.jsx:22` | everywhere |
| `DSec` / `DSecNav` section primitives | `project-modules.jsx:101` / `:119` | every tab |
| `DField` / `DFieldGrid` | `project-modules.jsx:11` / `:32` | every field grid |
| `DTableSkeleton` | `desktop-views.jsx:361` | every register |
| `DStat` summary strip cell | `desktop-views.jsx:188` | every tab header |
| `DAmdPanel` amendment drawer | `contract-amendments.jsx:240` | BOQ + Schedule |
| `DDrawer` | `desktop-admin.jsx:18` | anything with a drawer |
| Charts | `desktop-charts.jsx` (`DDonutMulti`, `DBarCompare`, `DLineTrend`, `DSCurve`) | portfolio, reports |

---

## Phase 0 — Foundation ✅ COMPLETE

- [x] Repo, .NET solution, Angular 19 workspace, proxy on 4300 → 5080
- [x] Design system copied verbatim (2,947 lines) + 130-icon SVG map extracted
- [x] `EpmDb` with flat storage — no navigation properties, no FKs, no indexes
- [x] `Program.cs` + `X-Epm-User` persona middleware (no auth by design)
- [x] `EP-DEV-01` reset · `EP-DEV-02` load-fixture · `EP-DEV-03` personas
- [x] Angular core: `api.ts` · `persona.ts` · `lang.ts` · `format.ts` · `icon.component.ts`
- [x] Shell: charcoal command bar, persona switcher, module nav, RTL
- [x] **PAGE-01 Projects list (SCR-E2)** + `docs/uml/projects.md`

---

## Phase 1 — Shared primitives and the rules ✅ COMPLETE

Everything downstream depends on these. Do them before fanning out.

**Exit state:** `dotnet test` 128/128 green · `dotnet build` and `ng build` both clean ·
`EP-LKP-01`, `EP-DOCS-01` verified live · Projects list checked at 1440 and 1024.

**Four items need client confirmation before they harden** — P-12 (which execution-stage
list), P-13 (the two `co-lifecycle` states missing from `06 §7`), P-18 (field-grid column
count), and the pre-existing D-01…D-05. See [DECISIONS.md](DECISIONS.md).

### 1.1 Lookups — unblocks every enum column in the app ✅ COMPLETE
- [x] Register `Lookup` DbSet; all 20 kinds (117 rows) from `06-DATA-DICTIONARY.md`
      — in `Features/Lookups/LookupCatalog.cs`, called by `Fixture.Load()` (P-11)
- [x] `EP-LKP-01` `GET /api/lookups` — grouped by kind, in spec order
- [x] `core/lookups.ts` — loads once (shareReplay), `label(kind, code)` returns the AR/EN name
- [x] Replace the inline `statuses` array in `projects.page.ts` with it
- [x] `docs/uml/lookups.md` · `TRACE.md` row
- [x] Verified in the browser: every enum value the fixture stores resolves to a label;
      AR↔EN toggle swaps chips and pills from the API payload; one fetch per session;
      `load-fixture` refetches; empty-db and 1024 both clean
- ~~Fixes the raw `finishes` / `handover` codes now showing on the Projects list~~
      **This was not true.** `DProjectsAll` has no stage column and the Projects list never
      rendered `ExecutionStage`. The labels now exist for the workspace tabs that will.

> **Behaviour change:** on an empty database the status filter chips no longer render —
> `statuses()` comes from the Lookups table, which is empty until the fixture loads. Only
> the *الكل / All* chip shows. This is correct (there is nothing to filter) but it is a
> visible difference from the hard-coded array, so it is noted rather than discovered later.

### 1.2 Domain rules — the specification as code ✅ COMPLETE
Ported from **`../epm/prototype-lite/core/domain.js`** — the base prototype's domain layer,
which already carries the rule / spec / example annotations in the right shape.
*(The path given here previously, `docs/spec/reference/prototype-lite/`, does not exist —
the file is in the sibling `epm` repo. Signatures follow it: flat functions over plain
values, not an object model.)*

- [x] `Rounding.LargestRemainder` — the exact-100.00% helper (D-07)
- [x] `BoqWeights` BR-01 · `ScheduleWeights` BR-02 · `Allocation` BR-03 · `ProgressReflection` BR-04
- [x] `TierSplit` BR-05 — **the 20% rule**, per line, against the *original* quantity (D-01)
- [x] `Proposals` BR-06 · `ChangeOrderGates` BR-07 · `Distribution` BR-08
- [x] `Amendments` BR-09 · `Penalty` BR-10 · `EarnedValue` BR-11 · `SlaLeadTime` BR-12
- [x] `WorkflowMachine` BR-13 · `ViewerRelation` BR-14
- [x] One xUnit file per rule, asserting the worked example from `02-BUSINESS-RULES.md` — **128 tests**
- [x] Property test: BOQ weights sum to exactly 100.00 across 500 random item sets
- [x] **Tests do not read the database** — verified: `grep -rn "EpmDb\|DbContext" Domain/` returns nothing
- [x] No clock in `Domain/` (D-06) — verified: `grep -rn "DateTime.Now"` returns nothing
- [x] `RuleCatalog.cs` + `EP-DOCS-01` `GET /api/docs/rules` executing every example live
- [x] `docs/uml/rules.md` · `TRACE.md` rows

**Exit — all met.** `dotnet test` green (128/128). 56.13 / 43.87 sums to exactly 100.00.
Tier split of (100, +30) gives 20 at the original rate and 10 at the new one. Penalty gives
6,100,000 → 1,680,000, waived 4,420,000. All 14 rules verified live through `EP-DOCS-01`.

### 1.3 Shared UI primitives ✅ COMPLETE
All in `web/src/app/shared/`, standalone, `ViewEncapsulation.None`, **no component CSS**.

- [x] `StatusPillComponent` from `DPill` — always carries a label, never colour-only (`05 §7.6`);
      no input can suppress it. Labels come from `EP-LKP-01`, so it renders any 06 enum.
      Owns the canonical→CSS map that was inline in `projects.page.ts` (P-08).
- [x] `SectionComponent` / `SecNavComponent` from `DSec` / `DSecNav`
- [x] `FieldGridComponent` from `DField` / `DFieldGrid` — **kept the reference's 2-column
      `.d-form-grid`**, not `auto-fill minmax(240px,1fr)`: nothing in `05` requires auto-fill
      here, and the cell borders depend on the 2-column count (P-18, needs CONFIRM)
- [x] `SummaryStripComponent` from `DStat` — grid `auto-fit minmax(120px,1fr)` via
      `.d-grid.stats.fit` in `styles.css`, since the copied sheet pins `repeat(4,1fr)` (P-17).
      Count-up seeds the settled value and settles on hidden (`05 §6`).
- [x] `TableSkeletonComponent` from `DTableSkeleton` — live on the Projects list
- [x] `DrawerComponent` from `DDrawer` — secondary detail goes in a drawer, not an expander (`04 §3`)
- [x] `docs/uml/_shared-primitives.md`
- [x] `ng build` clean — **required fixing a syntax error in the verbatim `desktop.css`** (P-19)

> **Verified:** `StatusPill` and `TableSkeleton` are rendering on the Projects list (pills
> carry `d-pill stalled` + "متأخر" for the canonical `delayed`). The `.fit` override was
> measured in the browser: 5 stats lay out 2+2+1 under the pinned rule, 5 equal tracks under
> `.fit`. The other five primitives compile and follow their reference components but have no
> consumer until Phase 3 — check each against its reference the first time a tab mounts it.

---

## Phase 1.5 — v1.1 design system ✅ COMPLETE

Adopted from `epm@design/system-revamp`. **Done before Phase 2 deliberately**: the
migration re-skins the class contract rather than renaming it, so it cost one screen
today and would have cost 25+ after Phase 6.

- [x] Stylesheets swapped verbatim — `tokens` `desktop` + new `boq.css`; 2,955 → 5,532 lines
- [x] `boq.css` registered in `angular.json`; **Inter** loaded (tokens declare `--font-en: Inter`
      but the branch's own `index.html` loads Roboto and never loads Inter — P-20)
- [x] ~~**Two accessibility values corrected** — `--outline` / `--viz-base` were 2.16:1 against a
      binding ≥3:1 floor~~ **REVERTED at Phase 2.9** on the client's instruction to match the
      reference exactly. They ship at v1.1's 2.16:1 light / 1.87:1 dark (P-21)
- [x] `.d-proj-filters` / `.d-proj-chips` deleted — superseded by the standard `.d-toolbar`
- [x] P-19 patch dropped — the upstream typo is fixed in v1.1
- [x] `.d-grid.stats.fit` kept — v1.1 **still** pins `repeat(4, 1fr)` (P-17 stands)
- [x] `SummaryStripComponent` reworked to the new `DStat` (icon tile + watermark retired,
      label→value→delta→bar→foot; count-up unchanged)
- [x] New primitives: **`epm-page-head`** (Z2 breadcrumb · title · action cluster) and
      **`epm-pager`** (from–to of total, windowed pages, RTL-aware, page size 15/30/60)
- [x] Projects list moved onto the v1.1 page skeleton — one bordered card containing
      toolbar strip → table → pager strip, with an always-visible result count
- [x] `05-DESIGN-SYSTEM.md` re-baselined; every ratio **measured in the running app**
- [x] Verified: `ng build` clean · AR + EN · light + dark · 1440 + 1024 · 128 API tests still green

> **Still open from the adoption:** `--tertiary` is now the same blue as
> `--status-ongoing-tx` (`05 §1.5`). If it is used as a decorative accent anywhere, that
> breaks `05 §7.5` — audit its usages before Phase 2 fans out.

---

## Phase 2.9 — Shell parity pass ✅ COMPLETE

Not originally on this roadmap. Added after a rendered-DOM diff of the two
prototypes showed the gap was never in the screens — it was the **shell**.

- [x] **Twelve chrome regions built**, all of which already had CSS in the
      copied sheets and none of which had markup: `.d-fill` · `.d-appfoot` ·
      `.d-side-toggle` + `data-side="collapsed"` · `.d-side-switch` +
      `.d-ctx-emblem` · `.d-side-acct` + `.d-side-av` · `.d-side-sep` ·
      `.d-search` + the `.d-cmdk` palette · `.d-nav-count`
- [x] **Nothing is a dead prop** — collapse persists, the workspace switcher
      navigates with `?ws=` (which every endpoint already accepts), and ⌘K is
      built from the route table so it can only offer a page that exists
- [x] **`.d-pacts` was empty on all five screens.** Every page-head action
      cluster restored, each firing the reference's own «— تجريبي / — demo»
      toast rather than silently doing nothing
- [x] `ThemeService` — the sheets carry a full `[data-theme="dark"]` palette
      and nothing was setting the attribute, so half the design system was
      unreachable. Toggle lives in the account popover, as in the reference
- [x] Nav label corrected to **ضبط الجداول الزمنية** (was «ضبط الجدولة»)
- [x] Verified: zero `d-*` classes remain that the reference renders and we do not

> **The four accessibility corrections are REVERTED** — client decision, visual
> fidelity over the `05 §7` floors. `--outline`/`--viz-base` (2.16:1),
> `--fg-subtle` as text (3.07:1), `--fs-100` (10px) and the threshold-coloured
> delay figure are all back to what v1.1 ships. **`NFR-A11Y-01` is not met, by
> choice.** The measurements and the exact restoring values are in DECISIONS.md
> under "REVERTED"; **Phase 7's accessibility pass should start from that table.**

---

## Phase 2 — Enterprise screens

Independent of each other. Can run in parallel once Phase 1 lands.

### 2.1 Contracts list — SCR-E3 · `DContractsAll` `enterprise-areas.jsx:299` (v1.1) ✅ COMPLETE
- [x] Register `ContractAmendment` DbSet
- [x] `Domain/Amendments.cs` (BR-09) — effective value = original + Σ **applied** deltas
- [x] `EP-CNT-01` `GET /api/contracts`
- [x] **`ProjectValue.Total` now receives effective values** — `PRJ-0279` moved 340M → 350M
- [x] Angular trio · TRACE row · label corrected to **العقود** (`nav_contracts_all`)

### 2.2 Entities — SCR-E4 · `DSpaces` `desktop-views.jsx:375` (v1.1) ✅ COMPLETE
- [x] `EP-ENT-01` `GET /api/entities` — dense sortable master table over `Workspaces`
- [x] Sortable name / active / projects / value, direction by icon not colour (`05 §7.8`)
- [x] Angular trio · TRACE row

> **Scope correction.** The reference component named here (`DSpaces`) renders
> **workspaces**, and the branch has no beneficiaries screen at all. Entities own
> projects; **beneficiaries receive quantity** (`01 §2.1`) and are a different list.
> Beneficiaries move to Phase 4.2, where BOQ distribution first needs them. See P-24.

### 2.3 Executive Portfolio — SCR-E1 · `DDashboard` `desktop-views.jsx:45` (v1.1) ✅ COMPLETE
- [x] KPI band as **one hairline-divided band** on an auto-fit grid, not floating cards
- [x] Contract-status donut — the single place status colours carry data (`05 §1`),
      paired with a legend so nothing is colour-only (`05 §7.6`)
- [x] Effective value by entity — `--viz-*` ramp, never status colour
- [x] Approved-but-unapplied shown as a labelled **projection**, never folded in (`02 §9`)
- [x] Count-up seeds the settled value and respects `prefers-reduced-motion` (`05 §6`)
- [x] `EP-PRT-01` · Angular trio · TRACE row

> **Physical %, financial %, SPI, CPI and the S-curve are NOT rendered as figures.**
> Each needs an input that does not exist yet — weight-rolled BOQ progress (BR-04),
> payments, or both (BR-11). They render as **"unavailable + reason"** tiles, which is
> what the v1.1 design language requires: *"never render 0/100% for a missing input"*.
> The reasons come from the server so they stay beside the rules that own them.
> `DBarCompare` · `DLineTrend` · `DSCurve` · `DTlMini` arrive with those inputs in Phase 4.

### 2.4 Alerts Center — SCR-E6 · `DAlertsCenter` `enterprise-areas.jsx:106` (v1.1) ✅ COMPLETE
- [x] Register `Alert` DbSet — columns pruned to what the register shows; `Body*`
      deferred to SCR-W13, which has the drawer that displays them
- [x] Severity band as four `.d-sevcard` filter toggles — count, share, bar and a
      **foot line that says what the count means** (how many are still open)
- [x] `EP-ALR-01` `GET /api/alerts` — counts taken BEFORE the severity/status
      filters, so selecting a card never moves the numbers on the cards
- [x] **`EP-ALR-02` `POST /api/alerts/{id}/ack` — the first WRITE in the system.**
      The reference toggles component state; here it persists and stamps the
      persona into `AcknowledgedByUserId`
- [x] Severity marker is **glyph + colour + accessible name** (`shared/sev-dot`),
      with the label printed beside it — never colour-only (`05 §7.6`)
- [x] Alert severity / kind / status added to `LookupCatalog` as a **marked
      addendum** — `06` defines none of the three (P-26)
- [x] Angular trio · `docs/uml/alerts.md` · TRACE rows

> **The ROADMAP line above used to read `enterprise-areas.jsx:65`.** That is the
> **pre-v1.1** component in `docs/spec/reference/` — a card feed with no table.
> The v1.1 one is a full register and lives in the sibling `epm` repo on
> `origin/design/system-revamp` at line 106. Same drift 2.1–2.3 hit. **`docs/spec/reference/`
> was never re-synced when v1.1 was adopted at Phase 1.5** — every remaining row
> in the reference map points at the old copy, so check the sibling repo before
> starting any of them.

> **Verified live against both prototypes side by side** at 1440 and 1024, AR and
> EN, light and dark: identical card band, chip set and order, column set, pill
> and pager. Contrast measured in the running app — acknowledged-row text 6.34
> light / 8.12 dark, severity glyphs 4.69–5.71 light (floors: 4.5 text, 3 graphic).
> Both empty states checked separately; the empty-database state renders no
> severity band and no toolbar, because there is nothing to summarise or clear.

### 2.5 Schedule Control — SCR-E5 · `DScheduleControl` `enterprise-areas.jsx:8` (v1.1) ✅ COMPLETE
- [x] Baseline vs forecast, delay, import status
- [x] **Baseline is the EFFECTIVE finish** (BR-09) — `PRJ-0148` reads *on track*;
      against its original finish it would read 20 days late, for time it was
      formally granted. Approved-but-unapplied extensions are NOT counted (`02 §9`)
- [x] **Delay is the WORST contract's, not the project's** — `PRJ-0279`'s
      project-level subtraction gives 16 days while `CNT-0279-EM` is 61 days
      late behind a longer sibling contract. The row shows 61 and names the contract
- [x] `Domain/Penalty.DelayDays()` exposed (BR-10) so the days shown here and the
      days charged for can never disagree — 3 new tests, `dotnet test` 131/131
- [x] **Three states, not two** — delayed · on track · *no schedule position*;
      the third is stated in a note bar because it is excluded from both counts
- [x] Critical activities: **"unavailable + reason"** tile and an em-dash column.
      The reference derives it from `p.id.charCodeAt(6) % 3`
- [x] `epm-summary-strip` gained an `unavailable` tile variant, so a KPI band can
      stay a band when one of its figures is genuinely underivable
- [x] `EP-SCT-01` · Angular trio · `docs/uml/schedule-control.md` · TRACE row

> **Two binding-contract breaches in the copied v1.1 sheets were found by
> measuring this screen** — `--fg-subtle` used as text at **3.07:1** (P-32) and
> `--fs-100` at **10px** (P-33), both affecting screens already merged. They were
> corrected, then **REVERTED at Phase 2.9** on the client's instruction to match
> the reference exactly. See DECISIONS.md "REVERTED".

> **Verified live against both prototypes** at 1440 and 1024, AR and EN, light and
> dark: same page head, same KPI band order and labels, same eight columns, same
> delay format, same pager. Both empty states checked separately.

### 2.6 Reports & Analytics — SCR-E7 · `DReports` `desktop-reports.jsx:58` (v1.1) ✅ COMPLETE

> ~~Trend · by-status · by-workspace · by-branch · period + export~~ — that is the
> **pre-v1.1** screen, and `04 §2`'s one-liner still describes it. v1.1 replaced the
> chart board with a **catalog of the twelve reports a user can actually run**, the
> same substitution the Alerts Center went through at 2.4. The charts are not lost:
> SCR-E1 is the chart board and already carries trend, status split and entity
> ranking. See P-37.

- [x] The twelve definitions as code — `Features/Reports/ReportCatalog.cs`, AR wording
      verbatim from the reference. Not a table: no row stores `RPT-01` (P-11's test,
      applied the other way)
- [x] Register — report · category · scope · format · frequency · last run · action;
      search · project scope · five category chips · pager
- [x] **Nine of the twelve cannot be produced yet, and each says which table it is
      waiting for and the phase that builds it.** Availability is computed from the
      tables actually registered in `EpmDb`, read off the EF model — so a later phase
      registering a DbSet flips its rows with no edit here (P-38)
- [x] A blocked row gets **no bare disabled button** — an explicit note in the row
      and «غير متاح» in the action cell
- [x] **Last run is twelve em dashes.** Nothing has ever run a report and there is
      nowhere to record that it had been; the reference hard-codes a date per row (P-09)
- [x] Chip counts move with the project scope (12 → 9) and hold still under search
      and category, so the chips and the rows can never disagree
- [x] Selection carried on `<option [selected]>`, not `[value]` on the `<select>` (P-39)
- [x] `EP-RPT-01` · Angular trio · `docs/uml/reports.md` · TRACE row

> **Verified live** at 1440 and 1024, AR and EN, light and dark: 12 rows / 7 scheduled
> / 3 runnable; scoping to `PRJ-0148` narrows to 9 rows with the scope bar shown and
> the chips recounted; Run toasts «تشغيل: … — تجريبي» carrying the scoped project, with
> `role=status` + `aria-live=polite`; filtered-empty state and its Clear button both
> reached; no horizontal overflow at 1024. `dotnet test` 131/131, `ng build` clean.

> **This is the last enterprise screen.** Every destination the reference's enterprise
> nav offers now exists — the ⌘K palette is built from that same list, so it gained
> the entry for free.

---

## Phase 3 — Workspace shell ✅ COMPLETE

Gates every tab. One agent, no parallelism.

> ~~3-pane layout — queue · detail · context~~ — that is the **pre-v1.1** workspace,
> and `04 §3` still describes it. v1.1 collapsed it: the queue became the **topbar
> project picker**, the detail pane grew a **grouped module rail**, and
> `DProjectContext` — the third pane — is still exported by the reference and
> rendered by nothing (`.d-three` carries `data-ctx="off"`, and the comment beside
> it reads *"actions now live in the page header, no side pane"*). The per-module
> actions it used to hold moved into Z6. See P-40.

- [x] Picker · detail · module rail from `DWorkspace` + `DProjectDetail` (v1.1)
- [x] Project picker in the topbar with search and status pills, scoped by `?ws=`;
      switching project **keeps the module you were reading**
- [x] Grouped module rail — overview + 4 groups (التعريف · التنفيذ · السجلات · الرقابة)
- [x] Z2 identity bar: breadcrumb → title → status pill → copyable project number
- [x] Routes `/projects/:id` and `/projects/:id/:module`, child-routed so the rail
      and the header survive a module change
- [x] The shell drops `.d-canvas` for a bare route — the workspace lays out its own
      full height, exactly as `DWorkspace` does
- [x] **All fifteen modules appear; the thirteen unbuilt ones are disabled and each
      names the phase that builds it.** ROADMAP said "only tabs that exist appear";
      followed literally that leaves a rail of two entries and four empty groups,
      which is not the screen. Nothing is a dead link — `built: false` is not
      routable and has no route entry (client decision, P-40)
- [x] **No readiness dots** — the reference derives them from `rng(p.id.charCodeAt(6))`
- [x] SCR-W1 Overview — `.d-meta` attributes, KPI band, contracts table, beneficiaries,
      open alerts. Project value = Σ **effective** contract values (BR-00 over BR-09);
      **the approved-but-unapplied projection is its own line, never inside it** (`02 §9`)
- [x] Delay is `Penalty.DelayDays` (BR-10) — the same 61 days SCR-E5 shows for
      `PRJ-0279`, driven by `CNT-0279-EM`, not the 16 a project-level subtraction gives
- [x] Physical % · financial % · SPI · CPI render **"unavailable + reason"**; the
      reference's S-curve is absent rather than faked, because a chart cannot be
      labelled unavailable
- [x] SCR-W2 Project Information — four semantic field groups. The **grouping is the
      endpoint's** (the reference matched a regex against each field's *English*
      label, so it silently did nothing in Arabic); the **labels are chrome**
- [x] Register `Beneficiary` DbSet + the five fixture rows the projects already reference
- [x] `EP-OVW-01` · `EP-INF-01` · Angular trios · `docs/uml/workspace-shell.md` · TRACE rows

> **Three defects found by measuring**, all fixed: a leaked `route.parent` subscription
> that re-fetched a module after leaving it (P-42), the KPI band clipping a 9-digit
> figure in the narrower workspace pane, and the phase note surviving into the ≤1200px
> collapsed rail where the module name does not.

> **Verified live** at 1440 and 1024, AR and EN, light and dark: rail 2 routable /
> 13 disabled; picker re-scopes and keeps the module; `PRJ-0279` reads 350,000,000
> with 353,000,000 stated separately; `PRJ-0277` reaches the no-contract branch with
> the value tile unavailable rather than zero; no horizontal overflow at 1024; no
> console errors. `dotnet test` 131/131, `ng build` clean.

---

## Phase 4 — The business core

Where the value is. **Contract before BOQ; BOQ before everything else.**

### 4.1 Contract tab — SCR-W3 · `DModContractNew` `project-modules.jsx:363` + `DContractAmendments` `contract-amendments.jsx:301` (v1.1) ✅ COMPLETE
- [x] Contract **register** for the project — the reconciliation strip
      *original + addenda impact = effective*, with the middle term visible.
      Skipped entirely when the project has one contract, as in the reference
- [x] Contract **record** with four sub-tabs: overview · details · payments · amendments
- [x] Identity / dates section, cost breakdown (award · reserve · supervision)
- [x] **Amendments** — version chain original → n, each with its delta value, delta
      days, running value/finish and state pill. Row 0 stays «العقد الأصلي»
      however many follow it (P-16)
- [x] **Approved-but-unapplied is a SEPARATE TABLE**, headed *"approving changes
      nothing — these figures are in none of the totals above"*, with its columns
      labelled *value if applied*. Not a row in the chain, not a summand anywhere (`02 §9`)
- [x] **Penalties before / after + waived** — `Domain/Penalty.Compare` (BR-10).
      `CNT-0279`: 61 days / 14,640,000 before, 16 days / 4,000,000 after,
      **10,640,000 waived** — what the 45-day extension bought.
      `CNT-0207`: 135 days, pinned at the 10% cap, nothing waived
- [x] Register `Payment` DbSet + `FinanceLetterNo`/`Date`; payments section
- [x] **Disbursed counts `paid` only**, never `certified` — the gap between the two
      is where a delayed project's money sits. `payment-kind` / `payment-status`
      added to the LookupCatalog addendum §A5 (P-26's rule)
- [x] Contract scoping enforced in the endpoint: a contract of another project 404s
- [x] `EP-CON-01` · `EP-CON-02` · Angular trio · `docs/uml/contract-tab.md` · TRACE rows

> **The reference's penalty formula is not the specification's.** v1.1 computes
> `value × rate / duration` per day with a 10–25% band, citing Regs 2/2014;
> `02 §10` and D-02 say 0.1%/day capped at 10%. The written spec owns the
> arithmetic, so `Domain/Penalty.cs` is unchanged — but the two give materially
> different money on `CNT-0279`. Recorded as **P-45, CONFIRM**.

> **Verified live** at 1440 and 1024, AR and EN, light and dark: the register
> reconciles 340,000,000 + 10,000,000 = 350,000,000; `PRJ-0148` skips the register
> and shows no back button; the chain, the pending table and the penalty read as
> above; payments show certified and paid dates separately. `dotnet test` 131/131,
> `ng build` clean.

### 4.2 BOQ tab — SCR-W4 · the densest screen in the system · `DBoqRegister` `boq-register.jsx:435` + `DBoqAssign` `boq-assign.jsx:11` (v1.1) ✅ COMPLETE
- [x] Contract selector gate — nothing renders until a contract is chosen ("اختر عقداً للبدء").
      A project with ONE contract is not asked; the v1.1 component never gates at
      all, and the divergence is recorded as **P-46**
- [x] Register `BoqItem`, `BoqRateBand`, `BoqDistribution`, `BoqActivityLink` DbSets —
      **and `Activity`**, which 4.3 was to own: BR-03 reads its weight and BR-04
      its progress, so the BOQ tab cannot be built without it. Columns pruned to
      what SCR-W4 shows; 4.3 restores the schedule ones
- [x] **Register view** — weights summing to exactly 100.00% via BR-01, expandable
      division → item hierarchy, progress bar, distribution status, column menu,
      frozen code + description, Z10 status strip
- [x] Inline row edit with live amount; delete confirms in-row and clears that item's
      distribution, links and bands. A **banded** line refuses the edit (`02 §5`) and a
      decrease that would strand a distribution refuses it too (`02 §8`)
- [x] **Distribution drawer** — inputs **capped** at the remaining quantity with an inline
      explanation (`02 §8`), the cap re-derived as the other rows move, gates 2 and 4
      checked in `EP-BOQ-06`, and only the project's own beneficiaries offered
- [x] **Activity-assignment view** — cost/man-hours toggle, coverage counters, manual
      override + reset, auto-distribute, over-allocation blocks the save
- [x] Switching contracts re-scopes everything (it is a navigation, and the contract is in
      the URL); **no BOQ row exposes project or WBS** (`01 §2.4`)
- [x] `EP-BOQ-01` … `EP-BOQ-08` · Angular trio · `docs/uml/boq-tab.md` · TRACE rows

> **Verified live** at 1440 and 1024, AR and EN: `CNT-0279-EM` reads **56.13 / 43.87**
> with the footer at exactly **100.00**; `BQ-003` shows A5 5.80% / A8 5.20% →
> **52.7 / 47.3** → **14,094,000 / 12,636,000**, coverage **full**; the man-hours basis
> moves the same line to 57.9 / 42.1; `PRJ-0148` skips the gate and shows the
> empty-bill state; editing BQ-012's rate re-derived every weight and the column still
> summed to 100.00; the distribution cap held at 540 and the save round-tripped.
> `dotnet test` 138/138, `ng build` clean, no console errors.

**Exit:** `CNT-0279-EM` reads 56.13% / 43.87%, footer sum exactly 100.00%.
`BQ-003` linked to A5/A8 gives shares 52.7% / 47.3%, assigned **14,094,000 / 12,636,000**, status **full**.

> The figures 14,092,710 / 12,637,290 printed in `02 §3` come from unrounded underlying
> weights, not from the stated 5.8 / 5.2 — `02 §4` says the same of its own example. The
> rule's answer is 14,094,000 / 12,636,000 and `AllocationTests` asserts both. See P-15.

### 4.3 Schedule tab — SCR-W5 · `DGantt` `schedule-module.jsx:80` + `DSchedTable` `:257` + `DModSchedule` `:437` (v1.1) ✅ COMPLETE
- [x] ~~Register `Activity` DbSet~~ — **done by 4.2**, which needed its weight (BR-03) and
      its progress (BR-04). What remained was restoring the columns 4.2 pruned:
      baseline / actual / forecast dates, durations, `TotalFloat`, `IsCritical`,
      `Calendar`, `Predecessors`. WBS stays a **path string**, not a tree table —
      the endpoint splits it, materialises each ancestor once and emits **one flat
      ordered list**, so a collapse cannot desynchronise from the data
- [x] Contract gate, for the same reason as SCR-W4 (P-46): an activity belongs to
      exactly one contract, and a project with ONE contract is not asked
- [x] Gantt with resizable pinned column block — floor 160px, default 320px (`04 §5`),
      drag **and** arrow keys, direction flipped in RTL
- [x] Nine info columns with the explicit grid contract; headers **wrap, never truncate**
- [x] Status as bar fill; **critical path is a 2px `--on-surface` ring, not a colour** (`04 §5`).
      The reference's own stylesheet paints it `--error` while its own legend draws
      the ring — recorded as **P-52**, and the override is in the stylesheet, not
      an inline style
- [x] Data-date line in `--viz-base` at the **project data date** (D-06); milestones
      as `--on-surface` diamonds
- [x] WBS tree showing **both** relative and absolute weight (BR-02) — the first screen
      where `Relative` has a parent that is not the contract
- [x] Table view, and an activity record pane. **Progress is read-only here**: `02 §4`
      reflects it onto the BOQ, and the screen that shows that consequence is SCR-W6
- [x] Below 1280px, column picker defaults to 4 essential columns
- [x] **SCR-E5's critical-activities tile and column became real** — the follow-through
      P-31 promised, with no change to the DTO's shape or the screen's
- [x] `EP-SCD-01` · `EP-SCD-02` · Angular trio · `docs/uml/schedule.md` · TRACE rows

> **The reference rolls progress up by original DURATION.** `02 §4` says "rolls up
> by weight", which makes a long cheap activity stop outranking a short expensive
> one. The written spec owns the arithmetic, so `ProgressReflection.Rollup` is used
> unchanged and the two give different node percentages. Recorded as **P-51**.

> **Verified live** at 1440 / 1280 / 1024 / 768, AR and EN, light and dark:
> `CNT-0279` reads A5 **abs 5.80% / rel 16.20%** and A8 **5.20%**, matching `02 §3`;
> node 2 rolls up to **67%**; A9 shows **−9 days, early** and is the one row that is;
> the man-hours basis moves A5 to **6.3%**; the critical filter leaves 8 activities
> and only the nodes above them; level 1 collapses to the four nodes; the critical
> bars carry a 2px `--on-surface` ring over a **status** fill, never red; `PRJ-0148`
> skips the gate, shows no back button and renders the no-schedule state. No header
> truncates and the chart stays inside the pane at all four widths.
> SCR-E5 now reads **11 critical activities**. `dotnet test` 140/140, `ng build` clean,
> no console errors.

**Exit:** `CNT-0279` A5 absolute weight 5.80%, relative 16.20%; node 2 progress 67.07%;
A9 slip −9; SCR-E5's critical-activities tile shows 11 instead of "unavailable".

### 4.4 Progress + Financials — SCR-W6 · `DModProgress` `project-modules.jsx:1391` / SCR-W7 · `DModFinancialNew` `:907` (v1.1) ✅ COMPLETE
- [x] Progress: move an activity's progress → BOQ progress, achieved qty and achieved amount update live (BR-04).
      The editor names the BOQ lines each row feeds **before** it is touched, and the
      reflection table prints `share × progress` per contributor rather than asserting
      the answer
- [x] **Not gated on a contract**, unlike SCR-W4 and SCR-W5: `02 §4` rolls physical %
      up across every contract, so a gate would hide the project's own headline (P-55)
- [x] Refused, not clamped: outside 0–100, or a fractional milestone. Blocked in the
      row before the request and checked again in the endpoint (`04 §9`)
- [x] Financials: approved + applied changes = revised − disbursed = balance, per
      contract, with the payments register beneath it
- [x] **Four figures per certificate** — gross − retention − advance recovery = net.
      Retention held and advance outstanding count **paid** certificates only, for the
      same reason disbursed does (P-26)
- [x] EVM (CPI/SPI/EAC/VAC) as **diagnostics** — 13px, `--on-surface-variant`, never
      colour-by-threshold (`05 §7.9`); each index carries a WORD instead of a colour,
      and renders as a RATIO, never a percentage
- [x] `Domain/PlannedProgress.cs` — the input BR-11 needs and `02` never defines (P-53)
- [x] **SCR-W1's four "unavailable" tiles became real** — physical, financial, SPI, CPI.
      Each still falls back to unavailable when its own input is genuinely missing
- [x] `EP-PRG-01` · `EP-PRG-02` · `EP-FIN-01` · Angular trios · `docs/uml/progress-financials.md` · TRACE rows

> **The reference's Progress module is a read-only dashboard** — its own header
> comment says so. `07 §M3` and this phase ask for the opposite in as many words.
> Both are honoured: the dashboard is the reference's, and the editor sits beneath
> it with the BOQ lines it moves visible in the same view. Recorded as **P-55**.

> **Two of the reference's six financial tabs have no source here** — the annual
> allocation and the advance audit SLA. Neither is invented from a payment date;
> both say so with their reason (**P-56**, the P-09 treatment).

> **Two defects were found and fixed in shared code**, both surfaced by this being
> the first screen whose figures change after load: the summary strip's count-up
> wrote `element.textContent`, which destroys the text node Angular's binding
> holds, so every tile froze at its first value; and `fmt` had no way to render an
> index, so SPI 0.49 printed as 49.00.

> **Verified live** at 1440 and 1024, AR and EN, light and dark: reporting **A5 at
> 100%** moves `BQ-003` to **52.73% / 14,094,000 achieved**, the contract roll-up to
> 55%, the project's physical % from **49.28 → 50.94**, and the gap tile from −51 to
> −49 — all in one response. 140 is refused in the row with the reason and the save
> disabled. `PRJ-0279` reconciles **340,000,000 + 10,000,000 = 350,000,000 −
> 86,700,000 = 263,300,000**, holds **3,100,000** of retention and **27,800,000** of
> advance, and `CNT-0279`'s third certificate reads certified-and-unpaid with the
> note that says why it is in neither balance. `PRJ-0148` shows a financial % but
> "unavailable" for physical and both indices; `PRJ-0159` shows unavailable for all
> four. `dotnet test` 149/149, `ng build` clean, no console errors.

**Exit:** report A5 at 100% → `BQ-003` progress reads **52.73%**, achieved amount
**14,094,000**.

> The roadmap's original figures — 52.6% and 14,059,980 — are `02 §4`'s, and come
> from the rounded share the spec prints rather than the one its own rule produces.
> This is **P-15 again**, already resolved for `02 §3`: `Domain/Allocation` divides
> before it multiplies, so A5's share is 52.7272…% and the achieved amount lands on
> exactly the 14,094,000 the BOQ tab already assigns to A5. The two agree because
> they are the same derivation (P-54).

### 4.5 Amendment disclosure — shared by BOQ and Schedule
- [ ] `DAmdMark` badge — count + three states: all applied · all pending · **mixed** (green with amber dot)
- [ ] `DAmdPanel` drawer, identical for BOQ items and activities (`04 §6`)
- [ ] Cell delta — effective figure + compact signed delta, coloured settled vs pending, **no strikethrough**
- [ ] `docs/uml/amendment-disclosure.md`

---

## Phase 5 — Change orders (the flagship)

The most heavily specified part of the system. Read `03-CHANGE-ORDER-PROCESS.md` end to end first.

### 5.1 Register — SCR-W8 · `DModVO` `vo-record.jsx:454` (v1.1) ✅ COMPLETE
- [x] Register `ChangeOrder` + `ChangeOrderLine` + `ChangeOrderActivity` DbSets —
      **and `ChangeOrderStage` + `ChangeOrderAttachment`**, which 5.4 was to own:
      `03 §10` puts "current stage · current owner" and the attachment count in the
      register's own row spec, and BR-14 resolves the relation off the stage chain.
      The same call 4.2 made about `Activity`
- [x] Lifecycle groups, **and they are one axis only** — `all` · pending · returned ·
      approved-applying · closed · rejected, with `draft` shown only when non-empty
- [x] **بانتظار إجرائي** filter driven by the viewer relation (BR-14), resolved
      SERVER-side from the persona header — switching persona is a RE-READ, never a
      client-side re-filter of relations computed for somebody else
- [x] Five compact indicators only — no large cards, no charts (`03 §10`). The
      average cycle is over CLOSED orders and renders "unavailable + reason" until
      one closes (P-09)
- [x] Status column carries the lifecycle pill **plus** exception chips (متأخر ·
      تجاوزت السقف · فشل التطبيق · بانتظار تثبيت الأسعار) **plus** the relation chip,
      and the title column repeats none of it
- [x] `06 §12`'s six orders seeded in six states, every age derived from the DATA
      DATE (D-06)
- [x] `EP-CHG-01` · Angular trio · `docs/uml/change-orders.md` · TRACE row

> **The reference component is `vo-record.jsx:454`, not `project-modules.jsx:1142`.**
> v1.1 moved the module into its own file and says so at `vo-record.jsx:4`: *"Loaded
> after project-modules.jsx so this DModVO replaces the earlier one."* The line above
> is corrected; TRACE carries the same correction.

> **Two indicator pairs are kept apart on purpose.** «قيد الاعتماد» counts the
> `pending` lifecycle and must agree with the GROUP of the same name, while
> needs-action and overdue span pending **and** returned — a returned order is back
> with its originator, and that is an action. Separately, the whole-order overdue
> ceiling (14 days since the incoming letter) is not the per-stage SLA (BR-12): an
> order can breach either without the other, which is what VO-02 and VO-06 exist to
> demonstrate.

> **Verified live** at 1440, AR and EN: six orders in six states; RE department sees
> **1 awaiting** (VO-03, returned to it) and the committee **3** (VO-06 at its stage,
> VO-05 and VO-04 as execution owner) — the same six rows, different relations, from
> one persona switch. VO-02 carries متأخر + تجاوزت السقف + بانتظار تثبيت الأسعار;
> VO-04 carries فشل التطبيق; VO-06 carries none, which is the control. Indicators
> read net approved **13,000,000**, pending 2, SLA 2, overdue 2, avg cycle **84.0
> days**. `dotnet test` 149/149, `ng build` clean, no console errors.

**Exit:** the same order shows a different relation to different personas, and the
«بانتظار إجرائي» count changes with it.

### 5.2 Record page — `DModVO` `vo-record.jsx:436` + `DVORecordPanel`
- [ ] Sticky header per `03 §9` — no project name, no repeated contract detail
- [ ] Tab 1 الملخص — order info, inputs preceding entry, impact, contract before/order/after, decision summary, 7-step checklist
- [ ] Tab 2 الكميات والكلفة — one comparison table under grouped **Before / Requested / Approved / Applied** headers; only changed figures marked, never whole rows
- [ ] Tab 3 الأثر الزمني — affected activities, requested/analysis/approved days, critical-path effect
- [ ] Tab 5 المرفقات — table with version and originating stage; **versions accumulate, files are never replaced**
- [ ] Tab 6 السجل — audit trail with previous → new value
- [ ] Leave an explicit placeholder for tab 4 (5.4 fills it)
- [ ] `EP-CHG-02..n` · UML · TRACE rows

### 5.3 Creation wizard — `DVOCreateWizard` `vo-wizard.jsx:6`
- [ ] **Contract selected FIRST** and scopes everything; read-only context header
- [ ] Step 1 — two type cards only; الأسباب الموجبة free textarea; responsible party + letter no/date
- [ ] Step 2 — BOQ tab + Activities tab in one step, each showing its selected count; existing register tables reused
- [ ] **Both proposals side by side** per line (contractor · RE dept) — `02 §6`
- [ ] **The 20% split sub-row** stating it explicitly and naming لجنة تثبيت الأسعار as final authority (`02 §5`)
- [ ] "Add new BOQ item" **does not exist here** — new items come from BOQ Management (`06 §7`)
- [ ] Step 3 — impact summary, one section, no large cards
- [ ] Step 4 — attachments with the six categories
- [ ] Step 5 — review, **expected approval path rendered from actual conditions**, two buttons only
- [ ] Submission blocked by the BR-07 gates with the offending lines listed
- [ ] `EP-WIZ-01..n` · UML · TRACE rows

**Exit:** original qty 100, add 30 → 20 at the original rate, 10 beyond 20%, rate-fixing stage appears
in the path. A decrease beyond the remaining quantity cannot be submitted.

### 5.4 Workflow + apply
- [ ] Register `ChangeOrderStage`, `ChangeOrderExternalParty`, `ChangeOrderApplyStep`, `ChangeOrderAuditEntry`
- [ ] Six-stage machine (BR-13) with **conditional** stages — rate-fixing only if a line trips 20%; endorsement only if the extension exceeds ¼ of the contract duration
- [ ] **Skipped stages listed explicitly with the reason** — never silently omitted (`03 §2`)
- [ ] External parties as **statuses inside the owning stage**, with letter number + date (`03 §3`)
- [ ] Delegate attribution — "لجنة المراجعة المصادقة — سُجِّل بواسطة مقرّر لجنة أوامر الغيار" (`03 §4`)
- [ ] Four decisions incl. **return with history retained**
- [ ] Persona gating (BR-14) — actions render only for `awaiting` / `recorder`; otherwise an explicit locked note, **never a bare disabled button**
- [ ] SLA / overdue / escalation (BR-12) measured from the **data date**, never the wall clock
- [ ] **Apply** → creates a `ContractAmendment`, moves quantities into rate bands, dates, penalty baseline
- [ ] 7-step application checklist with a **genuinely failable** weight step
- [ ] `EP-WFL-01..n` · UML · TRACE rows

**Exit:** approving VO-05 changes nothing. Applying it increments the amendment number and moves
contract value, finish, BOQ quantities, weights and the penalty baseline. VO-04 sits in *applying*
with the weight step failed and raises فشل التطبيق in the register.

---

## Phase 6 — Remaining tabs

Light, independent, parallelisable.

- [ ] SCR-W9 Risk — `DModRisk` — register + 5×5 severity grid + issues
- [ ] SCR-W11 Meetings — `DModMeetings`
- [ ] SCR-W12 Documents — `DModDrawings` — versioned register with approval status
- [ ] SCR-W13 Alerts — `DModAlerts`
- [ ] SCR-W14 Reports — `DModReports`
- [ ] SCR-W15 Audit History — `DModAudit`
- [ ] SCR-W10 3D Model — **stub per `07 §8`**: keep the tab, massing placeholder + object list, no BIM

---

## Phase 7 — Closeout

- [ ] `/docs` Angular route rendering `EP-DOCS-01` — rule text, inputs, live-computed example, source link
- [ ] `DECISIONS.md` complete — D-01…D-12 carried over plus everything resolved during the build
- [ ] `TRACE.md` complete — every screen, endpoint, rule, table
- [ ] `docs/uml/_global-er.md` · `_feature-map.md` · `_changeorder-lifecycle.md`
- [ ] **Fidelity pass** — walk all 22 screenshots in `docs/spec/screenshots/` side by side
- [ ] **Responsive pass** — 1440 / 1280 / 1024 / 768: no header truncates, Gantt stays inside the pane, KPI strips reflow 5→5→3→2
- [ ] **Accessibility pass** (`05 §7`, binding) — nothing below 11px; `--outline` / `--viz-base` never used as text colour; `:focus-visible` on every interactive element; status never colour-only; disabled uses explicit colours, never opacity
- [ ] **Bilingual pass** — every screen in both directions, no untranslated key, no unisolated number

---

## Parallelism

```
Phase 1 (1.1 → 1.2 → 1.3)      one agent, sequential — everything depends on it
   ├── Phase 2  2.1 2.2 2.3 2.4 2.6      up to 5 agents
   └── Phase 3  workspace shell           one agent
          └── Phase 4  4.1 → 4.2 → 4.3 → 4.4    mostly sequential; 4.5 joins after 4.2
                 └── Phase 5  5.1 → (5.2, 5.3) → 5.4
                        └── Phase 6  up to 6 agents
                               └── Phase 7
```

Peak useful parallelism is about 6 agents, in Phase 2 and Phase 6.
Phases 3, 4 and 5 are mostly one agent each — they build on their own output.
