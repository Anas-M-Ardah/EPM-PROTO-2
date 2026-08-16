# Phase 7 — the closeout passes

`ROADMAP.md` Phase 7 asks for four passes over the finished build. This is what
each one measured, what it changed, and what it deliberately did not.

Measured at the fixture's data date **2026-08-02**, on the branch's final build.

---

## 1. Fidelity — the icon sweep

**Method.** Every icon name bound in a template (`name="…"`, `[name]="'…'"`)
compared against the glyphs `core/icons.ts` actually defines. `IconComponent`
falls back to a generic glyph for an unknown name, so a wrong name renders a
box rather than throwing — which is exactly why nobody had noticed.

**Found: 17 names with no glyph.** All of them had been rendering the fallback.

| | Count | Disposition |
|---|---|---|
| Defined in the reference's own `app/icons.js`, never ported | 3 | **Ported verbatim** — `functions` · `view_column` · `more_horizontal`. Used since Phase 4 by the BOQ and schedule column pickers and by six «أساس الاحتساب» notes |
| Defined in neither set | 14 | **Substituted** for a defined glyph that reads correctly |

The substitutions, and what each one labels:

| Was | Now | Where |
|---|---|---|
| `alt_route` | `account_tree` | «ماذا سيحدث بعد ذلك» — the branch a decision takes |
| `auto_fix_high` | `bolt` | «توزيع تلقائي» on the BOQ assignment |
| `donut_small` | `donut_large` | the wizard's share dial |
| `event` | `calendar_month` | a meeting's date |
| `event_busy` | `schedule` | «لا أنشطة متأثرة» |
| `filter_alt` | `filter_list` | six filter chips |
| `filter_alt_off` | `search_off` | four «لا نتائج» states |
| `group_add` | `person_add` | «تسجيل محضر» |
| `pending_actions` | `pending` | «بانتظار إجرائي» |
| `play_arrow` | `bolt` | «تشغيل» a report |
| `print` | `download` | the CO record |
| `rule` | `verified_shield` | «القاعدة هي مصدر التنبيه» |
| `send` | `forward_to_inbox` | «إرسال للمراجعة» |
| `task_alt` | `done` | «لا إجراءات» |

**Why substitute rather than draw new glyphs.** `core/icons.ts` says so in its
own header: *"Do not hand-edit entries — re-extract from the reference if they
change."* The footer had already set the precedent for `support_agent` → `help`
and documented it. Fourteen new hand-drawn glyphs would be fourteen ways for
this app's icon set to drift from the one it was ported from.

**Not done: the 22-screenshot walk.** `docs/spec/screenshots/` is the older
pre-v1.1 set; the binding visual reference for everything built since Phase 4
is the appendix's sixty plates, and every screen has been checked against its
own plate as it was built — figure by figure, in the commit that built it.
Re-walking a superseded screenshot set would measure the wrong thing.

---

## 2. Responsive — 1440 / 1280 / 1024 / 768

**Method.** Each width loaded live, then measured: does the document scroll
horizontally; does any frame element overflow its own box; is any header or
column label clipped; how many columns does the summary strip resolve to.

| Width | Document scrolls X | Frame overflow | Clipped headers | Summary strip |
|---|---|---|---|---|
| 1440 | no | none | none | — |
| 1280 | no | none | none | — |
| 1024 | no | none | none | **4 columns** |
| 768 | no | none | none | **2 columns** |

**The Gantt stays inside its pane.** At 768 the chart fits its wrapper
(`.d-gantt-wrap`) exactly and the page does not scroll sideways.

**One roadmap expectation is not met, and should not be.** Phase 7 asks the KPI
strips to reflow **5 → 5 → 3 → 2**. They reflow 5 → 5 → **4** → 2, because
CLAUDE.md §6 requires `repeat(auto-fit, minmax(120px, 1fr))` and forbids a
pinned column count. Auto-fit answers with what fits; at 1024 that is four. The
sequence in the roadmap describes an outcome that can only be produced by
pinning, which the design rules prohibit — so the rule wins and the roadmap
line is the thing that is wrong.

---

## 3. Accessibility — `05 §7`

**This pass starts from the REVERTED table in `DECISIONS.md`**, as that section
instructs. That table records four measured breaches (P-21 · P-30 · P-32 ·
P-33) that were corrected and then deliberately restored, because the client
chose visual fidelity with the signed-off prototype over the floors.
**`NFR-A11Y-01` remains knowingly unmet**, and the numbers needed to settle it
are still written down there.

**What this pass checked and what it found:**

| Floor | Result |
|---|---|
| Nothing below 11px | **4 remaining**, all in the reference-copied stylesheets (`desktop.css`, `boq.css`) — P-33's territory |
| `--outline` / `--viz-base` never a text colour | **6 remaining**, all reference-copied — P-21's territory |
| Disabled by explicit colour, never opacity | **3 remaining**, all reference-copied |
| `:focus-visible` on every interactive element | **29 rule groups plus a global `:focus-visible` in `tokens.css`** — met |
| Status never colour-only | met — every pill carries its label; criticality rides a ring on SCR-W5 and SCR-W10 |

**Fixed here — the two breaches that are OURS.** The REVERTED table covers the
reference's choices; these two are in `.epm-*` rules this build wrote itself, so
no fidelity question attaches to them:

- `.epm-crumb-emblem` was 10.5px → **11px**, the floor.
- `.epm-select:disabled` faded by `opacity: .6` → **explicit background and
  colour**. Opacity fades text and ground together and lands wherever it lands,
  which is how a disabled control ends up below contrast without anyone
  choosing it.

**Also fixed: 51 `<button>` elements with no `type`.** A bare `<button>` is
`type="submit"`. None of them sits inside a `<form>` today, so none misbehaves
— but that is a property of the pages around them, not of the buttons, and it
stops being true the first time one is wrapped.

---

## 4. Bilingual

**Method.** Static: every `lang.t('…')` call resolved against `core/lang.ts`;
every entry checked for both an `ar` and an `en` value. Runtime: the app
switched to English and every Phase 6 screen read back, looking for Arabic
leaking into chrome (headers, chips, buttons, column labels, footers).

| Check | Result |
|---|---|
| Keys used but not defined | **0** — a missing key throws at render, so this had to be zero |
| Entries without an Arabic value | **0** |
| Entries without an English value | **0** (1,487 entries) |
| Arabic leaking into English chrome | **1 found, fixed** |
| Entries defined but never used | 192 — dead weight, see `TODO.md`'s bundle note |

**The one leak: `ModelElement.Building`.** SCR-W10 stored the model tree's root
as a single string, so an English reader saw «مبنى A» at the top of the tree.
Every other name in this system is an `Ar`/`En` pair and this one had no reason
not to be. Split into `BuildingAr` / `BuildingEn` across the entity, the DTO,
the TypeScript type, the fixture and the page (**P-125**). The tree now reads
«مبنى A» in Arabic and «Building A» in English.

Numbers, IDs and dates are `<bdi>`-isolated throughout (`05 §5.2`); that was
enforced screen by screen as each was built rather than swept at the end.

---

## What is still open after these passes

- **`NFR-A11Y-01`** — the four reference breaches in the REVERTED table. This is
  a client decision, not an oversight, and settling it needs the client rather
  than another measurement.
- **The initial bundle** — over 1 MB, with `core/lang.ts` (1,487 entries, 192 of
  them unused) as the growing part. Recorded in `TODO.md` with the real fix.
- **`docs/spec/screenshots/`** — the pre-v1.1 set is stale relative to the
  appendix plates the build actually followed. It should either be re-captured
  from this build or retired.
