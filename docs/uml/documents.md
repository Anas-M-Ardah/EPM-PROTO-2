# UML — Documents & Drawings (Phase 6)

**SCR-W12** — الوثائق والمخططات · **ملحق الشكل 46**.
Endpoint **`EP-DOC-01`** · `GET /api/projects/{projectId}/documents`

Reference component: **`DModDrawings`** — `project-modules.jsx:1396`.

The plate carries a notice of its own, inside the detail panel:

> «كل ملف جديد يُنشئ مراجعة جديدة؛ المراجعة السابقة تبقى في السجل معلَّمة كملغاة،
> ولا يوجد استبدال في المكان.»

That sentence is the whole design of this feature. It is why there are **two
tables and not one**, why a revision is only ever INSERTED, and why «which
revision is current» is a computed answer rather than a stored flag.

---

## 1. What files make up this feature

```mermaid
graph RL
  subgraph BROWSER["web/ — Angular"]
    PG["features/documents/<br/>documents.page.ts + .html"]
    API_TS["features/documents/<br/>documents.api.ts"]
    TY["features/documents/<br/>documents.types.ts"]
    CAPI["core/api.ts"]
    LANG["core/lang.ts<br/><i>doc_* chrome only</i>"]
    LKP["core/lookups.ts<br/><i>doc-discipline · doc-status</i>"]
    SEC["shared/section.component.ts"]
    SKEL["shared/table-skeleton.component.ts"]
    TOAST["shared/toast.service.ts<br/><i>demo() — upload says so</i>"]
  end

  subgraph API["api/ — .NET 9 minimal API"]
    EP["Features/Documents/<br/>DocumentsEndpoints.cs"]
    DTO["Features/Documents/<br/>DocumentsDto.cs"]
    DOM["<b>Domain/DocumentRevisions.cs</b><br/><i>Current · IsSuperseded · UnderReview</i>"]
    SCOPE["Features/Workspaces/<br/>WorkspaceScope.cs"]
  end

  subgraph SQL["SQL Server — EpmPrototype"]
    T1[("Projects")]
    T2[("Documents")]
    T3[("DocumentRevisions")]
    T4[("Lookups")]
  end

  PG --> API_TS
  PG --> LANG
  PG --> LKP
  PG --> SEC
  PG --> SKEL
  PG --> TOAST
  API_TS --> TY
  API_TS --> CAPI
  CAPI -.->|"HTTP + X-Epm-User"| EP
  EP --> SCOPE
  EP --> DOM
  EP --> DTO
  EP --> T1
  EP --> T2
  EP --> T3
  EP --> T4
  TY -.->|"names must match:<br/>currentRevisionNo · revisionCount · superseded"| DTO
```

> **The page owns no arithmetic.** `Current`, `IsSuperseded` and `UnderReview`
> are all in `Domain/DocumentRevisions`; the endpoint filters and projects; the
> page filters an already-projected list and formats it (CLAUDE.md §3.1).

---

## 2. What happens when the tab opens

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant PG as documents.page.ts
  participant LK as core/lookups.ts
  participant AP as documents.api.ts
  participant EP as EP-DOC-01
  participant DM as Domain/DocumentRevisions
  participant DB as SQL

  U->>PG: opens /projects/{id}/documents
  PG->>LK: ensureLoaded()
  PG->>AP: list(projectId)
  AP->>EP: GET /api/projects/{id}/documents
  EP->>DB: Projects.First(Id)
  EP->>EP: WorkspaceScope.Deny(ctx, WorkspaceCode)
  EP->>DB: Lookups.Where(Kind = "doc-discipline").OrderBy(Sort)
  Note over EP: folder ORDER and register ORDER are<br/>the same list — discipline, not alphabet
  EP->>DB: Documents.Where(ProjectId)
  EP->>DB: DocumentRevisions.Where(DocumentId in ids).OrderByDescending(No)
  loop per document
    EP->>DM: Current(revisions) → highest No
    EP->>DM: IsSuperseded(no, revisions) per revision
  end
  EP->>DM: UnderReview(all documents) → current status = draft
  EP-->>AP: DocumentsResponse (each row carries its OWN revisions)
  AP-->>PG: data.set(model)
  PG-->>U: folders · register · detail panel

  U->>PG: clicks a register row
  PG->>PG: toggleOpen(code) → opened() = rows.find(code)
  Note over PG: NO second request — the panel's history<br/>arrived with the row it opened from (P-84)
