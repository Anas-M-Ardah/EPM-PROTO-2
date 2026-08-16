# UML — Change orders, the CREATION WIZARD (Phase 5.3)

**المسار 9** — composing a change order: the contract, the type, the official
letter, the affected lines and activities, the impact, the documents, and the
decision to save it or send it.

Endpoints **`EP-WIZ-01`** · **`EP-WIZ-02`** · **`EP-WIZ-03`**. Reference
component: **`DVOCreateWizard`** `app/vo-wizard.jsx:6`. Binding plates:
**ملحق الأشكال 37–42**.

> **This is the one screen that WRITES a change order.** Everything else in the
> feature reads: the register lists, the record reports, and 5.4's decisions
> move an order that already exists.

---

## 1. What files make up this feature

```mermaid
graph RL
  subgraph BROWSER["web/ — Angular"]
    REG["features/change-orders/<br/>change-orders.page.ts<br/><i>opens it (الشكل 29)</i>"]
    WIZ["features/change-orders/<br/>change-order.wizard.ts + .html"]
    API_TS["features/change-orders/change-orders.api.ts<br/><i>wizardSource · preview · create</i>"]
    TY["features/change-orders/<br/>change-order-wizard.types.ts"]
    SEC["shared/section.component.ts"]
  end

  subgraph API["api/ — .NET 9 minimal API"]
    EP["Features/ChangeOrders/<br/>ChangeOrderWizardEndpoints.cs"]
    DTO["Features/ChangeOrders/ChangeOrderWizardDto.cs"]
    REC["Domain/ChangeOrderRecord.cs<br/><b>the split, shared with the record</b>"]
    TIER["Domain/TierSplit.cs<br/><b>BR-05 — the 20% rule</b>"]
    GATE["Domain/ChangeOrderGates.cs<br/><b>BR-07 — submission gates</b>"]
    WF["Domain/WorkflowMachine.cs<br/><b>BR-13 — the six-stage plan</b>"]
    WT["Domain/BoqWeights.cs<br/><b>BR-01 — the weight preview</b>"]
    BOQ["Features/Boq/BoqEndpoints.Derive()<br/><i>weights + executed qty, ONE derivation</i>"]
  end

  REG --> WIZ --> API_TS --> EP
  WIZ --> TY
  WIZ --> SEC
  EP --> DTO
  EP --> REC --> TIER
  EP --> GATE
  EP --> WF
  EP --> WT
  EP --> BOQ
```

**`Derive()` is reused, not re-derived** (P-54). A wizard that recomputed the
weight or the executed quantity could offer a line whose figures disagree with
the BOQ register the user just came from.

---

## 2. Three calls, and what each is for

```mermaid
sequenceDiagram
  participant U as دائرة المهندس المقيم
  participant W as change-order.wizard.ts
  participant E1 as EP-WIZ-01
  participant E2 as EP-WIZ-02
  participant E3 as EP-WIZ-03
  participant D as Domain/*

  U->>W: «أمر تغييري جديد»
  W->>E1: GET …/change-orders/new
  E1-->>W: contracts, each with ITS OWN lines + activities
  U->>W: pick contract · type · letter
  U->>W: add a line, type both proposals
  W->>E2: POST …/preview  (debounced 300ms)
  E2->>D: ChangeOrderRecord.For() ×2 · BoqWeights · Gates · Plan
  E2-->>W: split · nets · weights · expected path · issues
  U->>W: «إرسال للمراجعة»
  W->>E3: POST …/change-orders?kind=submit
  E3->>D: Gates.Validate()  → 422 if any
  E3->>D: WorkflowMachine.Plan()
  E3-->>W: {no, lifecycle}
  W-->>U: the new order's RECORD (EP-CHG-02)
```

**Why a preview endpoint exists at all:** `03 §8` and الشكل 39 recalculate as the
two proposals are typed, and CLAUDE.md §3.1 forbids computing that in Angular.
The round trip is the price of one implementation of BR-05 instead of two
(P-106).

---

## 3. What it writes

