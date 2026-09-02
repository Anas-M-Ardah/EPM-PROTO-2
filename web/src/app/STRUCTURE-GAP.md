# STRUCTURE-GAP — the markup the port never built

The stylesheets are **not** the problem. `web/src/styles/{tokens,components,app,
app-public,public,desktop,boq}.css` are byte-identical to the reference prototype
(`infinite-azaiton/epm@065de12`, the `design/system-revamp` branch GitHub Pages serves —
verified, P-205). The app still does not look like the prototype because the **markup**
diverged: whole structures were never written, so the rules that would have drawn them sit
in the sheets addressing nothing.

That set is measurable, and this file is the backlog it produces.

```bash
node tools/structure-gap.mjs          # the number
node tools/structure-gap.mjs --list   # every class + the component it comes from
```

Three sides, each biased so the gap is never **over**stated: the prototype side reads
`className=` attributes only (it can never invent a class); the Angular side takes **any**
`d-*` token appearing in any `.ts`/`.html` string (it over-captures on purpose); the CSS
side is every `.d-*` selector in the shipped sheets.

## The number

| | at first measure | now |
|---|---|---|
| the prototype emits | 411 `d-*` classes | **411** |
| the Angular app emits | 273 | **317** |
| defined in the shipped stylesheets | 530 | **530** |
| missing from the port | 151 | **101** |
| → **GAP** — and the prototype actually **renders** it | — | **67** |
| → **DEAD** — its component is never mounted *or is inside one that is not* | — | **34** |
| **OWN** — emitted by Angular, absent from the prototype | 6 | **5** |

| cluster | classes | state |
|---|---|---|
| A1 · الشكل 6 · 7 contract register + cost breakdown | 12 | **✅ done** |
| A2a · الشكل 29 · 33 register table + المسار layout | 5 | **✅ done** |
| A2b · الشكل 30 focus mode | 5 | ⏸ **not markup** — needs a decision |
| A3 · الشكل 33 review flow | 5 | ❌ **dead** — `DReviewFlow` is never mounted |
| A4a · الشكل 38 · 39 picker bar + editor row | 3 | **✅ done** |
| A4b · الشكل 38 · 39 facets, chips, caps | 6 | ⏸ **not markup** — needs a decision |
| A5 · الربط بالأنشطة | 5 of 7 | ⬛ **dead** — the port already followed the newer component; the 2 live ones fold into A7 and A16/17 |
| A14 · contract context strip | 0 | ❌ **dead** — same superseded module |
| A8 · SCR-W14 report shell + bodies | 6 | **✅ done** — and it needed a new endpoint |
| A6 · الأشكال 50–56 supply receipts + archive | 7 | **✅ done** |
| A12a · الأشكال 21 · 24 gantt extension, amendment block, parse state | 4 | **✅ done** |
| A12b · import validation checks | 1 | ⏸ **needs the server to declare its gates** |
| A12c · `d-sched-stat` | 1 | ⬛ **superseded** by `<epm-status-pill>` |
| A11 · shell zones and panes | 6 | ⬛ **none portable** — 2 never render, 1 renders empty, 2 are a recorded divergence, 1 would breach §6 |
| A15a · shared primitives — callout | 3 | **✅ done** — `d-panel-body` withdrawn, see below |
| A15b · `d-check` `d-model-topbar` `d-l04-z8fall` | 3 | ⬛ **not portable** — one recorded decision, two superseded |
| A7 · الشكل 15 · 17 allocation strip + audit SLA | 2 | **✅ done** |
| A10 · feed and share bar | 6 | ⬛ **out of reach** — only admin and profile render it |
| A16 · الشكل 10 amendment stack | 1 | **✅ done** |
| A17 · الشكل 47 · 48 alert severity | 1 | **✅ done** |
| A13 · charts — mini timeline + line trend | 6 | **✅ done** — and it needed an endpoint field |
| A5-rest · `d-actmenu` | 1 | 🔨 |
| **D · dead in the reference** | **34** | ❌ do not port |
| B · intended | 29 | — |
| C · module absent | 6 | — |

The drift is **omission, not invention**: 151 against 5. Nothing here says the port did
something wrong instead — and three rounds of correction have said it did rather less wrong
than the first measure claimed.

### What each correction changed, and why the number keeps moving

1. **148 → 151.** Three classes were counted as ported because a *comment* named them while
   explaining why they are deliberately absent. The tool now strips HTML and JS comments
   before tokenising, and `d-bulkbar` · `d-nav-grp` · `d-three` moved to §B4. Two more would
   have gone the same way this session — the A4b comment naming `.d-vow-facets` and
   `.d-vow-chip` as *not built* would have retired both rows.
2. **26 dead.** The measurement read `className=` out of the reference **source**, so
   components declared, exported to `window`, and never mounted looked like missing markup
   (P-210).
3. **26 → 34 dead.** That check was one level deep. A component mounted only *inside* an
   unmounted one is still unreachable, and the prototype supersedes whole modules — which
   is how A5 and A14 turned out to be retired screens (P-212).

