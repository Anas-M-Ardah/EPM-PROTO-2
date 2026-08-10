# CLAUDE.md — EPM full-stack prototype

Standing instructions. **[ROADMAP.md](ROADMAP.md) has the work; this file has the rules.**

This is a **prototype** for the Iraqi Ministry of Higher Education's Reconstruction & Projects
Department, ported from a client-validated React prototype to Angular + .NET + SQL Server.

The governing constraint is **readability and traceability**, not architectural correctness.
A person must be able to point at a number on screen and reach the SQL table in four hops, all
named the same thing. Where a "best practice" adds a hop, it is not wanted here.

---

## 1. Before you write anything

**Find the reference component.** Every screen already exists in
`docs/spec/reference/app/*.jsx`. [ROADMAP.md](ROADMAP.md#reference-component-map) names the
file and line for each. Open it. Follow its structure, its CSS classes, its column order, its
conditionals.

> PAGE-01 was first built from the written spec alone. It invented a column set, reached for
> `.d-search` instead of `.d-field` and `.d-secnav` instead of `.d-fchip`, and missed that the
> Workspace column is hidden when the page is workspace-scoped. All of it had to be redone.
> **The written spec gives you the rules. The reference component gives you the screen.**

The binding written spec is `docs/spec/` (`01`–`07`). `05-DESIGN-SYSTEM.md §7` is an
accessibility contract, not advice.

---

## 2. Traceability — the one convention

Every endpoint and its Angular caller carry the same anchor:

```csharp
// [EP-BOQ-03] GET /api/contracts/{contractId}/boq
// web: boq.api.ts getRegister() → boq.page.ts | spec: 04 §4 | rules: BR-01, BR-04 | tables: BoqItems
```

```ts
// [EP-BOQ-03] GET /api/contracts/{id}/boq → api/Features/Boq/BoqEndpoints.cs
getRegister(contractId: string) { … }
```

`grep -rn "EP-BOQ-03" api web` returns every touchpoint across both stacks.

**One slug, every layer.** For feature `Boq`:

| Layer | Path |
|---|---|
| Angular page | `web/src/app/features/boq/boq.page.ts` + `.html` |
| Angular client | `web/src/app/features/boq/boq.api.ts` |
| Angular types | `web/src/app/features/boq/boq.types.ts` |
| .NET endpoints | `api/Epm.Api/Features/Boq/BoqEndpoints.cs` |
| .NET DTOs | `api/Epm.Api/Features/Boq/BoqDto.cs` |

**DTO members and TypeScript interface members must have identical names.** That is what lets
one grep cross the language boundary.

---

## 3. Architecture rules

1. **All business arithmetic lives in `api/Epm.Api/Domain/`.** An endpoint may filter, join,
   sort and project. It may not compute a weight, a share, a tier split, a penalty or a
   lifecycle transition. Angular computes nothing but display formatting.
2. **One file per feature for endpoints.** No repository, no service class, no handler, no
   MediatR. Open `BoqEndpoints.cs` and see every query behind the BOQ tab.
3. **Storage is flat.** No navigation properties, no foreign keys, no cascade rules, no
   indexes. Tables join via plain ID columns in the endpoint:
   `db.Contracts.Where(c => c.ProjectId == id)`. That query *is* the relationship.
4. **Invariants are checked in endpoints**, where they can be read — not in schema config.
5. **Derived values are never stored.** Project value, BOQ weight, effective contract value,
   BOQ progress, penalties — all computed at projection time (`01 §3`).
6. **Original values are never overwritten.** `original` / `before` / `requested` / `approved` /
   `applied` are separate columns that all persist.
7. **No component-scoped CSS.** Classes come from `web/src/styles/` — 2,947 lines copied
   verbatim from the reference. `grep` before you write a rule. If it genuinely does not exist,
   add it to `web/src/styles.css` using tokens, never literals.

---

## 4. Database

**No migrations.** `EnsureCreated()` on boot creates the schema if absent and never wipes.
To apply a schema change: edit the entity, then `POST /api/dev/reset`.

**Nothing is seeded automatically.** The database starts empty. `POST /api/dev/load-fixture`
loads the `06 §12` scenario on demand. Its figures are **illustrative, not ministry data** —
see the warning at the top of `Features/Dev/Fixture.cs`.

Because empty is the default, **every screen needs a real empty state** (`04 §9`), and
"empty database" and "filter excluded everything" are two different states with two different
messages and two different buttons.

**Domain rule tests must never read the database.** Worked examples stay inline in
`Epm.Domain.Tests`, straight from `02-BUSINESS-RULES.md`, so a wrong fixture cannot make a
test lie.

`Data/Entities/` holds documented starting points for tables no page reads yet. They are
deliberately **not** registered in `EpmDb`. Wire one in when a page needs it, and prune its
columns to what that page shows.

**Money is `decimal`, never `float`** (D-11). Quantities and percentages `decimal(18,4)`.

---

## 5. Business non-negotiables

From client review. These are the ones most likely to be "simplified" by mistake.

1. **Contract is the working context.** A BOQ item and an activity each belong to exactly one
   contract. The project is *derived* from the contract and never asked for again. One change
   order may never span two contracts.
2. **Approved ≠ Applied ≠ Closed.** Approving changes nothing. Applying creates a contract
   amendment and moves quantities, dates and the penalty baseline. Closing verifies it.
   Approved-but-unapplied orders are a **projection**, never folded into effective figures.
3. **The 20% rule is per BOQ line**, measured against the **original** quantity (D-01). Only
   the excess may be re-priced, and only لجنة تثبيت الأسعار sets the binding rate — never the wizard.
4. **Two proposals, one decision.** Contractor and RE department each propose; the RE
   department's figure governs display; the approved value comes only from the pricing
   committee at financial review.
5. **External parties are statuses, not stages.** Recorded inside the owning stage by a
   delegate, against an official letter number and date. Attributed to the deciding party,
   with the delegate as recorder.
6. **Never overwrite original values.**
7. **Arabic RTL is primary**, not a translation layer. Logical CSS properties only. Every
   number, date, ID and currency string needs `<bdi>` isolation (`05 §5.2`).
8. **"Now" is the project data date** (2026-08-02 in the fixture), never `DateTime.Now` (D-06).

---

## 6. Design rules that get broken most often

- Type scale is exactly **11 / 11.5 / 12 / 13 / 15 / 18 / 21 / 24**. Nothing smaller than 11px.
- **No uppercase, no letter-spacing** — Arabic has no case and letter-spacing breaks its shaping.
- **Nothing floats.** Separation is hairlines and plane changes, never shadows.
- Sections are **label + space**, never nested boxes. Tables are the primary element, not cards.
- Summary strips use `grid-template-columns: repeat(auto-fit, minmax(120px,1fr))` — **never** a
  pinned column count, never `flex: 1 1 <basis>` (`05 §8`).
- **Status is never colour-only** — every pill carries a label.
- `--outline` and `--viz-base` are **graphic tokens**. Using them as text colour is a defect.
- Criticality is a **ring**, not a colour — the colour channel belongs to status.
- Never colour a magnitude by threshold (`bad ? --error : --success`). The neutral branch is
  `--on-surface`.
- **Prevent invalid input** — cap the field and explain the cap — rather than flagging it after.
- Secondary detail goes in a **drawer**, not an in-place expander.
- `:focus-visible` on every interactive element.

---

## 7. Running it

```bash
cd api/Epm.Api && dotnet run
```

```bash
cd web && npm start
```

API on **:5080**, web on **:4300** (4200 is taken by another project on this machine).

| Endpoint | Does |
|---|---|
| `POST /api/dev/reset` | drops and recreates the schema, empty — how a schema change is applied |
| `POST /api/dev/load-fixture` | loads the `06 §12` scenario on demand |
| `GET /api/dev/personas` | the seven personas from `03 §7` |

The running API locks its own exe — stop it before `dotnet build`.

---

## 8. When something is ambiguous

Check `docs/spec/07-POC-BUILD-PLAN.md §9` (open questions) and `DECISIONS.md` first. If it is
not there, **add it there rather than guessing** — this system is a legal and financial record
and a wrong assumption propagates into contract values.
