# UML — BOQ tab (Phase 4.2)

**SCR-W4** — a contract's bill of quantities, its allocation to activities, and
the distribution of its quantities to beneficiaries (`04 §4`).

Endpoints **`EP-BOQ-01`** … **`EP-BOQ-08`**, all under
`/api/projects/{projectId}/boq/…`.

Reference components: **`DBoqWorkspace`** `app/boq-workspace.jsx:16` ·
**`DBoqRegister`** `app/boq-register.jsx:435` · **`DBoqAssign`**
`app/boq-assign.jsx:11` — the v1.1 branch, `../epm@design/system-revamp`.

This is the densest screen in the system and the first one where five tables
have to agree. It is also the first that **writes four different things**: a
line's figures, a line's deletion, a distribution, and an allocation.

---

## 1. What files make up this feature

```mermaid
graph RL
  subgraph BROWSER["web/ — Angular"]
    PG["features/boq/<br/>boq.page.ts + .html"]
    API_TS["features/boq/boq.api.ts"]
    TY["features/boq/boq.types.ts"]
    CAPI["core/api.ts<br/><i>get · put · delete</i>"]
    LKP["core/lookups.ts<br/><i>allocation-coverage · distribution-state</i>"]
    DRW["shared/drawer.component.ts"]
    SKEL["shared/table-skeleton.component.ts"]
    TOAST["shared/toast.service.ts"]
    MODS["features/workspace/project-modules.ts<br/><i>built: true</i>"]
  end

  subgraph API["api/ — .NET 9 minimal API"]
    EP["Features/Boq/BoqEndpoints.cs"]
    DTO["Features/Boq/BoqDto.cs"]
    WT["Domain/BoqWeights.cs<br/><b>BR-01 — weight, Σ = 100.00</b>"]
    RND["Domain/Rounding.cs<br/><b>D-07 — largest remainder</b>"]
    SW["Domain/ScheduleWeights.cs<br/><b>BR-02 — activity weight</b>"]
    AL["Domain/Allocation.cs<br/><b>BR-03 — share · coverage</b>"]
    PR["Domain/ProgressReflection.cs<br/><b>BR-04 — progress · rollup</b>"]
    TS["Domain/TierSplit.cs<br/><b>BR-05 — banded line</b>"]
    DI["Domain/Distribution.cs<br/><b>BR-08 — state · cap</b>"]
    PV["Domain/ProjectValue.cs<br/><b>BR-00</b>"]
    DB["Data/EpmDb.cs"]
  end

  subgraph SQL["SQL Server — EpmPrototype"]
    T1[("Projects")]
    T2[("Contracts")]
    T3[("BoqItems")]
    T4[("BoqRateBands")]
    T5[("BoqActivityLinks")]
    T6[("BoqDistributions")]
    T7[("Activities")]
    T8[("Beneficiaries")]
  end

  PG --> API_TS
  PG --> LKP
  PG --> DRW
  PG --> SKEL
  PG --> TOAST
  MODS -.->|"routes to"| PG
  API_TS --> TY
  API_TS --> CAPI
  CAPI -.->|"HTTP"| EP
  EP --> DTO
  EP --> WT
  EP --> SW
  EP --> AL
  EP --> PR
  EP --> TS
  EP --> DI
  EP --> PV
  WT --> RND
  EP --> DB
  DB --> T1
  DB --> T2
  DB --> T3
  DB --> T4
  DB --> T5
  DB --> T6
  DB --> T7
  DB --> T8
```

`boq.types.ts` and `BoqDto.cs` carry **identical member names**, which is what
lets `grep -rn "EP-BOQ-02" api web` cross the language boundary.

---

## 2. The request, end to end

The register. Every read below goes through **one** derivation — `Derive()` —
so the grid and the allocation matrix can never disagree about a coverage.

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant PG as boq.page.ts
  participant A as boq.api.ts
  participant EP as BoqEndpoints.cs
  participant D as Domain/
  participant DB as SQL Server

  U->>PG: opens /projects/PRJ-0279/boq
  PG->>A: gate(projectId)
  A->>EP: GET /api/projects/{id}/boq  [EP-BOQ-01]
  EP->>DB: Contracts WHERE ProjectId · COUNT BoqItems BY ContractId
  DB-->>EP: 2 contracts, 10 and 2 items
  EP-->>PG: BoqGateResponse
  Note over PG: >1 contract → the GATE renders (04 §4).<br/>Exactly 1 → it is chosen for the user.

  U->>PG: chooses CNT-0279
  PG->>A: register(projectId, contractId)
  A->>EP: GET …/boq/{contractId}  [EP-BOQ-02]
  EP->>DB: Projects · Contracts (scope check → 404)
  EP->>DB: BoqItems · BoqRateBands · BoqActivityLinks<br/>BoqDistributions · Activities
  EP->>D: TierSplit.Effective(qty, rate, bands)
  D-->>EP: qty · rate · amount  (BR-05)
  EP->>D: BoqWeights.ForContract(amounts)
  D-->>EP: 9.37 … 1.54, Σ exactly 100.00  (BR-01 → D-07)
  EP->>D: ScheduleWeights.For(cost, total, total)
  D-->>EP: A5 5.80% · A8 5.20%  (BR-02)
  EP->>D: Allocation.Shares(absWeights, amount)
  D-->>EP: 52.7 / 47.3 → 14,094,000 / 12,636,000  (BR-03)
  EP->>D: Allocation.CoverageStatus(shares)
  D-->>EP: full · partial · over · unassigned  (06 §11)
  EP->>D: ProgressReflection.For(links, amount, qty)
  D-->>EP: 31.64% → 8,456,400  (BR-04)
  EP->>D: Distribution.For(qty, rows)
  D-->>EP: distributed · remaining · state  (BR-08, 06 §10)
  EP-->>PG: BoqRegisterResponse
