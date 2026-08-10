# 04 — Screens

Desktop-first, 3-pane workspace. All screens are bilingual; Arabic RTL is primary.

## 1. Shell

- **Command bar** (charcoal `#23262b`, full width): logo, global search with `⌘K` chip, notifications, language switch, avatar. Foreground `--topbar-fg #f0f1f2`; the `⌘K` chip is `rgba(255,255,255,.12)` — never a light-theme surface token.
- **Module nav** (left in LTR / right in RTL): grouped items with a group label; the label is `--on-surface-variant`, never `--outline`.
- **Content sheet**: white (`--surface-container-lowest`) on the warm greige canvas (`--background #eeece7`). One plane change only, marked with `--outline` edges where panes meet.

## 2. Enterprise screens

| Screen | Contents |
|---|---|
| Executive Portfolio | KPI strip (single hairline grid, not floating cards) · contract-status donut (the one place status colours are used for data) · cost-comparison bars (viz ramp) · annual-spend line · project timelines · milestones |
| Entities / Beneficiaries | dense sortable master table |
| Projects | cross-portfolio list, search + status filters |
| Contracts | cross-portfolio contract list |
| Schedule Control | portfolio schedule health, baseline vs forecast, delay, critical, import status |
| Alerts Center | severity KPIs + aggregated feed |
| Reports & Analytics | trend, by-status, by-workspace, by-branch, period + export |
| Administration | control center, users, roles, permission matrix, master data, audit log |

## 3. Project workspace

Three panes: **queue** (project list) · **detail** (tabs) · **context** (contextual actions, parties, per-tab edit history).

Tabs: Overview · Project Information · Contract · BOQ · Schedule · Progress · Financials · **Change Orders** · Risk · 3D Model · Meetings & Actions · Documents & Drawings · Alerts · Reports · Audit History.

### Tab layout system (applies to every tab)
- Section = **label + space**, never a nested box. `.d-sec-h` has no border; `.d-sec-b` has no background.
- Summary figures = one **hairline-divided band** across the top (Oracle Unifier record-header pattern), value 18–21px, label 11.5px muted, first cell flush to the margin. Grid `repeat(auto-fit, minmax(120px,1fr))`, column-gap 24px, row-gap 18px. **Never** pin the column count inline.
- Field grids = `repeat(auto-fill, minmax(240px,1fr))`, label above value, one hairline between rows, no cell boxes.
- Registers = dense tables with sticky headers, 9px row padding, hover tint, tabular numerals.
- Secondary detail = **drawer**, not an in-place expander. Wide drawer for comparison content.

## 4. BOQ tab (contract-scoped)

Contract selector first; nothing renders until a contract is chosen ("اختر عقداً للبدء").

Three views: **السجل** (register) · **توزيع الكميات** (distribution) · **الربط بالأنشطة** (activity assignment).

**Register columns:** code (+ amendment badge) · description · unit · quantity (+ signed delta) · unit rate · amount · weight · **نسبة التنفيذ** (progress bar + %) · distribution status · row actions (distribute / edit / delete).
Inline row editing with live amount; delete confirms in-row and clears that item's distribution.

**Distribution drawer:** BOQ code, description, unit, total quantity at the top; then an editable table (beneficiary · site · quantity · remove) with an *Add distribution* button; a compact summary of total / distributed / remaining-or-excess and the state pill. Inputs are capped at the remaining quantity with an inline explanation.

**Activity assignment view:** cost/man-hours basis toggle; per BOQ item, the linked activities with absolute weight, allocation %, assigned amount and status; allocation is editable and saved per item, with reset. Coverage counters for full/partial/over/unassigned.

## 5. Schedule tab

Gantt with a **resizable** fixed-column block (drag handle; floor 160px, default 320px) and a horizontally scrolling region containing both the info columns and the chart track — only the activity-name column is pinned, so the chart is never pushed out of the pane.

Nine info columns with an explicit grid contract, headers wrapping rather than truncating:
```
minmax(56,.7fr) minmax(74,1fr) minmax(74,1fr) minmax(74,1fr)
minmax(74,1fr) minmax(52,.6fr) minmax(56,.7fr) minmax(52,.6fr) minmax(52,.6fr)
```
Below 1280px a column picker defaults to 4 essential columns with a toggle for all 9.

Bars carry **status** as fill; **critical path is a 2px `--on-surface` ring**, not a colour — the legend shows the ring. Milestones are `--on-surface` diamonds. The data-date line is `--viz-base`.

WBS tree shows both **relative** and **absolute** weight per node.

## 6. Amendment disclosure (BOQ + Schedule, shared)

One pattern in both registers:

- **Badge** on the code/ID cell: count of amending orders, three states — all applied (green) · all pending (amber) · **mixed** (green with an amber dot). Tooltip lists each order and its state. The badge is the control that opens the panel.
- **Cell delta**: the effective figure plus a compact signed delta (`+717`), coloured settled vs pending. No strikethrough.
- **`DAmdPanel` drawer**, identical for BOQ items and activities: الوضع النافذ (original vs effective) · تسلسل التعديلات المطبَّقة · معتمدة بانتظار التطبيق (visually separated, with a warning that it is excluded from effective figures) · تفصيل الأسعار for banded items with the 20%-rule explanation.

The contract tab keeps its own amendment panel — that one describes a *contract version*; this one describes an *item's* history.

## 7. Contract tab

Sections as tabs: identity/dictionary · cost breakdown · **amendments (ملاحق)** · penalties · payments · documents.

**Amendments:** version list (original → n), each with source order, delta value, delta days, resulting value/finish, and state pill. Pending (approved-unapplied) orders listed separately with the projection.

**Penalties:** per-day rate, cap, delay days, amount — **before vs after** the applied amendments, with the waived amount.

## 8. Change Orders tab

Register and record — fully specified in `03` §9–§10. Focus mode (split queue + work pane) for the *awaiting me* set.

## 9. States every screen needs

| State | Requirement |
|---|---|
| Empty | icon + one line saying what to do ("اختر عقداً للبدء"), never a bare blank pane |
| Loading | skeleton rows matching the table's real column widths |
| Error | inline, in the pane that failed, with a retry |
| Permission-denied | explicit locked note naming the persona, not a hidden control |
| Validation | prevent invalid input where possible; block submission with a list of blocking rows |

## 10. Responsive

Desktop-first by agreement. Breakpoints exercised in the audit: **1440 / 1280 / 1024 / 768**. Requirements: no table header may truncate at any of them; the Gantt chart must remain inside the pane at all four; KPI strips reflow 5 → 5 → 3 → 2 columns.