**Acceptance is a GAP of 66.** That number replaces two this file used to carry — «40» here
and «33» in §Acceptance — and neither was ever recomputed as clusters withdrew. Both were
written when the only recorded non-markup verdicts were B and C, so every later withdrawal
(A11's 6, A15b's 3, the superseded pair, A12b's 1, A4b's 6, the feed's 6, `d-switch`) went
into the file's prose and never into its arithmetic. Counted rather than tallied by eye, the
67 that remain are:

| | | |
|---|---|---|
| **B** intended | 29 | BIM/IFC 19 · drawings viewer 6 · readiness 1 · §B4 3 |
| **C** module absent | 6 | administration 4 · profile 2 |
| behaviour | 11 | A2b 5 · A4b 6 |
| A11 shell | 6 | none portable — see §A11 |
| superseded | 5 | `d-gantt-resize` `d-sched-stat` `d-check` `d-model-topbar` `d-l04-z8fall` |
| feed, and `d-dot` | 6 | only admin and profile still render them |
| A12b | 1 | `d-val-row` — waiting on the server's gates |
| `d-switch` | 1 | admin and profile both — same reach as §C |
| `d-panel-body` | 1 | **withdrawn at the A7 audit** — admin, profile and one dead component are its only emitters. §A15a |
| **buildable markup left** | **1** | A5-rest 1 — `d-actmenu` |

29 + 6 + 11 + 6 + 5 + 6 + 1 + 1 + 1 + 1 = 67, so acceptance is 67 − 1 = **66**. Anything else
needs a row here explaining it — including a later decision to build one of the ⏸ clusters,
which would lower it again.

**Check the partition, do not trust the tally.** `tools/structure-gap.mjs --list` prints the
GAP set; bucketing it by hand is how the «40» and the «33» above got away from the file in
the first place, and the first version of *this* table lost `d-switch` and summed to 73
against a measured 74. Every row above was checked to cover the printed set exactly once —
no class in two buckets, none in none.

## Triage — what the remaining 97 actually are (A6 · A8 · A12 closed 17; A11 withdrew 6)

Done after four clusters produced four different outcomes, so the rest is sorted **before**
anyone starts building rather than one cluster at a time. Every class below has a mounted
emitter — the DEAD bucket already removed the ones nothing renders. What is left is the
question the mount check cannot answer: *is this markup, or is it a feature?*

| verdict | classes | what it means |
|---|---|---|
| **not reachable** | **36** | the screen is out of the port's scope — the model viewer, the drawings viewer, admin, profile. Nothing to do until that scope changes |
| **markup** | **49** — 1 left; A11 withdrew 6, A15 withdrew 3 | the port renders the same content in a different structure. This is the real backlog |
| **behaviour** | **11** | needs state or interaction the port does not have. Each needs a decision, not a template edit |
| **superseded** | **4** | the port has a documented better equivalent; porting would be a regression |

**Triage started on A5 and A5 stopped existing.** The port's الربط بالأنشطة draws
`boq-assign-row` · `boq-queue-b` · `boq-qcard` · `boq-remchip` — which are not bespoke at
all: they are `boq-assign.jsx`'s own classes, and `web/src/styles/boq.css` is a **verbatim
copy** of the reference's (diff = 0). The port followed `DBoqAssign`, the newer component.
`d-alloc*` and `d-openrow` come from `DBOQAssignment`, which lives inside `DModBOQ` —
**superseded and mounted by nothing**. Rebuilding A5 would have replaced correct work with
retired markup. Same for A14: `DContractCtx` is in the same superseded module. See P-212.

### behaviour — 11, all already split out

`d-ctxnum` `d-l14-z8fall` `d-vo-qfall` `d-vo-qitem` `d-vo-queue-b` (A2b · focus mode) ·
`d-vow-cap` `d-vow-chip` `d-vow-facets` `d-vow-prov` `d-vow-state` `d-vow-f` (A4b)

Of these, **`d-vow-cap` is the one worth building on its own merits** — `CLAUDE.md` §6 wants
invalid input prevented and the cap explained, and the port's quantity fields carry neither
a max nor a hint.

### superseded — 2

`d-gantt-resize` is the reference's drag handle on the **info block**; the port has
`d-gantt-namegrip` on the **name column**, which is what `04 §5` actually asks for and is
recorded in `styles.css` as a deliberate improvement. Porting it would undo that. Moved to
§E. And `d-sched-stat` joins it from A12c: the port renders activity status through
`<epm-status-pill kind="activity-status">` at all three sites the reference uses
`DSchedStatus`, and as the bar FILL on the Gantt row — a fourth status vocabulary would
fragment the one thing §6 asks to keep single.

### markup — 49, by cluster, largest first

| cluster | live | evidence checked |
|---|---|---|
| A8 · SCR-W14 reports ✅ | 6 | **done, and it was not the markup this table predicted** — see below. The reference is a two-pane `.d-report-shell` — category rail + view; the port filters a flat table with `.d-fchip`. The selection state already exists as the category filter, so it moves rather than gets built |
| A6 · الأشكال 50–56 supply ✅ | 7 | **done, and the prediction was half right.** The port DID draw cards under two subheadings — with a bespoke `.sup-card` while `.d-rcpt` and `.d-att` sat shipped and unused. What the table missed: every receipt carries `documents` that **nothing rendered at all** |
| A12 · الأشكال 21–24 schedule ✅ | 6 | **4 done, 1 split, 1 superseded.** `d-gantt-ext` was the find: the Gantt showed **nothing** for an approved-but-unapplied extension, so an activity with 12 days waiting drew like one with none. `d-parse`/`d-spin` fill a genuinely async gap — the parse said nothing at all. `d-act-amd` went **inside** the activity pane, which had no amendment information. `d-val-row` needs the server to declare its gates (A12b); `d-sched-stat` is superseded by `<epm-status-pill>` |
| A11 · shell zones ⬛ | 6 | **none portable, and this row was wrong.** The shell does jump d-pz2 → d-pz5 — and so does the reference: d-pz3 is gated on a `vitals` prop no call site passes, d-ctxmenu on a state nothing sets, d-pz4 renders empty. See §A11 |
| A15 · shared primitives | 7 | `d-panel-body` `d-callout*` `d-check` `d-model-topbar` `d-l04-z8fall`. Small, and they repaint every screen at once. `d-panel-body`'s only reference callers are unported screens, but the sheet expects it inside every `.d-panel` — adopt anyway |
| A13 · charts | 6 | the port has `<epm-scurve>` but **no** mini-timeline; `.d-tl-mini*` is a compact per-row list. The BOQ tab's `.d-mini-bar` is the nearest thing. Needs its rows fed, so it is markup + a data check |
| A10 · feed and share bar | 6 | `d-feed*` and `d-dot`. **Check these against الشكل 2 and الشكل 4, not against `DActRows`** — that component is dead, so the only thing still rendering `d-feed*` is admin |
| A7 · الشكل 15 · 17 financials | 2 | `d-slastages` is a straight swap for the port's `.epm-slastage`; `d-yalloc` is the annual-allocation strip |
| A16 · A17 · A5 rest | 3 | `d-amdstack` `d-alert-sev` `d-actmenu` — one element each |

Counts computed, not tallied by eye: the four buckets are 36 + 49 + 11 + 1 = 97, and the
table above sums to 49.

**A8 is now the one that changes what a user sees most**, and it is the A1 shape — a
different structure built for content the port already has, needing no new data. A5 used to
head this list; triaging it is what found P-212.

**Read `d-feed*` and `d-panel-body` with care.** Their only remaining emitters are admin and
profile components — screens this port does not have — so they are "live" only in the sense
that something renders them *somewhere*. `d-panel-body` is worth adopting regardless,
because the sheet expects it inside every `.d-panel`. A10 should be checked against الشكل 2
and الشكل 4 rather than against `DActRows`, which is dead.

| verdict | meaning |
|---|---|
| **rebuild** | the plate demands it, the CSS is shipped, the markup was never written |
| **intended** | a recorded decision — `07 §8`, P-09, P-118. Not drift. Do not "fix" |
| **module absent** | the whole screen was never ported. Bigger than markup |
| **keep — improvement** | the app's own, deliberately. Never read these as drift |

---

## A · Rebuild — 115 classes

Ordered by how much each changes what you see. Every one is **markup only**: the class
already exists in the copied sheets, so `CLAUDE.md` §3.7 holds and **no CSS rule is added**.

### A1 · الشكل 6 · 7 — contract register and cost breakdown · SCR-W3 · 12 · **✅ DONE**

`project-modules.jsx:363` `DModContractNew` (grid at `:490`, cost split at `:731`) →
`features/contract-tab/contract.page.html`

**Not what this file first claimed.** The port did *not* draw a `d-table` — it drew the
card grid too, out of ~90 lines of bespoke `.epm-*`, on the strength of a comment in
`styles.css` asserting that `DModContractNew` «renders a seven-column table with none of
the five figures the card carries». That was never true: the component renders
`.d-contract-grid` of `.d-contract-card` in the v1.1 branch, in the pre-v1.1 `main`, and in
**both** checked-in revisions of the reference. The structure was re-derived while an
identical one sat shipped and unused. The largest instance of §D, and the reason it is
worth reading this file before rebuilding anything.

Ported: `.d-csum` (+ `> .hd`) for the contractual position, `.d-recon` unchanged (already
correct), `.d-csum-bars` for the two rails — its `.track > u` is the «العلامة = نسبة الصرف»
tick — `.d-contract-grid` / `.d-contract-card*` for the cards, `.d-costsplit` for الشكل 7's
«تفصيل كلفة العقد». Deleted from `styles.css`: `.epm-concard*`, `.epm-conmeta`,
`.epm-confoot`, `.epm-barpair`, `.epm-track.marked`/`.mk`, `.epm-costgrid`/`.epm-costtile`,
`.d-pill.count::before`.

`d-contract-grid` `d-contract-card` `d-contract-card-top` `d-contract-card-title`
`d-contract-card-kv` `d-contract-card-val` `d-contract-card-mtx` `d-contract-card-foot`
`d-contract-mini` `d-csum` `d-csum-bars` `d-costsplit`

Two things the rebuild turned up, both recorded in P-207 rather than papered over:

- **The card had no focus ring.** `.d-contract-card` is `all: unset` on a `<button>`, which
  resets `outline` to `none` and **beats** the global `:focus-visible` at `tokens.css:390`
  — equal specificity, `desktop.css` loads later. The sheet gives the card a `:hover` rule
  and no focus one. Fixed in `styles.css` with the global rule's own values, exactly the
  P-204 precedent. The defect is in the reference too.
- **`.d-costsplit .cf` is `--fs-100` = 10px**, where the deleted `.epm-costtile .sp2` was
  11.5px. Below the 11px floor, and it is P-33 — one of the four breaches the client chose
  to keep for fidelity. Adopted rather than overridden, because overriding it would reopen
  a decision the client has already made.

### A2a · الشكل 29 · 33 — register table and المسار layout · SCR-W8 · 5 · **✅ DONE**

`vo-record.jsx:454` `DModVO` (register `:721`, L14 layout `:1311`) →
`features/change-orders/change-orders.page.html` · `change-order.page.html`

The register was `.d-tablewrap` + `.d-table` + an inline `min-width: 1240px`; it is now the
sheet's `.d-vow-tw.wide-voreg` + `.d-line-table.d-vo-reg`. Three things follow, all of them
the sheet's own: the min-width stops being a number in the template, the register gains
`max-height: 62vh` with its own scroll so the filter bar and footer stay in view, and the
type drops from `.d-table`'s hard-coded `14px` to `.d-line-table`'s `--fs-200`.

**A correction to what this paragraph first said.** It claimed 14px is «not on the eight-step
scale at all», citing `CLAUDE.md` §6 — *"11 / 11.5 / 12 / 13 / 15 / 18 / 21 / 24"*. That is
the **pre-v1.1** scale. The shipped tokens are `--fs-100…1000` = **10 · 12 · 14 · 16 · 20 ·
24 · 28 · 32 · 40 · 68**, so 14px is `--fs-300` and squarely on it. The swap is still right —
`.d-line-table` is the sheet's own «doc's `table.dg` contract, applied to every in-page
grid», and it drops an inline `min-width` — but the type-scale argument was false. §6 has not
been updated since Phase 1.5 replaced the palette and the scale together; see P-214. The cell contract came with it (`.code`, `.name.wrap`, `.r.num`), which is
load-bearing: `.d-line-table tbody td` is `white-space: nowrap`.

The المسار tab was three sections stacked in one column, which put the decision *below* the
thing it decides. It is now `.d-l14` — Z7 split **60/40**, trail inline-start, and a
`position: sticky` `.d-l14-dec` `<aside>` holding القرار and حالة المعاملة, so an approver
scrolling a six-stage chain keeps the decision in view. Collapses to one column at 1180px.

`d-form-state` replaced a `<span style="flex: 1">` in the external-decision drawer footer —
the sheet's own state line, which is both the spacer and the place the refusal is stated.

`d-vo-reg` `d-l14` `d-l14-trail` `d-l14-dec` `d-form-state`

### A2b · الشكل 30 «منتقي الأمر» — focus mode · 5 · ⏸ **NOT MARKUP — needs a decision**

`vo-record.jsx:996` (toolbar prev/next) · `:1022` (Z8 queue) · `:1082` (Z7 fallback)

These five are **a feature the port does not have**, not a structure it draws differently.
In the reference, when the persona has orders awaiting their action the record enters a
focus mode: a queue of those orders lives in the Z8 rail (`.d-vo-queue-b` of
`.d-vo-qitem` buttons), the toolbar grows «السابق / التالي» with a `.d-ctxnum` position
counter, and `.d-vo-qfall` gives the queue a home in Z7 below 1180px where Z8 is hidden.
The point is stated in the sheet itself: *"the queue stays beside the record so the user can
clear it in one pass."*

Building it needs queue state and a per-persona "awaiting me" list on the record route —
behaviour and data, not classes — so it is **outside step C's markup-only scope** and is not
counted against A2a. `d-l14-z8fall` sits here too: it duplicates the whole Z8 بطاقة الأمر
card for widths under 1180px, which in Angular means repeating the block rather than calling
a function, and it is only worth doing alongside the queue it shares the slot with.

`d-vo-queue-b` `d-vo-qitem` `d-vo-qfall` `d-ctxnum` `d-l14-z8fall`

### A3 · ~~الشكل 33 — مسار الاعتماد~~ · 5 · ❌ **DEAD — do not port**

`project-modules.jsx:74` `DReviewFlow`

**This entry was wrong twice over, and checking before building is what caught it.**

First, `DReviewFlow` is not الشكل 33's approval path. It is a generic four-step review strip
— مسودة · مُقدَّم · قيد المراجعة · معتمد — with a «مُعاد بملاحظات» marker. `03 §2`'s **six**
stages are drawn by `.d-votrail`, which the port already uses. Putting this on the المسار tab
would have contradicted the plate it claims to serve.

Second, and decisive: **`DReviewFlow` is never mounted.** It is declared at `:74`, exported
in the `Object.assign(window, …)` list at `:3020`, and rendered nowhere — no `<DReviewFlow`,
no `<window.DReviewFlow`, in the checked-in reference or in the live prototype
(`curl …/app/project-modules.jsx | grep -c '<DReviewFlow'` → 0). The five classes and their
CSS draw nothing in the running app. Porting them would have meant **inventing a call site
the reference does not have**.

Moved to §D. See P-210.

`d-review-flow` `d-rf-step` `d-rf-dot` `d-rf-l` `d-rf-ret`

### A4a · الشكل 38 · 39 — picker bar and editor row · 3 · **✅ DONE**

`vo-wizard-parts.jsx:42` `DVOMultiPick` · `vo-wizard.jsx:425` `DVOCreateWizard`
→ `features/change-orders/change-order.wizard.html`

The picker's search moved out of `.d-modal-body` into the sheet's own
`.d-vow-filters > .d-vow-search` bar, which is `flex: none` so it holds still while the
result table scrolls under it; `.d-field`, the app's generic search box, had been standing
in. And الشكل 39's expanded item card became `<tr class="d-vow-ed">` — the sheet gives the
row a `--surface-container-low` plane and a closing border, so the editor reads as a panel
opened out of the table rather than as more table. `.d-vow-edh` joins the existing
`.d-vow-tier` on the header rather than replacing it: `edh` supplies the inset and divider
that `.d-vow-ed`'s `padding: 0` removes, `tier` keeps `.t` and the tone on the 20% note.

`.d-vow-sub` was this row's only caller and is now unused — one of the six classes the sheet
ships that the prototype never emits.

`d-vow-filters` `d-vow-search` `d-vow-ed`

### A4b · الشكل 38 · 39 — facets, chips, caps · 6 · ⏸ **NOT MARKUP — needs a decision**

Six classes, four behaviours the port does not have:

- **`d-vow-facets` · `d-vow-chip`** — the picker filters by column (division, WBS, location)
  with the active filters shown as removable chips. Needs facet definitions per pool and
  filter state; the port's picker is search-only. The reference also multi-selects with
  checkboxes and adds in bulk («إضافة المحدد (n)») where the port adds one row at a time —
  a second behavioural difference in the same dialog.
- **`d-vow-cap`** — the quantity field states its ceiling («الحد N») and says when it has
  clamped («حُدَّ بالكمية المتبقية»). This is `CLAUDE.md` §6's *"prevent invalid input — cap
  the field and explain the cap — rather than flagging it after"*, so it is worth building;
  the port's inputs carry neither a max nor a hint. Needs clamping state.
- **`d-vow-prov`** — «جزئي — سعر الزائد غير مُحدَّد» under a proposal priced only in part.
- **`d-vow-state`** — the per-row state marker with its note list.
- **`d-vow-f`** — a 6px inline field row. Trivial CSS, but it has no obvious call site in the
  port's markup; it needs one identified rather than invented.

`d-vow-facets` `d-vow-chip` `d-vow-cap` `d-vow-prov` `d-vow-state` `d-vow-f`

### A5 · الشكل 12 — BOQ register, item card, activity assignment · SCR-W4 · 14

`project-modules.jsx:1931` `DBOQAssignment` (`:2027`) · `boq-assign.jsx:11` `DBoqAssign` ·
`boq-register.jsx:435` `DBoqRegister` → `features/boq/boq.page.html`

The allocation state is a **block with its own meta and progress** per row
(`d-alloc-top`/`-meta`/`-prog`), not a pill; adding a line is inline (`d-add-inline` ·
`d-add-trigger`); the assignment screen carries a per-row method menu (`d-actmenu`) and the
year-allocation strip (`d-yalloc`); a line priced in two bands draws `d-rate-multi`.

`d-alloc` `d-alloc-top` `d-alloc-meta` `d-alloc-prog` `d-openrow` `d-add-inline`
`d-add-trigger` `d-actmenu` `d-yalloc` `d-rate-multi` `d-tl-mini-fill` `d-tl-mini-track`
`d-form-hint` `d-inp`

### A6 · الأشكال 50–56 — supply items, receipts, archive · 6

`supply-items.jsx:24` `DModSupplyItems` (`:304`) · `DModReceipts` →
`features/supply/supply.page.html`

الشكل 52's receipt **cards** under their two subheadings, and الشكل 52's «أرشيف الفقرة» as
attachment cards — the port lists both as table rows.

`d-att` `d-attlist` `d-rcpt` `d-rcptlist` `d-filechip` `d-form-ro`

### A7 · الشكل 15 · 17 — التخصيص السنوي and مهل التدقيق · SCR-W7 · 2 · **✅ DONE**

`project-modules.jsx:1225` (`.d-yalloc`) · `:1324` (`.d-slastages`) `DModFinancialNew`
→ `features/financials/financials.page.html`

**Both were already reinvented** — the largest §D pair after A1, and the A1 note had already
named the rules that would go with them. `.d-slastages` is shipped at `desktop.css:3041` and
`.d-yalloc` at `:3023`; the page drew `.epm-cardgrid` of `.d-panel.epm-hrows.epm-slastage`
and `.epm-bar` + `.d-fig-row`, all declared in `web/src/styles.css`.

Deleted from `styles.css`: `.epm-slastage`, `.epm-cardgrid`, `.epm-hrows`, `.epm-bar` — the
four the A1 note promised «go with A7». `.epm-reghead` did **not** go, and §A7's row in
`styles.css` now says why: الشكل 17 has no such row, because the reference carries the
verdict as `DFGroup`'s `sub` and the current stage inside the `DMsgBar`. This port states
both up front beside the certificate's own status. That is the port having more to say, not
a structure it drew differently, so there is nothing in the sheet to adopt.

What the swap actually fixed, measured on the running fixture rather than argued:

- **The stage cards were three different heights.** `.d-slastages .ss` is
  `grid-template-rows: auto auto 1fr` precisely so a row of them is not — the comment above
  the rule says so. Re-measured after: all three cards **107px**, footers on one line.
- **`.d-yalloc .af` is a three-column grid** where `.d-fig-row` was a flex row, so the widest
  figure can no longer push the other two off the baseline; and `.d-yalloc` is a
  `container-type: inline-size`, so the terms stack at 520px of its **own** width rather than
  the viewport's.

Two things the rebuild turned up, both recorded in P-221:

- **The sheet gives `.d-yalloc .track > i` no background.** The reference paints it inline —
  `background: yrPct > 95 ? 'var(--warning)' : 'var(--viz-1)'` at `project-modules.jsx:1223`
  — so emitting the sheet's `.track` alone leaves the rail invisible. The fill joins the one
  rule this port already adds for exactly this reason (`.d-csum-bars .track > i.spend`).
  Keeping the port's `.epm-track` instead would have supplied a fill but **also** its own
  background and `margin-block`, and `styles.css` loads last — it would have overridden the
  sheet it is meant to be adopting. **One colour, not the reference's two:** its >95% branch
  colours a magnitude by threshold, which `CLAUDE.md` §6 forbids by name, and the
  near-exhausted state is already carried in words by the msgbar under the strip.
- **The reference has no per-stage overdue.** `EPM.paymentSLA` (`model.js:732`) emits
  `done` · `active` · `todo` and treats lateness as one fact about the whole SLA; this port
  derives it per desk, which is more than the reference knows. `overdue` maps onto `.ss.active`
  and nothing is lost: the pill reads «تجاوز المهلة», the msgbar states R12's escalation, and
  the card itself prints «19 يوم مضت» against «السقف 7 يوم». That is 05 §7.6 satisfied three
  times over; a third dot colour is not what it asks for.

`d-slastages` `d-yalloc`

### A8 · SCR-W14 — التقارير والتحليلات · 6 · **✅ DONE**

`project-modules.jsx:2771` `DModReports` (shell at `:2797`) →
`features/project-reports/project-reports.page.html` + **a new endpoint**

**Two label corrections first.** This is not الشكل 49 — that plate is the *university* reports
screen, `DReports` (`desktop-reports.jsx:58`), which emits none of these classes and is
SCR-E7. And the triage called this markup; it was not. The reference's `DModReports` is a
report **viewer** — a rail of report types beside a view that renders each one inline. The
port's SCR-W14 was a **catalog**: which reports this project can produce, and which source is
empty when it cannot (P-123). Two screens, two questions, and the port's answer is
information the reference does not have.

Built at the client's decision: **the shell AND the bodies.** `EP-PRP-02`
(`GET /api/projects/{id}/reports/{reportId}`) returns one report as figures + an optional
comparison + a table — which is what all six of the reference's bodies are, so the view
carries no branch per report and a new report describes itself. Seven of the nine render real
bodies (2–55 rows); nothing is computed client-side, and effective value and finish come from
`Domain/Amendments`, the same function SCR-W3 calls, so a figure here cannot disagree with the
contract tab.

**The port's answer was kept, and split in two.** `available: false` means the project has
nothing to report on and names the empty source. `rendered: false` means the report is
producible and this build does not draw it inline — RPT-04 wants weight-rolled BOQ progress,
which is SCR-W6's own rollup and would have been a second answer to «ما نسبة الإنجاز». Two
different absences, each said in words rather than shown as an empty pane (`04 §9`).

`d-report-shell` `d-report-cat` `d-report-cat-i` `d-report-view` `d-report-view-head`
`d-rev-title`

### A9 · الشكل 11 · 19 — activity log and financial change log · 6

`project-modules.jsx:41` `DEditTimeline` → `features/contract-tab/contract.page.html` ·
`features/financials/financials.page.html`

One row per **changed field**, with the old value struck through and the chips naming what
moved. Both pages currently draw `d-trail`/`d-tstep`, which is the generic step trail.

`d-edit-timeline` `d-edit-item` `d-edit-chips` `d-edit-chip` `d-edit-dot` `d-edit-meta`

### A10 · الشكل 2 · 4 — activity feed and distribution · SCR-E1 · SCR-E8 · SCR-W1 · 10

`desktop-views.jsx:28` `DActRows` (`:32`) · `desktop-views.jsx:7` `DDistribution` (`:15`) →
`features/portfolio/portfolio.page.html` · `workspaces.page.html` · `overview.page.html`

`d-dist` is the stacked share bar and `d-legend`/`d-legend-i` its two-column key.
**Already reinvented** — see §D.

`d-feed` `d-feed-i` `d-feed-av` `d-feed-tx` `d-feed-time` `d-actico` `d-dist` `d-legend`
`d-legend-i` `d-dot`

### A11 · Workspace shell — panes and zones · 10

`desktop-workspace.jsx:279` `DProjectContext` (`:340`) · `DWorkspace` ·
`desktop-shell.jsx:611` `DProjectHeader` · `DPager` · `DContextMenu` →
`shell/shell.component.html` · `features/workspace/workspace.page.html`

**⬛ NOTHING HERE IS PORTABLE, and every one of the six has its own reason.** This entry used
to say «Z3 and Z4 are absent entirely — the shell jumps `d-pz2` → `d-pz5`». The jump is real.
What the entry missed is that **the reference makes the same jump**, and the rest is either
a recorded divergence or a rule this port keeps and the reference does not.

| class | why not |
|---|---|
| `d-pz3` | **Never renders.** `DProjectHeader` guards it with `vitals && vitals.length > 0`, and the one call site — `desktop-workspace.jsx:257` — passes **no `vitals` at all**. `grep -rn "vitals=" *.jsx` returns nothing |
| `d-ctxmenu` | **Never renders.** `DContextMenu` is gated on `ctxMenu`, and `setCtxMenu` appears exactly once in the whole reference: inside that element's own `onClose`. Nothing ever opens it |
| `d-pz4` | Renders, and renders **empty**: `const headerActions = [];` (`desktop-workspace.jsx:179`). Porting it adds an empty div. The port puts module actions in Z6, which the reference also does |
| `d-pane` `d-detail` | The inner wrappers of `.d-three`, which §B4 already records as deliberately restructured — this shell uses `.d-detail-layout` / `.d-detail-main`, and `shell.component.ts:124` says so. `.d-pane` is `min-width:0; flex column; overflow hidden` and `.d-detail` is a background; both are already provided |
| `d-qrow-rail` | A 3px bar beside the project name in the picker, coloured by status **and carrying no label or title**. `CLAUDE.md` §6: *status is never colour-only*. Porting it would import a rule breach the port currently does not have |

### The blind spot this cluster exposed

The mount graph (P-212) answers *"is this component reachable"*. It cannot answer *"does this
branch ever execute"* — and `d-pz3` and `d-ctxmenu` are both reachable components whose
markup is behind a prop or a state that **no call site ever supplies**. Detecting that needs
dataflow, not a graph, so it stays a **triage step rather than a tool check**:

> Before porting a class, find its enclosing conditional. If it is gated on a prop, grep every
> call site for that prop. If it is gated on state, grep for the setter.

Two of six here failed that check. It is the same family as A3 and A5 — markup that exists in
the source and draws nothing in the running app — and it is why the triage reads call sites.

`d-pz3` `d-pz4` `d-ctx` `d-ctx-sec` `d-ctx-act` `d-pane` `d-pane-scroll` `d-detail`
`d-qrow-rail` `d-ctxmenu`

### A12 · الأشكال 21–24 — schedule and P6 import · SCR-W5 · 7

`schedule-module.jsx:80` `DGantt` (`:239`) · `DImportWizard` · `DModSchedule` ·
`DSchedStatus` → `features/schedule/schedule.page.html` · `schedule-import.wizard.ts`

**A12a — done · 4.** `d-gantt-ext` is the one that mattered: `02 §9` and non-negotiable #2
keep an approved-but-unapplied order out of every effective figure and show it labelled
beside them — and the Gantt showed **nothing at all**, so an activity carrying 12 approved
days drew exactly like one carrying none. It is now the sheet's hatched, dashed tail picking
up where the bar ends (verified on A10: bar ends 887.5px, tail 19.5px to 2026-12-10).
`d-parse`/`d-spin` fill a real silence — the parse *is* async (`File.text()`, and the Excel
path lazily imports SheetJS) and nothing on screen said so. `d-act-amd` went inside the
activity pane, which showed the dates, the float and the cost with no sign a change order had
moved any of them; applied and pending stay apart there, and the drawer still opens from it.

**A12b — 1, split.** `d-val-row` is one row per validation GATE with its own pass/warn mark.
`EP-SCD-05` returns **violations**, not gates, so the checks list would have to be invented
client-side from what failed — which would silently claim a gate ran. The honest fix is the
server declaring the gates it runs (`Domain/ScheduleImport` validates seven: file, activityId,
name, baseline, cost, manhours, predecessors), the same shape `EP-PRP-02` took in A8.

**A12c — 1, superseded.** `d-sched-stat` is the reference's raw status span. The port renders
activity status through `<epm-status-pill kind="activity-status">` at all three sites
`DSchedStatus` appears, and on the Gantt row as the bar FILL (`04 §5` — status is the fill,
criticality the ring). Porting a fourth vocabulary would fragment the one thing `CLAUDE.md`
§6 asks to keep single. §E.

`d-gantt-ext` `d-gantt-resize` `d-act-amd` `d-parse` `d-val-row` `d-sched-stat` `d-spin`

### A13 · Charts — mini timeline and line trend · SCR-E1 · 6 · **✅ DONE**

`desktop-charts.jsx:84` `DLineTrend` · `:116` `DTlMini`, both mounted in `DDashboard`
(`desktop-views.jsx:281` · `:285`) → `features/portfolio/portfolio.page.html` ·
`shared/line-trend.component.ts`

**The one cluster that needed the server.** Two panels on SCR-E1, and the port had neither
in the reference's shape:

- **«الصرف السنوي»** is a `.d-line-chart` line trend in the reference; the port drew bars.
- **«الجدول الزمني للمشاريع · أعلى 5 مشاريع كلفةً»** did not exist at all. The port's third
  panel in that column is «القيمة النافذة حسب مساحة العمل», which the reference does not have.

`d-mlist`/`d-mlist-row` were never part of this: `DMetricList` is **dead**, so they sit in §D.

#### The endpoint field, and why it is one field

`band.Projects` already carried name, status, value, physical, `PlannedFinish` and
`ForecastFinish` — everything the row draws **except the start date**. So
`PortfolioBand.ProjectRow` gains `Start`, derived where its mirror already is: a project
starts at its earliest contract start, the way it finishes at its latest contract finish.
`TimelineRow` is then a projection, and `PortfolioEndpoints` only orders by value and takes
five — the reference's own `[...portfolio].sort((a,b) => b.cost - a.cost).slice(0,5)`.

Projects with no contract are **excluded rather than drawn with two empty dates**: the panel
is a timeline, and a row with no span says nothing while still taking one of the five places.
The fixture has four projects and three qualify.

#### The mark is the reference's; the data is not, and must not be

`DLineTrend`'s series on this screen is `spendWeights = [0.14, 0.17, 0.20, 0.23, 0.26]` times
the portfolio total, over hard-coded years 2022–2026 (`desktop-views.jsx:64`). That is a
**shape, not a figure** — the same kind of invented series P-200 records for the curves — and
`PortfolioEndpoints` had already refused it in as many words: «Real years from real payment
dates — never a weight table». So the panel draws the port's own `annualSpend` and keeps its
own sub-line; it is **not** relabelled «تراكمي» the way the reference's is, because that
series only looks cumulative as its weights ascend, and the real cumulative position is the
financial curve higher up the same page.

#### Three things the rebuild turned up, all in P-225

- **`.d-tl-mini-row` is `all: unset` on a `<button>` with a click handler** — so it is a tab
  stop, and it computed `outline-style: none` for the third time in this port. Same defect
  and same fix as `.d-contract-card` (P-207) and `.d-fgroup > .gh` before it. Verified with a
  real Tab: `2px solid var(--primary)`, offset 2px.
- **The dates line is styled INLINE in the reference** (`desktop-charts.jsx:125-127`) — the
  sheet stops at `.d-tl-mini-fill`. The declarations move to `styles.css` under **scoped
  child names**, `.d-tl-mini-row .dates` and `.late`, not new `d-*` blocks: that is the
  sheet's own idiom (`.d-yalloc .ah`, `.d-slastages .sf`, `.d-rcpt .hd`) and it keeps the
  inventory honest — OWN stayed at 5, where a `d-`-prefixed name would have read as
  something the design system ships.
- **The overrun is never colour alone.** The late date is `--error`, and both dates print
  either way, and the row's `title` names the overrun in words (05 §7.6).

`d-tl-mini` `d-tl-mini-row` `d-tl-mini-name` `d-tl-mini-track` `d-tl-mini-fill` `d-line-chart`

### A14 · Contract context strip · 3

`contract-context.jsx:88` `DContractCtx` (`:92`) → `features/contract-tab/contract.page.html`

The pinned "which contract am I in" strip with its figure and its selector row.

`d-cctx` `d-cctx-f` `d-cctx-r`

### A15 · Shared primitives never adopted · 8

`desktop-admin.jsx:90` · `desktop-shell.jsx` `DCheck` · `project-modules.jsx` `DModBOQ` /
`DPaymentWizard` → every page

**A15a — done · 3 of 4.** `d-callout*` stands. **`d-panel-body` was WITHDRAWN at the A7
audit, and the seven wrappers it added have been removed.**

The original diagnosis was right twice and the fix was wrong twice, which is worth keeping in
full because it is the clearest §D in the file. `styles.css` said `.d-panel` carries no
padding of its own, that the sheet expects a `.d-panel-body` wrapper these pages never used,
and that the bodies «all touched the panel border on all four sides. Measured: 1px of inset,
which is the border». The first fix —
`.d-panel > .epm-donut-row, .d-panel > .epm-bars, .d-panel > .d-grid.stats { padding }` —
**matched nothing**: those three have no caller anywhere in the app, and the `.d-grid.stats`
strips are page-level children, not panel children.

A15 then replaced it with `.d-panel-body` around «the four chart components that genuinely
sat flush». **They never sat flush.** `<epm-scurve>` and `<epm-bar-compare>` both emit
`.d-chart-card` (`desktop.css:779`) — a card in its own right, with background, border,
radius, shadow and `padding: 16px 20px 12px`. The wrapper added 16px on top, so those four
panels were inset about twice as far as everything around them, and the «17px» this
paragraph used to report was the wrapper's edge, not the chart's.

**Checked against the live prototype, which settles it.** On its dashboard the panels are
`.d-panel > .d-panel-head + .d-chart-card` — a *direct* child — and the page emits
`.d-panel-body` **zero** times. The sheet even keys rules on that adjacency
(`.d-dash-main > .d-panel > .d-chart-card`, `desktop.css:730`; `.d-hero > …`, `:751`), which
an inserted wrapper stops matching; this port uses neither container, so nothing broke there
and the padding is the whole of the damage.

`.d-panel-body` has **no home in this port at all**. Its emitters in the reference are
`DAdmOverview` · `DAdmAssignments` (admin, §C1), `DProfile` (§C2) and `DDistribution` (dead)
— every one a screen this port does not have. It belongs with the feed classes under «out of
reach», and it is counted there now. `.d-tl-band`, `.d-donut-row` and `.d-hbars` carry their
own padding as they always did, and the `.d-mini` rows stay full-bleed. See P-224.

`d-callout` took الشكل 38's «مربع تفسيري لقاعدة الـ20%», which had been `.d-msgbar info` —
a class the sheet describes as «page-level state, four tones». The 20% rule is not a state;
it is what the screen is about, standing before any figure. **`.d-callout-tx > b` only:** the
sheet also styles a `.k` child with `text-transform: uppercase` and `letter-spacing: .4px`,
which `CLAUDE.md` §6 forbids outright — Arabic has no case and letter-spacing severs its
joins. The reference never uses `.k` there either.

**A15b — not portable · 3.**

- **`d-check`** — its only reachable caller is `DSpaces`' select column, and §B4 already
  records this port as having no select column and no `.d-bulkbar` (`entities.page.html:228`).
  Same decision, so the checkbox has nowhere to go.
- **`d-model-topbar`** — the *older* in-module header. `.d-pz6` is the module frame's own Z6
  and the port uses it everywhere. `DModReports` draws both: `desktop-workspace.jsx:262`
  wraps it in `DModuleFrame` with a title (reports is not in `SELF_FRAMED`) **and** it draws
  its own topbar with the same title. Porting it would reproduce a duplicated header.
- **`d-l04-z8fall`** — exists only to repeat a Z8 aside's content in the flow below 1180px.
  The port's «كيف تُحتسب» is an `<epm-drawer>`, which `CLAUDE.md` §6 asks for by name
  («secondary detail goes in a drawer, not an in-place expander») and which needs no
  fallback because it works at every width.

`d-panel-body` `d-callout` `d-callout-ico` `d-callout-tx` `d-check` `d-switch`
`d-model-topbar` `d-l04-z8fall`

### A16 · الشكل 10 — amendment stack · 1 · **✅ DONE**

`contract-amendments.jsx:324` `DContractAmendments` → `features/contract-tab/contract.page.html`

The plate's five sections were already there and already right; what was missing is the
wrapper they stand in. Z7 spaces its blocks at `--space-16` for every tab, and
`.d-amdstack` (`desktop.css:2775`) is the flex column `DContractAmendments` puts its own
groups in, at `--space-20`. Measured after: 20px inside, 16px around it.

**Two of its three rules are inert here, and the row says so rather than claiming a win.**
`.d-amdstack .d-form-grid` and `.d-amdstack .d-vow-tw` only bite when the sections inside
use those classes; this tab draws `<dl class="d-meta">` and `.d-tablewrap > .d-table` where
the reference draws `.d-form-grid` and `.d-vow-tw.wide-amd > .d-line-table`. That is the
same swap A2a made for the CO register, it is **not** part of A16 — which is one class — and
whoever takes it will find the wrapper already waiting.

`d-amdstack`

### A17 · الشكل 47 · 48 — alert severity · 1 · **✅ DONE**

`alerts-module.jsx:25` `DAlertSev` (call sites `:118` · `:210`) →
`features/project-alerts/project-alerts.page.html`

**This row nearly got withdrawn, and the reason it was not is worth keeping.** `DAlertSev`
has exactly two call sites: the `DRecordPane` aside that opens when an alert is selected —
which this port does not have on either alerts screen, so that one is behaviour, not markup
— and the **rules table**, which the port *does* have, in `project-alerts.page.html`. The
first read said the rules engine is out of scope (`alerts.page.html:22` says so of the
enterprise screen) and nearly closed the row on it.

Everywhere the port already renders a severity it was **right**: `.d-sevcell` +
`<epm-sev-dot>` in the enterprise table matches `enterprise-areas.jsx:213`, and the inbox
row's `.d-sev-dot` matches `DSevDot` at `alerts-module.jsx:275`. The rules table was the one
place it had invented a treatment — `.d-pill` + a tone — and `ALERT_SEV` even carries a
`.cls` field naming those exact tones, `stalled` · `suspended` · `completed`. **Nothing in
the reference consumes that field**; it is vestigial, and it is what made the port's pill
look sanctioned.

So the swap is geometry and glyph, not colour: `.d-pill::before` is the same 6px dot for all
three severities, so shape carries nothing and colour works alone, while `.d-alert-sev`
takes a per-severity icon — warning · error · info. Verified in the browser: three distinct
glyphs (triangle · exclamation · info), 24px, the labels «حرِج» · «متوسط» · «منخفض». That is
05 §7.6's «shape + colour + accessible label», and the reference's own `DSevDot` comment
argues it in the same words.

`.d-alert-sev` ships with **no colour** — `DAlertSev` paints it inline from `ALERT_SEV`, the
third instance of the pattern A7 found — so three tone rules join the documented block in
`styles.css`, using `.d-pill`'s own v1.1 tokens rather than the reference's older
`var(--error)` set, so severity here reads identically to severity everywhere else. See P-222.

`d-alert-sev`

---

## B · Intended — 27 classes · do not rebuild

### B1 · Real BIM/IFC rendering — `07 §8` · SRS §13 · 19

`model-module.jsx:83` `DModModel3D`. *"Keep the tab, stub the viewer."* The 3D scene, the
drawing sheet, the image compare strip and the revision picker are the viewer.

`d-model-tree` `d-model-toolbar` `d-model-tool` `d-model-badge` `d-model-drawing`
`d-model-images` `d-drawing-canvas` `d-drawing-sheet` `d-drawing-side` `d-drawing-tb`
`d-drawing-mini` `d-img-big` `d-img-thumb` `d-img-strip` `d-img-tag` `d-img-compare`
`d-rev-pick` `d-rev-tag` `d-superseded`

### B2 · Document preview and تأشيرات — P-118 · 6

`project-modules.jsx:2413` `DModDrawings`. الشكل 46's المعاينة and التأشيرات tabs are
**named in a notice** rather than opened onto an empty pane — the recorded decision.
`d-l18*` is that screen's tree-plus-sheet layout, which only exists to hold the viewer.

`d-viewer` `d-viewerbar` `d-dwg-reg` `d-l18` `d-l18-tree` `d-l18-fall`

### B4 · Deliberately absent, and already argued in the code · 3

Not found by this audit — found when `tools/structure-gap.mjs` stopped counting comments as
markup. Each is named in a template comment that explains why it is *not* there, which is
why each looked ported:

- `d-bulkbar` — `entities.page.html:228`: the register has no select column and no bulk bar.
- `d-nav-grp` — `shell.component.ts:182`: the reference's only `.d-nav-grp` is «الحوكمة»,
  a group this build does not print.
- `d-three` — `workspace.page.ts:26` · `shell.component.ts:124`: `DWorkspace` returns
  `.d-main > .d-three`; this shell makes the split differently.

`d-bulkbar` `d-nav-grp` `d-three`

### B3 · Module readiness dots — P-09 · 2

`desktop-workspace.jsx` `DProjectDetail` · `project-modules.jsx` `DReadiness`. The rail
shows a phase note in that slot instead.

`d-ready` `d-tab-ready`

---

## C · Module absent — 6 classes · not a markup gap

### C1 · Administration — proposal §24 · 4

`desktop-admin.jsx` `DAdmUsers` · `DAdmRoles` · `DAdmMatrix` · `DAdmAssignments` ·
`DAdmGroups` · `DAdmWorkspaces` · `DAdmProjects` · `DAdmAudit`.

**There is no `features/admin/` and no route.** The proposal §24 specifies eight admin
tools — المستخدمون المخوّلون · الأدوار ومستويات الصلاحية · الإسناد والنطاق · مصفوفة
الصلاحيات · المجموعات والهيكل التنظيمي · مساحات العمل والمشاريع · القوائم الموحّدة
والإعدادات · سجل التدقيق — and administration is **not** in `07 §8`'s out-of-scope list nor
in SRS §13. So this is an unbuilt module, not a documented omission, and it is bigger than
markup: `24`'s three inviolable controls (a user cannot see outside their formation · the
person who entered a transaction cannot approve it · a closed record cannot be edited
directly) have no screen to be administered from. **Raise with the client** — record the
answer in `TODO.md`, and carry it into `test.md` §17.

