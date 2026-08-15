# UML — Audit Trail (Phase 6)

**SCR-W15** — سجل التدقيق · `04 §3`.
Endpoint **`EP-AUD-01`** · `GET /api/projects/{projectId}/audit`

Reference component: **`DModAudit`** — `project-modules.jsx:3005`.

**There is no audit table, and that is the design** (P-122). This screen writes
nothing and stores nothing; it is a union of the logs the system already keeps
beside the records they describe. So it cannot disagree with the tab that owns
the record — SCR-W3's سجل النشاط and this screen render the same contract rows,
because they read the same table.

---

## 1. What files make up this feature

```mermaid
graph RL
  subgraph BROWSER["web/ — Angular"]
    PG["features/audit/<br/>audit.page.ts + .html"]
    API_TS["features/audit/<br/>audit.api.ts"]
    TY["features/audit/<br/>audit.types.ts"]
    CAPI["core/api.ts"]
    LANG["core/lang.ts<br/><i>aud_* chrome, plus the OWNING<br/>screens' prj_act_* · con_act_* · chg_act_*</i>"]
    SEC["shared/section.component.ts"]
    SKEL["shared/table-skeleton.component.ts"]
  end

  subgraph API["api/ — .NET 9 minimal API"]
    EP["Features/Audit/<br/>AuditEndpoints.cs"]
    DTO["Features/Audit/<br/>AuditDto.cs"]
    PERS["Features/Dev/<br/>Personas.cs<br/><i>resolves the CO trail's user id</i>"]
    SCOPE["Features/Workspaces/<br/>WorkspaceScope.cs"]
  end

  subgraph SQL["SQL Server — EpmPrototype"]
    T1[("Projects")]
    T2[("ProjectActivityEvents")]
    T3[("Contracts")]
    T4[("ContractActivityEvents")]
    T5[("ChangeOrders")]
    T6[("ChangeOrderAuditEntries")]
  end

  PG --> API_TS
  PG --> LANG
  PG --> SEC
  PG --> SKEL
  API_TS --> TY
  API_TS --> CAPI
  CAPI -.->|"HTTP + X-Epm-User"| EP
  EP --> SCOPE
  EP --> PERS
  EP --> DTO
  EP --> T1
  EP --> T2
  EP --> T3
  EP --> T4
  EP --> T5
  EP --> T6
  TY -.->|"names must match:<br/>sourceRef · isSystem · actorName"| DTO
```

> **The verbs keep their owning screen's wording.** A change-order approval
> reads «موافقة» here because that is what `chg_act_approve` says on the record
> page; a project edit reads «عدّل التعريف» because that is `prj_act_updated` on
> SCR-W2. One verb, one wording, wherever it is read.

---

## 2. What happens when the tab opens

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant PG as audit.page.ts
  participant AP as audit.api.ts
  participant EP as EP-AUD-01
  participant PR as Personas
  participant DB as SQL

  U->>PG: opens /projects/{id}/audit
  PG->>AP: list(projectId)
  AP->>EP: GET /api/projects/{id}/audit
  EP->>DB: Projects.First(Id)
  EP->>DB: ProjectActivityEvents.Where(ProjectId)
  EP->>DB: Contracts.Where(ProjectId) → contract ids
  EP->>DB: ContractActivityEvents.Where(ContractId in ids)
  EP->>DB: ChangeOrders.Where(ContractId in ids) → order ids
  Note over EP,DB: a change order has NO project column —<br/>the contract is the working context (01 §1)
  EP->>DB: ChangeOrderAuditEntries.Where(ChangeOrderId in ids)
  loop per change-order row
    EP->>PR: Resolve(UserId) — unless the writer was `system`
  end
  EP-->>AP: AuditResponse (one list, newest first)
  AP-->>PG: data.set(model)
  PG-->>U: source chips · the trail · the footer

  U->>PG: picks a source chip or types a search
  PG->>PG: filters rows already held
  Note over PG: no second request, and NO column sorts —<br/>the order is the answer, not a preference
