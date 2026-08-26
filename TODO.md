# TODO — decisions waiting on the client

Questions raised while building the appendix screens that **cannot be answered from
the documents** and that change behaviour, money, or dependencies if answered either
way. Each carries its `DECISIONS.md` entry, what is built today, and what changes
when the answer arrives.

Nothing here is blocking a screen: every one of them is built and working under a
stated assumption. They are here because the assumption is *ours*, not the
document's.

---

## 1 · The delay penalty formula — P-81 · **RESOLVED — the money moved**

**What was decided.** The client's own two documents win. `02 §10` (BR-10) has been
rewritten to العرض الفني §11's rule — «غرامة اليوم = (قيمة العقد ± تغيّر المبلغ) ÷
(مدة العقد ± تغيّر المدة) × نسبة الغرامة» — and الشكل 10's own figure is now the
first worked example in `PenaltyTests`.

| source | rule | on CNT-0170-EM (587,673,564 د.ع · 364 days) |
|---|---|---|
| ~~`02 §10` as ported~~ | ~~value × **0.1% per day**, capped at 10%~~ | ~~587,674 د.ع/day~~ |
| الشكل 10 · العرض الفني §11 — **what this build computes** | (value ÷ duration) × **10%** | **161,449** د.ع/day |

**What changed.** `Domain/Penalty.For` takes the contract duration; `Compare` passes
the before/after durations `Amendments.Effective` already carries;
`AppConfiguration.PenaltyPerDayPct` became `PenaltyRatePct = 0.10`; the DTO and the
TypeScript interface renamed `perDayPct` → `ratePct`; `con_pen_how_b` now states the
plate's equation. **No screen needed an edit** — الشكل 10's before/after table,
SCR-E5's delay days and SCR-W3's penalty section all read `Domain/Penalty`.

**Three consequences, none of them cosmetic.** The cap is now reached after exactly
one contract duration of delay rather than after 100 days regardless of duration. An
applied extension can now **lower** the daily penalty, because it raises the
denominator as well as the numerator. And a contract with no recorded duration
charges nothing a day instead of dividing.

**Still open for the client:** is the 10% rate fixed, or is الشكل 10's «النطاق
القانوني 10%–25%» a range the contract picks from?

---

## 2 · Reading real `.xlsx` — P-86 · **a dependency decision**

**The situation.** الشكل 13 is an *Excel* import — «تحليل Excel» is one of its five step
names — and reading a real `.xlsx` needs a spreadsheet parser (an .xlsx is a zip of
XML). This build parses **CSV/TSV natively** and refuses `.xlsx` with the fix printed
on screen: save the sheet as CSV UTF-8 from Excel and upload again.

**Why it was not just added.** Adding SheetJS (or similar) carries a bundle-size and
supply-chain cost that belongs to whoever owns deployment — particularly if this
system lands on a ministry network with its own rules about third-party packages.
Hand-rolling a zip+XML reader is ~120 lines of fiddly code (stored vs deflated
entries, shared strings, inline strings, date serials) that nothing in the repo could
verify without a real workbook to test against.

**What is already real:** column mapping, validation, the comparison against the bill
in force, the submission, and the version record. Wiring a real `.xlsx` reader changes
**one function** (`parseDelimited` in `boq-import.wizard.ts`) and **no rule**.

**Question for the client:** is a spreadsheet library acceptable in the deployment, or
is CSV the expected exchange format?

---

## Also open, lower stakes