`d-head-actions` `d-party-av` `d-stat-ico` `d-mini-emblem`

### C2 · Profile screen · 2

`desktop-workspace.jsx:628` `DProfile`. No route; the account popover in the topbar carries
what the port needs of it. Low value — confirm and then move this to §B.

`d-dl` `d-dl-i`

---

## D-dead · 34 classes nothing renders — in the reference either

`node tools/structure-gap.mjs --list` prints these under `--- DEAD ---`. Each is emitted
only by a component that is **declared, exported to `window`, and never mounted** — no `<X`
and no `<window.X` anywhere in the reference. Their CSS ships, their markup exists in the
source, and the running prototype draws none of it.

**Do not port any of them.** Doing so means inventing a call site the reference does not
have, which is how a screen ends up with something the plate never asked for. They are not
counted against any cluster's total; the clusters below carry their live remainder.

| never-mounted component | classes | was in |
|---|---|---|
| `DReviewFlow` `project-modules.jsx:74` | `d-review-flow` `d-rf-step` `d-rf-dot` `d-rf-l` `d-rf-ret` | **A3, now entirely dead** |
| `DEditTimeline` `project-modules.jsx:41` | `d-edit-timeline` `d-edit-item` `d-edit-chips` `d-edit-chip` `d-edit-dot` `d-edit-meta` | **A9, now entirely dead** |
| `DProjectContext` `desktop-workspace.jsx:279` | `d-ctx` `d-ctx-sec` `d-ctx-act` `d-pane-scroll` | A11 (10 → 6) |
| `DDistribution` `desktop-views.jsx:7` · `DActivity` | `d-dist` `d-legend` `d-legend-i` `d-actico` | A10 (10 → 6) |
| `DModBOQ` `project-modules.jsx` / `contract-context.jsx` · `D0count` | `d-add-inline` `d-add-trigger` `d-rate-multi` `d-inp` | A5 (14 → 10) |
| `DMetricList` `desktop-charts.jsx:68` | `d-mlist` `d-mlist-row` | A13 (6 → 4) |
| `DReadiness` `project-modules.jsx` | `d-ready` | B3 (2 → 1) |
| **`DBOQAssignment`** — inside `DModBOQ`, which nothing mounts | `d-alloc` `d-alloc-top` `d-alloc-meta` `d-alloc-prog` `d-openrow` | **A5, now dead** |
| **`DContractCtx`** `contract-context.jsx` — same superseded module | `d-cctx` `d-cctx-f` `d-cctx-r` | **A14, now dead** |

