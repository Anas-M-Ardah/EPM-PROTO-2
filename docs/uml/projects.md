# UML — Projects list (SCR-E2)

The cross-portfolio project list (`04 §2`). Route `/projects`.
Endpoint **`EP-PRJ-01`** · `GET /api/projects`

---

## 1. What files make up this feature

Everything you would touch to change this screen. Nothing else in the repo is involved.

```mermaid
graph RL
  subgraph BROWSER["web/ — Angular"]
    HTML["projects.page.html<br/><i>markup, 4 UI states</i>"]
    PAGE["projects.page.ts<br/><i>state + formatting only</i>"]
    PAPI["projects.api.ts<br/><i>one method per endpoint</i>"]
    TYPES["projects.types.ts<br/><i>mirrors ProjectsDto.cs</i>"]
    CAPI["core/api.ts<br/><i>the only HttpClient user</i>"]
    LANG["core/lang.ts<br/><i>AR/EN chrome strings</i>"]
    FMT["core/format.ts<br/><i>display only, no maths</i>"]
  end

  subgraph API["api/ — .NET 9 minimal API"]
    EP["Features/Projects/<br/>ProjectsEndpoints.cs"]
    DTO["Features/Projects/<br/>ProjectsDto.cs"]
    DOM["Domain/ProjectValue.cs<br/><b>the only arithmetic</b>"]
    DB["Data/EpmDb.cs"]
  end

  subgraph SQL["SQL Server — EpmPrototype"]
    T1[("Projects")]
    T2[("Contracts")]
  end

  HTML --> PAGE
  PAGE --> PAPI
  PAGE --> LANG
  PAGE --> FMT
  PAPI --> TYPES
  PAPI --> CAPI
  CAPI -.->|"HTTP + X-Epm-User"| EP
  EP --> DTO
  EP --> DOM
  EP --> DB
  DB --> T1
  DB --> T2
  TYPES -.->|"names must match"| DTO
```

> **The dotted line between `projects.types.ts` and `ProjectsDto.cs` is the contract that makes tracing work.** Member names are identical on both sides, so `grep -rn "contractCount"` finds the TypeScript interface, the C# record, and the endpoint projection in one search.

---

## 2. The request, end to end

What actually happens when the page loads or a filter changes.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant PG as projects.page.ts
    participant PA as projects.api.ts
    participant CA as core/api.ts
    participant EP as ProjectsEndpoints.cs
    participant DM as Domain/ProjectValue.cs
    participant DB as SQL Server

    U->>PG: opens /projects (or types a search)
    PG->>PG: loading.set(true)
    PG->>PA: list({ q, status })
    Note over PA: carries the [EP-PRJ-01] anchor
    PA->>CA: get('/api/projects', filters)
    CA->>EP: GET /api/projects?q=&status=<br/>X-Epm-User: user.re-dept

    Note over EP: persona middleware already resolved<br/>the user — no auth, see DECISIONS.md

    EP->>DB: SELECT * FROM Projects<br/>WHERE (filters)
    DB-->>EP: project rows
    EP->>DB: SELECT ProjectId, OriginalValue<br/>FROM Contracts WHERE ProjectId IN (…)
    DB-->>EP: contract rows

    Note over EP,DM: no JOIN, no Include() —<br/>two flat reads, matched in memory

    loop per project
        EP->>DM: Total(its contract values)
        DM-->>EP: value (DERIVED, never stored)
    end

    EP->>DB: SELECT Status, COUNT(*)<br/>GROUP BY Status
    DB-->>EP: counts for the filter chips

    EP-->>CA: ProjectsResponse { rows, total, countByStatus }
    CA-->>PA: typed ProjectsResponse
    PA-->>PG: rows + counts
    PG->>PG: loading.set(false)
    PG-->>U: register table, or one of 3 empty/error states
