# Amendment disclosure — ROADMAP 4.5 · `04 §6`

**«معتمد ≠ مطبَّق», rendered at the cell rather than only in the contract tab.**

Two screens carry the same disclosure over different objects: SCR-W4 marks a BOQ
line that a change order moved, SCR-W5 marks an activity one extended. One rule
file, one badge component, one drawer.

| | SCR-W4 (BOQ) | SCR-W5 (Schedule) |
|---|---|---|
| The object | one `BoqItem` | one `Activity` |
| What moves | quantity and amount | remaining duration and finish |
| Row badge | `EP-BOQ-02` sends `amendment` | `EP-SCD-02` sends `amendment` |
| Drawer | `EP-BOQ-17` | `EP-SCD-03` |
| The rule | `Domain/AmendmentDisclosure.For` | `…ForActivity` |

---

## Why it exists

`02 §9` and CLAUDE.md §5.2 are unambiguous: **approving a change order changes
nothing.** Applying it creates a contract amendment and moves quantities, dates
and the penalty baseline. Before this, that distinction lived only on the
contract tab — the BOQ register printed an effective quantity with no sign that
an order had moved it, and no way at all to tell a settled move from a projected
one.

`04 §6` asks the row to say so. This is that.

---

## The three states

```
        every order applied  ──→  applied   (.d-amd-mark.on)
        no order applied     ──→  pending   (.d-amd-mark.pend)
        both true            ──→  mixed     (.d-amd-mark.mix + dot)
```

**Never colour-only** (`05 §7.6`). The badge's label IS the count, `mixed` adds a
dot as a second channel, and the tooltip names every order and its state in
words: «VO-04 — نافذ · VO-05 — بانتظار التطبيق».

---

## The chain

```
                  original            effective            projected
  BoqItem.OriginalQty ──┐                  │                     │
                        ├─ VO-01 applied ──┤                     │
                        ├─ VO-04 applied ──┤                     │
                        │                  ├─ VO-05 approved ────┤
                        │                  │                     │
   never overwritten ───┘   what the row   │   labelled, and in  │
   (non-negotiable #6)      actually prints    no total above it
```

Three rules live in `Domain/AmendmentDisclosure` and nowhere else:

1. **Only applied orders move the effective figure.** The same rule
   `Domain/Amendments` applies at contract level; the two may not disagree about
   the same order.
2. **Each applied order starts from the running figure**, not from the original.
   Several orders can hit one line and the chain records where each began.
3. **Pending chains onto effective, cumulatively** — exactly as
   `Amendments.Projection` does at contract level. Two approved orders each
   adding 10 project to +20, not to +10 twice.

`PendingQty` is **null**, not equal-to-effective, when nothing awaits
application. "No projection" and "a projection that nets to zero" are different
facts and the badge shows them differently.

---

## Where the touches come from

### BOQ — `BoqEndpoints.Touches`

```
ChangeOrders   (lifecycle ∈ approved · applied_partial · closed)
   └─ ChangeOrderLines           → one touch per (order, line)
        ├─ AppliedDeltaQty ≠ null → APPLIED · delta from AppliedDeltaQty/AppliedAmount
        │      └─ BoqRateBands (IsExcessBand, SourceChangeOrderId) → BR-05's re-priced part
        └─ otherwise              → PENDING · delta from Domain/ChangeOrderRecord.For
                                    on the approved column, falling back to د.م.م's
```

**Applied is read from the LINE, not the order.** `AppliedDeltaQty` is written
line by line by the apply run (`03 §9` step 3), so an `applied_partial` order
marks the lines it actually moved and leaves the rest pending. Reading the
order's lifecycle would mark every line of such an order settled — which is the
one state that word exists to deny.

**A redistribution is mirrored onto its destination.** `03 §9` stores it on the
SOURCE line with the target in `TargetBoqItemId`; without the mirror the
destination row would show a delta with no order behind it. Its value delta is
`qty × rate` in both directions, **not** `AppliedAmount`, which records the
CONTRACT's zero — the right figure for the order and the wrong one for the row.

### Schedule — `ScheduleEndpoints.Touches`

```
ChangeOrders   (same three lifecycles)
   └─ ChangeOrderActivities      → one touch per (order, activity)
        ├─ AppliedDeltaDays ≠ null → APPLIED
        └─ otherwise               → PENDING · ApprovedDeltaDays ?? AnalysisDays
```

The requested day count is deliberately **not** used: `03 §9` tab 3 keeps the
three counts apart, and the contractor's ask discloses nothing about the
contract.

The **original** remaining duration is the first order's own
`BeforeRemainingDuration`, never `Activities.RemainingDuration` — the latter has
already moved by every applied order, which would make the delta zero on exactly
the rows that have one.

---

## Rendering

| Piece | Component | Class (already in `styles/desktop.css`) |
|---|---|---|
| Badge | `shared/amendment-mark.component.ts` | `.d-amd-mark` `.on` `.pend` `.mix` |
| Cell delta | `shared/amendment-delta.component.ts` | `.d-amd-delta` `.pend` |
| Drawer | `shared/amendment-panel.component.ts` | `.d-amd-steps` `.d-amd-step` `.d-amd-bands` |

**No new CSS.** `.d-amd-mark` came across at Phase 1.5 with the rest of the
reference stylesheet and sat unused for six phases.

Three rendering rules the plates are explicit about:

- **No strikethrough.** The effective figure is the figure; the delta sits
  beneath it. The original is not wrong, it is superseded, and striking it
  through says the opposite.
- **Colour follows settled vs pending, never good vs bad.** An increase and a
  decrease are the same colour — CLAUDE.md §6 forbids colouring a magnitude by
  threshold, and the fact being coloured here is whether the amendment issued.
- **The pending group is separate and says so.** Interleaving it with the
  applied chain by date would put an unsettled number in the middle of a settled
  one, which is what `02 §9` exists to prevent.

---

## The columns that are the same fact

ملحق الشكل 12's picker lists three columns ours did not have. Two of them are
this feature under another name:

| Column | Is |
|---|---|
| القيمة الأصلية (`origAmount`) | `amendment.originalAmount`, or the row's own amount when nothing touched it |
| الفرق (أمر تغييري) (`variance`) | `amendment.deltaAmount` — the settled delta, signed |
| القيمة المكتسبة (`earned`) | BR-04's `achievedAmount`, computed all along and shown nowhere |

The first two default **off** — on a bill with no amendments they are two
columns of «—». القيمة المكتسبة defaults **on**, because the reference's own
default grid carries it.

---

## What this exposed

Two defects that had been invisible:

1. **The fixture's applied orders had never written their rate bands.** VO-01
   was seeded `closed` with `AppliedDeltaQty` on two lines and VO-04
   `applied_partial` on one, while `BoqRateBands` stayed empty "because no order
   has been applied". The register therefore read 1,400 where the order that
   moved it said 1,710. Fixed in `Fixture.cs`; the five bands are documented
   there line by line.
2. **`TierSplit.Line.Banded` conflated two facts** — "figures come from bands"
   and "carries more than one rate". A line moved INSIDE the 20% threshold has
   one band at the contract rate, and «سعر مركّب» over it claims a rate-fixing
   decision nobody took. `MultiRate` is now the narrower test, and the register
   chip and the drawer's rate breakdown both read it.
