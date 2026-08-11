# UML — Progress + Financials (Phase 4.4)

**SCR-W6** — where an activity's progress is entered and BR-04 reflects it onto
the BOQ. **SCR-W7** — the project's money: approved, revised, disbursed, and the
two balances neither of those contains.

Endpoints **`EP-PRG-01`**, **`EP-PRG-02`** and **`EP-FIN-01`**.

Reference components: **`DModProgress`** `app/project-modules.jsx:1391` ·
**`DModFinancialNew`** `:907` — the v1.1 branch, `../epm@design/system-revamp`.

> **The two screens are documented together because they are one derivation.**
> Physical %, EV, SPI and CPI appear on both, and both read them from the same
> `BoqEndpoints.Derive` and the same `Domain/EarnedValue` call. Splitting the
> document would be the first step towards splitting the arithmetic (P-54).

---

## 1. What files make up these features

```mermaid
graph RL
  subgraph BROWSER["web/ — Angular"]
    PGP["features/progress/<br/>progress.page.ts + .html"]
    PGA["features/progress/progress.api.ts"]
    PGT["features/progress/progress.types.ts"]
    FNP["features/financials/<br/>financials.page.ts + .html"]
    FNA["features/financials/financials.api.ts"]
    FNT["features/financials/financials.types.ts"]
    CAPI["core/api.ts<br/><i>get · put</i>"]
    FMT["core/format.ts<br/><i>index() — a ratio, never a %</i>"]
    STRIP["shared/summary-strip.component.ts<br/><i>dp — decimals for an index</i>"]
    LKP["core/lookups.ts<br/><i>payment-kind · payment-status</i>"]
  end

  subgraph API["api/ — .NET 9 minimal API"]
    EPP["Features/Progress/ProgressEndpoints.cs"]
    EPF["Features/Financials/FinancialsEndpoints.cs"]
    DRV["Features/Boq/BoqEndpoints.Derive<br/><b>internal — the ONE derivation</b>"]
    PR["Domain/ProgressReflection.cs<br/><b>BR-04 — reflection · rollup</b>"]
    EV["Domain/EarnedValue.cs<br/><b>BR-11 — CPI · SPI · EAC · VAC</b>"]
    PP["Domain/PlannedProgress.cs<br/><b>P-53 — planned % · remaining days</b>"]
    AM["Domain/Amendments.cs<br/><b>BR-09 — effective · projection</b>"]
    PV["Domain/ProjectValue.cs<br/><b>BR-00</b>"]
    PEN["Domain/Penalty.cs<br/><b>BR-10 — DelayDays</b>"]
    DB["Data/EpmDb.cs"]
  end

  subgraph SQL["SQL Server — EpmPrototype"]
    T1[("Projects")]
    T2[("Contracts")]
    T3[("ContractAmendments")]
    T4[("Activities")]
    T5[("BoqItems")]
    T6[("Payments")]
  end

  PGP --> PGA
  PGP --> STRIP
  PGP --> FMT
  FNP --> FNA
  FNP --> STRIP
  FNP --> LKP
  PGA --> PGT
  FNA --> FNT
  PGA --> CAPI
  FNA --> CAPI
  CAPI -.->|"HTTP"| EPP
  CAPI -.->|"HTTP"| EPF
  EPP --> DRV
  EPF --> DRV
  EPP --> PR
  EPP --> EV
  EPP --> PP
  EPP --> AM
  EPP --> PV
  EPP --> PEN
  EPF --> EV
  EPF --> PP
  EPF --> AM
  EPF --> PV
  DRV --> DB
  EPP --> DB
  EPF --> DB
  DB --> T1
  DB --> T2
  DB --> T3
  DB --> T4
  DB --> T5
  DB --> T6
```

---

## 2. The write, end to end — `02 §4`'s own example