```

A write, and why the response is the whole register rather than one row:

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant PG as boq.page.ts
  participant EP as BoqEndpoints.cs
  participant DB as SQL Server

  U->>PG: edits BQ-012's rate in the row, 1,500 → 2,000
  Note over PG: the amount previews live — the ONE product<br/>this page computes (04 §4)
  PG->>EP: PUT …/items/BQ-012  [EP-BOQ-03]
  EP->>EP: banded? → refuse (02 §5)
  EP->>EP: Distribution.DecreaseBlocksApply? → refuse (02 §8)
  EP->>DB: UPDATE BoqItems
  EP->>EP: re-derive the WHOLE contract
  EP-->>PG: BoqRegisterResponse
  Note over PG: the amount moved, so BR-01's DENOMINATOR moved,<br/>so every other line's weight moved. Returning one row<br/>would leave nine weights on screen that no longer<br/>add to 100.00.
```

---

## 3. What it reads and writes

```mermaid
erDiagram
  PROJECTS ||..o{ CONTRACTS : "ProjectId — no FK, joined in the endpoint"
  CONTRACTS ||..o{ BOQITEMS : "ContractId — the scope invariant (01 §1)"
  CONTRACTS ||..o{ ACTIVITIES : "ContractId"
  BOQITEMS ||..o{ BOQRATEBANDS : "BoqItemId"
  BOQITEMS ||..o{ BOQDISTRIBUTIONS : "BoqItemId"
  BOQITEMS ||..o{ BOQACTIVITYLINKS : "BoqItemId"
  ACTIVITIES ||..o{ BOQACTIVITYLINKS : "ActivityId"
  BENEFICIARIES ||..o{ BOQDISTRIBUTIONS : "BeneficiaryCode"

  PROJECTS {
    string Id PK
    string BeneficiaryCodes "CSV — the project's own beneficiaries (01 §2.1)"
    date DataDate "AsOf. Never DateTime.Now (D-06)"
  }
  CONTRACTS {
    string Id PK
    string ProjectId "scope checked in the endpoint → 404"
    decimal OriginalValue
  }
  BOQITEMS {
    int Id PK
    string Code "unique WITHIN the contract, not globally"
    string ContractId
    string Unit
    string Division "a label on rows, not a table"
    string DivisionName
    string Source "imported | manual"
    decimal OriginalQty "NEVER overwritten (#6)"
    decimal UnitRate "NEVER overwritten — re-pricing makes a band"
  }
  BOQRATEBANDS {
    int Id PK
    int BoqItemId
    int Seq
    decimal Qty
    decimal Rate
  }
  BOQACTIVITYLINKS {
    int Id PK
    int BoqItemId
    int ActivityId
    decimal SharePct "a CACHE when IsManual is false"
    bool IsManual "per LINE in practice — see P-47"
  }
  BOQDISTRIBUTIONS {
    int Id PK
    int BoqItemId
    string BeneficiaryCode "must be the project's, and active (02 §8)"
    string SiteCode "the only place a location legitimately appears"
    decimal Qty
  }
  ACTIVITIES {
    int Id PK
    string ActivityId "A5 · A8 — 02 §3's own example"
    string ContractId
    string WbsPath "a PATH STRING, not a tree table"
    decimal ProgressPct "BR-04's input"
    decimal BudgetedCost "BR-02's cost basis"
    decimal BudgetedManHours "BR-02's man-hours basis, nullable"
    bool IsMilestone "weight 0, excluded from allocation (02 §2)"
  }
  BENEFICIARIES {
    string Code PK
    bool Active
  }
```

**Written by this screen:** `BoqItems` (`EP-BOQ-03` update, `EP-BOQ-04` delete),
`BoqDistributions` (`EP-BOQ-06`, and cleared by `EP-BOQ-04`),
`BoqActivityLinks` (`EP-BOQ-08`, and cleared by `EP-BOQ-04`).
`BoqRateBands` is read only — Phase 5.4 is what writes a band.

**Derived, never stored:** weight, share, coverage, assigned amount, absolute
weight, progress, achieved amount, achieved quantity, distributed, remaining,
distribution state, and the effective quantity/rate/amount of a banded line.

---

## 4. What the screen can look like

