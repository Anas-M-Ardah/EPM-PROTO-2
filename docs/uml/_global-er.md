# UML — the whole schema

Every table in `EpmDb`, and how they find each other.

**36 tables, and not one foreign key.** CLAUDE.md §3.3: storage is flat, tables
join through plain ID columns in the endpoint, and *that query is the
relationship*. Every line below is dotted (`||..o{`) for that reason — a solid
one would be a lie about a constraint the database does not hold.

The invariants those constraints would have carried are checked in endpoints
instead, where they can be read (§3.4).

---

## 1. The spine — project → contract → everything

Three rules shape the whole schema and they are worth stating before the boxes:

1. **The contract is the working context.** A BOQ item, an activity, a payment
   and a change order each belong to exactly one CONTRACT. The project is
   derived from the contract and never asked for again (§5.1). That is why
   `ChangeOrders` has no `ProjectId` — SCR-W15 and SCR-W14 reach a project's
   orders *through* its contracts.
2. **Original values are never overwritten** (§5.6). `original` / `before` /
   `requested` / `approved` / `applied` are separate columns that all persist.
3. **Derived values are never stored** (§3.5). Project value, BOQ weight,
   effective contract value, progress, penalties — none of them is a column.

```mermaid
erDiagram
  Workspaces ||..o{ Projects : "WorkspaceCode — BR-15 scopes every read"
  Projects ||..o{ Contracts : "ProjectId"
  Contracts ||..o{ BoqItems : "ContractId"
  Contracts ||..o{ Activities : "ContractId"
  Contracts ||..o{ Payments : "ContractId"
  Contracts ||..o{ ChangeOrders : "ContractId — never a ProjectId (§5.1)"
  Contracts ||..o{ ContractAmendments : "ContractId"
  BoqItems ||..o{ BoqActivityLinks : "BoqItemId"
  Activities ||..o{ BoqActivityLinks : "ActivityId"
  BoqItems ||..o{ BoqDistributions : "BoqItemId"
  BoqItems ||..o{ BoqRateBands : "BoqItemId"
  Beneficiaries ||..o{ BoqDistributions : "BeneficiaryCode"
```

---

## 2. The bill of quantities and the schedule

```mermaid
erDiagram
  BoqItems {
    int Id PK
    string ContractId "to Contract.Id"
    string Code "BQ-001 — unique WITHIN the contract, not globally"
    decimal OriginalQty "D-01's denominator for the 20% rule — never overwritten"
    decimal ContractedQty "moves only when an order is APPLIED"
    decimal ExecutedQty
    decimal Rate
    string Source "imported or manual"
  }
  BoqRateBands {
    int Id PK
    int BoqItemId
    decimal Qty
    decimal Rate
    bool IsExcessBand "the second band an apply creates for the excess over 20%"
    int SourceChangeOrderId "which order priced it"
  }
  BoqActivityLinks {
    int Id PK
    int BoqItemId
    int ActivityId
    decimal SharePct "BR-03 — computed, overridable, persisted"
  }
  BoqDistributions {
    int Id PK
    int BoqItemId
    string BeneficiaryCode
    decimal Qty "BR-08 — Σ rows is `distributed`"
  }
  Activities {
    int Id PK
    string ContractId
    string ActivityId "A1 · E3 — unique within the contract"
    string WbsPath "a PATH STRING; the tree is built in the endpoint"
    decimal ProgressPct
    bool IsCritical "a RING on screen, never a colour"
  }
  BoqImportVersions ||..o{ BoqImportVersionItems : "VersionId"
  BoqItems ||..o{ BoqRateBands : "BoqItemId"
  BoqItems ||..o{ BoqActivityLinks : "BoqItemId"
  Activities ||..o{ BoqActivityLinks : "ActivityId"
  BoqItems ||..o{ BoqDistributions : "BoqItemId"
```

> **An import writes a VERSION, never the bill** (P-87). `BoqImportVersions` and
> its items accumulate; nothing moves into `BoqItems` until an approval step
> that is not built.

---

## 3. The change order — seven tables for one decision

