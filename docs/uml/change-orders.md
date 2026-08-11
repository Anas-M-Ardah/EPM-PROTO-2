# UML — Change orders, the register (Phase 5.1)

**SCR-W8** — every change order on a project, grouped by lifecycle, with the
viewer's own relation to each one.

Endpoint **`EP-CHG-01`**. Reference component: **`DModVO`**
`app/vo-record.jsx:454` — the v1.1 branch, `../epm@design/system-revamp`.

> **ROADMAP names `project-modules.jsx:1142`. That is the PRE-v1.1 component.**
> v1.1 moved the whole module into its own file and says so at
> `vo-record.jsx:4`: *"Loaded after project-modules.jsx so this DModVO replaces
> the earlier one."* The rows already built carry their corrected v1.1 line;
> this one did not, and now does.

This is the first screen whose CONTENT depends on who is looking.

---

## 1. What files make up this feature

```mermaid
graph RL
  subgraph BROWSER["web/ — Angular"]
    PG["features/change-orders/<br/>change-orders.page.ts + .html"]
    API_TS["features/change-orders/change-orders.api.ts"]
    TY["features/change-orders/change-orders.types.ts"]
    CAPI["core/api.ts<br/><i>attaches X-Epm-User</i>"]
    PER["core/persona.ts<br/><i>the identity — P-05</i>"]
    LKP["core/lookups.ts<br/><i>co-lifecycle · co-type</i>"]
    PILL["shared/status-pill.component.ts"]
    STRIP["shared/summary-strip.component.ts"]
  end

  subgraph API["api/ — .NET 9 minimal API"]
    EP["Features/ChangeOrders/ChangeOrdersEndpoints.cs"]
    DTO["Features/ChangeOrders/ChangeOrdersDto.cs"]
    VR["Domain/ViewerRelation.cs<br/><b>BR-14 — relation + CanAct</b>"]
    SLA["Domain/SlaLeadTime.cs<br/><b>BR-12 — lead time · avg cycle</b>"]
    PRS["Features/Dev/Personas.cs<br/><i>Party drives BR-14</i>"]
    DB["Data/EpmDb.cs"]
  end

  subgraph SQL["SQL Server — EpmPrototype"]
    T1[("Projects")]
    T2[("Contracts")]
    T3[("ChangeOrders")]
    T4[("ChangeOrderStages")]
    T5[("ChangeOrderAttachments")]
  end

  PG --> API_TS
  PG --> PER
  PG --> LKP
  PG --> PILL
  PG --> STRIP
  API_TS --> TY
  API_TS --> CAPI
  CAPI -.->|"HTTP + X-Epm-User"| EP
  EP --> DTO
  EP --> VR
  EP --> SLA
  EP --> PRS
  EP --> DB
  DB --> T1
  DB --> T2
  DB --> T3
  DB --> T4
  DB --> T5
```

---