The last two rows are a different kind of dead and are the reason the check had to become
transitive. `DBOQAssignment` and `DContractCtx` **are** mounted — inside `DModBOQ`, which is
mounted nowhere. `desktop-workspace.jsx:221`, the workspace router, sends a construction
project's BOQ tab to `DBoqWorkspace` (`boq-workspace.jsx`) instead, and that is the component
the port followed: `web/src/styles/boq.css` is a verbatim copy of the reference's, and the
port's assignment tab emits its `boq-assign-row` · `boq-queue-b` · `boq-qcard` classes
unchanged. A one-level mount check called all eight live and would have sent a rebuild at a
screen that was already right.

**A9 and A3 are now empty.** §D also settles P-09 from the other side: the readiness dots
were "deliberately not ported" — and the reference does not draw them either.

Two of §D's rows change what §D-reuse below says: `d-legend`/`d-legend-i` and
`d-mlist`/`d-mlist-row` are the shipped halves of two "rebuilt instead of reused" pairs. The
`.epm-legend` and `.epm-bars` written in their place are therefore **not** duplicates of
something the prototype renders — they are original work for a widget the prototype only
ever declared. That makes them a weaker finding than A1's was, and A10/A13 should be
re-examined against the plates rather than against those components.

---

## D-reuse · Widgets that were rebuilt instead of reused

