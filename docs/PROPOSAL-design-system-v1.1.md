# Technical Proposal — adopting the v1.1 design system

**Subject:** `design/system-revamp` (branch in `infinite-azaiton/epm`) → `epm-fullstack`
**Date:** 2026-08-10
**Status:** for decision
**Recommendation:** **adopt now, before Phase 2 begins** — and re-baseline `05-DESIGN-SYSTEM.md` as part of it

---

## 1. Summary

The branch is a **complete replacement of the EPM design system**, not a visual
refresh. It retires the Autodesk-blue / warm-greige identity that
`docs/spec/05-DESIGN-SYSTEM.md` documents as binding, and replaces it with a
cool-grey / EPM-blue "v1.1" system, adds a formal page-zone architecture, adds a
dark theme, and ships a rebuilt BOQ module.

I built it and drove it in a browser. **It runs.** One defect found (§6).

The important finding is that despite the scale, **the migration is mechanically
cheap**: the branch re-skins the existing class contract rather than renaming
it. 50 of the 54 CSS classes our Angular templates use survive with identical
names, and 9 of 9 design tokens our own code references still exist.

The expensive part is not the CSS. It is that **the binding design spec is now
wrong**, and that the new palette **fails one clause of the binding
accessibility contract**.

| | |
|---|---|
| Branch | `design/system-revamp` — *not* `design-revamp` |
| Commits ahead of `main` | 27 |
| Files changed | 32 (+11,382 / −2,885) |
| Stylesheet growth | 2,306 → 4,883 lines (**+112%**) |
| Class contract preserved | **50 of 54** classes we use |
| Token contract preserved | **9 of 9** tokens we reference |
| New a11y failures | **2 tokens** below the binding ≥3:1 floor |

---

## 2. What actually changed

### 2.1 The palette — every semantic colour replaced

| Token | Current (`05 §1`, binding) | v1.1 revamp |
|---|---|---|
| `--primary` | `#0b6499` Autodesk blue | **`#1F5CDB`** EPM blue |
| `--background` | `#eeece7` warm greige | **`#F1F3F5`** cool grey |
| `--surface-container` | `#f3f1ed` | **`#F6F7F9`** |
| `--on-surface` | `#1c1a18` | **`#1D2127`** |
| `--on-surface-variant` | `#605a51` | **`#565E69`** |
| `--outline` | `#9b9389` | **`#A9B1BC`** |
| `--tertiary` | `#c74634` **Redwood red** | **`#1748B0`** — a blue |
| `--topbar-bg` | `#23262b` | **`#1D2127`** |

