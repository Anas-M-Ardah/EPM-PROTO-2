# UML — Meetings & Actions (Phase 6)

**SCR-W11** — الاجتماعات والإجراءات · **ملحق الشكل 45**.
Endpoint **`EP-MTG-01`** · `GET /api/projects/{projectId}/meetings`

Reference component: **`DModMeetings`** — `project-modules.jsx:1365`.

Two lists side by side: محاضر الاجتماعات — each minute carrying **one** قرار —
and إجراءات المتابعة, the actions those minutes produced.

**«متأخر» is a stored value, not a derivation** (P-116). The first cut computed
lateness from the due date against the project data date, the way BR-12 times a
payment desk. الشكل 45 refutes it on its own face: ACT-02 is due 2026-05-10
against a data date of 2026-08-11 and reads «قيد التنفيذ», while ACT-01 reads
«متأخر». Both are past due; only one is marked. This register is maintained by
whoever keeps the minutes, and lateness on it is their judgement.

---

## 1. What files make up this feature

```mermaid
graph RL
  subgraph BROWSER["web/ — Angular"]
    PG["features/meetings/<br/>meetings.page.ts + .html"]
    API_TS["features/meetings/<br/>meetings.api.ts"]
    TY["features/meetings/<br/>meetings.types.ts"]
    CAPI["core/api.ts"]
    LANG["core/lang.ts<br/><i>mtg_* chrome only</i>"]
    LKP["core/lookups.ts<br/><i>action-priority · action-status</i>"]
    SEC["shared/section.component.ts"]
    SKEL["shared/table-skeleton.component.ts"]
    TOAST["shared/toast.service.ts<br/><i>demo() — attachments say so</i>"]
  end

  subgraph API["api/ — .NET 9 minimal API"]
    EP["Features/Meetings/<br/>MeetingsEndpoints.cs"]
    DTO["Features/Meetings/<br/>MeetingsDto.cs"]
    SCOPE["Features/Workspaces/<br/>WorkspaceScope.cs"]
  end

  subgraph SQL["SQL Server — EpmPrototype"]
    T1[("Projects")]
    T2[("Meetings")]
    T3[("MeetingActions")]
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
  EP --> DTO
  EP --> T1
  EP --> T2
  EP --> T3
  EP --> T4
  TY -.->|"names must match:<br/>heldOn · decisionAr · dueDate · meetingId"| DTO
```

> **No `Domain/` file.** This is the rare screen with no arithmetic at all —
> every value on it was typed into the minutes. Adding a rule here would be
> inventing one (see the P-116 note above).

---

## 2. What happens when the tab opens

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant PG as meetings.page.ts
  participant AP as meetings.api.ts
  participant EP as EP-MTG-01
  participant DB as SQL

  U->>PG: opens /projects/{id}/meetings
  PG->>AP: list(projectId)
  AP->>EP: GET /api/projects/{id}/meetings
  EP->>DB: Projects.First(Id)
  EP->>EP: WorkspaceScope.Deny(ctx, WorkspaceCode)
  EP->>DB: Meetings.Where(ProjectId).OrderByDescending(HeldOn)
  EP->>DB: MeetingActions.Where(MeetingId in ids).OrderBy(Code)
  EP->>EP: KindOf(FileName) → "PDF" for the attachment card
  EP-->>AP: MeetingsResponse(meetings, actions)
  AP-->>PG: data.set(model)
  PG-->>U: two chips — محاضر الاجتماعات · إجراءات المتابعة

  U->>PG: clicks the actions chip
  PG->>PG: tab.set('actions')
  Note over PG: no second request — BOTH lists arrived together,<br/>and each action carries its meetingId
```

---

## 3. What it reads and writes

```mermaid
erDiagram
  Projects ||..o{ Meetings : "ProjectId — plain column, no FK"
  Meetings ||..o{ MeetingActions : "MeetingId — plain column, no FK"
  Lookups ||..o{ MeetingActions : "Kind=action-priority / action-status"

  Meetings {
    int Id PK
    string ProjectId "to Projects.Id"
    string TitleAr
    string TitleEn
    DateOnly HeldOn
    string DecisionAr "ONE decision per minute, as the plate has it"
    string DecisionEn
    string FileName "name only — no bytes stored; FileKind is derived from its extension"
  }

  MeetingActions {
    int Id PK
    int MeetingId "to Meetings.Id"
    string Code "ACT-01"
    string TitleAr
    string TitleEn
    string Owner "المسؤول"
    DateOnly DueDate
    string Priority "lookup action-priority"
    string Status "lookup action-status — open inprogress overdue closed;<br>overdue is STORED (P-116)"
  }
```

**`EP-MTG-01` writes nothing.** Recording a minute, closing an action and
attaching a file are not built.

---

## 4. What the screen can look like

```mermaid
stateDiagram-v2
  [*] --> Loading
  Loading --> Error: request failed
  Loading --> EmptyDb: meetings = 0
  Loading --> Data: meetings > 0
  Error --> Loading: retry

  EmptyDb: no minutes recorded on this project

  state Data {
    [*] --> Minutes
    Minutes: محاضر الاجتماعات — newest first, one decision each
    Actions: إجراءات المتابعة — every action on the project
    Minutes --> Actions: chip
    Actions --> Minutes: chip
    NoActions: minutes exist but no action was raised<br/>says so instead of showing an empty table
    Actions --> NoActions: actionCount = 0
  }
```

---

## 5. Where to change what

| Change | File |
|---|---|
| What the minute or the action carries | `api/Epm.Api/Features/Meetings/MeetingsEndpoints.cs` |
| A field on either list | `MeetingsDto.cs` **and** `meetings.types.ts` — same names |
| Priority / status names, including whether متأخر exists | `Lookups` rows `action-priority` · `action-status` — not code |
| Layout of the two lists | `meetings.page.html` |
| Screen chrome text | `core/lang.ts` `mtg_*` |

---

## 6. Known gaps

- **Read-only.** No minute is recorded and no action is closed from this screen.
- **One decision per minute.** الشكل 45 shows a single قرار per محضر, so
  `DecisionAr/En` are columns rather than a table. A minute with three decisions
  has nowhere to put the other two.
- **Attendees are not recorded.** The plate does not list them either.
- **No link to what an action is about.** An action referring to a change order
  or a BOQ item is plain text; nothing joins it to that record.
- **The two lists never scope each other.** Every action carries its
  `meetingId`, but the screen shows them as two chips over the whole project —
  which is what الشكل 45 draws. Filtering the actions to one minute is a
  one-signal change if it is ever wanted.
- **Lateness is nobody's job here.** Because «متأخر» is stored, an action can sit
  past its due date reading «قيد التنفيذ» indefinitely — which is what the plate
  shows, and a real deployment would want a report that says so.
