# UML — Project workspace shell (Phase 3)

The frame every project module renders inside, plus the first two modules.

**SCR-W1** Overview — `EP-OVW-01` · `GET /api/projects/{id}/overview`
**SCR-W2** Project Information — `EP-INF-01` · `GET /api/projects/{id}/information`

Reference components: **`DWorkspace`** `app/desktop-workspace.jsx:12` ·
**`DProjectDetail`** `:126` · **`DModOverview`** `app/project-modules.jsx:2512` ·
**`DModInformation`** `:280` — all the v1.1 branch,
`../epm@design/system-revamp`.

> **It is not three panes.** `04 §3` and ROADMAP Phase 3 both describe
> queue · detail · context. v1.1 collapsed that: the queue became the topbar
> project picker, the detail pane grew a grouped module rail, and
> `DProjectContext` is exported by the reference and rendered by nothing. See
> P-40 — and `04 §3` should be updated to match.

---

## 1. What files make up this feature

```mermaid
graph RL
  subgraph BROWSER["web/ — Angular"]
    SHELL["shell/shell.component.ts + .html<br/><i>topbar picker · bare chrome</i>"]
    SCOPE["core/project-scope.ts<br/><i>the picker's list, from EP-PRJ-01</i>"]
    WS["features/workspace/<br/>workspace.page.ts + .html<br/><b>rail + Z2 + outlet</b>"]
    MODS["features/workspace/<br/>project-modules.ts<br/><b>the 15, and which exist</b>"]
    OVPG["features/overview/<br/>overview.page.ts + .html"]
    OVAPI["features/overview/overview.api.ts"]
    OVTY["features/overview/overview.types.ts"]
    INPG["features/information/<br/>information.page.ts + .html"]
    INAPI["features/information/information.api.ts"]
    INTY["features/information/information.types.ts"]
    ROUTES["app.routes.ts<br/><i>/projects/:id/:module</i>"]
    LKP["core/lookups.ts"]
    STRIP["shared/summary-strip.component.ts"]
    FG["shared/field-grid.component.ts"]
    SEC["shared/section.component.ts"]
  end

  subgraph API["api/ — .NET 9 minimal API"]
    OVEP["Features/Overview/<br/>OverviewEndpoints.cs"]
    OVDTO["Features/Overview/OverviewDto.cs"]
    INEP["Features/Information/<br/>InformationEndpoints.cs"]
    INDTO["Features/Information/InformationDto.cs"]
    PV["Domain/ProjectValue.cs<br/><b>BR-00</b>"]
    AMD["Domain/Amendments.cs<br/><b>BR-09</b>"]
    PEN["Domain/Penalty.cs<br/><b>BR-10</b>"]
    DB["Data/EpmDb.cs"]
  end

  subgraph SQL["SQL Server — EpmPrototype"]
    T1[("Projects")]
    T2[("Contracts")]
    T3[("ContractAmendments")]
    T4[("Workspaces")]
    T5[("Beneficiaries")]
    T6[("Alerts")]
  end

  SHELL --> SCOPE
  SHELL --> ROUTES
  WS --> MODS
  WS --> ROUTES
  ROUTES --> OVPG
  ROUTES --> INPG
  OVPG --> OVAPI
  OVPG --> STRIP
  OVPG --> SEC
  OVPG --> LKP
  INPG --> INAPI
  INPG --> FG
  INPG --> SEC
  INPG --> LKP
  OVAPI --> OVTY
  INAPI --> INTY
  OVAPI -.->|"HTTP"| OVEP
  INAPI -.->|"HTTP"| INEP
  OVEP --> OVDTO
  OVEP --> PV
  OVEP --> AMD
  OVEP --> PEN
  INEP --> INDTO
  OVEP --> DB
  INEP --> DB
  DB --> T1
  DB --> T2
  DB --> T3
  DB --> T4
  DB --> T5
  DB --> T6
  OVTY -.->|"names must match:<br/>effectiveValue · projectionValue · delayDrivenBy"| OVDTO
```

> **One new table: `Beneficiaries`.** `Projects.BeneficiaryCodes` is a CSV of
> its codes (`01 §2.1`) and SCR-W1 is the first screen to resolve them.

---

## 2. The request, end to end

