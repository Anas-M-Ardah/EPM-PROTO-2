# 05 — Design System

> **RE-BASELINED TO v1.1 — Phase 1.5, 2026-08-10.**
> This document previously described the *Autodesk blue / warm-greige* system.
> That system has been **superseded** by the v1.1 design system adopted from
> `epm@design/system-revamp`. §1 below is rewritten from the shipped tokens and
> **every ratio was measured in the running application**, not carried over.
> The type scale, the §7 accessibility contract and the §8 cautions were not
> loosened — §7 remains binding, and adopting v1.1 required correcting two of
> its values to satisfy it (see §1.6 and P-21). Sections not touched by the
> re-baseline still describe current behaviour.

Identity: **cool-grey instrument panel** — dark command bar, cool neutral canvas,
EPM blue as the single interactive colour, squared geometry, dense tables.
Synthesised from Autodesk Construction Cloud (visual language), Primavera
Unifier (record/workflow architecture), P6 (grids, WBS, Gantt), Procore
(de-congestion) and Fluent 2 (foundation: spacing, type roles, focus, RTL).

---

## 1. Colour tokens

### 1.1 Semantic (light theme)
| Token | Value | Measured | Use |
|---|---|---|---|
| `--primary` | `#1F5CDB` | 5.81:1 | interactive only — never a data series |
| `--on-primary` | `#ffffff` | | |
| `--tertiary` | `#1748B0` | 8.11:1 | **see §1.5 — this is now a blue, not the old Redwood accent** |
| `--error` | `#C22B2E` | 5.71:1 | genuine adverse states only |
| `--background` | `#F1F3F5` | | canvas / chrome |
| `--surface-container-lowest` | `#ffffff` | | content sheet |
| `--surface-container` | `#F6F7F9` | | header rows, disabled |
| `--outline` | **`#858E9C`** | **3.31:1** | **borders and graphics only. Never text.** Corrected — see §1.6 |
| `--outline-variant` | `#E1E5EA` | 1.27:1 | decorative separation only — exempt from the 3:1 floor |
| `--stroke-default` | `#D5DAE1` | 1.41:1 | decorative separator — exempt |
| `--on-surface` | `#1D2127` | 16.17:1 | body text |
| `--on-surface-variant` | `#565E69` | 6.56:1 | secondary text |
| `--topbar-bg` | `#1D2127` | | command bar |

### 1.2 Status namespace
Statuses keep their **own** tokens so no colour carries two meanings. Fills use
the base value; **pill text uses the `-tx` variant**. All five measured on white:

| Status | Fill | Text | Measured |
|---|---|---|---|
| ongoing | `#1F5CDB` | `#1748B0` | 8.11:1 |
| completed | `#177D48` | `#177D48` | 5.17:1 |
| delayed | `#C22B2E` | `#C22B2E` | 5.71:1 |
| suspended | `#9A6B05` | `#9A6B05` | 4.69:1 |
| cancelled | `#565E69` | `#565E69` | 6.56:1 |

All clear the 4.5:1 text floor. Do **not** "equalise" them to a common ratio —
that destroys the pairwise separation legend dots depend on.

### 1.3 Data-visualisation ramp
Series colours stay outside the status and interactive namespaces.

| Token | Value | Measured | Use |
|---|---|---|---|
| `--viz-1` | `#1F5CDB` | 5.81:1 | primary/actual series, progress fills, Gantt bars |
| `--viz-2` | `#0F7480` | 5.48:1 | second series |
| `--viz-3` | `#8B5CF6` | 4.23:1 | third series |
| `--viz-track` | `#EAEDF0` | | planned/baseline fill |
| `--viz-base` | **`#858E9C`** | **3.31:1** | baseline line, annotations, bar edges. Corrected — see §1.6 |

**The dashboard status donut is the single exception** — it *is* status
distribution, so it uses the status namespace.

