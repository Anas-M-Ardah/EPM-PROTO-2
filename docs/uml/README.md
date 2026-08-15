# UML

One file per feature: `docs/uml/<feature>.md`, named after the feature folder
(`projects.md` ↔ `web/src/app/features/projects/` ↔ `api/Epm.Api/Features/Projects/`).

## Index

| Feature | Screen | Endpoints | Doc |
|---|---|---|---|
| Projects | SCR-E2 Projects list | `EP-PRJ-01` | [projects.md](projects.md) |
| Alerts | SCR-E6 Alerts Center | `EP-ALR-01` · `EP-ALR-02` | [alerts.md](alerts.md) |
| Schedule Control | SCR-E5 Schedule Control | `EP-SCT-01` | [schedule-control.md](schedule-control.md) |
| Reports | SCR-E7 Reports & Analytics | `EP-RPT-01` | [reports.md](reports.md) |
| Workspace shell | SCR-W1 Overview · SCR-W2 Information | `EP-OVW-01` · `EP-INF-01` | [workspace-shell.md](workspace-shell.md) |
| Contract tab | SCR-W3 Contract | `EP-CON-01` · `EP-CON-02` | [contract-tab.md](contract-tab.md) |
| BOQ tab | SCR-W4 BOQ | `EP-BOQ-01` … `EP-BOQ-08` | [boq-tab.md](boq-tab.md) |
| Change orders | SCR-W8 register | `EP-CHG-01` | [change-orders.md](change-orders.md) |
| Change order record | SCR-W8 record · الأشكال 30–34 | `EP-CHG-02` | [change-order-record.md](change-order-record.md) |
| Change order wizard | SCR-W8 wizard · الأشكال 37–42 | `EP-WIZ-01` · `EP-WIZ-02` · `EP-WIZ-03` | [change-order-wizard.md](change-order-wizard.md) |
| Change order workflow | SCR-W8 المسار · الشكل 33 | `EP-WFL-01` · `EP-WFL-02` · `EP-WFL-03` | [change-order-workflow.md](change-order-workflow.md) |
| Risks | SCR-W9 سجل المخاطر · الشكل 43 | `EP-RSK-01` | [risks.md](risks.md) |
| Meetings | SCR-W11 محاضر وإجراءات · الشكل 45 | `EP-MTG-01` | [meetings.md](meetings.md) |
| Documents | SCR-W12 الوثائق والمخططات · الشكل 46 | `EP-DOC-01` | [documents.md](documents.md) |
| Project alerts | SCR-W13 التنبيهات · الشكل 47 | `EP-PAL-01` · `EP-PAL-02` | [project-alerts.md](project-alerts.md) |
| 3D model | SCR-W10 النموذج ثلاثي الأبعاد · الشكل 44 | `EP-MDL-01` | [model.md](model.md) |
| Lookups | — (shared primitive) | `EP-LKP-01` | [lookups.md](lookups.md) |
| Domain rules | — (rules reference) | `EP-DOCS-01` | [rules.md](rules.md) |
| Shared UI primitives | — (presentation only) | — | [_shared-primitives.md](_shared-primitives.md) |
| Shell | — (frames every screen) | — (reads `EP-ENT-01` · `EP-DEV-03`) | [_shell.md](_shell.md) |

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
