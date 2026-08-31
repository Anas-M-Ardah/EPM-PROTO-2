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

## The number, at 2026-08-31

| | |
|---|---|
| the prototype emits | **411** `d-*` classes |
| the Angular app emits | **273** |
| defined in the shipped stylesheets | **530** |
| **GAP** — defined **and** emitted by the prototype **and** emitted by no template | **148** |
| **OWN** — emitted by Angular, absent from the prototype | **6** |

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

### A1 · الشكل 6 · 7 — contract register and cost breakdown · SCR-W3 · 12

`project-modules.jsx:363` `DModContractNew` (grid at `:490`) → `features/contract-tab/contract.page.html`

The prototype draws the project's contracts as **cards in a grid**, each carrying its own
value equation, paired progress bars, status and addenda badges. The port draws a
`d-table`. This is the single most visible difference in the app.

`d-contract-grid` `d-contract-card` `d-contract-card-top` `d-contract-card-title`
`d-contract-card-kv` `d-contract-card-val` `d-contract-card-mtx` `d-contract-card-foot`
`d-contract-mini` `d-csum` `d-csum-bars` `d-costsplit`

### A2 · الشكل 29 · 30 — change-order register and record layout · SCR-W8 · 10

`vo-record.jsx:454` `DModVO` (register `:721`, record layout `:1311`) →
`features/change-orders/change-orders.page.html` · `change-order.page.html`

`d-vo-reg` is the register's own shell; `d-l14*` is the record's fourteen-column layout with
its decision rail and trail. The port renders both through the generic
`d-toolbar` + `d-table` + `d-pz7` shell every other screen uses.

`d-vo-reg` `d-vo-qfall` `d-vo-qitem` `d-vo-queue-b` `d-ctxnum` `d-l14` `d-l14-dec`
`d-l14-trail` `d-l14-z8fall` `d-form-state`

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

## D · Four widgets were rebuilt instead of reused

The sharpest evidence that the reference was not being opened, and a direct breach of
`CLAUDE.md` §3.7 — *"grep before you write a rule."* Each pair is the same widget twice:
the shipped rule, addressing nothing, and a second implementation in
`web/src/styles.css`.

| widget | shipped, unused | written instead | plate |
|---|---|---|---|
| donut legend | `.d-legend` · `.d-legend-i` — `desktop.css:305` | `.epm-legend` — `styles.css:270` | الشكل 2 · 4 |
| value-by-entity bars | `.d-mlist` · `.d-mlist-row` — `desktop.css:768` | `.epm-bars` — `styles.css:278` | الشكل 2 |
| audit-stage cards | `.d-slastages .ss/.sh/.dot` — `desktop.css:3042` | `.epm-slastage` — `styles.css:929` | الشكل 17 |
| share bar | `.d-dist` — `desktop.css:303` | `.epm-track` — `styles.css:427` | الشكل 2 |

Rebuilding A7, A10 and A13 **deletes** these four blocks from `styles.css`. That is the
measure of the fix: the file gets shorter, not longer.

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
