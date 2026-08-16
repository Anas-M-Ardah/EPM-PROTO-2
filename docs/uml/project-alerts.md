# UML — Project Alerts (Phase 6)

**SCR-W13** — التنبيهات · **ملحق الشكل 47**.
Endpoints **`EP-PAL-01`** · **`EP-PAL-02`**

Reference component: **`DModAlerts`** — `alerts-module.jsx:20`.

The plate carries a notice of its own, above the rules table:

> «إيقاف قاعدة يوقف التنبيهات التي أنتجتها فورًا — التنبيه ليس سجلًا مستقلًا
> يُحرَّر.»

That sentence is a rule, not a caption. It is `Domain/AlertInbox.Live`, and the
switch on every row of the table proves it: turning R5 off takes the footer from
«التنبيهات 8 · تحتاج إجراءً 3» to «7 · 2», and turning it back on restores both
— with the acknowledgements already recorded on those alerts intact.

---

## 1. What files make up this feature

```mermaid
graph RL
  subgraph BROWSER["web/ — Angular"]
    PG["features/project-alerts/<br/>project-alerts.page.ts + .html"]
    API_TS["features/project-alerts/<br/>project-alerts.api.ts"]
    TY["features/project-alerts/<br/>project-alerts.types.ts"]
    CAPI["core/api.ts"]
    LANG["core/lang.ts<br/><i>pal_* chrome only</i>"]
    LKP["core/lookups.ts<br/><i>alert-severity · alert-kind ·<br/>alert-status · alert-recurrence · alert-bucket</i>"]
    SEC["shared/section.component.ts"]
    SKEL["shared/table-skeleton.component.ts"]
    TOAST["shared/toast.service.ts"]
  end

  subgraph API["api/ — .NET 9 minimal API"]
    EP["Features/ProjectAlerts/<br/>ProjectAlertsEndpoints.cs"]
    DTO["Features/ProjectAlerts/<br/>ProjectAlertsDto.cs"]
    DOM["<b>Domain/AlertInbox.cs</b><br/><i>Live · NeedsAction · Bucket · DaysToDue</i>"]
    ACK["Features/Alerts/<br/>AlertsEndpoints.cs<br/><i>EP-ALR-02 — the ack</i>"]
    SCOPE["Features/Workspaces/<br/>WorkspaceScope.cs"]
  end

  subgraph SQL["SQL Server — EpmPrototype"]
    T1[("Projects")]
    T2[("Alerts")]
    T3[("AlertRules")]
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
  CAPI -.->|"acknowledge()"| ACK
  EP --> SCOPE
  EP --> DOM
  EP --> DTO
  EP --> T1
  EP --> T2
  EP --> T3
  ACK --> T2
  PG --> T4
  TY -.->|"names must match:<br/>needsAction · bucket · daysToDue · escalateAfterHours"| DTO
```

> **Acknowledging is not this feature's write.** It is the Alerts Centre's
> `EP-ALR-02`, reused. One acknowledgement path means one place the persona is
> recorded (P-05); a second one here would be a second answer to who signed.

---

## 2. What happens when the tab opens

```mermaid
sequenceDiagram
  autonumber
  actor U as User
  participant PG as project-alerts.page.ts
  participant AP as project-alerts.api.ts
  participant EP as EP-PAL-01
  participant DM as Domain/AlertInbox
  participant W as EP-PAL-02
  participant DB as SQL

  U->>PG: opens /projects/{id}/alerts
  PG->>AP: list(projectId)
  AP->>EP: GET /api/projects/{id}/alerts
  EP->>DB: Projects.First(Id)
  EP->>DB: AlertRules.Where(ProjectId)
  EP->>DB: Alerts.Where(ProjectId).OrderByDescending(RaisedAt)
  EP->>DM: Live(alerts, rules) → a disabled rule's alerts drop out
  loop per live alert
    EP->>DM: Bucket(DueOn, dataDate) · DaysToDue(DueOn, dataDate)
  end
  EP->>DM: NeedsAction(live, dataDate) → open AND due
  EP-->>AP: ProjectAlertsResponse (inbox + rules, one payload)
  AP-->>PG: data.set(model)
  PG-->>U: «N تحتاج إجراءً الآن» · التنبيهات | القواعد

  U->>PG: flips a rule's switch
  PG->>W: POST /alert-rules/{code}/enabled {enabled}
  W->>DB: AlertRules.Enabled = enabled
  W-->>PG: {code, enabled}
  PG->>EP: list(projectId) again
  Note over PG,EP: the alerts that left, and the count that<br/>moved, are the SERVER re-running Live —<br/>the page patches nothing in place
```

---

## 3. What it reads and writes

