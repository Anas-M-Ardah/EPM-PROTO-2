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

## Phase 1 — Shared primitives and the rules

Everything downstream depends on these. Do them before fanning out.

### 1.1 Lookups — unblocks every enum column in the app
- [ ] Register `Lookup` DbSet; fill `Fixture.cs` from `06-DATA-DICTIONARY.md` (all 20 kinds)
- [ ] `EP-LKP-01` `GET /api/lookups` — grouped by kind
- [ ] `core/lookups.ts` — loads once, `label(kind, code)` returns the AR/EN name
- [ ] Replace the inline `statuses` array in `projects.page.ts` with it
- [ ] **Fixes the raw `finishes` / `handover` codes now showing on the Projects list**
- [ ] `docs/uml/lookups.md` · `TRACE.md` row

### 1.2 Domain rules — the specification as code
Port from `docs/spec/reference/prototype-lite/core/domain.js`, which already carries
`@rule` / `@spec` / `@example` annotations in the right shape.

- [ ] `Rounding.LargestRemainder` — the exact-100.00% helper (D-07)
- [ ] `BoqWeights` BR-01 · `ScheduleWeights` BR-02 · `Allocation` BR-03 · `ProgressReflection` BR-04
- [ ] `TierSplit` BR-05 — **the 20% rule**, per line, against the *original* quantity (D-01)
- [ ] `Proposals` BR-06 · `ChangeOrderGates` BR-07 · `Distribution` BR-08
- [ ] `Amendments` BR-09 · `Penalty` BR-10 · `EarnedValue` BR-11 · `SlaLeadTime` BR-12
- [ ] `WorkflowMachine` BR-13 · `ViewerRelation` BR-14
- [ ] One xUnit file per rule, asserting the worked example from `02-BUSINESS-RULES.md`
- [ ] Property test: BOQ weights sum to exactly 100.00 for any input set
- [ ] **Tests must not read the database** — examples stay inline, so a wrong fixture cannot make a test lie
- [ ] `RuleCatalog.cs` + `EP-DOCS-01` `GET /api/docs/rules` executing every example live

**Exit:** `dotnet test` green. 56.13 / 43.87 sums to exactly 100.00. Tier split of (100, +30)
gives 20 at the original rate and 10 at the new one. Penalty example gives 6,100,000 → 1,680,000,
waived 4,420,000.

### 1.3 Shared UI primitives
- [ ] `StatusPillComponent` from `DPill` — always carries a label, never colour-only (`05 §7.6`)
- [ ] `SectionComponent` / `SecNavComponent` from `DSec` / `DSecNav`
- [ ] `FieldGridComponent` from `DField` / `DFieldGrid` — `repeat(auto-fill, minmax(240px,1fr))`
- [ ] `SummaryStripComponent` from `DStat` — grid `auto-fit minmax(120px,1fr)`, **never** a pinned column count (`05 §8`)
- [ ] `TableSkeletonComponent` from `DTableSkeleton`
- [ ] `DrawerComponent` from `DDrawer` — secondary detail goes in a drawer, not an expander (`04 §3`)
- [ ] `docs/uml/_shared-primitives.md`

---

## Phase 2 — Enterprise screens

Independent of each other. Can run in parallel once Phase 1 lands.

### 2.1 Contracts list — SCR-E3 · `DContractsAll` `enterprise-areas.jsx:160`
- [ ] Register `ContractAmendment` DbSet
- [ ] `Domain/Amendments.cs` (BR-09) — effective value = original + Σ **applied** deltas
- [ ] `EP-CNT-01` `GET /api/contracts`
- [ ] **Then fix `ProjectValue.Total` callers to pass effective values, not original** (`02 §9`)
- [ ] Angular trio · UML · TRACE row

### 2.2 Entities / Beneficiaries — SCR-E4 · `DSpaces` `desktop-views.jsx:255`
- [ ] Register `Beneficiary` + `Workspace` DbSets; beneficiary tree via `ParentCode`
- [ ] `EP-ENT-01` `GET /api/beneficiaries` — dense sortable master table
- [ ] Angular trio · UML · TRACE row

### 2.3 Executive Portfolio — SCR-E1 · `DDashboard` `desktop-views.jsx:45`
- [ ] KPI strip as **one hairline-divided band**, not floating cards (`04 §3`)
- [ ] Contract-status donut — the single place status colours carry data (`05 §1`)
- [ ] Cost-comparison bars, annual-spend line, project timelines, milestones — `--viz-*` ramp only
- [ ] Port `DDonutMulti` · `DBarCompare` · `DLineTrend` · `DSCurve` · `DTlMini`
- [ ] Count-up animations must **seed the settled value** and respect `prefers-reduced-motion` (`05 §6`)
- [ ] `EP-PRT-01` · Angular trio · UML · TRACE row

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
`BQ-003` linked to A5/A8 gives shares 52.7% / 47.3%, assigned 14,092,710 / 12,637,290, status **full**.

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
