# 01 — Domain Model

## 1. Hierarchy

```
Organization / Ministry
└── Beneficiary            (generic: university, department, campus, site, facility, other)
    └── Project            (a project may serve several beneficiaries)
        └── Contract       (a project has MANY contracts; a contract has ONE project)
            ├── BOQ Item   (belongs to exactly ONE contract)
            └── Activity   (belongs to exactly ONE contract)
```

**Invariant — contract scoping.** BOQ items and activities are scoped by contract. The project is *derived* from the contract and must never be asked for again inside a BOQ row, an activity row, or a change-order form. A change order may not contain BOQ items or activities from more than one contract.

**Invariant — no beneficiary column on BOQ.** A BOQ item's quantity may be split across several beneficiaries, so the relationship is its own table (`boq_distribution`), never a column on the BOQ row.

**Invariant — BOQ↔Activity is many-to-many.** One BOQ item may be delivered by several activities; one activity may deliver several BOQ items. Separate mapping table.

## 2. Entities

### 2.1 Beneficiary
Generic master list — do **not** hard-code a "university" field; the same model will later carry ministries, directorates and sites.

| Field | Type | Notes |
|---|---|---|
| `code` | string PK | e.g. `BEN-UOB`, `BEN-UOB-ENG` |
| `name_ar` / `name_en` | string | both required |
| `type` | enum | `university · department · campus · site · facility · other` |
| `parent` | FK Beneficiary \| Organization | self-referencing tree |
| `active` | bool | inactive beneficiaries cannot receive new quantity |

### 2.2 Project
| Field | Notes |
|---|---|
| `id` | `PRJ-####` |
| `name_ar` / `name_en` | |
| `status` | `ongoing · completed · delayed · suspended · cancelled` |
| `type` | one of 3 project types (see `06` §3) |
| `execution_stage` | one of 12 (see `06` §2) |
| `funding_type` | one of 10 |
| `region`, `priority`, `branch`, `executor` | |
| `beneficiaries[]` | assigned subset of the master list — **only these may receive quantity** |
| `physical_pct`, `financial_pct` | derived, see `02` §6 |
| `value` | **derived** = Σ contract values. Never stored independently |

### 2.3 Contract
| Field | Notes |
|---|---|
| `key` / `code` | e.g. `CNT-0279`, `CNT-0279-EM` |
| `project_id` | FK |
| `name_ar` / `name_en` | |
| `original_value` | the awarded value; never overwritten |
| `effective_value` | **derived** = original + Σ applied amendment deltas |
| `status` | 5-state set + extended 9-value list (see `06` §4) |
| `start`, `original_finish` | contractual dates |
| `effective_finish` | **derived** = original_finish + Σ applied amendment days |
| `award_amount`, `reserve_amount`, `supervision_amount` | the three expense items |
| `incoming_no`, `incoming_date` | official letter that created the contract |
| `contractor`, `consultant` | parties |

### 2.4 BOQ Item
| Field | Notes |
|---|---|
| `code` | e.g. `BQ-001` — unique within the contract |
| `contract_id` | FK — **required** |
| `description_ar` / `_en`, `unit` | |
| `division` / `category` | optional grouping |
| `original_qty` | as contracted; never overwritten |
| `effective_qty` | **derived** from applied amendments |
| `unit_rate` | original contract rate |
| `rate_bands[]` | see `02` §3 — an amended item may carry more than one rate |
| `amount` | **derived** = qty × rate (or Σ band amounts) |
| `weight_pct` | **derived**, see `02` §1 |
| `executed_qty` | from progress |

> Do **not** put project, WBS or location on the BOQ row. They are either derived or belong to another relation.

### 2.5 Activity
| Field | Notes |
|---|---|
| `activity_id` | Primavera ID, e.g. `A1050` |
| `contract_id` | FK — **required** |
| `name`, `wbs_code` | WBS is a tree: LV1 project → LV2 building/zone → LV3 discipline → LV4 activity |
| `baseline_start/finish`, `actual_start/finish`, `forecast_finish` | |
| `original_duration`, `remaining_duration` | |
| `progress_pct` | |
| `budgeted_cost`, `budgeted_man_hours` | **the weight basis** — imported from P6 |
| `total_float`, `is_critical` | criticality is a *path property*, not a status |
| `calendar`, `predecessors[]` | |
| `status` | `notstarted · inprogress · ahead · delayed · completed` |
| `w_cost_abs`, `w_cost_rel`, `w_mh_abs`, `w_mh_rel` | **derived**, see `02` §2 |

### 2.6 BOQ Distribution (BOQ × Beneficiary)
| Field | Notes |
|---|---|
| `boq_id`, `beneficiary_code` | composite key — no duplicate pairs |
| `site_code` | optional |
| `qty` | Σ per BOQ item must be ≤ the item's quantity |

State is derived: `none · partial · full · over` (see `02` §4).

### 2.7 BOQ↔Activity Assignment
| Field | Notes |
|---|---|
| `boq_id`, `activity_id` | composite key |
| `share_pct` | auto from activity absolute weight; **manually overridable and saved** |
| `is_manual` | true once overridden |

### 2.8 Change Order
See `03` for the full lifecycle. Header fields:

| Field | Notes |
|---|---|
| `no` | `VO-##` |
| `contract_id` | FK — **selected first, scopes everything else** |
| `type` | `engineering` (cost/duration) \| `supply` (redistribution) — **only two** |
| `justification` | الأسباب الموجبة — free text, entered by the RE department |
| `responsible_party`, `incoming_no`, `incoming_date` | the official letter |
| `status` | `draft · pending · returned · approved · rejected` |
| `lifecycle` | derived: `draft · pending · returned · approved-applying · closed` |
| `requested_value` / `requested_days` | from the governing (RE dept) proposal |
| `approved_value` / `approved_days` | from the pricing committee decision only |
| `applied_value` / `applied_days` | set when the order is applied |
| `lines[]` | affected BOQ lines, each with the two proposals + tier split |
| `activities[]` | affected activities |
| `attachments[]` | categorised, versioned |
| `stages[]` | the 6-stage chain, see `03` §2 |
| `audit[]` | every event, with previous → new value |

### 2.9 Contract Amendment (ملحق عقد)
Created **only when a change order is applied**.

| Field | Notes |
|---|---|
| `no` | 0 = original contract, then 1..n |
| `contract_id`, `source_order_no` | |
| `delta_value`, `delta_days` | approved figures of the source order |
| `value`, `finish`, `duration` | the running contract state after this amendment |
| `state` | `original · superseded · effective · pending · partial` |
| `applied_at` | |

The **last applied** amendment is the effective contract. Approved-but-unapplied orders are listed as `pending` and are **never** folded into effective figures — they are shown separately as a projection.

## 3. Derived-value rules

Never store these; always compute:

- Project value = Σ contract effective values
- Contract effective value = original + Σ applied amendment deltas
- BOQ amount = qty × rate (or Σ rate bands)
- BOQ weight = amount ÷ contract BOQ total (largest-remainder to exactly 100.00%)
- Activity absolute/relative weights = from budgeted cost or man-hours
- BOQ progress = Σ (allocation share × activity progress)
- Delay penalty = f(effective value, effective finish, forecast finish)

## 4. Audit requirements

Every entity that a change order can touch keeps its history: **who, when, previous value, new value, source order, stage, version**. The BOQ item and the activity must each be able to answer "which change orders amended me, in what order, and what did each one do" — the prototype surfaces this as an amendment badge + history panel (`04` §6).
