# 02 — Business Rules

Every rule below becomes **one pure function** in the `domain/` layer. The worked example becomes its unit test.

---

## 1. BOQ weight

**Rule.** A BOQ item's weight is its share of its **contract's** total BOQ value. Weights must sum to exactly 100.00%.

```
weight(item) = item.amount / Σ(amounts of all BOQ items in the SAME contract) × 100
```

**Rounding.** Naïve `toFixed(2)` produces sums like 100.01%. Use **largest remainder**: floor every value at the chosen precision, then distribute the shortfall one increment at a time to the items with the largest fractional parts.

```
floors  = items.map(v => floor(v, 2dp))
short   = round((100 − Σfloors) × 100)          // in 0.01 units
order   = items sorted by (raw − floor) desc
for k in 0..short-1: out[order[k]] += 0.01
```

**Worked example.** Contract `CNT-0279-EM`, two items: BQ-002 amount 56,131,000 and BQ-004 amount 43,869,000; total 100,000,000.
→ raw 56.131% / 43.869% → **56.13% / 43.87%**, sum exactly 100.00%.

**Edge cases.** Empty contract → no rows, no 100% claim. Single item → 100.00%. Denominator is the *contract's* rows — a common bug is totalling the whole project first and then filtering.

---

## 2. Schedule weights (WBS + activity)

**Basis.** Chosen at schedule import: **budgeted cost** or **budgeted man-hours**. The system detects which fields the P6 file provides and asks the user. Every downstream weight uses the chosen basis; the UI keeps a cost/man-hours toggle.

**Rule.**
```
absolute(activity) = activity.basisValue / Σ(basisValue of ALL activities) × 100
relative(activity) = activity.basisValue / Σ(basisValue in its parent WBS node) × 100

absolute(wbsNode)  = aggregate(node) / Σ(all) × 100
relative(wbsNode)  = aggregate(node) / aggregate(parent node) × 100     // root: ÷ total
```
Milestones have zero duration and zero cost → all four weights are **0**, and they are excluded from allocation.

**Both values are displayed in the WBS tree** — relative shows a node's share of its parent, absolute its share of the project. Absolute is the one that drives BOQ allocation and earned value.

**Worked example.** Project total cost 100. Zone A (60) contains A1 (36) and A2 (24).
→ A1 absolute 36%, relative 60%; A2 absolute 24%, relative 40%; Zone A absolute 60%, relative 60% of the root.

---

## 3. BOQ ↔ Activity allocation

**Rule.** The user never types an allocation percentage. Allocation is driven by the **activity absolute weight**:

```
share(activity, boq) = absoluteWeight(activity) / Σ(absoluteWeight of activities linked to this BOQ) × 100
assignedAmount       = boq.amount × share / 100
```

The share is **manually overridable** per BOQ item and persisted; an overridden row is flagged, and a reset restores the computed value.

**Coverage status** (per BOQ item), from Σ shares:

| Σ shares | Status | Label |
|---|---|---|
| no links | `unassigned` | غير مخصص |
| \|Σ − 100\| < 0.5 | `full` | ✔ مخصص بالكامل |
| Σ < 100 | `partial` | ⚠ مخصص جزئياً |
| Σ > 100 | `over` | ✖ تخصيص زائد |

> Coverage compares **allocation shares to 100%** — it is *not* a comparison against the BOQ financial weight. The BOQ weight is the item's share of the bill; the allocation is the link between an item and its activities. Conflating them was an early error.

**Worked example.** BQ-003 amount 26,730,000, linked to A5 (absolute 5.8%) and A8 (absolute 5.2%); Σ = 11.0%.
→ A5 share = 5.8/11.0 = **52.7%**, A8 = **47.3%**; assigned 14,092,710 and 12,637,290. Status **full**.

---

## 4. Progress reflection (schedule → BOQ)

**Rule.** BOQ progress is the allocation-weighted mean of its linked activities' progress. It updates automatically whenever activity progress changes.

```
boqProgress    = Σ ( share_i / 100 × activityProgress_i )        // %
achievedAmount = boq.amount        × boqProgress / 100
achievedQty    = boq.effectiveQty  × boqProgress / 100
remainingValue = boq.amount − achievedAmount
```

