# test.md — the walk-through

One document to walk the whole system by. **81 comprehensive cases**, each covering a
screen or a journey step end to end, not a single control. Where a case fails, its six
lines name the suspects: the route to reproduce it, the endpoints behind it, the reference
component it must look like, and the domain function a wrong number came from.

> **Sources of truth**, in order: `docs/__العرض-الفني-…html` (the proposal — 28 sections,
> 14 مسارات, alert rules R1–R12, the three inviolable permission controls),
> `docs/__ملحق-الشاشات-والوظائف-…html` (the appendix — **60 plates in 13 groups**, the
> client's sign-off unit), and `design/system-revamp@065de12` (the running prototype,
> mirrored into `docs/spec/reference/`). Repo docs supply anchors only. Where they disagree
> with the client documents, the client documents win and the disagreement goes in §17.

---

## How to read a case

```
### T-BOQ-01 · title                          ← the plate and screen code follow the title
- **Route**   reproduce it here            **API**  every endpoint behind the screen
- **Ref**     the prototype component it must structurally match
- **Rule**    where a wrong number comes from, and whether a unit test already guards it
- **Do**      in the order the plate's «الإجراءات المتاحة» lists them
- **Expect**  figures read off the running fixture, never off a spec
- **Status**  see the vocabulary below
```

`grep -rn "EP-BOQ-03" api web` returns every touchpoint of an endpoint across both stacks
(`CLAUDE.md` §2). That is what makes the **API** line a debugging tool rather than a label.

### Status vocabulary

| | Means |
|---|---|
| ✅ | **Observed on the screen.** Someone opened it and read the figures. |
| 🟡 | **Verified below the screen only** — the endpoint was called or the domain test run, and the numbers in **Expect** are what came back. The rendering was not walked. |
| 🔨 | Written, not executed. |
| ⏸ | Needs an E2E harness this repo does not have, or is blocked. |
| ⚠️ | Known deviation — see §17. Not a bug; do not file it. |
| ❌ | Fails. |

> **A ✅ must have been observed, never inferred.** 🟡 exists so that rule can hold: most of
> this file was verified through the API and the domain suite in one session, and calling
> that ✅ would be a lie about which layer was checked. (This splits the plan's single ✅ in
> two — deliberately, and the reason is above.)

### Constants every case honours

- **"Now" is the project data date `2026-08-02`**, never `DateTime.Now` (D-06). A figure
  that moves when you run this tomorrow is a bug.
- Money is `decimal` (D-11). Quantities and percentages `decimal(18,4)`.
- Fixture figures are **illustrative, not ministry data** (`Features/Dev/Fixture.cs`).
- The fixture project is `PRJ-0279` «مجمع الكليات الطبية»; the supply project is `PRJ-0439`.

---

## Progress

Executed on **2026-09-02**: the domain suite (§14 and every **Rule** line), the API surface
behind §3–§13, and the production build (§16). **No screen was walked** — every case below
is 🟡 or lower for that reason, and turning one ✅ means opening it and reading it.

| § | Section | Cases | ✅ | 🟡 | 🔨 | ⏸ | ⚠️ |
|---|---|--:|--:|--:|--:|--:|--:|
| 0 | Setup | 4 | 0 | 4 | 0 | 0 | 0 |
| 1 | Public | 2 | 0 | 0 | 2 | 0 | 0 |
| 2 | Shell | 5 | 0 | 1 | 4 | 0 | 0 |
| 3 | Enterprise | 7 | 0 | 5 | 2 | 0 | 0 |
| 4 | المسار 1 — project creation | 2 | 0 | 1 | 1 | 0 | 0 |
| 5 | Workspace | 2 | 0 | 1 | 1 | 0 | 0 |
| 6 | Contract | 6 | 0 | 3 | 3 | 0 | 0 |
| 7 | BOQ | 3 | 0 | 2 | 1 | 0 | 0 |
| 8 | Supply | 4 | 0 | 2 | 2 | 0 | 0 |
| 9 | Schedule | 4 | 0 | 2 | 2 | 0 | 0 |
| 10 | Progress | 4 | 0 | 3 | 1 | 0 | 0 |
| 11 | Financials | 7 | 0 | 3 | 4 | 0 | 0 |
| 12 | Change orders | 8 | 0 | 3 | 5 | 0 | 0 |
| 13 | Remaining tabs | 7 | 0 | 6 | 0 | 0 | 1 |
| 14 | Rules & scope | 8 | 0 | 8 | 0 | 0 | 0 |
| 15 | Structure fidelity | 3 | 0 | 1 | 2 | 0 | 0 |
| 16 | Non-functional | 5 | 0 | 2 | 2 | 1 | 0 |
| | **Total** | **81** | **0** | **47** | **32** | **1** | **1** |

**Domain suite: 519 passed, 0 failed** (`cd api && dotnet test`, 2026-09-02, 176 ms).
**Production build: succeeds** with two unused-import warnings and one budget breach — §16.

---

# 0 · Setup

### T-SET-01 · An empty database is the default, and it is a state, not a blank
`SCR-000`

- **Route** — · **API** `EP-DEV-01`
- **Ref** `CLAUDE.md` §4 — nothing is seeded automatically
- **Rule** `EnsureCreated()`; no migrations. `POST /api/dev/reset` is how a schema change is applied.
- **Do** `curl -X POST :5080/api/dev/reset`, then open `/projects` and every module tab.
- **Expect** `200`. Lookup vocabulary survives (dropdowns populate); everything else is empty.
  Each screen shows the **empty-database** message with a create button — not the
  "filter excluded everything" message, which is a different state with a different button (`04 §9`).
- **Status** 🟡 — reset returned `200`; screens not walked.

### T-SET-02 · The fixture loads on demand and only on demand
`SCR-000`

- **Route** — · **API** `EP-DEV-02`
- **Ref** `docs/spec/06 §12`
- **Rule** `Features/Dev/Fixture.cs` — figures illustrative, not ministry data.
- **Do** `curl -X POST :5080/api/dev/load-fixture`, then `GET /api/portfolio`.
- **Expect** `200`. Portfolio: `projectCount 6` · `activeCount 4` · `delayedCount 1` ·
  `contractCount 6` · `entityCount 4` · `effectiveValue 3,040,249,875` · `asOf 2026-08-02`.
- **Status** 🟡 — observed via API on 2026-09-02.

### T-SET-03 · The ten personas, and what each may do
`SCR-000` · `03 §7`

- **Route** `/` (persona switcher) · **API** `EP-DEV-03`
- **Ref** `docs/spec/reference/app/desktop-shell.jsx:429` — `DAccountPop`
- **Rule** `Features/Dev/Personas.cs` — capability gating by the `X-Epm-User` header. No real auth.
- **Do** `GET /api/dev/personas`; switch through each in the account popover.
- **Expect** ten: `senior-mgmt` · `univ-specialist` · `re-dept` · `finance-dept` ·
  `project-manager` · `co-committee` · `co-rapporteur` · `rate-committee` · `endorsement` ·
  `inspection`. Each refusal names the party that *does* hold the permission — the button is
  never merely hidden.
- **Status** 🟡

### T-SET-04 · The rules page proves itself against the running code
`SCR-000` · `الشكل —`