```mermaid
stateDiagram-v2
  [*] --> Loading
  Loading --> Error : request failed
  Error --> Loading : retry

  Loading --> NoContract : the project has no contract
  Loading --> Gate : >1 contract, none chosen
  Loading --> Register : exactly 1 contract, or one is in the URL

  Gate --> Register : a contract is chosen (it goes in the URL)
  Register --> Gate : «تغيير العقد»

  state Register {
    [*] --> EmptyBill : this contract has no BOQ
    [*] --> Grid : rows
    Grid --> NoMatch : the filter excluded everything
    NoMatch --> Grid : clear filters
    Grid --> RowEdit : «تعديل» — inline, amount live
    RowEdit --> Grid : save (whole register re-derived) / cancel
    Grid --> RowDelete : «حذف» — confirms IN THE ROW
    RowDelete --> Grid : delete (clears distribution + links) / cancel
    Grid --> Drawer : «توزيع الكميات»
    Drawer --> Grid : save / close
  }

  Register --> Assign : «الربط بالأنشطة»
  Assign --> Register : «السجل»

  state Assign {
    [*] --> NoActivities : the schedule is not imported (Phase 4.3)
    [*] --> Queue : activities exist
    Queue --> Editor : an item is picked
    Editor --> Editor : type a share → dirty
    Editor --> Editor : «توزيع تلقائي» — BR-03's answer, on the chosen basis
    Editor --> Blocked : Σ > 100.5 — save refused (02 §3)
    Blocked --> Editor : corrected
    Editor --> Queue : save (override) / reset (restore computed) / cancel
  }
```

`EmptyBill` and `NoMatch` are **two different empty states with two different
messages and two different buttons** (`04 §9`), and so are `NoContract` and
`Gate`.

---

## 5. Where to change what

| To change… | Edit |
|---|---|
| the weight rule, or its rounding | `Domain/BoqWeights.cs` → `Domain/Rounding.cs` |
| how a share is computed, or what `full` means | `Domain/Allocation.cs` |
| how a BOQ line's progress follows its activities | `Domain/ProgressReflection.cs` |
| the distribution states, or the input cap | `Domain/Distribution.cs` |
| what a re-priced line's quantity/rate/amount are | `Domain/TierSplit.cs` |
| which columns the register offers | `columns` in `boq.page.ts` + the header/cells in `.html` |
| a column heading, a button, an empty state | `core/lang.ts` (`boq_*`) |
| a coverage or distribution **state label** | `Features/Lookups/LookupCatalog.cs` (06 §10, §11) — never `lang.ts` |
| what an endpoint refuses, and its message | `Features/Boq/BoqEndpoints.cs` |
| the fixture's items, activities, links or distribution | `Features/Dev/Fixture.cs` → `Boq(db)` |

---

## 6. Known gaps

- **No create and no import.** `04 §4` and ROADMAP 4.2 ask for inline EDIT and
  DELETE, and those exist. A line is created by importing the contract's BOQ
  sheet, which is not a screen this phase builds — so the empty state explains
  where a bill comes from rather than offering a button that cannot work.
- **`BoqRateBands` is exercised by no data.** The read path is complete and
  tested in `TierSplitTests`, but nothing writes a band until Phase 5.4 applies
  a re-pricing order, so no fixture line renders `banded`.
- **The unit and the division name are single columns, not `{ar, en}` pairs**,
  so they stay in Arabic when the UI is in English. This is deliberate and it
  is the same argument `core/format.ts` makes about dates: both are transcribed
  from the contract's own bill of quantities, so they are a **record**, not
  prose. Changing it would mean translating a legal document's own wording.
- **The activity count in Z10 includes milestones.** It is «الأنشطة» — how many
  activities this contract has — and a milestone is one. It is excluded from
  allocation everywhere that matters: the denominator, the picker, and
  `EP-BOQ-08`'s validation.
- **No amendment disclosure yet.** `DAmdMark` and `DAmdPanel` — the badge and
  drawer that show a line's change-order impact — are ROADMAP 4.5, shared with
  the Schedule tab. The register carries `banded`, which is the part of that
  story `BoqRateBands` can already tell.
- **Saved views and the density toggle are not ported.** Both are
  `usePersistedState` chrome in the reference with no server side; the column
  menu, which is the part that changes what the grid *says*, is ported.

---

## 7. Three things worth knowing before changing this screen

**Coverage is not weight.** `Coverage` compares Σ shares to 100%. `Weight` is
the line's share of the bill. Different questions, different denominators, and
`02 §3` calls conflating them an early error. `AssignedWeight` is the one place
they are deliberately multiplied, and the gap between it and `Weight` is the
part of the contract linked to no work — which can never be earned.

**The override is per LINE, not per link** (P-47). One manual link puts the
whole line into override mode. Mixing a stored share with a computed one gives
a total nobody chose, and a coverage nobody can explain. It is also what makes
`partial` and `over` reachable at all: a computed set always sums to exactly
100.

**The man-hours basis is a what-if** (P-48). Nothing stores which basis the
schedule was imported on, so the register always computes on cost. Flipping the
toggle shows what the shares *would* be; only «توزيع تلقائي» followed by a save
makes it binding — and that save is, correctly, an override.
