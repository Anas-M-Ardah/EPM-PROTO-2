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

### Enterprise screens

| ID | Screen | Reference component |
|---|---|---|
| SCR-E1 | Executive Portfolio | `DDashboard` — `desktop-views.jsx:45` + charts in `desktop-charts.jsx` |
| SCR-E2 | Projects | `DProjectsAll` — `enterprise-areas.jsx:112` |
| SCR-E3 | Contracts | `DContractsAll` — `enterprise-areas.jsx:160` |
| SCR-E4 | Entities / Beneficiaries | `DSpaces` — `desktop-views.jsx:255` |
| SCR-E5 | Schedule Control | `DScheduleControl` — `enterprise-areas.jsx:8` |
| SCR-E6 | Alerts Center | `DAlertsCenter` — `enterprise-areas.jsx:65` |
| SCR-E7 | Reports & Analytics | `DReports` — `desktop-reports.jsx:39` |

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
| SCR-W4 | BOQ | `DModBOQ` — `project-modules.jsx:801` · contract-scoped wrapper `DModBOQ` — `contract-context.jsx:269` · `DBOQAssignment` — `project-modules.jsx:980` · `DBoqDistDrawer` — `contract-context.jsx:101` |
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
- [x] **Two accessibility values corrected** — `--outline` / `--viz-base` were 2.16:1 against a
      binding ≥3:1 floor; now 3.31:1 light / 3.43:1 dark, overridden in `styles.css` so the
      copied sheets stay verbatim (P-21)
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

### 2.4 Alerts Center — SCR-E6 · `DAlertsCenter` `enterprise-areas.jsx:65`
- [ ] Register `Alert` DbSet · severity KPIs + aggregated feed
- [ ] `EP-ALR-01` · Angular trio · UML · TRACE row

### 2.5 Schedule Control — SCR-E5 · `DScheduleControl` `enterprise-areas.jsx:8`
- [ ] Baseline vs forecast, delay, critical count, import status
- [ ] `EP-SCT-01` · Angular trio · UML · TRACE row
- [ ] *Depends on Phase 4.2 (Activities) for real figures*

### 2.6 Reports & Analytics — SCR-E7 · `DReports` `desktop-reports.jsx:39`
- [ ] Trend · by-status · by-workspace · by-branch · period + export
- [ ] `EP-RPT-01` · Angular trio · UML · TRACE row

---

## Phase 3 — Workspace shell

Gates every tab. One agent, no parallelism.

- [ ] 3-pane layout from `DWorkspace` — queue · detail · context (`04 §3`)
- [ ] Project queue pane, project detail with the 15-tab bar (`DProjectDetail`)
- [ ] Context pane: contextual actions, parties, per-tab edit history (`DProjectContext`)
- [ ] Route `/projects/:id` and `/projects/:id/:tab`
- [ ] **Only tabs that exist appear** — a tab leading to a blank pane is worse than no tab
- [ ] SCR-W1 Overview — project value = Σ contracts, contracts table, beneficiaries
- [ ] SCR-W2 Project Information — full field grid
- [ ] `docs/uml/workspace-shell.md` · TRACE rows

---

## Phase 4 — The business core

Where the value is. **Contract before BOQ; BOQ before everything else.**

### 4.1 Contract tab — SCR-W3 · `DModContractNew` + `DContractAmendments`
- [ ] Identity / dictionary section, cost breakdown
- [ ] **Amendments** — version chain original → n, each with source order, delta value, delta days, state pill
- [ ] Approved-but-unapplied shown **separately as a projection**, never folded into effective figures (`02 §9`)
- [ ] **Penalties before / after + waived amount** — `Domain/Penalty.cs` BR-10
- [ ] Register `Payment` DbSet; payments section
- [ ] `EP-CON-01..n` · Angular trio · UML · TRACE rows