```

**Why three queries instead of one join:** flat reads are the whole storage model here — no navigation properties, no foreign keys. You can read exactly what hits the database. That costs a query; it buys never wondering what EF generated.

---

## 3. The data it reads

```mermaid
erDiagram
    PROJECTS {
        string  Id PK "PRJ-0279"
        string  WorkspaceCode "plain ID column"
        string  NameAr
        string  NameEn
        string  Status "06 §1 — 5-state set"
        string  Type "06 §3 — 8 types"
        string  ExecutionStage "06 §2 — 12 stages"
        string  FundingType "06 §5 — 10 types"
        string  Region
        string  Branch
        string  Executor
        string  BeneficiaryCodes "CSV, not a join table"
        date    DataDate "'now' — never DateTime.Now (D-06)"
    }

    CONTRACTS {
        string  Id PK "CNT-0279-EM"
        string  ProjectId "plain ID column"
        string  NameAr
        string  NameEn
        decimal OriginalValue "NEVER overwritten"
        string  Status
        date    Start
        date    OriginalFinish "NEVER overwritten"
        int     OriginalDurationDays
        date    ForecastFinish "drives the penalty (BR-10)"
        decimal AwardAmount
        decimal ReserveAmount
        decimal SupervisionAmount
        string  Contractor
        string  Consultant
    }

    PROJECTS ||..o{ CONTRACTS : "Contracts.ProjectId — convention, NOT a FK constraint"
```

**Three things this diagram is telling you:**

- **The dotted relationship is deliberate.** There is no foreign key in the database. `Contracts.ProjectId` is just a string column; the relationship exists only in the `Where()` clause of the endpoint, where you can read it.
- **There is no `Value` column on `PROJECTS`.** Project value is Σ contract values, computed per request (`01 §3`). Adding that column would be a defect.
- **`OriginalValue` and `OriginalFinish` are never overwritten.** Amendments layer on top of them (handoff non-negotiable #6). The Contract page adds that layer; the signature of `ProjectValue.Total` does not change when it does.

---

## 4. The four states this screen can be in

The database starts **empty** — nothing is seeded on boot — so the empty state is load-bearing, not decoration (`04 §9`).

```mermaid
stateDiagram-v2
    [*] --> Loading: page opens / filter changes

    Loading --> Error: request failed
    Loading --> EmptyDb: 0 rows AND no filter active
    Loading --> EmptyFilter: 0 rows AND a filter is active
    Loading --> Data: rows returned

    Error --> Loading: "إعادة المحاولة" (Retry)
    EmptyDb --> Loading: "تحميل بيانات العرض" (Load fixture)
    EmptyFilter --> Loading: "مسح المرشّحات" (Clear filters)
    Data --> Loading: search / status chip

    note right of EmptyDb
        The database is genuinely empty.
        Offers the fixture loader.
    end note

    note right of EmptyFilter
        Data exists, the filter excluded it.
        Offers to clear the filter.
        A DIFFERENT problem needing a
        DIFFERENT fix — never merge these two.
    end note
```

---

## 5. Where to change what

| You want to… | Touch these, in this order |
|---|---|
| Add a column to the table | `Project.cs` → `ProjectsDto.cs` → `projects.types.ts` → `projects.page.html`, then `POST /api/dev/reset` |
| Change how a figure is displayed | `core/format.ts` only |
| Change a filter or the query | `ProjectsEndpoints.cs` only |
| Change how project value is calculated | `Domain/ProjectValue.cs` only — it is the single definition |
| Change a label | `core/lang.ts` (UI chrome) — enum labels will move to the `Lookups` table |
| Restyle anything | Look in `web/src/styles/` first. Only add to `web/src/styles.css` if the class genuinely does not exist |

---

## 6. Known gaps

- **`ExecutionStage` renders its raw code** (`finishes`, `handover`) instead of an Arabic label. The `Lookups` table (`06`) is not wired yet; the page that adds it fixes every enum column across the app at once.
- **Project value uses `OriginalValue`.** It should use the *effective* value — original plus applied amendment deltas (`02 §9`). The Contract page adds `ContractAmendments`; only the argument passed to `ProjectValue.Total` changes.
- **`physicalPct` / `financialPct` are absent.** They need BOQ progress (BR-04) and payments respectively.