```mermaid
erDiagram
  ChangeOrders ||..o{ ChangeOrderLines : "ChangeOrderId"
  ChangeOrders ||..o{ ChangeOrderActivities : "ChangeOrderId"
  ChangeOrders ||..o{ ChangeOrderStages : "ChangeOrderId"
  ChangeOrders ||..o{ ChangeOrderAttachments : "ChangeOrderId"
  ChangeOrders ||..o{ ChangeOrderApplySteps : "ChangeOrderId"
  ChangeOrders ||..o{ ChangeOrderAuditEntries : "ChangeOrderId"
  ChangeOrderStages ||..o{ ChangeOrderExternalParties : "StageNo — a STATUS inside a stage, not a stage"
  ChangeOrders ||..o| ContractAmendments : "SourceChangeOrderId (P-104)"

  ChangeOrders {
    int Id PK
    string ContractId
    string No "VO-01 — the next free number is taken across the PROJECT (P-107)"
    string Lifecycle "draft pending approved applied closed rejected cancelled"
    decimal RequestedValue "the contractor's ask — kept"
    decimal ApprovedValue "the pricing committee's — kept separately"
    int RequestedDays
    int ApprovedDays
  }
  ChangeOrderLines {
    int Id PK
    int ChangeOrderId
    string BoqCode
    decimal ContractorDeltaQty "two proposals, kept apart (BR-06)"
    decimal ReDeptDeltaQty
    decimal ApprovedDeltaQty
    decimal ContractorRate
    decimal ReDeptRate
    decimal ApprovedRate "only لجنة تثبيت الأسعار sets the binding excess rate"
  }
  ContractAmendments {
    int Id PK
    string ContractId
    int No "last.no + 1 — BR-09"
    decimal Value
    DateOnly Finish
    DateTime AppliedAt "NULL while pending — the projection reads these rows"
    int SourceChangeOrderId
  }
```

> **Approved ≠ Applied ≠ Closed** (§5.2). Approval creates the *pending*
> `ContractAmendment`; applying FLIPS it rather than inserting a second one
> (P-111). An approved-but-unapplied order is a projection everywhere it
> appears and is never folded into an effective figure.

---

## 4. The registers Phase 6 added

```mermaid
erDiagram
  Projects ||..o{ Risks : "ProjectId"
  Projects ||..o{ Meetings : "ProjectId"
  Meetings ||..o{ MeetingActions : "MeetingId"
  Projects ||..o{ Documents : "ProjectId"
  Documents ||..o{ DocumentRevisions : "DocumentId"
  Projects ||..o{ Alerts : "ProjectId — NULL for an enterprise-wide alert"
  Projects ||..o{ AlertRules : "ProjectId"
  AlertRules ||..o{ Alerts : "Code to RuleCode — nullable"
  Projects ||..o{ ModelElements : "ProjectId"
  Projects ||..o{ ModelVersions : "ProjectId"
  Contracts ||..o{ ModelElements : "ContractId + BoqCode + ActivityCode"

  Documents {
    int Id PK
    string Code "the identity — what does NOT change on re-issue"
    string Discipline
  }
  DocumentRevisions {
    int No "which is current is the HIGHEST — never a stored flag"
    string Status
    string TransmittalNo
    string FileName "name only; no bytes are stored"
  }
  AlertRules {
    string Code "R1..R12"
    string TriggerAr "PROSE — recorded, not evaluated (P-119)"
    bool Enabled "switching it off withdraws its alerts at READ time"
  }
  ModelElements {
    string BuildingAr "a PAIR, like every name (P-125)"
    string ContractId "required: BOQ codes repeat across contracts"
    string BoqCode
    string ActivityCode
  }
```

---

## 5. The trails, and the one table that is not there

```mermaid
erDiagram
  Projects ||..o{ ProjectActivityEvents : "ProjectId — الشكل 5"
  Contracts ||..o{ ContractActivityEvents : "ContractId — الشكل 11"
  ChangeOrders ||..o{ ChangeOrderAuditEntries : "ChangeOrderId — 03 §9"
  Payments ||..o{ PaymentAuditStages : "PaymentId — BR-12's desks"
  Payments ||..o{ PaymentAttachments : "PaymentId"
  Projects ||..o{ ProjectAllocations : "ProjectId — الشكل 15"
```

> **There is no `AuditEvents` table and there should not be** (P-122). SCR-W15
> reads the three trails above; a fourth store copying them would be a second
> answer to «من غيّر هذا الحقل ومتى», and the copy drifts the first time one of
> the three gains a column.

---

## 6. The two tables every screen reads

| Table | What it is | Read by |
|---|---|---|
| `Lookups` | Every stored code's label, in both languages — `06 §1–§11`'s value lists, one table, one endpoint (`EP-LKP-01`) | every page with a status, a kind or a discipline |
| `Workspaces` | The scope BR-15 enforces. `WorkspaceScope.Deny` refuses before anything is read | every project-scoped endpoint |

**What is deliberately NOT a table:** the twelve report definitions
(`ReportCatalog.cs`) and the fifteen documented rules (`RuleCatalog.cs`). Both
are capabilities of the system rather than records in it, and both would be
split across two mechanisms if their labels lived in `Lookups`.

---

## 7. Schema changes

No migrations. `EnsureCreated()` builds the schema on boot if it is absent and
never wipes; a schema change is `POST /api/dev/reset` (CLAUDE.md §4). Money is
`decimal`, never `float` (D-11); quantities and percentages `decimal(18,4)`.

`Data/Entities/` also holds documented starting points for tables no page reads
yet. Two were removed during Phase 6 rather than wired in — `ModelObject` (its
massing geometry fed a viewer `07 §8` puts out of scope) and `AuditEvent` (see
§5) — because a starting point that will never be written is a promise the
schema does not keep.