**Worked example** (the client's own case). BQ-003 "Slabs & stairs", amount 26,730,000, allocation to A5 = 52.6%. A5 progress reaches 100%, A8 still 0%.
→ boqProgress = 52.6% → achievedAmount = 26,730,000 × 0.526 = **14,059,980** (client's figure 14,057,931 — same rule, unrounded shares), achievedQty = effective qty × 52.6%.

**Contract / project rollup.** Contract executed value = Σ achievedAmount of its BOQ items. Project physical % rolls up by weight; financial % comes from payments.

---

## 5. The 20% rule (quantity change pricing)

**Rule.** For a quantity **increase or decrease**, the portion up to **20% of the original quantity** is valued at the **original unit rate**. Only the portion beyond 20% may carry a **new rate**.

```
TIER      = 0.20
threshold = originalQty × TIER
atRate    = min(deltaQty, threshold)        // priced at originalRate
excessQty = max(0, deltaQty − threshold)    // priced at the proposed new rate

increase: newAmount = before + atRate × originalRate + excessQty × newRate
decrease: newAmount = before − atRate × originalRate − excessQty × newRate
```

Applies **per BOQ line**, to change types `increase` and `decrease` only — not to rate change, cancellation or redistribution.

**Who sets the new rate.** The contractor and the RE department each *propose* an excess rate. The **binding** rate is fixed later by **لجنة تثبيت الأسعار** (rate-fixing committee) — it is never entered in the wizard. When any line trips the threshold, the rate-fixing stage is inserted into the approval chain.

**Worked example — increase.** Original qty 100, add 30.
→ threshold 20; first **20 at the original rate**; remaining **10 at the new proposed rate**.

**Worked example — decrease.** Original qty 100, reduce 30.
→ 20 deducted at the original rate; 10 deducted at the new proposed rate.

**Consequence for the BOQ.** After application the item legitimately carries **more than one rate**, so the item stores **rate bands**, and the register shows a blended rate with the bands available in the detail panel:

```
blendedRate = Σ(bandQty × bandRate) / Σ(bandQty)
```

---

## 6. Two proposals, one approved value

**Rule.** Each affected line carries two proposals:
- **مقترح المقاول** — the contractor's
- **مقترح د.م.م** — the resident engineer's department's

The **RE department's figure governs** all displayed revised values and impacts once entered; before that, the contractor's figure is shown and labelled as such. When they differ, the divergence is shown explicitly (`contractor → RE dept (Δ)`).

**Neither is the approved value.** The approved value is the **pricing committee's decision**, entered during financial review. Until then every approved-value field reads *يُحدَّد في التدقيق المالي* and the revised contract value is labelled **تقديرية** (indicative).

---

## 7. Change-order validation gates

Submission is blocked (not merely warned) when any of these hold:

| Gate | Rule |
|---|---|
| Decrease exceeds remaining | `deltaQty > (contractedQty − executedQty)` — checked for **each** proposal separately |
| Redistribution without target | `type = redistribution` and no target BOQ item selected |
| Redistribution unbalanced | Σ quantity drawn ≠ Σ quantity distributed |
| Empty order | no BOQ lines and no activities |
| Cross-contract | any line or activity outside the selected contract |

Prefer **preventing invalid input** (cap the field at the maximum, explain the cap) over flagging it afterwards. Show blockers as a list on the review step with a link to the offending line.

---

## 8. Quantity distribution to beneficiaries

**Rule.** A BOQ item's quantity may be split across the beneficiaries **assigned to that project** (never the whole master list).

```
distributed = Σ rows.qty
remaining   = max(0, item.qty − distributed)
excess      = max(0, distributed − item.qty)
```

| Condition | State |
|---|---|
| distributed = 0 | `none` — غير موزّعة |
| 0 < distributed < qty | `partial` — موزّعة جزئياً |
| distributed = qty (±0.001) | `full` — موزّعة كلياً |
| distributed > qty | `over` — تتجاوز الكمية (error) |

**Prevention.** Each input is capped at `item.qty − (sum of the other rows)`, with an inline explanation. The `over` state exists only for legacy/imported data.

**Import validation** (all must pass before applying):
1. The BOQ item belongs to the selected contract.
2. The beneficiary is assigned to the current project and is active.
3. `row.qty + already-distributed-to-others ≤ item.qty`.
4. No duplicate (BOQ, beneficiary) pair.
5. The computed distribution total matches the file's stated total.

Results are shown **before** applying, row by row, with the failing reason.

**Interaction with change orders.**
- Quantity **increase** → existing distribution is untouched; the added quantity appears as *remaining to distribute*.
- Quantity **decrease** → if the current distributed total would exceed the revised quantity, the distribution **must be revised before the order can be applied**.
- Distribution detail appears inside a change order **only** if that BOQ item already has a distribution.

---

## 9. Contract amendment and effective values

**Rule.** An approved change order does not change the contract. **Applying** it does.

```
on apply(order):
  amendment.no        = last.no + 1
  amendment.value     = previous.value    + order.approvedValue
  amendment.finish    = previous.finish   + order.approvedDays
  amendment.duration  = previous.duration + order.approvedDays
  contract.effective  = this amendment
  BOQ  effective quantities/rates ← approved lines (as rate bands)
  schedule effective dates        ← approved activity changes
  penalty baseline recomputed (§10)
```

State per version: `original` (no. 0) · `superseded` (an earlier applied one) · `effective` (the last applied) · `pending` (approved, not applied) · `partial` (mid-application).

**Projection.** What the contract *would* become if every approved-unapplied order were applied is shown separately and clearly labelled — never mixed into effective figures.

---

## 10. Delay penalty

**Rule.** `0.1% of the contract value per day of delay, capped at 10% of the contract value.`

```
days   = max(0, forecastFinish − contractualFinish)
perDay = effectiveContractValue × 0.001
cap    = effectiveContractValue × 0.10
amount = min(perDay × days, cap)
```

**An applied change order moves both terms** — the value (raising the per-day amount and the cap) and the contractual finish (usually reducing the delay days). Show **before vs after** and the resulting **waived amount**, because a time extension is often the point of the order.

**Worked example.** Value 100,000,000, contractual finish 2026-06-30, forecast 2026-08-30 → 61 days × 100,000 = 6,100,000 (below the 10,000,000 cap). An applied order adds 45 days and 5,000,000 → new finish 2026-08-14, days 16, perDay 105,000 → 1,680,000. **Waived: 4,420,000.**

---

## 11. Earned value

```
PV = budget × plannedProgress
EV = budget × actualProgress
AC = actual cost incurred
CPI = EV / AC          SPI = EV / PV
EAC = budget / CPI     VAC = budget − EAC
```
Derived indices are **diagnostics**, never headline figures — see the type hierarchy in `05` §3. Do not colour them green/red by threshold: use `--on-surface` and reserve `--error` for genuine exception states.

---

## 12. Transaction lead time & SLA

```
leadDays = dataDate − officialIncomingDate
```
Measured from the **official incoming letter date** against the **project's data date** (never `Date.now()` — the demo dataset is historical, and a wall-clock reference makes every record look years late).

Per-stage SLA is 5 days by default. A stage past its SLA is `overdue`, raises the order's *needs action* flag, and auto-escalates to senior management.
