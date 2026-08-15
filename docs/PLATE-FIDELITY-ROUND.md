# The plate fidelity round

*"Follow the docs word for word — take a round to check."*

Every screen in this build was checked against its plate as it was built. That
check looked at **columns and figures**. This round looks at the part nobody had
systematically checked: each plate's **«الوظائف والخصائص الظاهرة»** — its list
of controls — and its **«الإجراءات المتاحة للمستخدم»**.

That is the class of gap that hid «مرشح نوع الأمر» on الشكل 29 for two phases.

---

## Method

All sixty plates' «الوظائف والخصائص الظاهرة», «الإجراءات المتاحة للمستخدم» and
«اللوحات والتبويبات الظاهرة» were extracted from the appendix. Then:

1. **Control nouns** — every «زر X» · «مبدّل X» · «مرشح X» · «منتقي X» ·
   «مفتاح X» and every «…» quoted name — were pulled out mechanically (105 of
   them) and searched for in the app's own Arabic strings. 18 came back absent
   or partial and were checked by hand.
2. **Tab counts** — every plate that states one («ستة تبويبات (…)») was compared
   against the built tab list.
3. Each candidate was then confirmed in the code, not assumed from the search.

---

## What it found

### Fixed in this round

| Plate | Screen | Named in the plate | Was |
|---|---|---|---|
| الشكل 29 | SCR-W8 register | **«مبدّل «العرض بصفة»»** | in the app shell's account menu (P-126) |
| الشكل 29 | SCR-W8 register | **«المرشح: المرحلة»** | not built (P-128) |
| الشكل 29 | SCR-W8 register | **«مرشح نوع الأمر»** | not built (P-128) |
| الشكل 30 | SCR-W8 record | **«مبدّل «العرض بصفة»»** | in the shell (P-126) |
| الشكل 30 | SCR-W8 record | **«منتقي الأمر»** | not built (P-128) |
| الشكل 47 | SCR-W13 alerts | **«زر ضبط قواعد التنبيه»** | not built — now present and says the editor behind it is fixture data (P-129) |

### Also rebuilt — SCR-W1 نظرة عامة

**الشكل 4 was not the source this screen was built from.** It came from the v1.1
reference `DModOverview`, and the two had diverged on nearly every line: five
missing identity fields, four figures the plate pairs and the screen showed
alone, both charts absent, no «فتح التنبيهات», an alerts panel of counts where
the plate asks for cards you act from — and two panels the plate never names.

Rebuilt to the plate (P-130 · P-131 · P-132). It is the second screen this
round found built from the reference rather than from its plate, and the first
one that has been redone.

### The one structural gap — SCR-W6 الإنجاز

**الشكل 25 names four tabs and the screen has three, and they are not the same
three.**

| الشكل 25 | Built |
|---|---|
| الملخص | الملخص ✅ |
| **حسب هيكل التجزئة** | — |
| **الأثر والكلفة** | — |
| **مخاطر الجدول** | — |
| — | الأنشطة |
| — | بنود الكميات |

The plate also names three controls the screen does not have: **«مرشح مرجع
المقارنة»**, **«زر «كيف تُحتسب»»** and **«زر تحديث نسبة الإنجاز»** — and
«تصدير PDF».

SCR-W6 was built in Phase 4.4 from `04 §3` and the reference component
`DModProgress`, before the appendix became the binding visual reference for this
screen. Everything on it is correct — BR-04's reflection, the earned-value
figures, the one screen that MOVES progress — but its shape is the reference's
and not the plate's.

**This is not a patch.** «حسب هيكل التجزئة» is the WBS rollup (which
`ProgressReflection.Rollup` already computes), «الأثر والكلفة» is earned value
(which `EarnedValue.For` already computes) and «مخاطر الجدول» is the at-risk
activity list (which `DModProgress` itself draws). The data is there; the tab
structure is a rebuild of one screen, and it is recorded here rather than done
quietly in a round the user asked to be a *check*.

### Named in a plate, correctly absent

| Plate | Control | Why it is not a gap |
|---|---|---|
| الشكل 18 | «بطاقة موسومة «قيم معتمدة من الدائرة المالية»» | الشكل 18 is SCR-W7's `records` tab, which is **named-not-drawn** by design and carries a `needs` message saying what it waits for |
| الشكل 12 | «زر «العروض»» | «الأعمدة» is built; «العروض» implies saved column presets, a feature rather than a label — recorded in `TODO.md` |
| الأشكال 50–58 | «زر إضافة فقرة» · «زرَّي استلام» · «إرفاق ملف» · «إضافة تحويل» | the الفقرات التجهيزية module has no table and is not built (P-110); the plates' controls follow it |

### Confirmed correct

Checked and matching, control for control:

- **الشكل 43** risks — the collapsible register card, the search field, the
  severity tabs with counts, the nine columns, the footer strip.
- **الشكل 45** meetings — «زر محضر اجتماع جديد», the two tabs, the attachment
  card with its kind, the counters.
- **الشكل 46** documents — the folders, the search, the status filters, «آخر
  مراجعة فقط», «رفع وثيقة», «رفع مراجعة», the per-revision download.
- **الشكل 47** alerts — the two-view switch, the twelve-rule table with its
  eight columns, the enable switch per rule.
- **الشكل 44** model — the version reading, the discipline filters, the tree,
  the element panel with its links, the colour key.
- **الشكل 30** record — six tabs, matching the plate's six by name.
- **الشكل 7 · 8** contract — five tabs, matching.
- **الشكل 14** financials — six tabs, matching.

---

## What this round did not check

- **Pixel fidelity.** This is a control-and-structure audit. The visual pass is
  `docs/CLOSEOUT-PASSES.md` §1, and the stylesheets are the reference's own.
- **The figures.** Those were checked screen by screen as each was built, and
  the plates' own numbers are reproduced in the fixture — 14 documents / 21
  revisions, 12 alert rules, 8 alerts / 3 needing action, 6 model elements.
- **الأشكال 48 · 49** — enterprise screens already built against `04 §2`.
