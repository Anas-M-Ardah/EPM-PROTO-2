# UML — Contract tab (Phase 4.1)

**SCR-W3** — the project's contracts and their amendment chain (`04 §7`).
Endpoints **`EP-CON-01`** `GET /api/projects/{id}/contracts` ·
**`EP-CON-02`** `GET /api/projects/{id}/contracts/{contractId}`

Reference components: **`DModContractNew`** `app/project-modules.jsx:363` ·
**`DContractAmendments`** `app/contract-amendments.jsx:301` — the v1.1 branch,
`../epm@design/system-revamp`.

This is the screen where **approved ≠ applied** stops being a rule in a
document and becomes two tables that must not be added together.

---

## 1. What files make up this feature

```mermaid
graph RL
  subgraph BROWSER["web/ — Angular"]
    PG["features/contract-tab/<br/>contract.page.ts + .html"]
    API_TS["features/contract-tab/contract.api.ts"]
    TY["features/contract-tab/contract.types.ts"]
    CAPI["core/api.ts"]
    LKP["core/lookups.ts<br/><i>amendment-state · payment-*</i>"]
    SEC["shared/section.component.ts"]
    PILL["shared/status-pill.component.ts"]
    SKEL["shared/table-skeleton.component.ts"]
    MODS["features/workspace/project-modules.ts<br/><i>built: true</i>"]
  end

  subgraph API["api/ — .NET 9 minimal API"]
    EP["Features/ContractTab/<br/>ContractEndpoints.cs"]
    DTO["Features/ContractTab/ContractDto.cs"]
    AMD["Domain/Amendments.cs<br/><b>BR-09 — the chain</b>"]
    PEN["Domain/Penalty.cs<br/><b>BR-10 — before · after · waived</b>"]
    PV["Domain/ProjectValue.cs<br/><b>BR-00</b>"]
    CAT["Features/Lookups/LookupCatalog.cs<br/>ADDENDUM §A5 — payment kind/status"]
    DB["Data/EpmDb.cs"]
  end

  subgraph SQL["SQL Server — EpmPrototype"]
    T1[("Projects")]
    T2[("Contracts")]
    T3[("ContractAmendments")]
    T4[("Payments")]
  end

  PG --> API_TS
  PG --> LKP
  PG --> SEC
  PG --> PILL
  PG --> SKEL
  MODS -.->|"routes to"| PG
  API_TS --> TY
  API_TS --> CAPI
  CAPI -.->|"HTTP"| EP
  EP --> DTO
  EP --> AMD
  EP --> PEN
  EP --> PV
  EP --> DB
  CAT --> DB
  DB --> T1
  DB --> T2
  DB --> T3
  DB --> T4
  TY -.->|"names must match:<br/>effectiveValue · projectionValue · waived"| DTO
```

> **One new table: `Payments`.** Nothing in the system could say what had been
> paid until now — which is why SCR-E1's financial tiles and four rows of the
> SCR-E7 catalog were rendering "unavailable".

---

## 2. The request, end to end

```mermaid
sequenceDiagram
    autonumber
    actor U as Viewer
    participant P as contract.page.ts
    participant A as contract.api.ts
    participant E as ContractEndpoints.cs
    participant AM as Domain/Amendments
    participant PN as Domain/Penalty
    participant DB as SQL Server

    U->>P: open /projects/PRJ-0279/contract
    P->>A: register('PRJ-0279')
    A->>E: GET …/contracts  [EP-CON-01]
    E->>DB: Contracts · ContractAmendments · Payments
    E->>AM: Effective(original, deltas) per contract
    AM-->>E: value + finish IN FORCE (BR-09)
    E-->>P: rows + original / addendaImpact / effective

    Note over P: one contract → skip the register entirely
    U->>P: open a contract
    P->>A: detail('PRJ-0279', 'CNT-0279')
    A->>E: GET …/contracts/CNT-0279  [EP-CON-02]
    E->>E: contract scoping — c.ProjectId must match

    loop each APPLIED amendment, in order
        E->>AM: Apply(running, deltaValue, deltaDays)
        AM-->>E: the running contract after that link
    end
    Note over E: approved-but-unapplied are applied on top of<br/>EFFECTIVE into a SEPARATE list — never chained in

    E->>PN: Compare(orig value/finish, effective value/finish, forecast)
    PN-->>E: before · after · WAIVED (BR-10)
    E-->>A: contract + money + versions + pending<br/>+ penalty + payments + unavailable[]
    A-->>P: response
    P-->>U: reconciliation · position · chain · pending · penalty
```

