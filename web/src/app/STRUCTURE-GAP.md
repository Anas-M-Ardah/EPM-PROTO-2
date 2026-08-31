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
| the Angular app emits | 273 | **290** |
| defined in the shipped stylesheets | 530 | **530** |
| **GAP** — defined **and** emitted by the prototype **and** emitted by no template | 148 | **131** |
| **OWN** — emitted by Angular, absent from the prototype | 6 | **6** |

| cluster | classes | state |
|---|---|---|
| A1 · الشكل 6 · 7 contract register + cost breakdown | 12 | **✅ done** — 148 → 136 |
| A2a · الشكل 29 · 33 register table + المسار layout | 5 | **✅ done** — 136 → 131 |
| A2b · الشكل 30 focus mode | 5 | ⏸ **not markup** — needs a decision |
| A3 … A17 | 93 | 🔨 |
| B · intended | 27 | — |
| C · module absent | 6 | — |

**A2b is why the totals no longer land on 33 by markup alone.** The acceptance figure below
assumes every A-cluster is a markup port; the first cluster that turned out to be a missing
*feature* has to be counted separately or the number lies. Anything else that proves to be
behaviour rather than structure gets split the same way.

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

### A3 · الشكل 33 — مسار الاعتماد · 5

`project-modules.jsx:74` `DReviewFlow` → `features/change-orders/change-order.page.html`

The six-stage flow with its return branch (`d-rf-ret` is «إعادة للتعديل» — the arc back).
`03 §2`'s six stages are the flagship of the whole system and the plate draws them as a
flow, not a list.

`d-review-flow` `d-rf-step` `d-rf-dot` `d-rf-l` `d-rf-ret`

### A4 · الأشكال 37–42 — the creation wizard · 9

`vo-wizard.jsx:6` `DVOCreateWizard` · `vo-wizard-parts.jsx:42` `DVOMultiPick` / `DVOChips`
→ `features/change-orders/change-order.wizard.ts`

Step 2's picker is a **faceted** search over the bill (`d-vow-facets` · `d-vow-filters` ·
`d-vow-search`), and step 2's item card states the 20% cap and both proposals in its own
frame (`d-vow-cap` · `d-vow-prov` · `d-vow-f` · `d-vow-ed` · `d-vow-state`).

`d-vow-facets` `d-vow-filters` `d-vow-search` `d-vow-chip` `d-vow-cap` `d-vow-prov`
`d-vow-f` `d-vow-ed` `d-vow-state`

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

## D · Widgets that were rebuilt instead of reused

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