```

**One read carries the history.** Fetching the revisions separately would give
the panel its own chance to disagree with the row it opened from — the call the
BOQ item card already made.

---

## 3. What it reads and writes

```mermaid
erDiagram
  Projects ||..o{ Documents : "ProjectId — plain column, no FK"
  Documents ||..o{ DocumentRevisions : "DocumentId — plain column, no FK"
  Lookups ||..o{ Documents : "Kind=doc-discipline → Discipline"
  Lookups ||..o{ DocumentRevisions : "Kind=doc-status → Status"

  Documents {
    int Id PK
    string ProjectId "to Projects.Id"
    string Code "AR-DR-001 — what the register is read by"
    string TitleAr
    string TitleEn
    string Discipline "lookup doc-discipline"
    string Issuer "issuing office"
  }

  DocumentRevisions {
    int Id PK
    int DocumentId "to Documents.Id"
    int No "1,2,3 rendered R1 R2 R3; unique per document"
    DateOnly IssuedOn
    string Issuer "may differ from the document's"
    string DescriptionAr
    string DescriptionEn
    string TransmittalNo "per REVISION, not per document"
    string FileName "name only — no bytes stored"
    string Status "approved draft rejected"
  }
```

**Nothing on this screen is stored twice.**

| Not a column | Why | Where it comes from |
|---|---|---|
| `IsCurrent` | Two answers to one question; they disagree the first time an old revision is inserted late | `DocumentRevisions.Current` — the highest `No` |
| `Superseded` | Same | `DocumentRevisions.IsSuperseded` — a higher `No` exists |
| Document `Status` | A document has no status; its *current revision* does — which is why a drawing can be معتمد at R1 and مسوّدة at R2 | projected from the current revision |
| `UnderReview` count | A stored counter goes stale the moment a revision lands | `DocumentRevisions.UnderReview` |

**`EP-DOC-01` writes nothing.** «رفع وثيقة» and «رفع مراجعة» are demo stubs and
say so in a toast — the insert path is not built.

---

## 4. What the screen can look like

```mermaid
stateDiagram-v2
  [*] --> Loading
  Loading --> Error: request failed
  Loading --> EmptyDb: rows = 0
  Loading --> Data: rows > 0
  Error --> Loading: retry

  EmptyDb: no documents on this project<br/>the database is empty
  NoMatch: no documents match the filters<br/>folder / status / search excluded everything<br/>offers clear filters

  Data --> NoMatch: filter or search
  NoMatch --> Data: clearFilters()

  state Data {
    [*] --> Latest
    Latest: latest revision only ON<br/>one row per DOCUMENT, current revision
    AllIssues: toggle OFF<br/>one row per REVISION, superseded ones marked
    Latest --> AllIssues: toggle
    AllIssues --> Latest: toggle
    --
    [*] --> Closed
    Closed --> Panel: click a row
    Panel --> Closed: click it again
    state Panel {
      [*] --> Revisions
      Revisions: revision history — current above superseded
      Details: details + the notice naming preview and stamps
      Revisions --> Details
      Details --> Revisions
    }
  }
```

The two empty states are different states with different messages and different
buttons (`04 §9`): an empty database is not an over-filtered register.

---

## 5. Where to change what

| Change | File |
|---|---|
| Which revision is current, what counts as ملغاة, what «قيد المراجعة» means | `api/Epm.Api/Domain/DocumentRevisions.cs` |
| Folder order, status chips, what the row carries | `api/Epm.Api/Features/Documents/DocumentsEndpoints.cs` |
| A field on the register or the panel | `DocumentsDto.cs` **and** `documents.types.ts` — same names |
| Discipline names, issue-status names | `Lookups` rows `doc-discipline` · `doc-status` — not code |
| Column layout, the toggle, the panel tabs | `documents.page.html` |
| Screen chrome text | `core/lang.ts` `doc_*` |

---

## 6. Known gaps

- **No write path.** «رفع وثيقة» and «رفع مراجعة» are stubs. Inserting a
  revision is the one write this screen wants, and it is deliberately not built
  until there is a file store to put bytes in.
- **المعاينة and التأشيرات are named, not drawn** (P-118). No file contents are
  stored and no flow records a stamp, so the two tabs the plate shows are
  described in a notice inside التفاصيل rather than opened onto nothing.
- **No transmittal record.** `TransmittalNo` is a string on the revision; the
  transmittal itself — its covering letter, its recipients, its date out — has
  no table. الشكل 46 does not draw one either.
- **No link to the change order that caused a re-issue.** «مطابقة للمنفَّذ»
  revisions usually follow an applied VO; nothing joins the two yet.