| # | Question | Built today |
|---|---|---|
| P-79 | Is there an official **payment code** (الشكل 9 prints `PAY-100`)? | «دفعة 1» from the sequential number; no code is invented |
| P-85 | **إدخال يدوي** on the BOQ register needed a create endpoint (`EP-BOQ-09` was taken by the importer) | **Closed — `EP-BOQ-12` `POST …/items` exists and `boq.api.ts addItem()` calls it.** What is still open is `P-161`: the write is gated by workspace access alone, because المسار 3 step 3ب names no capacity for manual entry |
| ~~P-87~~ | ~~Who approves an imported BOQ version?~~ | **Closed by `EP-BOQ-13`.** The same shape now governs the SCHEDULE: `EP-SCD-06` accepts دائرة المهندس المقيم or مدير المشروع, refuses whoever submitted the version, and is the only route in the build that moves `Activities.Baseline*` |
| ~~P-90~~ | ~~How is a **component's forecast** apportioned (الشكل 14 prints one per expense item, by no stated ratio)?~~ | **Closed by P-190 — the question had a false premise.** Nothing is apportioned: each expense item runs BR-11 on its own budget and its own recorded spend at the contract's actual %, which is what `DModFinancialNew` does, and the three sum to the contract row exactly |
| ~~P-96~~ | ~~Who **registers a payment**?~~ | **Closed.** الشكل 20's wizard is built (`EP-FIN-02`), and the capacity is دائرة المهندس المقيم or مدير المشروع — the party that MEASURES the works raises the certificate against them. It registers a `pending` certificate and its audit route. **Certifying and disbursing are now `EP-FIN-03`** (P-181): the desk holding the file releases it, and the party that owns that desk is the only one who may — دائرة المهندس المقيم at the first, الدائرة المالية at the other two |
| P-185 | العرض الفني §16 puts the **US dollar in Phase 1** beside the dinar, with an approved rate for any aggregate. §26 lists the rate SOURCE as still undecided | IQD only, hard-coded. Currency belongs to the CONTRACT, so it reaches every screen and every roll-up — deferred whole rather than half-built on this one |
| P-182 | R2 and R9 warn at **90%** of the allocation and of the revised cost; are those the right thresholds, and should the warning block anything? | The 100% CEILINGS are enforced by `EP-FIN-02` and `EP-FIN-03` and refuse the payment with the figure named. The 90% alerts are seeded `Alerts` rows and do not yet fire from live figures |
| P-44 | At the CONTRACT level, what is الإنجاز المالي a percentage of — the effective value, or the total cost (إحالة + احتياط + إشراف)? | **Answered at the PROJECT level** by §23-1: «المصروف التراكمي نسبةً إلى الكلفة المعدلة», and `Domain/BudgetBasis` is where all three screens read it. SCR-W3 still renders no financial %: a contract has no recorded budget of its own |
| Q-F5-2 | What derives أولوية المشروع · رقم اعتماد الموازنة · المنطقة الجغرافية, all tagged «مقترح»? | `Suggest()` fills only the code and the expenditure category |

---

*Every entry above has its full reasoning in `DECISIONS.md` under the same number.*

---

## Bundle size — the one build number that had to move

Phase 6's last screen tripped `angular.json`'s `initial` **error** budget: the
initial chunk is now just over 1 MB, so the error ceiling went to 1.5 MB. The
**warning** stays at 500 kB deliberately — it is the signal, and it has been
lit since Phase 4.

Nothing about this is a page's fault; every feature is lazily loaded. Two files
are eagerly loaded and grow with every screen:

- **`core/lang.ts`** — one dictionary for the whole app, now well past 1,900
  entries. Splitting it per feature (each page importing its own `*_ *` block)
  is the real fix and touches every page, so it is a task of its own rather
  than something to fold into a screen.
- **`web/src/styles/`** — 2,947 lines copied verbatim from the reference, plus
  `styles.css`. It is a design contract (CLAUDE.md §3.7) and is not a candidate
  for trimming.

Raising a budget is not a fix. It is recorded here so the next person reads
this rather than the diff.

---

## Phase 4.5 «Amendment disclosure» — **BUILT**

Found during Phase 7's TRACE audit, not during Phase 4, and closed now. All four
`ROADMAP.md §4.5` items exist: the `DAmdMark` badge with its three states, the
`DAmdPanel` drawer shared by BOQ lines and schedule activities, the cell delta with
no strikethrough, and `docs/uml/amendment-disclosure.md`.

`.d-amd-mark` was already in `web/src/styles/desktop.css:2058` and had sat unused
for six phases; **no CSS was added.**

**Two defects it exposed, both closed:**

1. **The fixture's applied orders had never written their rate bands.** VO-01 was
   seeded `closed` with `AppliedDeltaQty` on two lines and VO-04 `applied_partial`
   on one, while `BoqRateBands` stayed empty on the stated grounds that "no such
   order has been applied". So the register read BQ-006 as 1,400 م³ while the order
   that moved it said 1,710. Five bands are now seeded and documented line by line.
2. **`TierSplit.Line.Banded` was two facts under one name** — "the figures come
   from bands" and "the line carries more than one rate". An order applied INSIDE
   the 20% threshold writes one band at the contract rate, and «سعر مركّب» over it
   claims a rate-fixing decision nobody took. `MultiRate` is now the narrower test
   and the register chip reads it; `Banded` still governs the edit guard, which is
   the question it was actually answering.

## SCR-W6 الإنجاز now has الشكل 25's shape — **REBUILT**