```mermaid
sequenceDiagram
    autonumber
    actor U as Viewer
    participant S as shell.component.ts
    participant W as workspace.page.ts
    participant P as overview.page.ts
    participant A as overview.api.ts
    participant E as OverviewEndpoints.cs
    participant AM as Domain/Amendments
    participant PN as Domain/Penalty
    participant PV as Domain/ProjectValue
    participant DB as SQL Server

    U->>S: open /projects/PRJ-0279/overview
    Note over S: readProject(url) → the id<br/>bare = true → no .d-canvas
    S->>W: route activates the workspace shell
    W->>W: rail from project-modules.ts<br/>(2 built · 13 disabled + phase)
    W->>P: <router-outlet> activates the module
    P->>A: get('PRJ-0279')
    A->>E: GET /api/projects/PRJ-0279/overview  [EP-OVW-01]
    E->>DB: Projects · Contracts · ContractAmendments<br/>· Workspaces · Beneficiaries · Alerts

    loop each contract
        E->>AM: Effective(original, deltas)
        AM-->>E: value + finish IN FORCE (BR-09)
        E->>PN: DelayDays(effectiveFinish, forecastFinish)
        PN-->>E: max(0, forecast − contractual) (BR-10)
    end

    E->>PV: Total(effective values)
    PV-->>E: the project value (BR-00)
    Note over E: projection = effective + Σ UNAPPLIED deltas,<br/>as its OWN figure — never folded in (02 §9)
    E-->>A: project + totals + contracts<br/>+ beneficiaries + alerts + unavailable[]
    A-->>P: response
    P-->>U: meta list · KPI band (2 real + 4 unavailable)<br/>· projection bar · contracts · beneficiaries · alerts
```

---

## 3. What it reads

```mermaid
erDiagram
    PROJECTS {
        string Id PK
        string NameAr
        string NameEn
        string WorkspaceCode
        string Status
        string Type
        string ExecutionStage
        string FundingType
        string Region
        string Priority
        string Branch
        string Executor
        string DesignerParty
        string ConsultantParty
        string BeneficiaryCodes "CSV of Beneficiary.Code — 01 §2.1"
        date DataDate "the project's own now — D-06"
        date UpdatedAt
    }

    CONTRACTS {
        string Id PK
        string ProjectId
        decimal OriginalValue "NEVER overwritten"
        date OriginalFinish "NEVER overwritten"
        int OriginalDurationDays
        date ForecastFinish "RECORDED, nullable"
        string Contractor
        string Consultant
    }

    CONTRACT_AMENDMENTS {
        int Id PK
        string ContractId
        int No
        decimal DeltaValue "moves the value ONLY when applied"
        int DeltaDays
        datetime AppliedAt "NULL = approved but NOT applied"
    }

    BENEFICIARIES {
        string Code PK
        string NameAr
        string NameEn
        string Type
        string ParentCode "self-referencing tree — a faculty's university"
        bool Active "false = may not receive new quantity"
    }

    ALERTS {
        int Id PK
        string ProjectId
        string Severity
        bool Acknowledged
    }

    WORKSPACES {
        string Code PK
        string NameAr
        string NameEn
    }

    PROJECTS ||..o{ CONTRACTS : "Contracts.ProjectId = Projects.Id — NO FK, matched in the endpoint"
    CONTRACTS ||..o{ CONTRACT_AMENDMENTS : "ContractAmendments.ContractId = Contracts.Id — NO FK"
    PROJECTS ||..o{ BENEFICIARIES : "Projects.BeneficiaryCodes CONTAINS Beneficiaries.Code — a CSV, split in the endpoint"
    BENEFICIARIES ||..o{ BENEFICIARIES : "ParentCode = Code — NO FK"
    PROJECTS ||..o{ ALERTS : "Alerts.ProjectId = Projects.Id — NO FK"
    WORKSPACES ||..o{ PROJECTS : "Projects.WorkspaceCode = Workspaces.Code — NO FK"
```

**Writes nothing.** SCR-W2 is the only module in the workspace whose every
value is a stored column; SCR-W1's every figure is derived at projection time.

### The four derived figures on SCR-W1

| Figure | How | Rule |
|---|---|---|
| Project value | `ProjectValue.Total` over `Amendments.Effective(...).Value` | BR-00 over BR-09 |
| Effective finish | `Amendments.Effective(...).Finish` per contract | BR-09 |
| Delay days | worst `Penalty.DelayDays(effectiveFinish, forecastFinish)` | BR-10 |
| Projection | effective + Σ **unapplied** deltas — its own figure | 02 §9 |

---

## 4. What the screen can look like

