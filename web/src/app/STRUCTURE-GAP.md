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
| the Angular app emits | 273 | **288** |
| defined in the shipped stylesheets | 530 | **530** |
| missing from the port | 151 | **131** |
| → **GAP** — and the prototype actually **renders** it | — | **105** |
| → **DEAD** — its component is never mounted, in the reference either | — | **26** |
| **OWN** — emitted by Angular, absent from the prototype | 6 | **5** |

| cluster | classes | state |
|---|---|---|
| A1 · الشكل 6 · 7 contract register + cost breakdown | 12 | **✅ done** |
| A2a · الشكل 29 · 33 register table + المسار layout | 5 | **✅ done** |
| A2b · الشكل 30 focus mode | 5 | ⏸ **not markup** — needs a decision |
| A3 · الشكل 33 review flow | 5 | ❌ **dead** — `DReviewFlow` is never mounted |
| A4a · الشكل 38 · 39 picker bar + editor row | 3 | **✅ done** |
| A4b · الشكل 38 · 39 facets, chips, caps | 6 | ⏸ **not markup** — needs a decision |
| A5 … A17, live remainder | 65 | 🔨 |
| **D · dead in the reference** | **26** | ❌ do not port |
| B · intended | 29 | — |
| C · module absent | 6 | — |

**The first measure said 148 and it was 151.** Three classes — `d-bulkbar`, `d-nav-grp`,
`d-three` — were counted as ported because a *comment* in a template named them while
explaining why they are deliberately absent. `tools/structure-gap.mjs` now strips HTML and
JS comments before tokenising, and those three moved to §B4 where they belonged. Two more
would have gone the same way this session: the A4b comment naming `.d-vow-facets` and
`.d-vow-chip` as *not* built would have retired both rows.

**Acceptance is a GAP of 40** — 29 intended, 6 module-absent, 5 for A2b — dropping to 35 if
A2b is built. It is no longer the single number this file opened with, because three
clusters in, three different things turned out to be true: a real port, a missing feature,
and dead code.

**Two corrections have already changed what this file counts.** A2b: the first cluster that
turned out to be a missing *feature* rather than a structure drawn differently, split out so
a cluster is not reported done when half of it is a decision waiting to be taken. And §D:
the measurement read `className=` out of the reference **source**, which counts components
that are declared, exported to `window`, and never mounted. `node tools/structure-gap.mjs`
now checks for `<X` or `<window.X` before calling a class missing, and 26 of the 131 turned
out to draw nothing in the running prototype. **Acceptance is now a GAP of 32** — the 26
intended-or-absent that remain live, plus A2b's 5, minus the one B3 class that moved to §D.

The drift is **omission, not invention**: 148 against 6. Nothing here says the port did
something wrong instead; it says it did less.

**115 rebuild · 27 intended · 6 module absent.** Those three totals are the whole of the
148, and each class below appears in exactly one row.

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
type drops from `.d-table`'s **14px — a size not on the eight-step scale at all** — to
`--fs-200`. The cell contract came with it (`.code`, `.name.wrap`, `.r.num`), which is
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

### A7 · الشكل 17 — مهل التدقيق · SCR-W7 · 1

`project-modules.jsx:1324` `DModFinancialNew` → `features/financials/financials.page.html`

**Already reinvented** — see §D. `.d-slastages .ss/.sh/.dot` is shipped at
`desktop.css:3042`; the page draws `.epm-slastage`, declared in `web/src/styles.css`.

`d-slastages`

### A8 · الشكل 49 — التقارير · SCR-E7 · SCR-W14 · 6

`project-modules.jsx:2771` `DModReports` (`:2797`) → `features/reports/reports.page.html` ·
`features/project-reports/project-reports.page.html`

The catalog is a **shell with category rail and a view pane** (`d-report-shell` ·
`d-report-cat` · `d-report-view`), not a filtered table.

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