Found by the plate fidelity round ([docs/PLATE-FIDELITY-ROUND.md](docs/PLATE-FIDELITY-ROUND.md)).

الشكل 25 names **four** tabs — الملخص · حسب هيكل التجزئة · الأثر والكلفة · مخاطر
الجدول — and SCR-W6 had three, of which only «الملخص» matched. It now has the
plate's four, in a `.d-pz5` strip like every other module.

| الشكل 25 | Built |
|---|---|
| الملخص | ✅ plus «تحديثات الإنجاز (واردة من الأقسام)» — the SAME `ContractActivityEvents` rows `Domain/ProgressSeries` draws SCR-W1's actual line from |
| حسب هيكل التجزئة (الشكل 26) | ✅ the WBS tree rolled up from the activities on cost weights, with the gap per node and «مستويات مكتملة N من M» |
| الأثر والكلفة (الشكل 27) | ✅ six cards, plus a table saying which of them moves the revised cost and which is carried into nothing |
| مخاطر الجدول (الشكل 28) | ✅ four cards and the at-risk list, ordered by slip, over a **declared** 10-day threshold printed on its own card |

**الأنشطة and بنود الكميات are no longer tabs, and that is the plate's own call.**
الشكل 25 makes updating progress a BUTTON — «زر تحديث نسبة الإنجاز» — not a
reading surface. They live behind that button, full width, because two dense
tables do not fit a drawer; the tab strip hides while the editor is open, and a
«العودة إلى القراءة» button leaves it. **The one place progress MOVES is
unchanged** and still verified.

**«كيف تُحتسب» is a drawer**, and it carries every rule behind the four tabs —
including the reason الشكل 25's «مرشح مرجع المقارنة» is absent: there is exactly
one baseline, because nothing in this build moves `Activities.Baseline*` after
import, and a picker would offer comparisons that cannot be made. **«تصدير PDF»**
is `window.print()`; there is no server-side renderer and inventing one is a
dependency this phase does not own.

**No new arithmetic.** `ProgressReflection.Rollup` does the WBS,
`Domain/ScheduleImpact` (built for الشكل 23) does the delay cost, `EarnedValue`
already had EAC and VAC, and `Amendments` already knew applied from pending.

## الشكل 12's «زر العروض» — **BUILT** (P-163)

The register now has «العروض» beside «الأعمدة»: named presets over the search
string, the coverage chip and the column toggles, saved as rows in
`BoqSavedViews` and owned by the `X-Epm-User` persona (`EP-BOQ-14/15/16`) rather
than the browser, which is where the reference keeps them.

**One thing the preset cannot capture: sort.** See below.

---

## The register sorts now, and inside its groups — **BUILT**

Found by driving the live prototype beside this build, not from the plates.

Every `<th>` in the prototype's BOQ grid carries a real sort handler, and sorting
reorders rows **inside each division group** rather than flattening them. This build
had no sort control at all, which is why `BoqSavedView` had no sort column — the
absence was recorded there and is no longer true.

**What was built.** Every header on `.d-boqgrid` sorts, on a three-click cycle:
asc → desc → **the bill's own order** (code within division), so there is always a
way back to the document's order without reloading. The sort applies within each
group and leaves the grouping and its subtotal rows intact — verified on CNT-0279,
where «القيمة» reorders BQ-005 · BQ-001 · BQ-006 inside «الأعمال الترابية والأسس»
and leaves the four divisions where they are.

The two enumeration columns sort by their **code**, not their translated label: a
sort that reordered itself on «EN» would be reporting the dictionary, not the bill.
The sort is stable, so equal values keep the bill's order — which matters on a
column like التنفيذ where half the lines read 0%.

`BoqSavedView` gained `SortKey`/`SortDir` (the reference's `sort: { k, d }`, split
into two flat columns for the same reason `VisibleColumns` is a CSV), and
`EP-BOQ-14/15/16` carry them. A view saved before this restores as unsorted, which
is exactly what its author was looking at.

## Three columns the reference's picker has and this one does not — **ADDED**

The prototype's «الأعمدة» menu listed twelve and ours listed ten. All three are
now in the picker:

| Reference column | Here |
|---|---|
| القيمة الأصلية (`origAmount`) | **added** — `amendment.originalAmount`, defaulting OFF |
| الفرق (أمر تغييري) (`variance`) | **added** — the settled delta, signed, defaulting OFF |
| القيمة المكتسبة (`earned`) | **added** — BR-04's achieved amount, defaulting ON as the reference does |
| التوزيع | ours only — BR-08 distribution, which the reference has no column for |