```

---

## 3. What it reads and writes

```mermaid
erDiagram
  Projects ||..o{ ProjectActivityEvents : "ProjectId — plain column, no FK"
  Projects ||..o{ Contracts : "ProjectId — plain column, no FK"
  Contracts ||..o{ ContractActivityEvents : "ContractId — plain column, no FK"
  Contracts ||..o{ ChangeOrders : "ContractId — plain column, no FK"
  ChangeOrders ||..o{ ChangeOrderAuditEntries : "ChangeOrderId — plain column, no FK"

  ProjectActivityEvents {
    int Id PK
    string ProjectId
    string Action "created updated"
    string ActorName "COPIED at the time, not joined now"
    string ActorRole
    string ActorParty
    DateOnly At
  }

  ContractActivityEvents {
    int Id PK
    string ContractId
    string Action "created updated change-order progress"
    string Source "user or system — الشكل 11 draws the two differently"
    string Field "one row per CHANGED field"
    string Before
    string After
    string RefId "the change order an automatic event came from"
    string Note
    string ActorName
    DateOnly At
  }

  ChangeOrderAuditEntries {
    int Id PK
    int ChangeOrderId
    DateTime At "the only trail with a TIME, not just a date"
    string UserId "an id — resolved through Personas, not copied"
    string Action "create edit submit approve return reject cancel apply"
    int StageNo
    string Field
    string PreviousValue
    string NewValue
  }
```

**`EP-AUD-01` writes nothing, and no table belongs to this feature.**

| Not a table | Why | Where the rows come from |
|---|---|---|
| `AuditEvents` | Every endpoint that writes one of the three would have to write this too — a second answer that drifts (P-122) | the three logs above |
| a `Source` column | It would be a label somebody assigned, and could be wrong | the table the row was read from |

---

## 4. What the screen can look like

```mermaid
stateDiagram-v2
  [*] --> Loading
  Loading --> Error: request failed
  Loading --> EmptyDb: total = 0
  Loading --> Data: total > 0
  Error --> Loading: retry

  EmptyDb: no actions recorded on this project

  state Data {
    [*] --> All
    All --> Scoped: source chip
    Scoped --> All: clear
    NoMatch: no actions match the filters<br/>offers clear filters
    Scoped --> NoMatch: search excluded everything
    NoMatch --> All: clear
  }
```

Newest first in every state, and nothing sorts.

---

## 5. Where to change what

| Change | File |
|---|---|
| Which trails the union reads, how a row is projected | `api/Epm.Api/Features/Audit/AuditEndpoints.cs` |
| A field on the trail | `AuditDto.cs` **and** `audit.types.ts` — same names |
| What a verb reads as | the OWNING screen's key in `core/lang.ts` (`prj_act_*` · `con_act_*` · `chg_act_*`) |
| Column layout, the diff rendering | `audit.page.html` |
| Screen chrome text | `core/lang.ts` `aud_*` |

---

## 6. Known gaps

- **Three trails, not everything.** A BOQ edit, a payment, a progress entry and
  a document revision are not logged anywhere yet, so they cannot appear here.
  Each would be recorded beside its own record, and this screen would pick it
  up with one more query.
- **No sign-ins, no permission changes.** The reference's own AUDIT dataset is
  full of them; they are enterprise events with no project to belong to, and
  nothing records them.
- **Two of the three trails copy the actor; the third resolves it.** The
  project and contract logs store `ActorName`/`Role`/`Party` at the time of the
  edit — deliberately, since a persona list can change. `ChangeOrderAuditEntries`
  stores only `UserId`, so renaming a persona would silently rewrite history on
  those rows. Making it copy like the other two is a schema change with a
  backfill, not a projection change.
- **Dates, not times, on two of the three.** Only the change-order trail
  records a time, so rows from the same day cannot be ordered against each
  other exactly.
- **No export.** An audit trail is the one register most likely to be asked for
  as a file; RPT-11 defines that report and producing it is not built.
