# UML

One file per feature: `docs/uml/<feature>.md`, named after the feature folder
(`projects.md` ↔ `web/src/app/features/projects/` ↔ `api/Epm.Api/Features/Projects/`).

## Index

| Feature | Screen | Endpoints | Doc |
|---|---|---|---|
| Projects | SCR-E2 Projects list | `EP-PRJ-01` | [projects.md](projects.md) |
| Alerts | SCR-E6 Alerts Center | `EP-ALR-01` · `EP-ALR-02` | [alerts.md](alerts.md) |
| Lookups | — (shared primitive) | `EP-LKP-01` | [lookups.md](lookups.md) |
| Domain rules | — (rules reference) | `EP-DOCS-01` | [rules.md](rules.md) |
| Shared UI primitives | — (presentation only) | — | [_shared-primitives.md](_shared-primitives.md) |

## What every feature doc must contain

Four diagrams, in this order. They answer four different questions.

| # | Diagram | Mermaid type | Answers |
|---|---|---|---|
| 1 | File map | `graph` | *Which files are this feature?* Angular trio, endpoints, DTO, domain, tables |
| 2 | Request sequence | `sequenceDiagram` | *What happens when I click?* page → api.ts → endpoint → domain → SQL and back |
| 3 | Data | `erDiagram` | *What does it read and write?* columns, and which "relationships" are plain ID columns |
| 4 | States | `stateDiagram-v2` | *What can the screen look like?* loading · error · empty · data (04 §9) |

Then two tables: **where to change what**, and **known gaps**.

## Rules

- **Mermaid only, committed as markdown.** It renders on GitHub, it diffs in review, and an agent can update it in the same commit as the code. An image would be stale within a week.
- **Label edges with the real identifier** — the `EP-…` anchor, the actual column name. A diagram that says "fetches data" is decoration.
- **Draw what exists, not what is planned.** Gaps go in §6 as prose, never as a box in a diagram.
- **English labels inside diagrams.** Mermaid's layout does not handle RTL text well. Arabic belongs in the prose and in the UI, not in node labels.
- **Show absent foreign keys as dotted** (`||..o{`) and say so in the edge label. This project has no FK constraints — a solid line would be a lie.

## Updating

A feature doc is part of the feature. Changing an endpoint or a table without
updating its diagram is an incomplete change — the same way leaving a stale
comment is.