---

## 3. What it reads

```mermaid
erDiagram
    CONTRACTS {
        string Id PK
        string ProjectId
        decimal OriginalValue "NEVER overwritten"
        date OriginalFinish "NEVER overwritten"
        int OriginalDurationDays
        date ForecastFinish "nullable — no forecast means no penalty figure"
        decimal AwardAmount
        decimal ReserveAmount
        decimal SupervisionAmount
        string IncomingNo
        string Contractor
        string Consultant
    }

    CONTRACT_AMENDMENTS {
        int Id PK
        string ContractId
        int No "0 = the original; 1..n"
        int SourceChangeOrderId "null until Phase 5.1 exists"
        decimal DeltaValue
        int DeltaDays
        datetime AppliedAt "NULL = approved but NOT applied"
    }

    PAYMENTS {
        int Id PK
        string ContractId
        int No
        string Kind "payment-kind — ADDENDUM §A5"
        string FinanceLetterNo "03 §3 — recorded against an official letter"
        decimal GrossAmount
        decimal RetentionAmount
        decimal AdvanceRecovery
        decimal NetAmount
        date CertifiedDate
        date PaidDate
        string Status "pending → certified → paid"
    }

    CONTRACTS ||..o{ CONTRACT_AMENDMENTS : "ContractAmendments.ContractId = Contracts.Id — NO FK"
    CONTRACTS ||..o{ PAYMENTS : "Payments.ContractId = Contracts.Id — NO FK"
```

**`EP-CON-01` and `EP-CON-02` write nothing** — every figure on them is derived at
projection time. المسار 2's `EP-CON-03` / `EP-CON-04` are the contract tab's only
writes, and they touch `Contracts` alone.

### The three values, and why they are three