The first two were Phase 4.5's amendment disclosure by another name and arrived
with it; they default off because on a bill with no amendments they are two
columns of «—». «القيمة المكتسبة» was the separate miss: the figure was computed
all along and printed on no screen.

## P-48 is closed: the weight basis is recorded at import

`02 §2` says the weight basis is chosen at SCHEDULE IMPORT, and until now nothing
in this build stored that choice — the BOQ register computed on cost always, and
SCR-W5's toggle was a what-if. `ScheduleImportVersion.Basis` is where the choice
now lives, written by `EP-SCD-05` and validated against the file: choosing
ساعات العمل on a file that does not carry them for every assignable activity is
REFUSED, not silently fallen back from.

## Two smaller divergences, recorded and not changed

**The beneficiaries drawer is 720px here (`.d-drawer wide`) and 440px there.**
Measured: at 440px the reference's own drawer overflows — `scrollWidth` 699 in a
439px body — and it scrolls horizontally. Ours shows all six columns with no
scroll. The wider drawer is the better answer for a six-column table and the
reason is in the template; it is listed here because it is a visible departure
from the reference's geometry, not because it is wrong.

**The coverage chips read differently.** `06 §11` gives «مخصص جزئياً» and
«تخصيص زائد»; the prototype's chips say «جزئي» and «تجاوز», and it keeps the
diacritics («مُخصَّص»). The lookup labels win here — they are the data
dictionary's and `progress.page.ts` reads the same list — so a chip-only rewrite
would split one vocabulary across two screens.

---
## The checked-in reference is older than the live prototype

Found while rebuilding SCR-W1 against `infinite-azaiton.github.io/epm`.

`docs/spec/reference/app/` does **not** contain files the live prototype ships:

- `store.js` · `boq-data.js` · `model.js`
- **`supply-items.jsx`** — الفقرات التجهيزية, which `P-110` records as "not
  modelled". The prototype has `DModSupplyItems`, `DModSupplyOrders`,
  `DModSupplyBOQ`, `DModSupplyProgress`, `DModReceipts` and `DModItemInquiry`.
- `boq-register.jsx` · `boq-assign.jsx` · `boq-workspace.jsx`
- `desktop-workspace.jsx`

And `DModOverview` itself had diverged — the checked-in copy is the one SCR-W1
was built from, and it is not what the prototype draws today (P-133).

**Two consequences worth deciding on:**

1. **Re-sync the reference.** Everything built in Phases 4–6 was checked
   against the older copy. SCR-W1 needed two rebuilds because of this; other
   screens may carry the same divergence and nobody would know.
2. **الفقرات التجهيزية has a design after all.** الأشكال 50–58 were recorded as
   unbuildable for want of a table; the prototype has six components for it.
   That is a phase of work, not a fix.


---

## Fixture drift, seen on SCR-E1 and SCR-W1 — **FIXED**

**What it was.** Both screens derive planned progress from `Activities` baselines at
the data date (2026-08-02), and every baseline in the fixture FINISHED before that
date. So the portfolio read «المخطط 100%», the SPI that fell out of it (0.49) was
arithmetically right and narratively wrong — it said the portfolio was half as fast as
planned when what it actually said was that the fixture's schedules had all ended two
months ago — «معالم قادمة» was empty because no planned finish fell after the data
date, and SCR-W1's curve jumped 32%→49% at its last point.

**What was done.** `Fixture.cs` only. Nothing in `Domain/` changed, because this was
never a rule problem.

- **The two PRJ-0279 contracts moved 90 days later** — start, original finish,
  forecast, incoming letter, every activity baseline/actual/forecast, and the two
  early advance/interim certificates drawn against them. The dates anchored to the
  DATA DATE rather than to the contract did **not** move: the change orders' ages,
  the amendments' `AppliedAt`, and the two certificates of 2026-07-09.
- **Three more progress updates were recorded** on CNT-0279 (31→38→46→55) and one on
  CNT-0279-EM (33→35). The curve's jump was never the baselines: the actual line is
  only as current as its last RECORDED update (`Domain/ProgressSeries` interpolates
  nothing, deliberately), and nothing had been logged since May against a derived 55%.

**What it reads now.** Portfolio المخطط **75.96%** against الإنجاز **49.29%**, SPI
**0.65**; one upcoming milestone; and a curve that climbs 21.6 → 26.3 → 30.5 → 41.1 →
49.3 with no step at the end. The penalty story is untouched — both contracts are
still 61 days late and الشكل 10's before/after table reads exactly as it did.
