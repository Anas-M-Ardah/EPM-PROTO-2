# EPM — full-stack prototype

Engineering Projects Management for the **Ministry of Higher Education & Scientific Research
(Iraq) — Reconstruction & Projects Department**.

Angular 19 · .NET 9 minimal APIs · SQL Server. Arabic RTL primary, bilingual AR/EN.

This is a **port** of a client-validated React prototype (`../epm`) — same system, same design,
same business rules, on a real stack with a real database. It remains a prototype.

---

## Run it

```bash
cd api/Epm.Api && dotnet run
```

```bash
cd web && npm start
```

API on **:5080**, web on **:4300** → open <http://localhost:4300>

**The database starts empty.** That is deliberate. Click *تحميل بيانات العرض / Load demo
fixture* on the Projects screen, or:

```bash
curl -X POST http://localhost:5080/api/dev/load-fixture
```

The fixture's figures are **illustrative, not ministry data** — see the warning at the top of
`api/Epm.Api/Features/Dev/Fixture.cs`.

---

## How to trace anything

Every endpoint and its Angular caller share an anchor. One grep crosses both stacks:

```bash
grep -rn "EP-PRJ-01" api web
```

returns the page, the API client, the endpoint, and the tables it reads.

DTO members and TypeScript interface members share names too, so this works as well:

```bash
grep -rn "contractCount" api web
```

`TRACE.md` is the index: every screen, endpoint, business rule and table.

---

## How to change things

| Change | Files, in order |
|---|---|
| A column on a screen | entity → `*Dto.cs` → `*.types.ts` → `*.page.html`, then `POST /api/dev/reset` |
| A business rule | the one file in `Domain/` + its test. Nothing else defines it |
| A query or filter | that feature's `*Endpoints.cs` only |
| A label | `web/src/app/core/lang.ts` (UI chrome) or the `Lookups` table (enums) |
| Styling | `grep web/src/styles/` first — 2,947 lines copied verbatim from the reference |

---

## Layout

```
CLAUDE.md      the rules that don't change — read first
ROADMAP.md     the work, with a checklist per phase
TRACE.md       screen → endpoint → rule → table index
DECISIONS.md   every business-rule and port decision, with its reasoning

docs/SRS.md    what the system does and why, end to end — start here to
               understand the BUSINESS. Derived from docs/spec/; not binding.
docs/spec/     the binding specification (01–07 + 22 screenshots)
docs/spec/reference/app/   the React prototype — THE reference for every screen
docs/uml/      one Mermaid doc per feature

api/Epm.Api/
  Program.cs           DI, persona middleware, one Map line per feature
  Data/EpmDb.cs        the one DbContext — append-only DbSet list
  Data/Entities/       flat POCOs; unregistered ones are starting points
  Domain/              THE specification as code — all arithmetic lives here
  Features/<Name>/     <Name>Endpoints.cs + <Name>Dto.cs

web/src/
  styles/              design system, copied verbatim — do not re-derive
  app/core/            api · persona · lang · format · icon
  app/shell/           command bar, module nav
  app/features/<name>/ <name>.page.ts + .html · .api.ts · .types.ts
```

---

## What is deliberately not here

- **No authentication.** A persona header stands in. The permission *model* (`03 §7`) is real
  and server-resolved; the identity is not.
- **No migrations.** `EnsureCreated()` + `POST /api/dev/reset`.
- **No repositories, CQRS, MediatR, AutoMapper or NgRx.** Each adds a hop to trace through.
- **No foreign keys.** Relationships are `Where()` clauses you can read.
- **No real P6 / Excel import** (`07 §2`) — the validation gates are implemented, the parsers are not.
- **No report rendering.** SCR-E7 defines all twelve reports and says, per row, whether the
  system holds the data to produce it — three do today. Producing the PDF is in no phase.
- **No BIM viewer** — out of Phase 1 (`07 §8`); the tab is kept and stubbed.

Each of these is recorded with its reasoning in `DECISIONS.md`.