### 1.4 Density, radius and control heights (new in v1.1)
| Token | Value |
|---|---|
| `--r-xs / --r-sm / --r-md / --r-lg` | 2 / **4 (default)** / 6 / 8 px |
| `--ctl-h-sm / md / lg` | 28 / **32** / 40 px |
| `--row-h`, `--row-h-head` | 40 px |
| `--cell-px` | 12 px |
| `--page-pad`, `--section-gap` | 20 / 24 px |

A `[data-density="compact"]` override exists for dense registers.

### 1.5 `--tertiary` is no longer an accent — OPEN
v1.1 sets `--tertiary` to `#1748B0`, which is **the same blue as
`--status-ongoing-tx`**. The Redwood red that this token carried is gone from
the palette. §7.5 forbids one colour carrying two meanings, so `--tertiary`
must not be used as a decorative accent anywhere it could be read as *ongoing*.
**Audit its usages before Phase 2.** Recorded as an open question.

### 1.6 Two values were corrected on adoption (P-21)
v1.1 ships `--outline` and `--viz-base` at `#A9B1BC` — **2.16:1**, below the
§7.1 floor of 3:1 for graphics. The palette they replaced sat at 3.03:1: the old
values were chosen to pass, the new ones were not. Dark theme was worse
(`#454C57` = 1.87:1).

Both are corrected in `web/src/styles.css` — **`#858E9C`** (3.31:1) in light and
**`#6B7484`** (3.43:1) in dark. These are the lightest values on v1.1's own
neutral ramp that clear the floor, so the intended look is preserved as far as
the contract allows. `--outline-variant` and `--stroke-default` are untouched:
they are decorative separators, which WCAG 1.4.11 exempts.

---

## 2. Typography

```
Arabic UI     Cairo
Latin UI      Hanken Grotesk
Figures       IBM Plex Mono  (tabular-nums everywhere numbers align)
```

**Type scale — exactly eight steps.** No other value may appear, inline or in CSS.
```
11 · 11.5 · 12 · 13 · 15 · 18 · 21 · 24        (+ 44 display, public landing only)
```

Token map: `--label-sm 11` · `--label 12` · `--body-sm 13` · `--body 15` · `--title 18` · `--title-lg 21` · `--headline 24` · `--display-lg 44`.

**Weights — four.** `400` regular · `--fw-medium 500` · `--fw-bold 600` · `--fw-x 700/800`.

**No uppercase, no letter-spacing** on labels, headings or figures — Arabic has no case, and letter-spacing degrades Arabic shaping.

### Hierarchy contract
```
primary metric      21px / --fw-x     / --on-surface        ← the headline figure
summary-strip value 18px / --fw-x     / --on-surface
section heading     12px / --fw-bold  / --on-surface-variant ← labels a region, must not compete
body                13px
derived index (CPI) 13px / --fw-bold  / --on-surface-variant ← diagnostics, never headline weight
label               11.5px / regular  / --on-surface-variant
```

**Minimum rendered size is 11px.** Nothing smaller, anywhere.

---

## 3. Spacing, geometry, elevation

- Section spacing 30px; strip bottom margin 24px; field row padding 10px 0.
- Radii: `--r-sm` small controls, `--r-md` cards/drawers. Squared, not pill-like (except status pills at 999px, height 21px).
- **Nothing floats.** Content sheets and panels are flat; separation comes from hairlines and plane changes, not shadow.
- Table rows: 9px vertical padding, `--surface-container-high` divider, sticky header with an `--outline` bottom rule.

---

## 4. Components

| Component | Anatomy |
|---|---|
| Status pill | 21px tall, 11px text, tinted background (`color-mix` 14–17%) + `-tx` text. **Always carries a label** — never colour-only. |
| Amendment badge | count + history icon; states applied / pending / mixed (dot); is a `<button>` that opens the history drawer |
| Summary strip | flex/grid band, hairline-divided, first cell flush |
| Register table | sticky header, hover tint, tabular numerals, grouped header band for Before/Requested/Approved/Applied |
| Drawer | scrim + panel; wide variant for comparison content; head / scrollable body / foot |
| Stepper | fixed top, icon per step, completion indicator |
| Segmented control | `--surface-container-low` track |
| Secondary button | transparent with a resting `--outline-variant` hairline; hover promotes to `--outline` |
| Disabled control | `background-color: --surface-container`, `color: --outline`, `border-color: --outline-variant`, `cursor: not-allowed`, `pointer-events: none`. **Never opacity** — it breaks the contrast maths of the text underneath. |

