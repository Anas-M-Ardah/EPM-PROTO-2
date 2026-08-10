# 05 — Design System

Identity: **Autodesk Construction Cloud × Oracle Redwood** — charcoal command bar, warm greige canvas, Autodesk product blue as the interactive colour, Oracle Redwood red as the accent, squared geometry, dense tables.

---

## 1. Colour tokens

### Brand ramps
```
Autodesk blue   navy-50  #e8f4fb   navy-100 #c6e4f5  navy-200 #93cdec  navy-300 #57b0dd
                navy-400 #1f92cf   navy-500 #0d7fbf  navy-600 #0b6499 ← PRIMARY
                navy-700 #094f7a   navy-800 #0a3f60  navy-900 #23262b ← command bar
Redwood red     crimson-300 #e79087  crimson-400 #d76656  crimson-500 #c74634 ← accent
                crimson-600 #a83729  crimson-700 #892b20
```

### Semantic (light theme)
| Token | Value | Use |
|---|---|---|
| `--primary` | `#0b6499` | interactive only — never a data series |
| `--on-primary` | `#ffffff` | |
| `--primary-hover` | `#094f7a` | |
| `--tertiary` | `#c74634` | accent; **not** an action colour on buttons (it collided with `--error`) |
| `--error` | `#bc2c1a` | genuine adverse states only |
| `--background` | `#eeece7` | canvas / chrome |
| `--surface-container-lowest` | `#ffffff` | content sheet |
| `--surface-container-low` | `#faf9f6` | hover / inset |
| `--surface-container` | `#f3f1ed` | disabled background |
| `--surface-container-high` | `#ece9e3` | row dividers |
| `--surface-container-highest` | `#e4e0d9` | |
| `--outline` | `#9b9389` | **borders and graphics only — 3.03:1. Never text.** |
| `--outline-variant` | — | decorative separation only |
| `--on-surface` | `#1c1a18` | |
| `--on-surface-variant` | `#605a51` | secondary text — 6.82:1 |
| `--topbar-fg` | `#f0f1f2` | command-bar text |
| `--topbar-fg-dim` | `#a9adb4` | command-bar secondary |

### Status namespace
Statuses have their **own** tokens so no colour carries two meanings. Fills use the base value; **pill text uses the `-tx` variant** (which meets 4.5:1).

| Status | Fill | Text |
|---|---|---|
| ongoing | `--status-ongoing #0b6499` | `#094f7a` |
| completed | `--status-completed #1e8a52` | `#146b3e` |
| delayed | `--status-delayed #bc2c1a` | `#bc2c1a` |
| suspended | `--status-suspended #b1741a` | `#8a5a12` |
| cancelled | `--status-cancelled #605a51` | `#605a51` |

Pairwise ΔE (Lab) ranges 42–102 — all above the 25 threshold for 8px legend dots. Do **not** "equalise" these to a common contrast ratio: it destroys pairwise separation (measured: worst pair falls to ΔE 39).

### Data-visualisation ramp
Series colours are deliberately outside the status and interactive namespaces.

| Token | Value | Use |
|---|---|---|
| `--viz-1` | `#0696d7` | primary/actual series, progress fills, Gantt bars |
| `--viz-2` | `#7c83e8` | second series |
| `--viz-3` | `#8c3f6b` | third series |
| `--viz-track` | `#e4e0d9` | planned/baseline fill |
| `--viz-base` | `#9b9389` | baseline line, annotations, bar edges (3.03:1 — graphics only) |

Pairwise ΔE: 1/2 = 35, 1/3 = 61, 2/3 = 49.

**The dashboard status donut is the single exception** — it *is* status distribution, so it uses the status namespace.

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

1. **Text ≥ 4.5:1; borders, icons and graphics ≥ 3:1.**
2. `--outline` and `--viz-base` are **graphic tokens**. Using them as text colour is a defect (2.57–3.03:1). Secondary text is `--on-surface-variant`.
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