The sharpest evidence that the reference was not being opened, and a direct breach of
`CLAUDE.md` §3.7 — *"grep before you write a rule."* Each pair is the same widget twice:
the shipped rule, addressing nothing, and a second implementation in
`web/src/styles.css`.

| widget | shipped, unused | written instead | plate | state |
|---|---|---|---|---|
| **the whole contract register** | `.d-contract-grid` · `.d-contract-card*` · `.d-csum` · `.d-csum-bars` | `.epm-concard` · `.epm-cardgrid` · `.epm-reghead` · `.epm-barpair` | الشكل 6 | ✅ A1 |
| cost breakdown tiles | `.d-costsplit` — `desktop.css:2873` | `.epm-costgrid` · `.epm-costtile` | الشكل 7 | ✅ A1 |
| the spend tick | `.d-csum-bars .track > u` | `.epm-track.marked > .mk` | الشكل 6 · 7 | ✅ A1 |
| donut legend | `.d-legend` · `.d-legend-i` — `desktop.css:305` | `.epm-legend` — `styles.css` | الشكل 2 · 4 | 🔨 A10 |
| value-by-entity bars | `.d-mlist` · `.d-mlist-row` — `desktop.css:768` | `.epm-bars` — `styles.css` | الشكل 2 | 🔨 A13 |
| audit-stage cards | `.d-slastages .ss/.sh/.dot` — `desktop.css:3042` | `.epm-slastage` — `styles.css` | الشكل 17 | 🔨 A7 |
| share bar | `.d-dist` — `desktop.css:303` | `.epm-track` — `styles.css` | الشكل 2 | 🔨 A10 |