**Z3 and Z4 are absent entirely.** `d-pz3` is the project header band and `d-pz4` the pager
zone; the shell jumps `d-pz2` → `d-pz5`. `d-pane`/`d-pane-scroll`/`d-detail` are the
workspace's own scroll frame — the reason `web/src/styles.css` carries the long
`display: contents` block fighting Angular host elements is that the frame the sheet expects
is not the frame the port builds.

`d-pz3` `d-pz4` `d-ctx` `d-ctx-sec` `d-ctx-act` `d-pane` `d-pane-scroll` `d-detail`
`d-qrow-rail` `d-ctxmenu`

### A12 · الأشكال 21–24 — schedule and P6 import · SCR-W5 · 7

`schedule-module.jsx:80` `DGantt` (`:239`) · `DImportWizard` · `DModSchedule` ·
`DSchedStatus` → `features/schedule/schedule.page.html` · `schedule-import.wizard.ts`

`d-gantt-resize` is the prototype's own column grip (the port wrote `d-gantt-namegrip`
instead — see §E, that one is a **keep**); `d-parse`/`d-val-row`/`d-spin` are the import
wizard's parse and validation rows; `d-act-amd` is the amendment badge on an activity.

`d-gantt-ext` `d-gantt-resize` `d-act-amd` `d-parse` `d-val-row` `d-sched-stat` `d-spin`

### A13 · Charts — mini timelines, metric lists, line trend · 6

`desktop-charts.jsx:116` `DTlMini` (`:122`) · `DMetricList` · `DDualLine` / `DLineTrend` →
`shared/dual-line.component.ts` · `bar-compare.component.ts`

`d-mlist`/`d-mlist-row` is the label + 76px track + value row. **Already reinvented** —
see §D.

`d-tl-mini` `d-tl-mini-row` `d-tl-mini-name` `d-mlist` `d-mlist-row` `d-line-chart`

### A14 · Contract context strip · 3

`contract-context.jsx:88` `DContractCtx` (`:92`) → `features/contract-tab/contract.page.html`

The pinned "which contract am I in" strip with its figure and its selector row.

`d-cctx` `d-cctx-f` `d-cctx-r`

### A15 · Shared primitives never adopted · 8

`desktop-admin.jsx:90` · `desktop-shell.jsx` `DCheck` · `project-modules.jsx` `DModBOQ` /
`DPaymentWizard` → every page

Small, and they repaint the whole app at once. `d-panel-body` is the padding wrapper
`.d-panel` expects — `web/src/styles.css` currently hand-pads three body types by name
because it was never used. `d-callout*` is the explanatory box الشكل 13 · 14 · 20 · 23 all
carry. `d-check`/`d-switch` are the checkbox and toggle الشكل 1 and الشكل 47 need.
`d-model-topbar` is the module top bar — misleadingly named, used by BOQ, supply and
reports as well as the model tab.

`d-panel-body` `d-callout` `d-callout-ico` `d-callout-tx` `d-check` `d-switch`
`d-model-topbar` `d-l04-z8fall`

### A16 · الشكل 10 — amendment stack · 1

`contract-amendments.jsx:324` `DContractAmendments` → `features/contract-tab/contract.page.html`

`d-amdstack`

### A17 · الشكل 47 · 48 — alert severity · 1

`alerts-module.jsx:25` `DAlertSev` → `features/alerts/alerts.page.html` ·
`project-alerts.page.html`

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

## D-dead · 26 classes nothing renders — in the reference either

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
| `d-gantt-namegrip` | the resizable **name** column `04 §5` asks for; the prototype resizes the info block instead and pins the name at 320px |
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

The port is done when `node tools/structure-gap.mjs` reports a GAP of **33** — the 27
intended plus the 6 whose module does not exist — and every `epm-*` selector still resolves.
Any other number needs a row in this file explaining it.

---

*Measured 2026-08-31 against `infinite-azaiton/epm@065de126e1a5dcfc94dc42b583a4f0c73d744644`.
See `DECISIONS.md` P-205 (the stale reference folder) and P-206 (this gap).*