```mermaid
sequenceDiagram
  autonumber
  participant U as User
  participant PG as progress.page.ts
  participant A as progress.api.ts
  participant EP as ProgressEndpoints.cs
  participant D as Domain/
  participant DB as SQL Server

  U->>PG: opens /projects/PRJ-0279/progress
  PG->>A: get(projectId)
  A->>EP: GET …/progress  [EP-PRG-01]
  EP->>DB: Contracts · Activities · Payments · ContractAmendments
  EP->>EP: BoqEndpoints.Derive(contract, "cost")  — the ONE derivation
  EP->>D: ProgressReflection.For(links, amount, qty)
  D-->>EP: BQ-003 31.64% → 8,456,400  (BR-04)
  EP->>D: PlannedProgress.PlannedPct(baseline, asOf)
  D-->>EP: 100% — the baseline required it all by 2026-08-02  (P-53)
  EP->>D: EarnedValue.For(budget, planned, actual, ac)
  D-->>EP: SPI 0.49 · CPI 1.99  (BR-11)
  EP-->>PG: ProgressResponse

  U->>PG: types 100 into A5's box
  Note over PG: BLOCKED BEFORE THE REQUEST if outside 0–100,<br/>or if a milestone is given anything but 0 or 100.<br/>The endpoint checks both again (04 §9).
  PG->>A: saveProgress(projectId, "A5", 100)
  A->>EP: PUT …/progress/activities/A5  [EP-PRG-02]
  EP->>EP: scope check — A5's contract belongs to this project, else 404
  EP->>D: PlannedProgress.RemainingDuration(121, 100) → 0
  EP->>DB: UPDATE Activities SET ProgressPct, RemainingDuration
  EP->>EP: rebuild the WHOLE model
  EP-->>PG: ProgressResponse
  Note over PG: BQ-003 → 52.73%, achieved 14,094,000;<br/>the contract roll-up, the project's physical %,<br/>EV, SPI and CPI all move with it.
```

**The response is the whole model, never the row that changed.** One activity's
progress moves every BOQ line it feeds, the contract executed value above those,
the project physical %, and through it EV, SPI and CPI. Patching one row into a
cached model would leave five figures on screen that no longer agree.

---

## 3. What they read and write

```mermaid
erDiagram
  PROJECTS ||..o{ CONTRACTS : "ProjectId"
  CONTRACTS ||..o{ ACTIVITIES : "ContractId"
  CONTRACTS ||..o{ BOQITEMS : "ContractId"
  CONTRACTS ||..o{ PAYMENTS : "ContractId"
  CONTRACTS ||..o{ CONTRACTAMENDMENTS : "ContractId"

  PROJECTS {
    string Id PK
    date DataDate "the planned figure is read AT this date (D-06)"
  }
  CONTRACTS {
    string Id PK
    decimal OriginalValue "the AWARDED value — and award_amount is the same money"
    decimal AwardAmount "01 §2.3's three expense items. NOT a partition (P-57)"
    decimal ReserveAmount
    decimal SupervisionAmount
    date ForecastFinish "BR-10's input"
  }
  ACTIVITIES {
    string ActivityId "A5 — 02 §4's own example"
    decimal ProgressPct "WRITTEN by EP-PRG-02"
    int RemainingDuration "WRITTEN with it — never allowed to contradict it"
    date BaselineStart "P-53 reads the baseline, never the forecast"
    date BaselineFinish
    decimal BudgetedCost "the weight basis both roll-ups divide by"
  }
  PAYMENTS {
    int No
    string Kind "interim · advance · final · retention-release"
    string Status "pending · certified · paid"
    decimal GrossAmount
    decimal RetentionAmount "counted only when the certificate is PAID"
    decimal AdvanceRecovery "same rule — a recovery happens when money moves"
    decimal NetAmount "gross − retention − recovery"
  }
```

**Written by these screens:** `Activities.ProgressPct` and
`Activities.RemainingDuration`, by `EP-PRG-02`. Nothing else. SCR-W7 does not
write at all — a certificate is raised against works measured on site, and the
reference's `DPaymentWizard` needs a measurement source this model lacks.

**Derived, never stored:** physical %, financial %, planned %, every BOQ line's
progress / achieved quantity / achieved amount / remaining value, contract
executed value, revised cost, disbursed, retention held, advance outstanding,
balance, and all four EVM indices.