- **Route** `/docs` · **API** `EP-DOCS-01`
- **Ref** — (Angular-only screen; the prototype's `domain.js` RULES array is the source)
- **Rule** `Domain/RuleCatalog.cs` → `RuleCatalogTests` ✅ 4 facts. Every `Run()` calls the
  same Domain function the endpoints call; inlining arithmetic there would defeat the point.
- **Do** Open `/docs`. For each rule read the spec text, the worked example, the expected
  answer, and the **live** result computed beside it.
- **Expect** 17 entries `BR-01`…`BR-15` plus `BQ-002` and `TIER-20`. Every live result equals
  its stated expectation. A mismatch here means the system and the specification have drifted
  — which is the entire reason this page renders the result at all.
- **Status** 🟡 — `RuleCatalogTests` green; page not opened.

---

# 1 · Public

### T-PUB-01 · The landing page, before any session
`SCR-P0`

- **Route** `/` (signed out) · **API** —
- **Ref** `docs/spec/reference/app/screens-public.jsx:162` — `Landing`
- **Rule** — (no domain arithmetic)
- **Do** Sign out. Load `/`. Toggle language and theme from the public nav.
- **Expect** The hero scene renders (`hero-scene.directive.ts`). `/` is two screens: the
  landing when there is no session, the signed-in home when there is. **No mobile branch**
  — `landing.page.ts:24`, and `mobile.css` is absent by decision.
- **Status** 🔨

### T-PUB-02 · Sign-in is a persona box, and says so
`SCR-P1`

- **Route** `/login` · **API** `EP-DEV-03`
- **Ref** `docs/spec/reference/app/screens-public.jsx:247` — `Login`
- **Rule** `Features/Dev/Personas.cs`
- **Do** Enter `user.re-dept` with any password. Then a name that is not a persona.
- **Expect** The first signs in. The second is refused with a message naming the persona
  format. The password is ignored, and the screen does not pretend otherwise.
- **Status** 🔨

---

# 2 · Shell

### T-SHL-01 · The workspace picker is the front door
`الشكل 1` · `SCR-E0`

- **Route** `/entities` · **API** `EP-ENT-01`
- **Ref** `docs/spec/reference/app/desktop-views.jsx:375` — `DSpaces`
- **Rule** `Domain/WorkspaceAccess` → `WorkspaceAccessTests` ✅ 10 facts + 3 inline
- **Do** Open `/entities` as `senior-mgmt`. Filter by kind. Open `جامعة بغداد`.
- **Expect** 4 entities across kinds `central-unit` · `state-university` ·
  `supply-directorate` · `technical-university`. `ub` shows `projectCount 3` ·
  `activeCount 2` · `contractCount 3` · `effectiveValue 421,250,000`.
- **Status** 🟡

### T-SHL-02 · The sidebar, scope, and what collapses
`SCR-E0`

- **Route** any · **API** —
- **Ref** `docs/spec/reference/app/desktop-shell.jsx:155` — `DSidebar`
- **Rule** —
- **Do** Collapse and expand the rail. Switch scope between enterprise and a workspace.
- **Expect** Below **1200px** the rail collapses to icons — this is why the demo is presented
  at 1440 or 1280. Scope changes the breadcrumb and the register filters together, never one
  without the other.
- **Status** 🔨

### T-SHL-03 · The command palette
`SCR-E0`

- **Route** any (`Ctrl`+`K`) · **API** —
- **Ref** `docs/spec/reference/app/desktop-shell.jsx:105` — `DCommandPalette`
- **Rule** —
- **Do** Open with the keyboard, type a project name, navigate with arrows, `Enter`.
- **Expect** Keyboard-only operation throughout. `aria-selected` tracks the highlighted row
  (`shared/command-palette.component.ts:76`). Escape closes and returns focus to the opener.
- **Status** 🔨

### T-SHL-04 · The project header and its vitals
`الشكل 4` · `SCR-W2`

- **Route** `/projects/PRJ-0279/overview` · **API** `EP-OVW-01`
- **Ref** `docs/spec/reference/app/desktop-shell.jsx:586` — `DProjectHeader`
- **Rule** `Domain/ProjectValue` → `ProjectValueTests` ✅ 4 facts
- **Do** Read the header. Copy the project number.
- **Expect** `PRJ-0279` · «مجمع الكليات الطبية» · status `ongoing` · stage `structure` ·
  workspace `جامعة بغداد` · `dataDate 2026-08-02`. Contract count 2, both derived.
- **Status** 🔨

### T-SHL-05 · Every number, date and ID is bidi-isolated
`SCR-E0` · `05 §5.2`

- **Route** any · **API** —
- **Ref** `docs/spec/05-DESIGN-SYSTEM.md §5.2`
- **Rule** — (rendering contract, not arithmetic)
- **Do** In Arabic, read a row carrying an ID, a date, a percentage and a currency string
  side by side. Then the same row in English.
- **Expect** `<bdi>` isolation on all four; no digit or hyphen jumps to the wrong side of its
  label. The prototype omits this — the Angular app adds it deliberately (§17).
- **Status** 🔨

---

# 3 · Enterprise

### T-ENT-01 · The portfolio, and the indices that govern it
`SCR-E1`

- **Route** `/portfolio` · **API** `EP-PRT-01`
- **Ref** `docs/spec/reference/app/desktop-views.jsx:45` — `DDashboard`
- **Rule** `Domain/EarnedValue` → `EarnedValueTests` ✅ 5 facts · `Domain/PortfolioBand` →
  `PortfolioBandTests` ✅ 17 facts
- **Do** Open `/portfolio` as `senior-mgmt`. Filter by workspace, then by status, then by kind.
- **Expect** `physical 7.04` · `planned 75.96` · `financial 4.33` · `spi 0.09` ·
  `cpi 1.63` · `acceptableIndex 0.95` · `earnedValue 214,125,741.19` ·
  `actualCost 131,730,000`. SPI is EV ÷ PV and CPI is EV ÷ AC — neither is stored.
- **Status** 🟡

### T-ENT-02 · The all-projects register
`الشكل 3` · `SCR-E2`

- **Route** `/projects` · **API** `EP-PRJ-01`
- **Ref** `docs/spec/reference/app/enterprise-areas.jsx:233` — `DProjectsAll`
- **Rule** `Domain/WorkspaceAccess` → `WorkspaceAccessTests` ✅
- **Do** Search, filter by status, filter by workspace. Then repeat scoped to one workspace.
- **Expect** 6 projects unscoped. **The Workspace column is hidden when the page is
  workspace-scoped** — this is the exact detail PAGE-01 got wrong when built from the written
  spec alone (`CLAUDE.md` §1). Empty-filter and empty-database are distinct states.
- **Status** 🟡

### T-ENT-03 · The all-contracts register
`SCR-E3`

- **Route** `/contracts` · **API** `EP-CNT-01`
- **Ref** `docs/spec/reference/app/enterprise-areas.jsx:299` — `DContractsAll`
- **Rule** `Domain/ContractRollup` → `ContractRollupTests` ✅ 8 facts
- **Do** Search; filter by status and workspace; open one contract from the register.
- **Expect** 6 contracts. Each row's value is its **effective** value — award plus applied
  amendments — never the original, and never including pending ones.
- **Status** 🟡

### T-ENT-04 · Schedule control across the portfolio
`SCR-E4`

- **Route** `/schedule-control` · **API** `EP-SCT-01`
- **Ref** `docs/spec/reference/app/enterprise-areas.jsx:8` — `DScheduleControl`
- **Rule** `Domain/ScheduleImpact` → `ScheduleImpactTests` ✅ 7 facts ·
  `Domain/PlannedProgress` → `PlannedProgressTests` ✅ 9 facts
- **Do** Filter by state. Open the delayed project.
- **Expect** One delayed project. Delay is measured against the **approved baseline**, at the
  data date, and is attributed to a driving contract — for `PRJ-0279`, `61` days driven by
  `CNT-0279-EM`.
- **Status** 🟡

### T-ENT-05 · The alerts centre
`الشكل 48` · `SCR-E5`

- **Route** `/alerts` · **API** `EP-ALR-01` `EP-ALR-02`
- **Ref** `docs/spec/reference/app/enterprise-areas.jsx:106` — `DAlertsCenter`
- **Rule** `Domain/AlertInbox` → `AlertInboxTests` ✅ 8 facts + 6 inline
- **Do** Filter by severity, then by workspace. Acknowledge one alert and re-filter.
- **Expect** An acknowledged alert leaves the needs-action count but stays in the register.
  Alerts whose rule is disabled are filtered out; alerts with a null `RuleCode` always survive
  — that branch is the one `AlertInboxTests` guards.
- **Status** 🟡

### T-ENT-06 · Reports across the university
`الشكل 49` · `SCR-E6`

- **Route** `/reports` · **API** `EP-RPT-01`
- **Ref** `docs/spec/reference/app/desktop-reports.jsx:58` — `DReports`
- **Rule** —
- **Do** Filter by category, by project, by workspace.
- **Expect** Categories come from the lookup vocabulary, not from a hard-coded list. A report
  with nothing to report on is shown as unavailable **with its reason**, never hidden.
- **Status** 🔨

### T-ENT-07 · The signed-in home
`SCR-E7`

- **Route** `/` (signed in) · **API** `EP-PRT-01`
- **Ref** `docs/spec/reference/app/desktop-views.jsx:45` — `DDashboard`
- **Rule** `Domain/ExecutiveSignal` → `ExecutiveSignalTests` ✅ 10 facts + 6 inline
- **Do** Sign in as `senior-mgmt`, then as `univ-specialist`. Compare.
- **Expect** The same screen, scoped differently — the specialist sees their workspaces only.
  Signals are derived from the portfolio, never set by anyone.
- **Status** 🔨

---

# 4 · المسار 1 — project creation

### T-PRJ-01 · Defining a project, field by required field
`الشكل 5` · `SCR-W1`

- **Route** `/projects/new` · **API** `EP-PRJ-02` `EP-LKP-01`
- **Ref** `docs/spec/reference/app/project-modules.jsx:280` — `DModInformation`
- **Rule** `Domain/ProjectDefinition` → `ProjectDefinitionTests` ✅ 16 facts + 19 inline
- **Do** As `univ-specialist`, press save with an empty form. Then fill name, code, type,
  registration year, stage, status, region, funding, priority, planned cost, formation,
  beneficiary, organisational structure and consultancy firm, and save.
- **Expect** The empty save is refused **field by field**, not with one generic message. The
  four that are most often forgotten — formation, beneficiary, org structure, consultant — are
  required. The id is the next number in one ministry-wide sequence, not per workspace.
  Suggested values are tagged «مقترح».
- **Status** 🟡 — `POST /api/projects` exercised on 2026-09-02; the form was not walked.

### T-PRJ-02 · Creating a project needs a workspace you actually hold
`الشكل 3` · `SCR-W1`

- **Route** `/projects/new` · **API** `EP-PRJ-02` `EP-WSP-02`
- **Ref** `docs/spec/reference/app/desktop-admin.jsx:201` — `DAdmAssignments`
- **Rule** `Domain/WorkspaceAccess` → `WorkspaceAccessTests` ✅
- **Do** As `senior-mgmt` create a workspace with a **fresh** code. Switch to
  `univ-specialist` and try to create a project in it.
- **Expect** Refused. Which workspaces `univ-specialist` holds is fixed in code, because the
  screen that would assign them is the Administration module — **out of scope** (`07 §8`).
  Use `ub` or `sp`. This is a documented limitation, not a defect (§17).
- **Status** 🔨

---

# 5 · Workspace

### T-WSP-01 · The workspace dashboard after picking an entity
`الشكل 2` · `SCR-W0`

- **Route** `/workspace` · **API** `EP-WSP-01`
- **Ref** `docs/spec/reference/app/desktop-workspace.jsx:354` — `DWorkspaceOverview`
- **Rule** `Domain/ContractRollup` ✅ · `Domain/PortfolioBand` ✅
- **Do** Open `ub`. Filter by status, then by branch.
- **Expect** `projectCount 3` · `activeCount 2` · `delayedCount 0` · `contractCount 3` ·
  `effectiveValue 421,250,000` · `pendingValue 3,000,000` · `openAlertCount 7`. Pending
  amendment value is shown **beside** the effective value, never folded into it.
- **Status** 🟡

### T-WSP-02 · Creating a workspace is a ministry permission
`الشكل 1` · `SCR-W0`

- **Route** `/entities` · **API** `EP-WSP-02`
- **Ref** `docs/spec/reference/app/desktop-admin.jsx:310` — `DAdmWorkspaces`
- **Rule** `Features/Dev/Personas.cs`
- **Do** Try «إضافة جهة» as `univ-specialist`, then as `senior-mgmt`.
- **Expect** The first is refused, naming المركز الوزاري. The second succeeds. `kind` must be
  one of the four seeded kinds; a free-text kind is rejected.
- **Status** 🔨

---

# 6 · Contract

### T-CON-01 · The contracts register draws cards, not a table
`الشكل 6` · `SCR-W3`

- **Route** `/projects/PRJ-0279/contracts` · **API** `EP-CON-01`
- **Ref** `docs/spec/reference/app/project-modules.jsx:363` — `DModContractNew`
- **Rule** `Domain/ContractRollup` → `ContractRollupTests` ✅ 8 facts
- **Do** Open the register. Compare zone for zone against the live prototype.
- **Expect** A **grid of contract cards** — `.d-contract-grid` and `.d-contract-card*` — not
  a `.d-table`. This was the first cluster rebuilt in the structure port; see
  `web/src/app/STRUCTURE-GAP.md`.
- **Status** 🟡

### T-CON-02 · The contract card overview
`الشكل 7` · `SCR-W3`

- **Route** `/projects/PRJ-0279/contract/CNT-0279` · **API** `EP-CON-02`
- **Ref** `docs/spec/reference/app/project-modules.jsx:363` — `DModContractNew`
- **Rule** `Domain/ContractRollup` ✅ · `Domain/BudgetBasis` → `BudgetBasisTests` ✅ 11 facts
- **Do** Read the cost split — award, reserve, supervision, monitoring — and the effective value.
- **Expect** Contract value is the **sum of its cost components**, not a stored field.
  `.d-csum` / `.d-csum-bars` / `.d-costsplit` render the split; the spend line is `--success`.
- **Status** 🟡

### T-CON-03 · Contract details, and what may be edited
`الشكل 8` · `SCR-W3`

- **Route** `…/contract/CNT-0279/edit` · **API** `EP-CON-04` `EP-CON-05`
- **Ref** `docs/spec/reference/app/project-modules.jsx:363` — `DModContractNew`
- **Rule** `Domain/ContractDefinition` → `ContractDefinitionTests` ✅ 17 facts + 5 inline
- **Do** Edit dates, parties, and the award letter. Try a finish before the start.
- **Expect** The invalid range is **prevented at the field**, not flagged after submit
  (`CLAUDE.md` §6). Original values persist alongside the edit; nothing is overwritten.
- **Status** 🔨

### T-CON-04 · Contract payments
`الشكل 9` · `SCR-W3`

- **Route** `…/contract/CNT-0279` → payments · **API** `EP-FIN-01`
- **Ref** `docs/spec/reference/app/project-modules.jsx:907` — `DModFinancialNew`
- **Rule** `Domain/PaymentCertificate` → `PaymentCertificateTests` ✅ 17 facts
- **Do** Read the certificate rows: gross, retention, advance recovery, net, and status.
- **Expect** `certified 53,227,000` and `disbursed 86,700,000` are **different columns** —
  certified is not paid. `retentionHeld 3,100,000` · `advanceOutstanding 27,800,000`.
- **Status** 🟡

### T-CON-05 · Amendments — and the three words that are not synonyms
`الشكل 10` · `SCR-W3`

- **Route** `…/contract/CNT-0279` → amendments · **API** `EP-BOQ-17` `EP-SCD-03`
- **Ref** `docs/spec/reference/app/contract-amendments.jsx:301` — `DContractAmendments`
- **Rule** `Domain/Amendments` → `AmendmentsTests` ✅ 6 facts + 6 inline ·
  `Domain/AmendmentDisclosure` → `AmendmentDisclosureTests` ✅ 13 facts
- **Do** Read applied amendments, then the pending one. Check the effective and projection values.
- **Expect** `originalValue 340,000,000` · `effectiveValue 351,250,000` (2 applied) ·
  `projectionValue 354,250,000` (1 pending). **The pending order is a projection and is never
  folded into the effective figure** — `CLAUDE.md` §5.2.
- **Status** 🔨

### T-CON-06 · The contract activity log
`الشكل 11` · `SCR-W3`

- **Route** `…/contract/CNT-0279` → activity · **API** `EP-AUD-01`
- **Ref** `docs/spec/reference/app/project-modules.jsx:188` — `DActivityLog`
- **Rule** —
- **Do** Read the log. Filter by source.
- **Expect** `.d-edit-timeline` / `.d-edit-*` structure. Entries attribute the **deciding
  party**, with the delegate recorded separately as recorder (`CLAUDE.md` §5.5).
- **Status** 🔨

---

# 7 · BOQ

### T-BOQ-01 · The register, the record panel, and weights that sum to exactly 100
`الشكل 12` · `SCR-W4`

- **Route** `/projects/PRJ-0279/boq/CNT-0279` · **API** `EP-BOQ-01` `EP-BOQ-02` `EP-BOQ-03`
  `EP-BOQ-04` `EP-BOQ-12` `EP-BOQ-14`…`16`
- **Ref** `docs/spec/reference/app/boq-register.jsx:435` — `DBoqRegister`;
  record panel at `boq-register.jsx:88` — `DBoqRecordPanel`
- **Rule** `Domain/BoqWeights` → `BoqWeightsTests` ✅ 6 facts · `Domain/Rounding` →
  `RoundingTests` ✅ 7 facts + 6 inline · `Domain/BoqKind` → `BoqKindTests` ✅ 4 + 6 inline
- **Do** Open the register. Sum the weight column by hand. Open a row's record panel. Save a
  saved view, then delete it.
- **Expect** `CNT-0279` weights `10.00 · 3.60 · 16.44 · 10.69 · 18.24 · 9.96 · 15.96 · 4.99 ·
  8.64 · 1.48` — **summing to exactly 100.00**, by largest remainder. `toFixed(2)` gives
  100.01 and is the bug this guards. The denominator is **this contract's** rows: total the
  project and then filter, and you get the classic wrong answer.
- **Status** 🟡

### T-BOQ-02 · Import — preview, submit, approve
`الشكل 13` · `SCR-W4`

- **Route** `…/boq/CNT-0279` → import · **API** `EP-BOQ-09` `EP-BOQ-10` `EP-BOQ-11` `EP-BOQ-13`
- **Ref** `docs/spec/reference/app/boq-workspace.jsx:16` — `DBoqWorkspace`
- **Rule** `Domain/BoqImport` → `BoqImportTests` ✅ 12 facts
- **Do** Preview a file, read the validation, submit a version, then try to approve it as the
  same persona who submitted it.
- **Expect** Preview never writes. The submitter may not approve — separation of duties, the
  same rule the schedule enforces (T-SCD-03).
- **Status** 🔨

### T-BOQ-03 · Linking items to activities, and distributing the share
`الشكل 12` · `SCR-W4`

- **Route** `…/boq/CNT-0279` → الربط بالأنشطة · **API** `EP-BOQ-05` `EP-BOQ-06` `EP-BOQ-07` `EP-BOQ-08`
- **Ref** `docs/spec/reference/app/boq-assign.jsx:11` — `DBoqAssign`
- **Rule** `Domain/Allocation` → `AllocationTests` ✅ 10 facts · `Domain/Distribution` →
  `DistributionTests` ✅ 7 facts
- **Do** Link an item to an activity. Change the basis between cost and man-hours. Use
  auto-distribute. Then override one share by hand.
- **Expect** Basis lives **inside** the «توزيع» menu beside auto-distribute, because the basis
  is a parameter of the distribution and not a separate setting. Shares are capped so an item
  cannot be over-allocated.
- **Status** 🟡

---

# 8 · Supply — the second project type

### T-SUP-01 · The supply items register
`الشكل 50` · `SCR-S1`

- **Route** `/projects/PRJ-0439/supply/CNT-0439` · **API** `EP-SUP-01`
- **Ref** `docs/spec/reference/app/supply-items.jsx:24` — `DModSupplyItems`
- **Rule** `Domain/SupplyStatus` → `SupplyStatusTests` ✅ 6 facts + 4 inline
- **Do** Open the register. Filter by status.
- **Expect** `PRJ-0439` «تجهيز الأجهزة المختبرية العلمية» · `CNT-0439` «عقد التجهيز» ·
  `asOf 2026-08-02`. Status is a **derived** position in the supply lifecycle, never a field
  anyone sets.
- **Status** 🟡

### T-SUP-02 · The item detail panel, both tabs
`الأشكال 51 · 52` · `SCR-S1`

- **Route** `…/supply/CNT-0439` → item · **API** `EP-SUP-02`
- **Ref** `docs/spec/reference/app/supply-items.jsx:24` — `DModSupplyItems`
- **Rule** `Domain/SupplyRedistribution` → `SupplyRedistributionTests` ✅ 11 facts
- **Do** Open an item. Switch between its two tabs. Redistribute a quantity between beneficiaries.
- **Expect** Redistribution conserves the total — the panel refuses a split that does not sum
  back to the item's quantity.
- **Status** 🔨

### T-SUP-03 · Recording receipts — store, then preliminary
`الأشكال 53 · 54 · 55` · `SCR-S2`

- **Route** `…/supply/CNT-0439` → الاستلامات · **API** `EP-SUP-04`
- **Ref** `docs/spec/reference/app/supply-items.jsx:627` — `DModReceipts`
- **Rule** `Domain/SupplyReceipts` → `SupplyReceiptsTests` ✅ 12 facts
- **Do** Record a store receipt (`الشكل 53`), then a preliminary receipt (`الشكل 54`), then
  read the receipts tab (`الشكل 55`).
- **Expect** The two receipt kinds are distinct records with distinct effects; a preliminary
  receipt cannot precede its store receipt. Quantities never exceed the item's balance.
- **Status** 🔨

### T-SUP-04 · Item inquiry
`الشكل 56` · `SCR-S3`

- **Route** `…/supply/CNT-0439` → استعلام · **API** `EP-SUP-03`
- **Ref** `docs/spec/reference/app/supply-items.jsx:694` — `DModItemInquiry`
- **Rule** `Domain/SupplyStatus` ✅
- **Do** Search for `ITM-006`. Read its card.
- **Expect** The card assembles contract, beneficiary, receipts and status in one place — all
  joined in the endpoint by plain ID columns, which is what `CLAUDE.md` §3.3 means by "that
  query *is* the relationship".
- **Status** 🟡

---

# 9 · Schedule

### T-SCD-01 · The Gantt
`الشكل 21` · `SCR-W5`

- **Route** `/projects/PRJ-0279/schedule/CNT-0279` · **API** `EP-SCD-01` `EP-SCD-02`
- **Ref** `docs/spec/reference/app/schedule-module.jsx:80` — `DGantt`
- **Rule** `Domain/ScheduleWeights` → `ScheduleWeightsTests` ✅ 7 facts
- **Do** Open the Gantt. Filter to the critical path. Change the WBS level. Drag the name
  column's grip.
- **Expect** WBS parents roll up from their children; no parent percentage is stored. The
  resizable name column (`.d-gantt-namegrip`) is an **Angular-only improvement** that `04 §5`
  asks for and the prototype lacks — recorded as *keep* in `STRUCTURE-GAP.md`, not drift.
- **Status** 🟡

### T-SCD-02 · The tabular view, and comparison
`الأشكال 22 · 23` · `SCR-W5`

- **Route** `…/schedule/CNT-0279` → table / compare · **API** `EP-SCD-02` `EP-SCD-03`
- **Ref** `docs/spec/reference/app/schedule-module.jsx:257` — `DSchedTable`
- **Rule** `Domain/ComparisonPeriod` → `ComparisonPeriodTests` ✅ 15 facts ·
  `Domain/ScheduleImpact` → `ScheduleImpactTests` ✅ 7 facts
- **Do** Switch to the table. Open comparison and read the impact against the baseline.
- **Expect** The same activities, the same numbers, a different presentation — not a second
  computation. Impact is measured against the **approved** baseline only.
- **Status** 🟡

### T-SCD-03 · Importing a P6 schedule, and who may approve it
`الشكل 24` · `SCR-W5`

- **Route** `…/schedule/CNT-0279` → استيراد · **API** `EP-SCD-04` `EP-SCD-05` `EP-SCD-06` `EP-SCD-07`
- **Ref** `docs/spec/reference/app/schedule-module.jsx:324` — `DImportWizard`
- **Rule** `Domain/ScheduleImport` → `ScheduleImportTests` ✅ 16 facts
- **Do** As `univ-specialist`, import `docs/demo/demo-schedule.xer`, submit the version, then
  try to approve it. Switch to `re-dept` and approve.
- **Expect** Parsing happens in the browser. The wizard reports the impact on the contract's
  finish date **before** submission. The submitter may not approve: the baseline is what slip
  and penalty are measured against, so the resident engineer owns it.
- **Status** 🔨

### T-SCD-04 · Activities belong to one contract, never to a project
`الشكل 21` · `SCR-W5`

- **Route** `/projects/PRJ-0279/schedule` · **API** `EP-SCD-01`
- **Ref** `docs/spec/reference/app/schedule-module.jsx:437` — `DModSchedule`
- **Rule** `CLAUDE.md` §5.1 — contract is the working context
- **Do** Open the schedule without a contract in the route.
- **Expect** The screen asks which contract **first**. That refusal is the rule stating
  itself, not a missing feature.
- **Status** 🔨

---

# 10 · Progress

### T-PRG-01 · The progress summary
`الشكل 25` · `SCR-W6`

- **Route** `/projects/PRJ-0279/progress` · **API** `EP-PRG-01`
- **Ref** `docs/spec/reference/app/project-modules.jsx:1391` — `DModProgress`
- **Rule** `Domain/EarnedValue` → `EarnedValueTests` ✅ 5 facts · `Domain/ProgressSeries` →
  `ProgressSeriesTests` ✅ 16 facts
- **Do** Read the headline and the EVM block.
- **Expect** `physical 50.5873` · `financial 24.7714` · `planned 75.9556` · `delayDays 61` ·
  `baselineFinish 2026-09-28` · `forecastFinish 2026-11-28`. EVM: `budget 350,000,000` ·
  `pv 265,844,701.31` · `ev 177,055,574.67` · `ac 86,700,000` · `cpi 2.04` · `spi 0.67`.
  **`ac` counts paid certificates only** — that is why CPI is 2.04 and not 1.
- **Status** 🟡

### T-PRG-02 · Progress by WBS
`الشكل 26` · `SCR-W6`

- **Route** `…/progress` → WBS · **API** `EP-PRG-01`
- **Ref** `docs/spec/reference/app/project-modules.jsx:1391` — `DModProgress`
- **Rule** `Domain/ProgressReflection` → `ProgressReflectionTests` ✅ 7 facts
- **Do** Expand a WBS parent. Compare its figure against its children.
- **Expect** The parent is the weighted roll-up of its children and is never entered.
- **Status** 🟡

### T-PRG-03 · Recording progress, and what it moves
`الشكل 27` · `SCR-W6`

- **Route** `…/progress` · **API** `EP-PRG-02`
- **Ref** `docs/spec/reference/app/project-modules.jsx:1391` — `DModProgress`
- **Rule** `Domain/ProgressReflection` ✅ · `Domain/BoqWeights` ✅
- **Do** As `re-dept`, set an activity to a new percentage. Then open the BOQ register
  without typing anything else.
- **Expect** The linked BOQ item's progress follows from the link; the contract's percentage
  follows from the value achieved. **Nobody types a contract percentage.**
- **Status** 🟡

### T-PRG-04 · Schedule risk
`الشكل 28` · `SCR-W6`

- **Route** `…/progress` → risk · **API** `EP-PRG-01`
- **Ref** `docs/spec/reference/app/project-modules.jsx:1391` — `DModProgress`
- **Rule** `Domain/RiskSeverity` → `RiskSeverityTests` ✅ 6 facts ·
  `Domain/TileThreshold` → `TileThresholdTests` ✅ 23 facts
- **Do** Read the risk tiles. Check the colour of each magnitude.
- **Expect** Criticality is a **ring**, not a colour — the colour channel belongs to status
  (`CLAUDE.md` §6). No magnitude is coloured by threshold; the neutral branch is `--on-surface`.
- **Status** 🔨

---

# 11 · Financials — المسار 8

### T-FIN-01 · The cost table
`الشكل 14` · `SCR-W7`

- **Route** `/projects/PRJ-0279/financial` · **API** `EP-FIN-01`
- **Ref** `docs/spec/reference/app/project-modules.jsx:907` — `DModFinancialNew`
- **Rule** `Domain/BudgetBasis` → `BudgetBasisTests` ✅ 11 facts
- **Do** Read the totals block.
- **Expect** `approved 340,000,000` · `approvedChanges 11,250,000` ·
  `pendingChanges 3,000,000` · `revised 351,250,000` · `disbursed 86,700,000` ·
  `certified 53,227,000` · `balance 263,300,000` · `spendPct 24.7714`.
  Note `budgetRevised 350,000,000` against `contractCommitments 351,250,000` —
  `budgetGap −1,250,000`. **Commitments exceeding the recorded budget is shown, not hidden.**
- **Status** 🟡

### T-FIN-02 · The annual allocation
`الشكل 15` · `SCR-W7`

- **Route** `…/financial` → التخصيص السنوي · **API** `EP-FIN-01`
- **Ref** `docs/spec/reference/app/project-modules.jsx:907` — `DModFinancialNew`
- **Rule** `Domain/PaymentCertificate.Ceilings` → `PaymentCertificateTests` ✅ 17 facts
- **Do** Read the allocation for the data date's year against the spend to date.
- **Expect** `spentYear 86,700,000`. The allocation is per **year** — `Ceilings()` reads
  `ProjectAllocations` for `asOf.Year`, so a certificate dated into another year is measured
  against that year's figure.
- **Status** 🟡

### T-FIN-03 · The payments register
`الشكل 16` · `SCR-W7`

- **Route** `…/financial` → الدفعات · **API** `EP-FIN-01`
- **Ref** `docs/spec/reference/app/project-modules.jsx:907` — `DModFinancialNew`
- **Rule** `Domain/PaymentCertificate` ✅ 17 facts
- **Do** Read each certificate: gross, retention, advance recovery, net, status, certified
  date, paid date.
- **Expect** Certified date and paid date are **separate columns**, and a row can carry the
  first without the second. `retentionHeld 3,100,000` across the register.
- **Status** 🔨

### T-FIN-04 · Audit lead times — three desks, two parties
`الشكل 17` · `SCR-W7`

- **Route** `…/financial` → مهل التدقيق · **API** `EP-FIN-01` `EP-FIN-03`
- **Ref** `docs/spec/reference/app/project-modules.jsx:907` — `DModFinancialNew`
- **Rule** `Domain/AuditRoute` → `AuditRouteTests` ✅ 16 facts · `Domain/SlaLeadTime` →
  `SlaLeadTimeTests` ✅ 7 facts
- **Do** As `re-dept` release «تدقيق المهندس المقيم». Then try to release
  «تدقيق الدائرة المالية» as the same persona. Switch to `finance-dept` and release the
  remaining two.
- **Expect** The second attempt is **refused**: the party that raised the claim may not clear
  the finance desk. «مدير المشروع» is refused at every desk on the route — it may raise a
  certificate and nothing more. Each stage's cap is measured against the data date.
  Requires `.d-slastages` structure.
- **Status** 🔨

### T-FIN-05 · The recorded budget — one party, one entry point
`الشكل 18` · `SCR-W7`

- **Route** `…/financial` → البيانات المسجّلة · **API** `EP-FIN-04`
- **Ref** `docs/spec/reference/app/project-modules.jsx:907` — `DModFinancialNew`
- **Rule** `Domain/BudgetBasis` ✅ · `Domain/PaymentCertificate.Ceilings` ✅
- **Do** Open the tab as `re-dept` and read the refusal. Switch to `finance-dept`, press
  «تعديل», and record الكلفة المقررة, المعدلة, التخصيص السنوي (with its year), and حالة المناقلة.
- **Expect** Badged «قيم معتمدة من الدائرة المالية». The button is not hidden for `re-dept`
  — the screen states whose permission it is. **Recording these figures is what switches the
  ceilings on**: `Ceilings()` skips any figure that is null, so before this the rules exist
  with nothing to measure against. `budgetSource` becomes `recorded`.
- **Status** 🟡

### T-FIN-06 · The financial change log
`الشكل 19` · `SCR-W7`

- **Route** `…/financial` → سجل التغييرات · **API** `EP-FIN-01` `EP-AUD-01`
- **Ref** `docs/spec/reference/app/project-modules.jsx:41` — `DEditTimeline`
- **Rule** —
- **Do** Change a recorded figure, then read the log.
- **Expect** The previous value persists beside the new one. `.d-edit-timeline` structure.
- **Status** 🔨

### T-FIN-07 · Registering a certificate — five steps, two required documents
`الشكل 20` · `SCR-W7`

- **Route** `…/financial` → تسجيل دفعة · **API** `EP-FIN-02`
- **Ref** `docs/spec/reference/app/project-modules.jsx:825` — `DPaymentWizard`
- **Rule** `Domain/PaymentCertificate` ✅ 17 facts
- **Do** As `re-dept`, walk العقود المشمولة → المبالغ والبنود → كتاب المالية → ذرعات الأعمال →
  المراجعة. First submit an amount that breaches the annual allocation. Then a valid one.
  Then check the project card.
- **Expect** The ceiling breach is refused with «الصرف السنوي يتجاوز التخصيص السنوي», naming
  the limit and the attempted total. The finance letter and **at least one ذرعة are required
  by the server**, not merely asked for by the form. Net = gross − retention − advance
  recovery, computed server-side. The row lands `pending`; **nothing here moves المصروف**, and
  the project card's CPI does not change until all three desks clear (T-FIN-04).
  Full walk-through: [`docs/demo/runsheet.html`](docs/demo/runsheet.html) steps 08–10.
- **Status** 🔨

---

# 12 · Change orders — المسار 5

### T-CHG-01 · The register, and its facets
`الشكل 29` · `SCR-W8`

- **Route** `/projects/PRJ-0279/changeorders` · **API** `EP-CHG-01`
- **Ref** `docs/spec/reference/app/vo-record.jsx:454` — `DModVO`
- **Rule** `Domain/ChangeOrderRecord` → `ChangeOrderRecordTests` ✅ 13 facts ·
  `Domain/ViewerRelation` → `ViewerRelationTests` ✅ 9 facts
- **Do** Open as `senior-mgmt`, then as `co-committee`, then as `re-dept`. Use the facet
  filters and the search box.
- **Expect** As `senior-mgmt`: `awaitingMe 0` · `netApproved 14,250,000` · `pending 2` ·
  `needsAction 2` · `overdue 2` · `avgCycleDays 27`. Groups: `draft 0` · `pending 2` ·
  `returned 1` · `applying 2`. **`awaitingMe` changes with the persona; the register does
  not** — the same rows, a different answer to "is this mine". Requires `.d-vo-reg` and the
  `.d-vow-*` facet shell.
- **Status** 🟡

### T-CHG-02 · The order card
`الشكل 30` · `SCR-W8`

- **Route** `…/changeorders/VO-02` · **API** `EP-CHG-02`
- **Ref** `docs/spec/reference/app/vo-record.jsx:389` — `DVORecordPanel`
- **Rule** `Domain/ChangeOrderRecord` ✅
- **Do** Open `VO-02`. Read the summary.
- **Expect** The order names exactly one contract. **One change order may never span two
  contracts** (`CLAUDE.md` §5.1).
- **Status** 🟡

### T-CHG-03 · Quantities and cost — the 20% rule, per line, against the original
`الشكل 31` · `SCR-W8`

- **Route** `…/changeorders/VO-02` → الكميات · **API** `EP-CHG-02`
- **Ref** `docs/spec/reference/app/vo-record.jsx:389` — `DVORecordPanel`
- **Rule** `Domain/TierSplit` → `TierSplitTests` ✅ 15 facts · `Domain/ChangeOrderGates` →
  `ChangeOrderGatesTests` ✅ 10 facts
- **Do** Read each affected line's original quantity, requested quantity, and the tier split.
- **Expect** The threshold is measured **per BOQ line against the ORIGINAL quantity** (D-01),
  never against the current one and never against the contract total. Only the **excess** may
  be re-priced. The wizard never sets the binding rate.
- **Status** 🟡

### T-CHG-04 · Time impact
`الشكل 32` · `SCR-W8`

- **Route** `…/changeorders/VO-02` → الأثر الزمني · **API** `EP-CHG-02` `EP-SCD-03`
- **Ref** `docs/spec/reference/app/vo-record.jsx:389` — `DVORecordPanel`
- **Rule** `Domain/ScheduleImpact` ✅ · `Domain/Penalty` → `PenaltyTests` ✅ 12 facts
- **Do** Read the extension claimed and its effect on the penalty baseline.
- **Expect** The penalty baseline moves only when the order is **applied**, not when it is
  approved.
- **Status** 🔨

### T-CHG-05 · The approval path — six stages, and the parties beside them
`الشكل 33` · `SCR-W8`

- **Route** `…/changeorders/VO-02` → مسار الاعتماد · **API** `EP-WFL-01` `EP-WFL-02`
- **Ref** `docs/spec/reference/app/project-modules.jsx:74` — `DReviewFlow`
- **Rule** `Domain/WorkflowMachine` → `WorkflowMachineTests` ✅ 17 facts ·
  `Domain/Proposals` → `ProposalsTests` ✅ 6 facts
- **Do** Walk the stages as each owning persona. At a stage with an external party, record
  that party's position as a delegate, against a letter number and date.
- **Expect** `.d-review-flow` with `.d-rf-dot/l/ret/step`. **External parties are statuses,
  not stages** (`CLAUDE.md` §5.5): recorded inside the owning stage, attributed to the
  deciding party, with the delegate as recorder. Two proposals — contractor and RE department
  — with the RE department's figure governing display; the approved value comes only from
  لجنة تثبيت الأسعار at financial review.
- **Status** 🔨

### T-CHG-06 · Attachments
`الشكل 34` · `SCR-W8`

- **Route** `…/changeorders/VO-02` → المرفقات · **API** `EP-CHG-02`
- **Ref** `docs/spec/reference/app/project-modules.jsx:143` — `DFiles`
- **Rule** —
- **Do** Read the attachment list and its official letter references.
- **Expect** Every external decision carries a letter number and date — that is what makes it
  a record rather than an opinion.
- **Status** 🔨

### T-CHG-07 · Approving changes nothing; applying changes everything
`الأشكال 35 · 36` · `SCR-W8`

- **Route** `…/changeorders/VO-02` · **API** `EP-WFL-01` `EP-WFL-03`
- **Ref** `docs/spec/reference/app/contract-amendments.jsx:301` — `DContractAmendments`
- **Rule** `Domain/ChangeOrderApply` → `ChangeOrderApplyTests` ✅ 12 facts ·
  `Domain/AmendmentDisclosure` → `AmendmentDisclosureTests` ✅ 13 facts
- **Do** Record the contract's effective value and the affected BOQ line's quantity and the
  activity's dates. **Approve** the order. Re-read all three. Then **apply** it. Re-read again.
- **Expect** After approving: **nothing has moved.** The order appears as a projection beside
  the effective value. After applying: a contract amendment exists, quantities, dates and the
  penalty baseline have moved, and the **original values still persist** in their own columns
  (`CLAUDE.md` §3.6). `الشكل 35` shows the effect inside a BOQ line, `الشكل 36` inside a
  schedule activity — `.d-amd-mark` / `.d-amd-delta` / `.d-amd-panel`.
- **Status** 🟡

### T-CHG-08 · The creation wizard, all five steps
`الأشكال 37 · 38 · 39 · 40 · 41 · 42 · 57 · 58 · 59 · 60` · `SCR-W8`

- **Route** `…/changeorders` → إنشاء أمر تغييري · **API** `EP-WIZ-01` `EP-WIZ-02` `EP-WIZ-03`
- **Ref** `docs/spec/reference/app/vo-wizard.jsx:6` — `DVOCreateWizard`; parts at
  `vo-wizard-parts.jsx:20` — `DVOMultiPick`, `:78` — `DVODetailPanel`, `:127` — `DVONewItemPanel`
- **Rule** `Domain/ChangeOrderGates` ✅ 10 facts · `ChangeOrderWizardTests` ✅ 8 facts ·
  `Domain/TierSplit` ✅ 15 facts
- **Do** النوع والكتاب الرسمي (`37` · `57`) → البنود والأنشطة المتأثرة (`38` · `58`) →
  تفصيل البند والمقترحان (`39`) → ملخص الأثر (`40` · `59`) → المرفقات (`41`) →
  المراجعة والإرسال (`42` · `60`). Try to select items from two different contracts.
- **Expect** The two-contract selection is refused. The preview (`EP-WIZ-02`) never writes.
  The wizard shows the tier split but **never sets a binding rate**. Plates 57–60 are the
  same wizard for the supply project type.
- **Status** 🔨

---

# 13 · Remaining tabs

### T-MOD-01 · Project overview and the module strip
`الشكل 4` · `SCR-W2`

- **Route** `/projects/PRJ-0279/overview` · **API** `EP-OVW-01` `EP-OVW-02`
- **Ref** `docs/spec/reference/app/project-modules.jsx:2512` — `DModOverview`
- **Rule** `Domain/ModuleReadiness` → `ModuleReadinessTests` ✅ 11 facts ·
  `Domain/TileThreshold` → `TileThresholdTests` ✅ 23 facts
- **Do** Read every tile, then the module strip «خط سير المراحل» and the rail dots.
- **Expect** `physical 50.5873` · `planned 75.9556` · `financial 24.7714` · `spi 0.67` ·
  `cpi 2.04` · `delayDays 61` · `appliedAmendments 2` · `pendingAmendments 1`.
  The strip counts units that **hold data** — there is no per-module approval state, and
  calling a unit «معتمد» because it holds rows would be a fabricated verdict (§17).
- **Status** 🟡

### T-MOD-02 · Project information
`الشكل 5` · `SCR-W2`

- **Route** `/projects/PRJ-0279/information` · **API** `EP-INF-01` `EP-PRJ-03` `EP-PRJ-04`
  `EP-PRJ-05` `EP-PRJ-06`
- **Ref** `docs/spec/reference/app/project-modules.jsx:280` — `DModInformation`
- **Rule** `Domain/ProjectDefinition` → `ProjectDefinitionTests` ✅ 16 facts + 19 inline
- **Do** Read the field grid. Enter edit mode, change a field, save, then reset. Check that
  no input is nested inside another.
- **Expect** Save round-trips and the read view reflects it. Beneficiaries are their own
  endpoint pair. `.d-pz7 > epm-field-group > .d-fgroup` keeps the group from stretching —
  the fix for the nested-input rendering (P-2xx).
- **Status** 🟡

### T-MOD-03 · Risks
`الشكل 43` · `SCR-W9`

- **Route** `/projects/PRJ-0279/risk` · **API** `EP-RSK-01`
- **Ref** `docs/spec/reference/app/project-modules.jsx:2888` — `DModRisk`
- **Rule** `Domain/RiskSeverity` → `RiskSeverityTests` ✅ 6 facts
- **Do** Read the bands, then filter by each.
- **Expect** `high 1` · `medium 2` · `low 4` — 7 risks. `RSK-01` «تأخر تجهيز المواد
  الكهربائية». Severity is derived from likelihood × impact, never picked from a list.
- **Status** 🟡

### T-MOD-04 · The 3D model
`الشكل 44` · `SCR-W10`

- **Route** `/projects/PRJ-0279/model` · **API** `EP-MDL-01`
- **Ref** `docs/spec/reference/app/model-module.jsx:13` — `DModModel3D`
- **Rule** —
- **Do** Open the tab.
- **Expect** **Deliberately stubbed** (`07 §8`). The `d-model-*` / `d-viewer*` /
  `d-drawing-*` / `d-three` clusters — ~22 classes — are documented, intended omissions in
  `STRUCTURE-GAP.md`, not drift. The screen says what it would show, and does not pretend.
- **Status** ⚠️ — see §17.

### T-MOD-05 · Meetings and the action log
`الشكل 45` · `SCR-W11`

- **Route** `/projects/PRJ-0279/meetings` · **API** `EP-MTG-01`
- **Ref** `docs/spec/reference/app/project-modules.jsx:2075` — `DModMeetings`
- **Rule** — (R6 drives the overdue-action alert)
- **Do** Read the minutes and each decision's action.
- **Expect** `meetingCount 3` · `actionCount 3`. First meeting «الكشف على نسب الإنجاز»
  held `2026-04-11`. An action open more than 21 days raises **R6** in the alerts tab.
  `.d-tl-mini*` / `.d-feed*` structure.
- **Status** 🟡

### T-MOD-06 · Documents and drawings, with revisions
`الشكل 46` · `SCR-W12`

- **Route** `/projects/PRJ-0279/documents` · **API** `EP-DOC-01`
- **Ref** `docs/spec/reference/app/project-modules.jsx:2110` — `DModDrawings`
- **Rule** `Domain/DocumentRevisions` → `DocumentRevisionsTests` ✅ 6 facts
- **Do** Read the folder counts and the status split. Open `ST-DR-002` and read both revisions.
- **Expect** `documentCount 14` · `revisionCount 21` · `underReview 6`. Folders: معماري 3 ·
  إنشائي 2 · كهربائي 3 · ميكانيكي 2 · مدني 2 · تقارير 2. `ST-DR-002` shows **R2 «الحالية»
  above R1 «ملغاة», both keeping their file** — a superseded revision is never deleted.
- **Status** 🟡

### T-MOD-07 · Project alerts, and the rule that proves itself
`الشكل 47` · `SCR-W13`

- **Route** `/projects/PRJ-0279/alerts` · **API** `EP-PAL-01` `EP-PAL-02`
- **Ref** `docs/spec/reference/app/alerts-module.jsx:31` — `DModAlerts`
- **Rule** `Domain/AlertInbox` → `AlertInboxTests` ✅ 8 facts + 6 inline
- **Do** Read the twelve rules and the raised alerts. Disable **R3**, and watch the register.
  Re-enable it.
- **Expect** `alertCount 8` · `needsAction 3` · `ruleCount 12` · `enabledRuleCount 12` ·
  severities `critical 1` · `warning 5` · `info 2`. Raised alerts carry `R3` (2026-07-09),
  `R5` (2026-07-02), `R8` on `VO-02` (2026-07-21), `R6` on `ACT-01` (2026-07-14).
  Disabling R3 removes its alert from the register and leaves rule-less alerts untouched —
  which is the rule demonstrating itself on the screen that configures it.
- **Status** 🟡

---

# 14 · Rules and scope

These are the ones most likely to be "simplified" by mistake. Each is guarded by a domain
test that reads its worked example inline from `02-BUSINESS-RULES.md` — **never from the
database**, so a wrong fixture cannot make a test lie (`CLAUDE.md` §4).

### T-RUL-01 · BOQ weights sum to exactly 100.00%
- **Rule** `Domain/BoqWeights` → `BoqWeightsTests` ✅ 6 facts · `BR-01`
- **Do** `/docs` → `BOQ-WEIGHT`. Then sum the weight column on `CNT-0279` by hand.
- **Expect** Amounts `56,131,000 / 43,869,000` → `56.13% / 43.87%`, **sum exactly 100.00**.
  Largest-remainder rounding; `toFixed(2)` yields 100.01 and is the defect. The denominator
  is the contract's rows, never the project's.
- **Status** 🟡

### T-RUL-02 · The 20% rule is per line, against the ORIGINAL quantity
- **Rule** `Domain/TierSplit` → `TierSplitTests` ✅ 15 facts · `TIER-20` · D-01
- **Do** `/docs` → `TIER-20`. Then T-CHG-03 on a line already amended once.
- **Expect** Measured against the **original**, not the current quantity — a line amended
  twice does not get a fresh 20%. Only the excess is re-priced, and only لجنة تثبيت الأسعار
  sets the binding rate.
- **Status** 🟡

### T-RUL-03 · معتمد ≠ مطبَّق ≠ مغلق
- **Rule** `Domain/ChangeOrderApply` ✅ 12 facts · `Domain/WorkflowMachine` ✅ 17 facts
- **Do** T-CHG-07 in full.
- **Expect** Approving changes nothing. Applying creates an amendment and moves quantities,
  dates and the penalty baseline. Closing verifies. Approved-but-unapplied orders are a
  **projection** — `projectionValue 354,250,000` beside `effectiveValue 351,250,000`.
- **Status** 🟡

### T-RUL-04 · Originals are never overwritten
- **Rule** `Domain/Amendments` ✅ · `Domain/AmendmentDisclosure` ✅ 13 facts · `CLAUDE.md` §3.6
- **Do** Apply an order, then read the BOQ line and the activity.
- **Expect** `original` / `before` / `requested` / `approved` / `applied` all persist as
  separate columns. `.d-amd-delta` prints from-and-to, which is only possible because both survive.
- **Status** 🟡

### T-RUL-05 · Penalties and the extension window
- **Rule** `Domain/Penalty` → `PenaltyTests` ✅ 12 facts · `Domain/SlaLeadTime` ✅ 7 facts
- **Do** `/docs` → the penalty rule. Then T-CHG-04.
- **Expect** Penalty runs from the **applied** baseline. R10 opens the extension-claim window
  at 28 days from the notice; R11 marks the committee's decision date.
- **Status** 🟡

### T-RUL-06 · The three inviolable permission controls
- **Rule** `Features/Dev/Personas.cs` · `Domain/ViewerRelation` → `ViewerRelationTests` ✅ 9 facts
- **Do** The negatives: submitter approves their own schedule baseline (T-SCD-03); `re-dept`
  clears the finance desk on a certificate it raised (T-FIN-04); `re-dept` edits the recorded
  budget (T-FIN-05).
- **Expect** All three refused **server-side**, each naming the party that does hold the
  permission. A refusal that only hides a button is a defect.
- **Status** 🟡

### T-RUL-07 · The twelve alert rules
- **Rule** `Domain/AlertInbox` ✅ · `Features/Dev/Fixture.cs:2390`
- **Do** `/projects/PRJ-0279/alerts`. Read each rule's trigger, severity, channels,
  recurrence and escalation.
- **Expect** R1 critical, slip ≥ 5 days, daily, escalate 48h · R2 warning, spend ≥ 90% ·
  R3 warning, milestone within 45 days · R4 warning, no update 40 days · R5 info, document
  not approved · R6 warning, action open > 21 days · R7 critical, high risk open ·
  R8 warning, order under approval · R9 critical, cumulative spend ≥ 90% · R10 warning,
  claim within 28 days · R11 warning, committee decision date · R12 critical, audit SLA breached.
- **Status** 🟡

### T-RUL-08 · Workspace scope, and الاشتقاق لا الإدخال
- **Rule** `Domain/WorkspaceAccess` ✅ 10 facts + 3 inline · `BR-15` · `CLAUDE.md` §3.5
- **Do** As `univ-specialist` open every enterprise register. Then hunt for any editable
  field holding a derived value — project value, BOQ weight, effective contract value, a
  parent WBS percentage, a contract progress figure.
- **Expect** Registers scope to the workspaces held; the Workspace column disappears when
  scoped. **No derived value is stored or editable anywhere** — that is the single rule this
  whole system is built to demonstrate.
- **Status** 🟡

---

# 15 · Structure fidelity

The instrument is `tools/structure-gap.mjs` and the backlog is
`web/src/app/STRUCTURE-GAP.md`. The measurement: the prototype's `className=` tokens
(reachable from `main.jsx → DesktopApp` only), the Angular app's `d-*` tokens across `.ts`
and `.html`, and the `.d-*` selectors defined in `web/src/styles/*.css`.

### T-STR-01 · The gap count is re-measurable and has not regressed
- **Do** `node tools/structure-gap.mjs`. Compare `GAP` / `DEAD` / `OWN` against the numbers
  `STRUCTURE-GAP.md` records.
- **Expect** All 151 classes partitioned **exactly once**. The residual `GAP` matches what
  the doc documents as intended: the 3D/drawings cluster (`07 §8`) and the readiness dots
  (P-09). Anything else in `GAP` is a regression.
- **Status** 🟡 — the instrument and its four corrections are recorded; not re-run here.

### T-STR-02 · No shared component was lost to the port
- **Do** Resolve all 30 `epm-*` selectors. `grep -rc '<epm-select' web/src/app`.
- **Expect** All 30 present. `epm-select` in particular stays — it is the app's one dropdown,
  replacing the OS list the prototype's native `<select>` opens, with its `bare` variant and
  the `.d-ctxsel` focus-ring contract documented in `styles.css` (P-197, P-204). The port is
  **additive**: a rebuilt screen means the existing component emits the prototype's classes,
  never that the component is deleted for inline markup.
- **Status** 🔨

### T-STR-03 · Screen-by-screen against the live prototype
- **Do** Open `https://infinite-azaiton.github.io/epm/` beside the app. Compare zone for zone:
  الأشكال 6 · 7 · 12 · 17 · 29 · 33 · 49, then the shared primitives.
- **Expect** Same zones, same order, same class vocabulary. Documented differences only:
  `routerLink` in place of `onNav()`, `<bdi>` isolation the prototype omits, the ten
  Angular-only classes, and the P-204 accessibility fixes — all recorded as **keep** in
  `STRUCTURE-GAP.md`.
- **Status** 🔨

---

# 16 · Non-functional

### T-NFR-01 · Arabic RTL is primary, not a translation layer
- **Do** Read every register and every form in Arabic. Check mixed-direction rows.
- **Expect** Logical CSS properties throughout — no `left`/`right`. `<bdi>` on every number,
  date, ID and currency string (`05 §5.2`). **No uppercase and no letter-spacing**: Arabic
  has no case and letter-spacing breaks its shaping (`CLAUDE.md` §6).
- **Status** 🔨

### T-NFR-02 · Both languages, everywhere
- **Do** Toggle language on every screen. Check empty states, refusals and toasts.
- **Expect** Every DTO carries `…Ar` and `…En` and both are populated — including refusal
  messages, which are the strings most often left Arabic-only.
- **Status** 🔨

### T-NFR-03 · Responsive at 1440 / 1280 / 1024 / 768
- **Do** Resize through all four. Watch tables, the module rail and the summary strips.
- **Expect** Below **1200px** the rail collapses to icons. Summary strips use
  `repeat(auto-fit, minmax(120px,1fr))` — **never** a pinned column count, never
  `flex: 1 1 <basis>` (`05 §8`). Wide tables scroll inside their own container; the page body
  never scrolls sideways. **No mobile branch exists** — that layer is out of scope.
- **Status** 🔨

### T-NFR-04 · Accessibility
- **Do** Keyboard-only through a register, a form, a drawer and the command palette. Check
  focus rings and target sizes.
- **Expect** `:focus-visible` on every interactive element (`05 §7` — a contract, not
  advice). Status is never colour-only: every pill carries a label. Criticality is a ring;
  the colour channel belongs to status. WCAG 2.2 target size on `epm-select` (P-204).
- **Status** ⏸ — needs an axe/Playwright pass this repo does not have.

### T-NFR-05 · The build, and what it warns about
- **Do** `cd api && dotnet test` (stop the API first — it locks its own exe, `CLAUDE.md` §7).
  Then `cd web && npm run build`.
- **Expect** **519 passed, 0 failed, 176 ms.** The web build succeeds — it is the only
  typecheck this project has. Three warnings stand, all recorded in §17: an unused
  `IconComponent` import in `field-grid.component.ts:69`, a template expression flagged in
  `command-palette.component.ts:76`, and **`bundle initial exceeded maximum budget: 1.12 MB
  against a 500 kB budget`**.
- **Status** 🟡 — both run on 2026-09-02; figures above are what came back.

---

# 17 · Known gaps

Expected. Do not file these as bugs.

| # | What | Why | Where |
|---|---|---|---|
| 1 | The 3D model and drawings viewer is a stub | Deliberate scope decision | `07 §8` · T-MOD-04 |
| 2 | ~22 `d-model-*` / `d-viewer*` / `d-drawing-*` / `d-three` classes never emitted | Follows from #1 | `STRUCTURE-GAP.md` |
| 3 | Readiness dots (`d-ready`, `d-tab-ready`) not ported | P-09 | `STRUCTURE-GAP.md` |
| 4 | No per-module approval state; the strip shows «بدأت», not «معتمد» | Removed from المسار 1 and 2 at the client's instruction. Calling a unit approved because it holds rows would be a fabricated verdict. | T-MOD-01 · `ملحق الشكل 4` shows `4/8 معتمد` |
| 5 | The Administration module is absent | Out of scope — which is why workspace assignments for `univ-specialist` are fixed in code and a fresh workspace code has nobody able to create a project in it | `07 §8` · T-PRJ-02 |
| 6 | No mobile layout; `mobile.css` absent | No mobile branch | `landing.page.ts:24` · T-NFR-03 |
| 7 | No real authentication — a persona name in a header | Prototype | `Features/Dev/Personas.cs` |
| 8 | No migrations; a schema change needs `POST /api/dev/reset` | `EnsureCreated()` by decision | `CLAUDE.md` §4 |
| 9 | Bundle is 1.12 MB against a 500 kB budget | Not addressed in this phase | T-NFR-05 |
| 10 | `IconComponent` imported but unused in `field-grid.component.ts` | Build warning, harmless | T-NFR-05 |
| 11 | `docs/SRS.md` §16.3 still claims "Screens: 4 of 24" | **Documentation defect** — stale since Phase 1. The claim is false; the count is not maintained. | `docs/SRS.md` |
| 12 | `CLAUDE.md` §6's type-scale line described the pre-v1.1 scale | Corrected (P-214/P-215). `tokens.css` ships `--fs-100…--fs-1000` = 10 · 12 · 14 · 16 · 20 · 24 · 28 · 32 · 40 · 68. `--fs-100` breaches the 11px floor — that is P-33, one of four the client chose to keep. | `CLAUDE.md` §6 |
| 13 | `app-public.css:88` carries a mojibake em-dash in a comment | Cosmetic, in a comment | `web/src/styles/app-public.css` |
| 14 | The 19 scenarios in `docs/MANUAL-TEST-SCENARIOS.md` overlap this file | Absorbed here by area, not duplicated case for case. That file remains the narrative walk-through; this one is the checklist. | `docs/MANUAL-TEST-SCENARIOS.md` |

---

## Out of scope for this file

Playwright and CI (T-NFR-04 is the one case that needs it, marked ⏸), the mobile layer, the
3D and drawings clusters, and fixing `docs/SRS.md` §16.3 — recorded above as a documentation
defect rather than silently corrected, because this repo records.

## Verification of this file itself

```bash
grep -c '^### T-' test.md                                    # 81, matches the progress table
for n in $(seq 1 60); do grep -q "الشكل $n" test.md || echo "plate $n uncovered"; done
grep -oE 'docs/spec/reference/app/[a-z-]+\.jsx?' test.md | sort -u | while read p; do [ -f "$p" ] || echo "missing $p"; done
grep -oE '\bEP-[A-Z]+-[0-9]+' test.md | sort -u | while read a; do grep -rq "\[$a\]" api/Epm.Api || echo "no endpoint $a"; done
grep -oE '[A-Za-z]+Tests\b' test.md | sort -u | while read t; do [ -f "api/Epm.Domain.Tests/$t.cs" ] || echo "missing $t"; done
```