## 2. The request, end to end

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant PG as change-orders.page.ts
  participant A as change-orders.api.ts
  participant EP as ChangeOrdersEndpoints.cs
  participant D as Domain/
  participant DB as SQL Server

  U->>PG: opens /projects/PRJ-0279/changeorders
  PG->>A: list(projectId)
  A->>EP: GET …/change-orders  (X-Epm-User: user.re-dept)
  EP->>EP: Personas.Resolve(header) → Party, IsDelegate
  EP->>DB: ChangeOrders WHERE ContractId IN (project's contracts)
  EP->>DB: ChangeOrderStages · attachment counts
  loop per order
    EP->>EP: applicable stages only — a skipped stage owns nobody
    EP->>D: ViewerRelation.For(party, delegate, lifecycle, current, …)
    D-->>EP: awaiting · recorder · acted · upcoming · none  (BR-14)
    EP->>D: SlaLeadTime.For(dataDate, incomingDate)
    D-->>EP: leadDays, overdue  (BR-12, from the DATA DATE — D-06)
  end
  EP->>D: SlaLeadTime.AverageCycleDays(closed only)
  D-->>EP: 84 — null if nothing has closed  (P-09)
  EP-->>PG: rows + groups + five indicators + awaitingMe

  U->>PG: switches persona
  Note over PG: a RE-READ, not a re-filter. The relations on screen<br/>were computed for somebody else, and BR-14 is the<br/>server's answer (03 §7).
  PG->>EP: GET …/change-orders  (X-Epm-User: user.co-committee)
  EP-->>PG: same six orders, different relations — awaitingMe 1 → 3
```

---

## 3. What it reads and writes

```mermaid
erDiagram
  PROJECTS ||..o{ CONTRACTS : "ProjectId"
  CONTRACTS ||..o{ CHANGEORDERS : "ContractId — one order never spans two (01 §1)"
  CHANGEORDERS ||..o{ CHANGEORDERSTAGES : "ChangeOrderId"
  CHANGEORDERS ||..o{ CHANGEORDERATTACHMENTS : "ChangeOrderId"

  CHANGEORDERS {
    string No "VO-01 … VO-06"
    string Lifecycle "06 §7 — draft · pending · returned · approved · applied_partial · closed · rejected · cancelled"
    decimal RequestedValue "what was asked"
    decimal ApprovedValue "what the committee decided — NEVER overwrites the request"
    decimal AppliedValue "what actually moved onto the contract"
    string WeightRecalcState "failed → فشل التطبيق on the register"
    date IncomingDate "BR-12 measures the lead time from here"
    date DecisionDate "with IncomingDate, the closed order's cycle time"
  }
  CHANGEORDERSTAGES {
    int StageNo "BR-13's six-stage chain"
    string OwnerParty "compared against Persona.Party — this IS BR-14's input"
    bool Applicable "a conditional stage that did not apply (03 §2)"
    string SkipReason "kept, never dropped — 5.4 renders the list"
    string Status "pending · active · done · returned"
    date SentAt "the STAGE clock, distinct from the order's"
    int SlaDays "BR-12's per-stage ceiling"
  }
```

**Written by this screen:** nothing. The register lists and filters; every
decision, transition and attachment is Phase 5.2 and 5.4.

**Derived, never stored:** the viewer relation, `canAct`, every exception chip,
the lead time, the group counts and all five indicators.

> **`ChangeOrderStage` and `ChangeOrderAttachment` are registered in 5.1, not
> 5.4** — the same call 4.2 made about `Activity`. `03 §10` puts "current stage
> · current owner" and the attachment count in the register's own row spec, and
> BR-14 resolves the relation off the stage chain. The register cannot be built
> without either.

---

## 4. The two axes, and why they are separate

```mermaid
stateDiagram-v2
  [*] --> Loading
  Loading --> Error : request failed
  Error --> Loading : retry
  Loading --> NoOrders : this project has none
  Loading --> Register : rows

  state Register {
    [*] --> All
    All --> Lifecycle : a Z6 tab — the SAME for every viewer
    All --> Attention : a toolbar chip — depends on WHO IS LOOKING
    All --> Text : free search over no · title · justification · letter
    Lifecycle --> NoMatch : the filters excluded everything
    Attention --> NoMatch
    Text --> NoMatch
    NoMatch --> All : clear filters
  }
```

`NoOrders` and `NoMatch` are **two different empty states with two different
messages and two different buttons** (`04 §9`).

The reference's own comment is the reason they are separate axes: *"Lifecycle is
one axis and follows the workflow order; attention is another and depends on who
is looking. Mixing them was why «بحاجة إلى إجراء» sat next to «المعتمدة» as if
they answered the same question."*

---

## 5. Where to change what

| To change… | Edit |
|---|---|
| how a relation is resolved, or what may act | `Domain/ViewerRelation.cs` |
| the lead time, the per-stage SLA, the cycle average | `Domain/SlaLeadTime.cs` |
| when an exception chip fires | `Row()` in `Features/ChangeOrders/ChangeOrdersEndpoints.cs` |
| the whole-order overdue ceiling | `OrderOverdueDays` in the same file |
| which lifecycles share a group | `groupOf` in `change-orders.page.ts` **and** the groups list in the endpoint — they must agree |
| a lifecycle or type **label** | `Features/Lookups/LookupCatalog.cs` (`co-lifecycle`, `co-type`) — never `lang.ts` |
| a column heading, a chip, an empty state | `core/lang.ts` (`chg_*`) |
| the six seeded orders | `Features/Dev/Fixture.cs` → `ChangeOrders(db)` |

---

## 6. Known gaps

- **No record page, no decisions, no wizard.** 5.2, 5.3 and 5.4. The register
  says so in a message bar rather than offering a row click that goes nowhere.
- **`recorder` is unreachable.** It needs `ChangeOrderExternalParty` to know an
  external party is pending, which 5.4 registers. The endpoint passes
  `externalPartyPending: false` explicitly rather than guessing — a relation
  claimed without its input would be worse than one that never fires.
- **A returned order's re-opened stage is fixture data, not a transition.**
  VO-03 sits with the RE department because the fixture says so; the machine
  that puts it there is 5.4.
- **Exception chips are computed, not stored.** `03 §10` treats them as
  exceptions on top of the lifecycle, so nothing persists them — which also
  means they move with the data date, as they should.

---

## 7. Three things worth knowing before changing this screen

**The relation is the server's answer, always** (`03 §7`, BR-14). `canAct`
arrives as a boolean. The browser never recomputes it and never infers it from a
party name, because it is the entire authorisation model for an order — and the
identity being a fake header (P-05) is exactly why what that identity may do has
to be decided somewhere the browser cannot reach.

**"Pending" and "overdue" are different sets, and the fixture proves it.**
`06 §12` seeds VO-02 at 22 days and VO-06 at 5 for no other reason. If they ever
collapsed, the «متأخر» chip would be a synonym for «قيد الاعتماد». The same care
separates the WHOLE-ORDER ceiling (14 days since the incoming letter) from the
PER-STAGE SLA (BR-12) — an order can breach either without the other.

**Approving changes nothing** (`02 §9`). Net approved sums approved orders, and
none of that money is on any contract until it is APPLIED. VO-05 is approved and
untouched; its 3,000,000 appears in no contract total anywhere in the system, and
the register says so under the table rather than leaving a reader to assume the
figure is binding.