### 4.2 BOQ tab — SCR-W4 · the densest screen in the system
- [ ] Contract selector gate — nothing renders until a contract is chosen ("اختر عقداً للبدء")
- [ ] Register `BoqItem`, `BoqRateBand`, `BoqDistribution`, `BoqActivityLink` DbSets
- [ ] **Register view** — weights summing to exactly 100.00% via BR-01, progress bar, distribution status
- [ ] Inline row edit with live amount; delete confirms in-row and clears that item's distribution
- [ ] **Distribution drawer** (`DBoqDistDrawer`) — inputs **capped** at the remaining quantity with an inline explanation (`02 §8`)
- [ ] **Activity-assignment view** (`DBOQAssignment`) — cost/man-hours toggle, coverage counters, manual override + reset
- [ ] Switching contracts re-scopes everything; **no BOQ row exposes project or WBS** (`01 §2.4`)
- [ ] `EP-BOQ-01..n` · Angular trio · UML · TRACE rows

**Exit:** `CNT-0279-EM` reads 56.13% / 43.87%, footer sum exactly 100.00%.
`BQ-003` linked to A5/A8 gives shares 52.7% / 47.3%, assigned **14,094,000 / 12,636,000**, status **full**.

> The figures 14,092,710 / 12,637,290 printed in `02 §3` come from unrounded underlying
> weights, not from the stated 5.8 / 5.2 — `02 §4` says the same of its own example. The
> rule's answer is 14,094,000 / 12,636,000 and `AllocationTests` asserts both. See P-15.

### 4.3 Schedule tab — SCR-W5 · `DModSchedule` + `DGantt`
- [ ] Register `Activity` DbSet — WBS is a **path string**, not a tree table
- [ ] Gantt with resizable pinned column block — floor 160px, default 320px (`04 §5`)
- [ ] Nine info columns with the explicit grid contract; headers **wrap, never truncate**
- [ ] Status as bar fill; **critical path is a 2px `--on-surface` ring, not a colour** (`04 §5`)
- [ ] Data-date line in `--viz-base`; milestones as `--on-surface` diamonds
- [ ] WBS tree showing **both** relative and absolute weight (BR-02)
- [ ] Below 1280px, column picker defaults to 4 essential columns
- [ ] `EP-SCD-01..n` · Angular trio · UML · TRACE rows

### 4.4 Progress + Financials — SCR-W6 / SCR-W7
- [ ] Progress: move an activity's progress → BOQ progress, achieved qty and achieved amount update live (BR-04)
- [ ] Financials: budget / disbursed / advances / retention / due, payments register
- [ ] EVM (CPI/SPI/EAC/VAC) as **diagnostics** — 13px, `--on-surface-variant`, never colour-by-threshold (`05 §7.9`)
- [ ] `EP-PRG-01` / `EP-FIN-01` · Angular trios · UML · TRACE rows

**Exit:** drag A5 to 100% → `BQ-003` progress reads 52.6%, achieved amount ≈ 14,059,980.

### 4.5 Amendment disclosure — shared by BOQ and Schedule
- [ ] `DAmdMark` badge — count + three states: all applied · all pending · **mixed** (green with amber dot)
- [ ] `DAmdPanel` drawer, identical for BOQ items and activities (`04 §6`)
- [ ] Cell delta — effective figure + compact signed delta, coloured settled vs pending, **no strikethrough**
- [ ] `docs/uml/amendment-disclosure.md`

---

## Phase 5 — Change orders (the flagship)

The most heavily specified part of the system. Read `03-CHANGE-ORDER-PROCESS.md` end to end first.

### 5.1 Register — SCR-W8 · `DModVO` `project-modules.jsx:1142`
- [ ] Register `ChangeOrder` + `ChangeOrderLine` + `ChangeOrderActivity` DbSets
- [ ] Four groups: بحاجة إلى إجراء · قيد الاعتماد · المعتمدة والمغلقة · المرفوضة
- [ ] **بانتظار إجرائي** filter driven by the viewer relation (BR-14)
- [ ] Five compact indicators only — no large cards, no charts (`03 §10`)
- [ ] Status column carries the lifecycle pill **plus** exception chips (متأخر · يحتاج إجراء · فشل التطبيق) **plus** the relation chip
- [ ] `EP-CHG-01` · Angular trio · UML · TRACE row

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