| Figure | How | Never |
|---|---|---|
| **Original** | `Contracts.OriginalValue`, stored | overwritten (non-negotiable #6) |
| **Effective** | original + Σ **applied** deltas — `Amendments.Effective` (BR-09) | includes an unapplied amendment |
| **Projection** | effective + Σ **unapplied** deltas — `Amendments.Projection` (`02 §9`) | added into any total on the screen |

`CNT-0279`: awarded **240,000,000**, one applied amendment → effective
**250,000,000**, one approved-and-unapplied → projection **253,000,000**. The
contract is worth 250,000,000 today.

### Disbursed is `paid`, not `certified`

`Payments.Status` is a sequence — pending → certified → paid — and the gap
between the last two is exactly where a delayed project's money sits.
`EP-CON-01` sums only `paid` into **disbursed**; `certified` is its own figure.
On `CNT-0279` that is 76,700,000 against 117,925,000.

---

## 4. What the screen can look like

```mermaid
stateDiagram-v2
    [*] --> Loading
    Loading --> NotFound: 404 — no such project, or the contract is another project's
    Loading --> Error: request failed
    Loading --> NoContract: the project has none
    Loading --> Register: 2+ contracts, none selected
    Loading --> Record: a contract is in the URL, or there is only one
    Error --> Loading: Retry

    NoContract: A project is registered before it is awarded.
    Register --> Record: pick a row
    Record --> Register: back (hidden when there is only one)

    state Record {
        Overview: reconciliation · position · cost breakdown
        Details: identity · dates & duration
        Payments: the certificates, or an empty state
        Amend: chain · approved-not-applied · penalty
    }
```

---

## 5. Where to change what

| Change | File |
|---|---|
| A column, a sub-tab, the reconciliation layout | `web/…/features/contract-tab/contract.page.html` |
| Sub-tab state, bar geometry, label resolution | `…/contract.page.ts` |
| Chrome strings | `web/src/app/core/lang.ts` (`con_*`) |
| Amendment-state / payment labels | `Features/Lookups/LookupCatalog.cs` (06 §8 · ADDENDUM §A5) |
| How the chain is built | `api/…/Domain/Amendments.cs` (BR-09) — **not** the endpoint |
| How the penalty is computed | `api/…/Domain/Penalty.cs` (BR-10) — **not** the endpoint |
| What counts as disbursed | `ContractEndpoints.cs` — the `Status == "paid"` filter |
| The payload shape | `ContractDto.cs` **and** `contract.types.ts` |

---

## 6. Known gaps

| # | Gap | Why it is a gap and not a defect |
|---|---|---|
| 1 | **An amendment cannot name the order that created it.** The Change order column is an em dash on every row, with a note saying so. | `ContractAmendments.SourceChangeOrderId` has nothing to point at until the change-order register exists (Phase 5.1). Stated rather than left blank (P-09). |
| 2 | **Spend is not split across award / reserve / supervision.** All three show their amount and no spend, with the reason printed. | A payment is recorded against the CONTRACT. Apportioning it across the three expense items would be an allocation nobody authorised. |
| 3 | **No financial %.** The money is shown; the percentage is not. | `02 §4` says financial % "comes from payments" without fixing the denominator — effective value or total contract cost including reserve and supervision. Choosing one would be a guess with a number attached (P-44). |
| 4 | **The penalty's "no forecast" branch is not exercised by the fixture.** Every fixture contract carries a `ForecastFinish`. | The branch exists and returns `unavailable: true`; nothing in the seeded data reaches it. |
| ~~5~~ | ~~**No edit mode, no "add contract".** Both are demo toasts.~~ **CLOSED by المسار 2** — `EP-CON-03` creates, `EP-CON-04` updates, `EP-CON-05` reads the definition back, on the same shape المسار 1 uses for a project. | |
| 6 | **No per-payment record pane.** The reference opens a Z8 drawer with the payment's line items and attachments. | Payments have no line items in this model — `04 §7`'s certificate breakdown belongs to Phase 4.4's Financials screen. |
| 7 | **The reference's penalty formula is NOT the one used.** | See §7. |

---

## 7. Two things this screen does that the reference does not

**It keeps the projection out of every total.** The reference renders one
`projected` figure beside the effective one; here the approved-but-unapplied
amendments are a **separate table with its own heading** — «الاعتماد لا يغيّر
العقد — هذه الأرقام غير مضافة إلى أي مجموع أعلاه» — and their columns are
labelled *value if applied* rather than *value*. `02 §9` is the rule; making the
two tables impossible to read as one list is how the screen enforces it.

**It uses the specification's penalty rule, not the reference's.** v1.1 computes
the daily penalty as `value × rate / duration` with `rate` between 10% and 25%,
citing Regs 2/2014 — a total ceiling reached when the delay equals the full
contract duration. `02 §10` and D-02 say **0.1% per day, capped at 10%**. The
written spec owns the arithmetic and the reference owns the screen (CLAUDE.md
§1), so `Domain/Penalty.cs` is unchanged and its tests still pass. **The
divergence is real and is recorded as P-45 for the client to settle** — on
`CNT-0279` the two rules give materially different money.

On that contract the current rule reports: 61 days and 14,640,000 before the
amendments, 16 days and 4,000,000 after, **10,640,000 waived** — which is what
the 45-day extension bought. `CNT-0207` is the other case: 135 days late and the
penalty pinned at its 10% cap of 3,120,000, with nothing waived because that
contract has no amendments.