```mermaid
erDiagram
  CHANGE_ORDERS ||..o{ CHANGE_ORDER_LINES : "ChangeOrderId (no FK)"
  CHANGE_ORDERS ||..o{ CHANGE_ORDER_ACTIVITIES : "ChangeOrderId (no FK)"
  CHANGE_ORDERS ||..o{ CHANGE_ORDER_STAGES : "on SUBMIT only (P-109)"
  CHANGE_ORDERS ||..o{ CHANGE_ORDER_ATTACHMENTS : "ChangeOrderId (no FK)"
  CHANGE_ORDERS ||..o{ CHANGE_ORDER_AUDIT_ENTRIES : "create + submit"
  CHANGE_ORDER_LINES }o..|| BOQ_ITEMS : "BoqItemId (no FK)"
  CHANGE_ORDER_ACTIVITIES }o..|| ACTIVITIES : "ActivityId (no FK)"

  CHANGE_ORDERS {
    string No "next free across the PROJECT (P-107)"
    string Lifecycle "draft on save, pending on submit"
    string TitleAr "the justification's first line (P-108)"
    decimal RequestedValue "the RE department's net — nothing approved"
    int RequestedDays "Σ of the affected activities' requested days"
  }
  CHANGE_ORDER_LINES {
    decimal ContractedQty "FROZEN at creation — the 20% basis (D-01)"
    decimal BeforeQty "the state the order was raised against"
    decimal ContractorDeltaQty "proposal A"
    decimal ReDeptDeltaQty "proposal B"
    decimal ContractorExcessRate "a PROPOSAL — never binding (02 §5)"
    decimal ApprovedDeltaQty "NULL. The wizard may not set it"
  }
  CHANGE_ORDER_STAGES {
    int StageNo "all six, planned by BR-13"
    bool Applicable "false ⇒ SkipReason, never dropped (03 §2)"
    string Status "the first applicable one is `active`"
  }
```

**No approved column is ever written here.** `ApprovedValue`, `ApprovedDays`,
`ApprovedDeltaQty` and `ApprovedExcessRate` stay null until the pricing and
rate-fixing committees rule — the wizard has no field for any of them, and the
screens name the body that sets each one instead.

---

## 4. What the screen can look like

```mermaid
stateDiagram-v2
  [*] --> Loading
  Loading --> Step1: contracts loaded
  Loading --> Error: request failed
  Step1 --> Step1: no contract chosen — steps 2..5 disabled
  Step1 --> Step2
  Step2 --> Picker: «اختيار بنود» / «اختيار أنشطة»
  Picker --> Step2
  Step2 --> LineOpen: a line is expanded (الشكل 39)
  LineOpen --> Step2
  Step2 --> Step3
  Step3 --> Step4
  Step4 --> Step5
  Step5 --> Blocked: BR-07 issue — «إرسال» disabled
  Blocked --> Step2: 422 sends the reader to the offending line
  Step5 --> Draft: «حفظ كمسودة»
  Step5 --> Submitted: «إرسال للمراجعة»
  Submitted --> [*]: the new order's RECORD opens
  Draft --> [*]
```

A draft is allowed to be incomplete — that is what a draft is. Only submission
is gated (`02 §7`).

---

## 5. Three things worth knowing before changing this screen

**The contract is not a filter, it is the scope.** `EP-WIZ-01` returns contracts
each carrying their own lines and activities, so the client is never holding a
list it could compose a cross-contract order from. BR-07's `cross-contract` gate
still runs on the way in, because a UI that cannot express something is not the
same as a rule that forbids it.

**Nothing here is approved, and the screen says so rather than hiding it.**
«القيمة المعتمدة» reads «يُحدَّد في التدقيق المالي» and the excess rate reads
«يُثبَّت بلجنة تثبيت الأسعار» — two labels that exist because the fields behind
them deliberately do not (`02 §5`–§6, D-08).

**The expected path is computed, not printed.** الشكل 42 shows six stages; two of
them are conditional, and the wizard asks `WorkflowMachine.Plan` with the
order's own conditions. A stage that will not run is listed with its reason,
which is the same treatment the record's المسار tab gives it (`03 §2`).