Each rebuild **deletes** its block from `styles.css`. That is the measure of the fix: the
file gets shorter, not longer. A1 removed **22 selectors and added 3** (net −13 lines; the
rest of the diff is comments recording why): one `.spend` fill modifier, because the
reference sets that colour inline at four call sites and `05 §8` names inline-styles-beating-
the-stylesheet a defect class, and the missing focus ring above.

The rest of `web/src/styles.css` is not implicated — most of it documents genuine Angular
host-element problems and is described in §E.

---

## E · Keep — the app's own, deliberately

**Never read anything in this section as drift.** The prototype is React with no component
layer; this app has one, and that is an improvement, not a divergence. Rebuilding a screen's
structure means **the existing component emits the prototype's classes** — never that the
component is replaced by inline markup.

### The 30 shared components — all protected

`epm-select` · `epm-icon` · `epm-data-table` `[epmCell]` · `epm-drawer` · `epm-popover` ·
`epm-command-palette` · `epm-pager` · `epm-page-head` · `epm-section` · `epm-sec-nav` ·
`epm-module-bar` · `epm-field-grid` · `epm-field-group` · `epm-summary-strip` · `epm-tile` ·
`epm-status-pill` · `epm-sev-dot` · `epm-table-skeleton` · `epm-toast` · `epm-donut` ·
`epm-scurve` · `epm-dual-line` · `epm-bar-compare` · `epm-persona-switcher` ·
`epm-ministry-lockup` · `epm-amd-delta` · `epm-amd-mark` · `epm-amd-panel` · `epm-app-footer`