```mermaid
stateDiagram-v2
    [*] --> Loading
    Loading --> NotFound: 404 — no such project
    Loading --> Error: request failed
    Loading --> Data
    Error --> Loading: Retry

    NotFound: The id is a wrong URL, not an empty state.
    NotFound: 04 §9 is about empty DATA.

    state Data {
        [*] --> Awarded
        Awarded: has contracts — value, delay, amendment chain
        NoContract: contractCount = 0
        NoContract: value tile "unavailable + reason", contracts table empty-with-explanation
        Awarded --> NoContract
    }

    state Rail {
        Built: overview · information — routable
        Unbuilt: the other 13 — disabled, phase stated, NOT routable
    }
```

`PRJ-0277` and `PRJ-0159` reach the no-contract branch in the fixture.

---

## 5. Where to change what

| Change | File |
|---|---|
| A module becomes real | `features/workspace/project-modules.ts` (`built: true`) **and** a route in `app.routes.ts` — both, or it is a dead link |
| The rail's grouping or order | `features/workspace/project-modules.ts` |
| Module labels, group labels | `web/src/app/core/lang.ts` (`mod_*`) |
| Z2 header, breadcrumb, id chip | `features/workspace/workspace.page.html` |
| The project picker | `shell/shell.component.html` + `core/project-scope.ts` |
| Which routes drop the canvas | `bare` in `shell.component.ts` |
| SCR-W1 figures, tiles, columns | `features/overview/*` and `Features/Overview/OverviewEndpoints.cs` |
| SCR-W2 field GROUPING | `Features/Information/InformationEndpoints.cs` — semantic, belongs with the data |
| SCR-W2 field LABELS | `core/lang.ts` (`inf_*`) — a label is chrome |
| How value / finish / delay are derived | `Domain/ProjectValue.cs` · `Amendments.cs` · `Penalty.cs` — **not** an endpoint |

---

## 6. Known gaps

| # | Gap | Why it is a gap and not a defect |
|---|---|---|
| 1 | **No context pane.** `04 §3`'s third pane is not built. | v1.1 does not render one either — `DProjectContext` is dead code there, and `.d-three` carries `data-ctx="off"`. Its per-module actions moved into Z6 (P-40). |
| 2 | **No readiness dots** on the rail. | The reference derives them from `rng(p.id.charCodeAt(6) * 13 + 5)`. No review state is stored anywhere in this system (P-09). |
| 3 | **No S-curve, no physical %, no SPI/CPI.** Four KPI tiles render "unavailable + reason". | Physical % is BR-04 (Phase 4.2), financial % needs payments (4.1), the indices need a baseline curve (4.3). The curve is absent rather than unavailable because a chart cannot be labelled. |
| 4 | **No edit mode.** The reference's Information module edits inline. | Nothing in this build writes except alert acknowledgement, so an edit mode would be a form that discards what you type. |
| 5 | **No activity-log tab** on SCR-W2, and no description field. | There is no audit table until Phase 6, and `Projects` has no description column. |
| 6 | **No per-module Z6 actions.** | Every one of them (import P6, record payment, create change order) belongs to a module that does not exist yet. |
| 7 | **No keyboard ↑/↓ through the picker list.** The reference moves selection with arrows. | Its queue was a permanent pane; ours is a menu, and a menu that navigates on arrow-key would fire a route change per keypress. |
| 8 | **Module permission is not enforced.** The reference locks a module when `!m.perm`. | BR-14 `ViewerRelation` exists in `Domain/`, but nothing maps a persona to a module yet — and inventing a map would gate real screens on a guess. The `locked` visual is used for *unbuilt*, which is a different statement and is labelled as one. |

---

## 7. Three things this shell does that the reference does not

**Its rail cannot lie about what exists.** Thirteen of the fifteen modules are
disabled, each stating the phase that builds it, and none of them is routable.
The route table and `project-modules.ts` are the two halves of one guarantee:
`built: true` with no route would be exactly the dead link the list prevents.

**Its project value is Σ effective, and the projection is beside it, never in
it.** `PRJ-0279` reads **350,000,000** — awarded 340,000,000 plus one applied
amendment. One further amendment is approved and not applied; the screen says
the value *would* be 353,000,000 and puts that on its own line. Folding it in
is the single most consequential mistake this screen could make (`02 §9`).

**Its delay is the same number SCR-E5 shows.** 61 days on `PRJ-0279`, driven by
`CNT-0279-EM` — not the 16 days a project-level date subtraction gives, because
the electromechanical contract has slipped behind a longer sibling's extended
finish. Both screens call `Penalty.DelayDays`, so they cannot disagree.