---

## 4. What the screens can look like

```mermaid
stateDiagram-v2
  [*] --> Loading
  Loading --> Error : request failed
  Error --> Loading : retry
  Loading --> NoContract : the project has no contract

  Loading --> Summary : SCR-W6
  state Summary {
    [*] --> Headline
    Headline --> Activities : «إدخال الإنجاز»
    Headline --> Reflection : «الانعكاس على الكميات»
  }

  state Activities {
    [*] --> Row
    Row --> Editing : «تعديل»
    Editing --> Blocked : outside 0–100, or a fractional milestone
    Blocked --> Editing : corrected
    Editing --> Row : save (whole model rebuilt) / cancel
  }

  state Reflection {
    [*] --> Lines
    Lines --> Terms : a line is opened — share × progress, printed
    Terms --> Lines : closed
    Lines --> Unearnable : a line no activity is linked to
  }

  Loading --> Sheet : SCR-W7
  state Sheet {
    [*] --> Reconciliation
    Reconciliation --> Payments : «الدفعات»
    Payments --> Certificate : a row is picked
    Certificate --> Payments : closed
    Reconciliation --> Indices : «المؤشرات»
  }
```

---

## 5. Where to change what

| To change… | Edit |
|---|---|
| how a BOQ line's progress follows its activities | `Domain/ProgressReflection.cs` |
| what "planned" means, or the remaining-duration formula | `Domain/PlannedProgress.cs` |
| any EVM index | `Domain/EarnedValue.cs` |
| what a progress write refuses | `Features/Progress/ProgressEndpoints.cs` — and the mirror check in `progress.page.ts`'s `draftError` |
| what counts as disbursed, retained or recovered | `Features/Financials/FinancialsEndpoints.cs` |
| an index's rendering (a ratio, never a percentage) | `core/format.ts` `index()` |
| a KPI tile's decimals | `Stat.dp` in `shared/summary-strip.component.ts` |
| a column heading, a button, an empty state | `core/lang.ts` (`prg_*`, `fin_*`) |
| a payment **kind or status label** | `Features/Lookups/LookupCatalog.cs` — never `lang.ts` |

---

## 6. Known gaps

- **No payment wizard.** SCR-W7 reads. `DPaymentWizard` raises a certificate
  against measured works, and nothing records a measurement yet.
- **No annual allocation and no audit SLA** (P-56). Two of the reference's six
  tabs have no source in this data model; both say so with their reason rather
  than being invented from a payment date.
- **Disbursement is not split across cost components.** A payment cites a
  finance letter, not an award line, so splitting it per component would be an
  allocation nobody performed.
- **Progress does not move an activity's STATUS.** `ProgressPct` and `Status`
  are separate columns (`06 §9`), and a status is set by the section that owns
  the work. An activity can therefore read 100% and «متأخر» at once — which is
  true, and is what a late-but-finished activity is.
- **The S-curve is absent.** The reference generates it with a smoothstep over
  the project span. A curve of fabricated points cannot be labelled unavailable,
  so there is none — the same call SCR-W1 already made.

---

## 7. Three things worth knowing before changing these screens

**Planned progress is an ASSUMPTION, and it is the one figure here that is**
(P-53). `02` never defines it, but BR-11 needs it. It is linear across each
activity's own baseline span, on the same cost weights physical % uses, so SPI
compares like with like and a reader can re-derive it from two columns already
on the Schedule screen. Replacing it is one function.

**Paid is not certified, anywhere** (P-26). Disbursed, retention held and
advance outstanding all count PAID certificates only. `CNT-0279`'s third
certificate is certified and unpaid on purpose: counting it would report
2,425,000 of retention the ministry is not holding and 4,850,000 of advance the
contractor has not repaid.

**The three expense items are not parts of the contract** (P-57). `01 §2.3`
defines `original_value` as "the awarded value" and `award_amount` is that same
money, so award + reserve + supervision exceeds every contract by exactly the
two allowances. They live in their own table with their own heading; rendered as
an indented sub-tree they would out-total the row above them.
