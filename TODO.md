# TODO — decisions waiting on the client

Questions raised while building the appendix screens that **cannot be answered from
the documents** and that change behaviour, money, or dependencies if answered either
way. Each carries its `DECISIONS.md` entry, what is built today, and what changes
when the answer arrives.

Nothing here is blocking a screen: every one of them is built and working under a
stated assumption. They are here because the assumption is *ours*, not the
document's.

---

## 1 · The delay penalty formula — P-81 · **changes money**

**The conflict.** `02-BUSINESS-RULES.md §10` (BR-10, flagged `D-02 CONFIRM` since the
port) and the client's own two documents state **different rules**:

| source | rule | on CNT-0170-EM (587,673,564 د.ع · 364 days) |
|---|---|---|
| `02 §10` — what this build computes | value × **0.1% per day**, capped at 10% | **587,674** د.ع/day |
| الشكل 10 plate · العرض الفني §11 | (value ÷ duration) × **10%** | **161,449** د.ع/day |

العرض الفني §11 states it in words — «غرامة اليوم = (قيمة العقد ± تغيّر المبلغ) ÷ (مدة
العقد ± تغيّر المدة) × نسبة الغرامة» — and الشكل 10 prints 161,449 against those exact
inputs. The two differ by **3.6×**, and they differ in shape: under the client formula
the 10% cap is reached after exactly one contract duration of delay; under ours after
100 days regardless of duration.

**What is built.** BR-10 is unchanged and الشكل 10 states the rule it actually applies
in its «كيف تُحتسب الغرامة» box. `CLAUDE.md §1` settles which document wins where — *the
written spec gives the rules, the plate gives the screen* — and silently swapping a
penalty formula changes money on a legal record.

**If the client formula is binding:** one change in `Domain/Penalty.For`, one worked
example added to `PenaltyTests`, and the `con_pen_how_b` string. **Every screen already
reads from there** — الشكل 10's before/after table, SCR-E5's delay days and SCR-W3's
penalty section all follow with no further edits.

**Question for the client:** which formula is contractually binding, and is the 10%
rate fixed or the «النطاق القانوني 10%–25%» الشكل 10 mentions?

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
| P-85 | **إدخال يدوي** on the BOQ register needs a create endpoint (`EP-BOQ-09` was taken by the importer; a `POST …/items` does not exist) | The button is a demo stub, and a spawned task describes the endpoint |
| P-87 | **Who approves** an imported BOQ version (المسار 3 steps 7–8)? No figure in the appendix shows it | Versions accumulate as `submitted`; nothing moves into the live bill |
| P-90 | How is a **component's forecast** apportioned (الشكل 14 prints one per expense item, by no stated ratio)? | Forecast at contract level only (BR-11); components print «—» |
| P-96 | Who **registers a payment**? الشكل 16 names them; nothing records it | The panel says الشكل 20's wizard will capture it |
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

## Phase 4.5 «Amendment disclosure» was never built

Found during Phase 7's TRACE audit, not during Phase 4.

`ROADMAP.md`'s section 4.5 — the shared amendment badge and drawer for the BOQ
and the schedule — has four unticked items and **none of them exists**:

- `DAmdMark` badge — count plus three states: all applied · all pending · mixed
- `DAmdPanel` drawer, identical for BOQ items and activities (`04 §6`)
- the cell delta — effective figure plus a compact signed delta, coloured
  settled vs pending, **no strikethrough**
- `docs/uml/amendment-disclosure.md`

`.d-amd-mark` **is** in `web/src/styles/desktop.css:2058` — it came across with
the rest of the reference stylesheet — but nothing in `web/src/app` uses it.
Phases 4.6 onward were built on top and nobody came back.

**What it would show.** SCR-W4 and SCR-W5 currently print effective figures with
no sign that an amendment moved them. `04 §6` wants the row to say so, and to
tell an APPLIED move from a PENDING one — which is `02 §9` and CLAUDE.md §5.2's
«معتمد ≠ مطبَّق» rendered at the cell rather than only in the contract tab. The
data is all there: `ContractAmendments.SourceChangeOrderId` (P-104) and
`BoqRateBands.SourceChangeOrderId` already say which order moved which line.

It is a Phase 4 gap, not a Phase 7 one, and it is the only unbuilt item left in
the roadmap outside the explicitly deferred ones.

---

## SCR-W6 الإنجاز does not have الشكل 25's shape

Found by the plate fidelity round ([docs/PLATE-FIDELITY-ROUND.md](docs/PLATE-FIDELITY-ROUND.md)).

الشكل 25 names **four** tabs — الملخص · حسب هيكل التجزئة · الأثر والكلفة ·
مخاطر الجدول — and SCR-W6 has three, of which only «الملخص» matches. It also
names «مرشح مرجع المقارنة», «زر «كيف تُحتسب»», «زر تحديث نسبة الإنجاز» and
«تصدير PDF»; none is built.

The screen is not wrong — BR-04's reflection, the earned-value figures and the
one place progress MOVES are all correct and verified. It was built in Phase
4.4 from `04 §3` and `DModProgress`, before the appendix plates became the
binding visual reference for it.

**The data for all four tabs already exists:**

- «حسب هيكل التجزئة» → `ProgressReflection.Rollup` already rolls the WBS tree
- «الأثر والكلفة» → `EarnedValue.For`, already on screen in three places
- «مخاطر الجدول» → the at-risk activity list `DModProgress` itself draws

So this is a re-shaping of one screen over data that is already computed, not
new arithmetic. It is the largest single fidelity gap left in the build.

## الشكل 12's «زر العروض»

The BOQ register has «الأعمدة» (the column picker) and not «العروض». The plate
names both. «العروض» implies saved column/filter presets — a feature, not a
label — so it is recorded here rather than faked with a button that reopens the
column picker.

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

## Fixture drift, seen on SCR-E1 and SCR-W1

Both screens now derive planned progress from `Activities` baselines at the
data date (2026-08-02), and the portfolio reads **«المخطط 100%»** — every
activity baseline in the fixture finishes before that date. The SPI that falls
out of it (0.49) is therefore arithmetically right and narratively wrong: it
says the portfolio is half as fast as planned, when what it actually says is
that the fixture's schedules all ended two months ago.

The same drift makes «معالم قادمة» empty — no planned finish falls after the
data date — and it is why SCR-W1's progress curve jumps from 32% to 49% at its
last point.

**This is a fixture problem, not a rule problem.** `Fixture.cs` needs baselines
that straddle the data date the way a live portfolio's would. Nothing in
`Domain/` changes.