```mermaid
erDiagram
  Projects ||..o{ Alerts : "ProjectId — plain column, no FK (null = enterprise-wide)"
  Projects ||..o{ AlertRules : "ProjectId — plain column, no FK"
  AlertRules ||..o{ Alerts : "Code to RuleCode — plain column, nullable, no FK"
  Lookups ||..o{ AlertRules : "alert-severity / alert-recurrence"

  AlertRules {
    int Id PK
    string ProjectId "to Projects.Id"
    string Code "R1 to R12"
    string NameAr
    string NameEn
    string TriggerAr "PROSE — recorded, not evaluated (P-119)"
    string TriggerEn
    string Severity "lookup alert-severity"
    bool ChannelInApp "in-app / email / SMS — none of them dispatch yet"
    bool ChannelEmail
    bool ChannelSms
    string Recurrence "lookup alert-recurrence"
    int EscalateAfterHours "null = بلا تصعيد; ONE number, the unit is formatting"
    bool Enabled "the switch — the only write on this screen"
  }

  Alerts {
    int Id PK
    string ProjectId
    string RuleCode "to AlertRules.Code; NULL when the system raised it on itself"
    string Severity
    string Kind
    string TitleAr
    string TitleEn
    string TargetRef
    DateTime RaisedAt "at the data date, never a wall clock (D-06)"
    DateOnly DueOn "null = a notice with no deadline"
    bool Acknowledged
    string AcknowledgedByUserId "the persona that signed (P-05)"
  }
```

**Nothing about the suppression is stored.**

| Not a column | Why | Where it comes from |
|---|---|---|
| `Suppressed` on the alert | A rule switch would have to rewrite every alert it produced, and a half-finished sweep leaves the two disagreeing | `AlertInbox.Live` filters at read time |
| `Bucket` | It changes every day without anything being written | `AlertInbox.Bucket(DueOn, dataDate)` |
| `NeedsAction` count | A stored counter goes stale the moment a rule is switched or an alert acknowledged | `AlertInbox.NeedsAction` |
| A parsed trigger expression | Nothing evaluates it — claiming otherwise is the defect (P-119) | prose in `TriggerAr/En` |

`EP-PAL-02` writes **one bool**. `EP-PAL-01` writes nothing.

---

## 4. What the screen can look like

```mermaid
stateDiagram-v2
  [*] --> Loading
  Loading --> Error: request failed
  Loading --> Data: loaded
  Error --> Loading: retry

  state Data {
    [*] --> Rules
    Rules: القواعد — twelve rows, a switch on each<br/>«12 مفعلة من 12»
    Inbox: التنبيهات — four fixed groups
    Rules --> Inbox: segmented control
    Inbox --> Rules: segmented control

    state Inbox {
      [*] --> HasAlerts
      HasAlerts: متأخرة · مستحقة اليوم · خلال هذا الأسبوع · لاحقاً<br/>empty groups are not drawn
      ZeroInbox: nothing is waiting on you<br/>a SUCCESS state, not an empty result
      NoSeverity: no alerts at this severity<br/>offers «عرض الكل»
      HasAlerts --> NoSeverity: severity chip
      NoSeverity --> HasAlerts: show all
      HasAlerts --> ZeroInbox: every rule switched off
    }

    state Rules {
      [*] --> HasRules
      NoRules: no rules on this project —<br/>without them nothing is raised automatically
      HasRules --> NoRules
    }
  }
```

An empty inbox is **not** "no records found". It is the healthy state, and it
says so with its own icon and its own words (`04 §9`).

---

## 5. Where to change what

| Change | File |
|---|---|
| What suppression means, what «تحتاج إجراءً» counts, where a group's boundary falls | `api/Epm.Api/Domain/AlertInbox.cs` |
| What the row or the rule carries, the chip counts | `api/Epm.Api/Features/ProjectAlerts/ProjectAlertsEndpoints.cs` |
| A field on either list | `ProjectAlertsDto.cs` **and** `project-alerts.types.ts` — same names |
| Severity, kind, recurrence and group names | `Lookups` rows — not code |
| The twelve rules themselves | `Features/Dev/Fixture.cs` `AlertRules(db)` — they are DATA |
| Layout, the switch, the group order on screen | `project-alerts.page.html` |
| Screen chrome text, the Arabic day forms | `core/lang.ts` `pal_*` |

---

## 6. Known gaps

- **No engine** (P-119). No scheduler evaluates a trigger, and no channel
  dispatches: «داخل النظام · بريد · رسالة» describes where a notification would
  go. `07 §2` lists real email and SMS as POC work. The screen states this under
  the table rather than leaving the reader to assume.
- **No rule editor.** الشكل 47 shows a «ضبط قواعد التنبيه» button; the switch is
  built and the editor behind that button is not. Severity, channels, recurrence
  and the escalation ceiling are fixture data.
- **No escalation timeline.** The reference's detail pane walks a rule's
  escalation chain — مدير المشروع → مدير القسم → الوكيل الفني — and nothing
  records those steps here, so no pane is drawn.
- **No snooze.** The reference feed carries a third status; nothing in `02` or
  `03` says when a snooze expires or who may set one, so it is not stored
  (`Alert.cs`).
- **Rules are per project with no catalogue.** A second project needs its own
  twelve rows; there is no enterprise default set to inherit from.