Note `--tertiary`: the Redwood-red accent that `05` describes as half the brand
identity is **gone**, replaced by a blue that is also the `ongoing` status text
colour. That needs checking against `05 §7.5` ("no colour carries two
meanings") wherever `--tertiary` is still used as an accent.

Typography adds **Inter** for Latin; **Cairo is kept** for Arabic. A **dark
theme** arrives (`[data-theme]`), which we do not have today.

### 2.2 New structural architecture

The branch introduces a named page-zone contract that our Angular shell does
not implement:

| Zone | Primitive | Purpose |
|---|---|---|
| Z0 | `DTopbar` | Global bar — context, search, notifications. **Not** the breadcrumb |
| Z2 | `DPageHead` | Identity bar — breadcrumb → title (+status) → action cluster (≤3 secondary + 1 primary) |
| Z6 | `.d-toolbar` | Search + filter chips + view controls + result count, **integrated into the grid card** |
| Z7 | — | Content; the only scroll region |
| Z8 | — | Context panel — docked 320 / drawer 420–640 |

Plus a standard **`DPager`** (from–to of total, windowed page buttons, page
size 15/30/60) — real paging, which we do not have.

### 2.3 A rebuilt BOQ module

`boq-register.jsx`, `boq-workspace.jsx`, `boq-assign.jsx`, `boq-data.js` and a
new **`boq.css` (723 lines)**. This is the flagship: synthesised division
hierarchy with expandable roll-up rows, sticky identifier column, saved views,
amendment comparison columns, skeleton + empty states.

**This directly targets our Phase 4.2**, which is the densest screen in the
system and currently unbuilt.

---

## 3. Migration risk — measured, not estimated

I checked the actual dependency surface rather than assuming.

**Tokens our own code references: 9. Present in the revamp: 9.**
`--font-ar` · `--on-surface` · `--on-surface-variant` · `--outline` · `--r-sm` ·
`--surface-container-lowest` · `--topbar-fg` · `--topbar-field` ·
`--topbar-field-hover`

**Classes our Angular templates reference: 54. Present in the revamp: 50.**

The four exceptions are not blockers:

| Class | Reality |
|---|---|
| `d-proj-filters`, `d-proj-chips` | **Ours, not the reference's.** I added them for the Projects filter bar. The revamp's `.d-toolbar` supersedes them — deleting ours is the correct migration |
| `d-stat-top`, `d-stat-num` | The revamp restructured `DStat`: icon tile and watermark retired, label moved above value, optional delta/bar/foot added. `.d-stat-num` survives as the count-up hook |

**`SummaryStripComponent` is the only primitive needing real rework** — and its
count-up logic is unaffected: the revamp uses the identical settle-on-hidden,
easeOutCubic approach I already implemented.

This is why the recommendation is "now": the CSS swap is close to drop-in
**today**, and gets linearly more expensive with every screen we build.

---

## 4. What this breaks

### 4.1 The binding design spec becomes wrong — highest impact

`docs/spec/05-DESIGN-SYSTEM.md` is **binding** and its §1 colour tables,
§7 accessibility contract and §8 cautions all describe the *old* system. After
adoption, the single most-cited design document in the repo is inaccurate.

`docs/SRS.md §11` and `CLAUDE.md §6` both restate those values and inherit the
problem.

**This is not optional cleanup.** `05 §7` opens with *"These came out of a
formal adversarial audit; they are requirements, not preferences."* An
inaccurate binding spec is worse than no spec.

### 4.2 Two tokens fail the accessibility contract — measured

`05 §7.1` requires **borders, icons and graphics ≥ 3:1**. Measured against
white in the running branch:

| Token | Old | v1.1 | Floor | Result |
|---|---|---|---|---|
| `--outline` | 3.03:1 | **2.16:1** | ≥3 | ❌ fails |
| `--viz-base` | 3.03:1 | **2.16:1** | ≥3 | ❌ fails |
| `--on-surface` | — | 16.17:1 | ≥4.5 | ✅ |
| `--on-surface-variant` | 6.82:1 | 6.56:1 | ≥4.5 | ✅ |
| `--primary` | — | 5.81:1 | ≥4.5 | ✅ |
| status `-tx` (all five) | — | 5.17–8.11:1 | ≥4.5 | ✅ |

The old values sat *exactly* at the 3.03:1 threshold — they were chosen to pass.
The new ones do not.

This matters concretely because `04 §5` specifies `--viz-base` for the **Gantt
data-date line** and bar edges, and `05 §1` labels `--outline` "borders and
graphics only — 3.03:1". Both are meaningful graphics, not decoration.

`--outline-variant` (1.27:1) and `--stroke-default` (1.41:1) are **not** flagged:
they are decorative separators, which WCAG 1.4.11 exempts.

**Fix is cheap** — darken two hex values by roughly one step. It must be a
deliberate decision, not a silent inheritance.

### 4.3 Smaller items

- **P-17 survives.** `.d-grid.stats` is still pinned to `repeat(4, 1fr)`,
  contradicting `05 §8`. My `.fit` override is **still required** after the swap.
- **P-19 is fixed upstream.** The stray `; }` in `.d-modnav` is gone, so I can
  delete our local patch and the deviation note.
- **`card-exec` / `card-analytic` / `card-op`** are specified in
  `design-language.md` §"Card classes" but **not implemented** — 0 occurrences
  in the CSS. The design doc overstates what shipped.

---

## 5. Recommendation

**Adopt now, before Phase 2 starts.**

The argument is timing, not preference:

| Adopt at | Screens to re-verify |
|---|---|
| **Now** (end of Phase 1) | **1** (Projects) + 7 primitives |
| After Phase 2 | 7 |
| After Phase 3 | 9 + the workspace shell |
| After Phase 6 | 25+ |

Phase 1 delivered the rules and the primitives — the layer that is *least*
coupled to visual design. Phase 2 onwards is where screens multiply. This is the
cheapest moment this decision will ever be available, and the gap widens
monotonically.

Adopting also **de-risks Phase 4.2**: the BOQ module is our hardest screen, and
the branch has already designed and built it.

### Proposed sequence

| Step | Work | Size |
|---|---|---|
| **0** | **Decide the two a11y values** (§4.2) — darken `--outline` / `--viz-base` to ≥3:1, or accept and record the deviation | Decision |
| **1** | Re-baseline `05-DESIGN-SYSTEM.md` against v1.1: colour tables, type ramp, density/radius maps, re-run the §7 audit. Update `CLAUDE.md §6` and `SRS.md §11` | **M** |
| **2** | Swap the four stylesheets + add `boq.css`; delete our `.d-proj-filters`/`.d-proj-chips`; keep the `.fit` override; drop the P-19 patch | **S** |
| **3** | Rework `SummaryStripComponent` to the new `DStat`; verify the other six primitives against their new reference | **S** |
| **4** | Add the new primitives as Angular components: `DPageHead` (Z2), `.d-toolbar` (Z6), `DPager` | **M** |
| **5** | Re-verify the Projects list: AR + EN, light + **dark**, 1440/1280/1024/768 | **S** |
| **6** | Re-point Phase 4.2's reference from `DModBOQ` to `boq-register`/`boq-workspace`/`boq-assign` in ROADMAP + TRACE | **S** |

Steps 2–3 are genuinely small **only because** the class contract survived —
that is the finding that makes this proposal viable.

### If you defer

Then pin it explicitly: record in `DECISIONS.md` that `epm-fullstack` targets
the **pre-v1.1** system and that `../epm@design/system-revamp` is a known
divergence. The failure mode to avoid is drifting into it accidentally — someone
copying a class from the new branch into a screen built on the old tokens.

---

## 6. Defect found while building

**`boq-demo.html` is broken on this branch.** It throws
`ReferenceError: DBoqWorkspace is not defined`.

Cause: it loads `boq-register.jsx` and `boq-assign.jsx` but **not**
`boq-workspace.jsx`, which is where `DBoqWorkspace` is defined. It is also
pinned at `?v=57` while `index.html` is at `?v=338` — a stale harness left
behind as the module was split.

**Fix:** add `<script type="text/babel" src="app/boq-workspace.jsx?v=338">` and
re-pin the other tags. One line. The main app is unaffected — `index.html`
loads all four files correctly.

---

## 7. Open questions

1. **The two a11y values** (§4.2) — darken, or accept with a recorded
   deviation? This is a binding-contract question, not a taste question.
2. **Is `--tertiary` still an accent?** It is now the same blue as
   `ongoing` status text. If it is used as an accent anywhere, that is
   `05 §7.5` ("no colour carries two meanings").
3. **Does the ministry want the dark theme in scope?** It arrives free with the
   swap, but it doubles the visual verification surface for every screen.
4. **Do we adopt the Z-zone architecture wholesale**, or only the parts Phase 2
   and 3 need? The full contract implies reworking the shell we already built.
5. **Is `design/system-revamp` intended to merge to `epm@main`?** It is 27
   commits ahead and unmerged. If `main` is still the reference of record, our
   `docs/spec/reference/` copy is correct as-is and this proposal is premature.

---

## 8. How to look at it yourself

The branch is checked out and served:

```bash
npx --yes serve -l 8123 "C:/Users/admin/AppData/Local/Temp/claude/D--Projects-EPM/159d4b3c-c9f6-47b4-8398-df920014390d/scratchpad/epm-revamp"
```

Open <http://localhost:8123>. The worktree is in the scratchpad — nothing in
`D:\Projects\EPM\epm` was modified, and `main` is untouched. Remove it with:

```bash
git -C D:/Projects/EPM/epm worktree remove --force "C:/Users/admin/AppData/Local/Temp/claude/D--Projects-EPM/159d4b3c-c9f6-47b4-8398-df920014390d/scratchpad/epm-revamp"
```