`epm-select` especially: it is the app's one dropdown, it replaces the operating system's
list that the prototype's native `<select>` opens, and its `bare` variant plus the
`.d-ctxsel` focus-ring contract are documented in `styles.css` (P-197, and the WCAG 2.2
target-size fix in P-204). A15's `d-panel-body` goes **inside** `epm-section`; A10's
`d-legend` goes **inside** `epm-donut`.

### The 6 Angular-only classes

| class | why it exists |
|---|---|
| `d-gantt-namegrip` | the resizable **name** column `04 §5` asks for; the prototype resizes the info block instead and pins the name at 320px. **This supersedes `d-gantt-resize`** — the reference's handle on the info block. Porting that one would undo the improvement, so it is triaged out rather than left in the backlog |
| `d-tabs` · `d-tab` | the tab strip as a component rather than repeated inline markup |
| `d-detail-body` · `d-stat-wm` · `d-hbars` · `d-vow-sub` | small additions, each documented at its declaration |

### Also untouched

`routerLink` in place of the prototype's `onNav()` buttons (a module becomes a real,
pasteable address) · `<bdi>` isolation the prototype omits · every accessibility fix already
made (P-204) · the `display: contents` host rules in `styles.css`, which solve a real
Angular problem the prototype cannot have.

**If an improvement and the prototype's structure genuinely conflict, write both readings
into this file and ask.** Do not resolve it by reverting.

---

## How to work a row

1. Open the prototype component at the `file:line` the row names, and the plate beside it.
2. Open the shipped rule: `grep -n '\.d-contract-grid' web/src/styles/desktop.css`. It tells
   you the DOM it expects — children, order, which element carries which class.
3. Change the Angular template so the existing component emits that DOM.
4. **Add no CSS.** If you believe a rule is missing, grep all seven sheets first; §D is what
   happens when that step is skipped.
5. `node tools/structure-gap.mjs` — the GAP must fall by exactly the row's count.
6. Record anything surprising as a `DECISIONS.md` P-entry.

## Acceptance

The port is done when `node tools/structure-gap.mjs` reports a GAP of **66** and every
`epm-*` selector still resolves. The 65 is broken out in the table under §The number — it is
not «the intended plus the module-absent», which is what this line said while nine clusters
were withdrawing classes into verdicts the sum never saw. Any other number needs a row in
this file explaining it.

---

*Measured 2026-08-31 against `infinite-azaiton/epm@065de126e1a5dcfc94dc42b583a4f0c73d744644`.
See `DECISIONS.md` P-205 (the stale reference folder) and P-206 (this gap).*