---

## 5. RTL rules

1. Arabic is the primary direction. Author with **logical properties** (`inset-inline-start`, `margin-inline`, `padding-inline`, `border-inline-*`) — physical `left`/`right` only where genuinely physical.
2. Every number, percentage, date, duration, currency amount, ID and reference string needs **bidi isolation** (`dir="ltr"` on the span, or `<bdi>`). Unwrapped values are a defect even when they currently look correct — e.g. `0.92 / 1.05` renders with the slash leading the line without it.
3. Icons that flip: chevrons, arrows, breadcrumb separators, back/forward. Icons that do not: clocks, checkmarks, search, logos, media controls.
4. Test at the **longest realistic Arabic string**, not the current content. Nav items cap at two lines with ellipsis and a `title`.
5. `mono` figures use `font-variant-numeric: tabular-nums` so columns align in both directions.

---

## 6. Motion

- Count-up animations must **seed the settled value** in the DOM and only animate when `!document.hidden && !prefers-reduced-motion`, with a `visibilitychange` listener that settles immediately if the tab is hidden. rAF fires zero times in a background tab — every screenshot/PDF/PPTX export path hit this and shipped zeros.
- Transitions are short and functional. No decorative motion.

---

## 7. Accessibility contract (binding)

These came out of a formal adversarial audit; they are requirements, not preferences.

1. **Text ≥ 4.5:1; borders, icons and graphics ≥ 3:1.** Re-measured against v1.1 at Phase 1.5 — every token in §1 now carries its measured ratio, and the two that failed were corrected (§1.6).
2. `--outline` and `--viz-base` are **graphic tokens**. Using them as text colour is a defect (3.31:1 — below the 4.5:1 text floor). Secondary text is `--on-surface-variant` (6.56:1).
3. Fill hues (`--success`, `--warning`, status base values) are **never** text colours. Use the `-tx` variants.
4. `18px/700` does **not** qualify as large text — it needs the full 4.5:1.
5. **No colour carries two meanings.** Status colour never appears on a button, link or decoration; interactive colour never appears as a data series.
6. Status is never colour-only — pair every colour with a label or icon.
7. **`:focus-visible` on every interactive element** — 2px `--primary`, 2px offset. Including nav items, table rows, chips, segmented buttons, selects, inputs and the amendment badge.
8. Criticality, coverage and other *properties* use non-colour channels (rings, dots, icons) so the colour channel stays free for status.
9. Never colour a magnitude by threshold with a status hue (the `bad ? --error : --success` idiom) — green on an ordinary number reads as "approved". Adverse branches may use `--error`; the neutral branch is `--on-surface`.
10. Alpha-based text (`color-mix(... currentColor N%)`) must be ≥ 85% on a solid interactive fill.

---

## 8. Implementation cautions (learned the hard way)

- **Inline styles beat stylesheets.** Recurring defect class in the prototype: a CSS rule was added while the value was set inline in JSX. When re-implementing, keep colour and size decisions in the token/theme layer, not in component style props.
- **The scale lives in tokens, not literals.** Changing `font-size` declarations without changing the token values behind them fixes nothing.
- **Grid, not flex, for figure strips.** `flex: 1 1 <basis>` stretches a 3-item strip to 441px per tile around 90px of content, and wraps a 6-item strip 5+1 with a ballooned orphan. `grid-template-columns: repeat(auto-fit, minmax(120px,1fr))` cannot.
- Lay sibling groups out with flex/grid + `gap`, never source whitespace or per-element margins.
