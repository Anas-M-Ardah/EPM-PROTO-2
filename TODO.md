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
