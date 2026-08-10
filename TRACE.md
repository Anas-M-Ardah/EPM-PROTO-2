# TRACE

One row per endpoint. Add yours when you build a page; never reorder existing rows
(one row per line means git merges them cleanly across parallel agents).

`grep -rn "<endpoint id>" api web` returns every touchpoint of a row across both stacks.

## Screens

| Screen | Spec | Reference component | Angular page | Endpoints | Status |
|---|---|---|---|---|---|
| SCR-E2 Projects | 04 §2 | `DProjectsAll` enterprise-areas.jsx:112 | `features/projects/projects.page.ts` | `EP-PRJ-01` | ✅ built |
| SCR-E1 Portfolio | 04 §2 | `DDashboard` desktop-views.jsx:45 *(v1.1)* | `features/portfolio/portfolio.page.ts` | `EP-PRT-01` | ✅ built — progress/EVM tiles render "unavailable + reason" until BR-04 and payments exist |
| SCR-E3 Contracts | 04 §2 | `DContractsAll` enterprise-areas.jsx:299 *(v1.1)* | `features/contracts/contracts.page.ts` | `EP-CNT-01` | ✅ built |
| SCR-E4 Entities | 04 §2 | `DSpaces` desktop-views.jsx:375 *(v1.1)* | `features/entities/entities.page.ts` | `EP-ENT-01` | ✅ built |
| SCR-E5 Schedule Control | 04 §2 | `DScheduleControl` enterprise-areas.jsx:8 | — | `EP-SCT-01` | ⬜ |
| SCR-E6 Alerts Center | 04 §2 | `DAlertsCenter` enterprise-areas.jsx:106 *(v1.1)* | `features/alerts/alerts.page.ts` | `EP-ALR-01` · `EP-ALR-02` | ✅ built — the first screen that writes; ack persists with the persona |
| SCR-E7 Reports | 04 §2 | `DReports` desktop-reports.jsx:39 | — | `EP-RPT-01` | ⬜ |
| SCR-W1 Overview | 04 §3 | `DModOverview` project-modules.jsx:1461 | — | `EP-OVW-01` | ⬜ |
| SCR-W2 Information | 04 §3 | `DModInformation` project-modules.jsx:157 | — | `EP-INF-01` | ⬜ |
| SCR-W3 Contract | 04 §7 | `DModContractNew` project-modules.jsx:194 | — | `EP-CON-01` | ⬜ |
| SCR-W4 BOQ | 04 §4 | `DModBOQ` project-modules.jsx:801 | — | `EP-BOQ-01` | ⬜ |
| SCR-W5 Schedule | 04 §5 | `DModSchedule` schedule-module.jsx:432 | — | `EP-SCD-01` | ⬜ |
| SCR-W6 Progress | 04 §3 | `DModProgress` project-modules.jsx:668 | — | `EP-PRG-01` | ⬜ |
| SCR-W7 Financials | 04 §3 | `DModFinancialNew` project-modules.jsx:485 | — | `EP-FIN-01` | ⬜ |
| SCR-W8 Change Orders | 03 §9–10 | `DModVO` project-modules.jsx:1142 | — | `EP-CHG-01` | ⬜ |
| SCR-W8 CO wizard | 03 §8 | `DVOCreateWizard` vo-wizard.jsx:6 | — | `EP-WIZ-01` | ⬜ |
| SCR-W8 CO workflow | 03 §2–6 | `DVOStageTimeline` project-modules.jsx:1120 | — | `EP-WFL-01` | ⬜ |
| SCR-W9 Risk | 04 §3 | `DModRisk` project-modules.jsx:1693 | — | `EP-RSK-01` | ⬜ |
| SCR-W10 3D Model | 07 §8 | `model-module.jsx` | — | `EP-MDL-01` | ⬜ stub |
| SCR-W11 Meetings | 04 §3 | `DModMeetings` project-modules.jsx:1365 | — | `EP-MTG-01` | ⬜ |
| SCR-W12 Documents | 04 §3 | `DModDrawings` project-modules.jsx:1396 | — | `EP-DOC-01` | ⬜ |
| SCR-W13 Alerts | 04 §3 | `DModAlerts` alerts-module.jsx:20 | — | `EP-PAL-01` | ⬜ |
| SCR-W14 Reports | 04 §3 | `DModReports` project-modules.jsx:1579 | — | `EP-PRP-01` | ⬜ |
| SCR-W15 Audit | 04 §3 | `DModAudit` project-modules.jsx:1727 | — | `EP-AUD-01` | ⬜ |

## Endpoints built

| ID | Method + route | .NET file | Angular caller | Rules | Tables |
|---|---|---|---|---|---|
| `EP-PRJ-01` | `GET /api/projects` | `Features/Projects/ProjectsEndpoints.cs` | `projects.api.ts` `list()` | BR-00 | Projects · Contracts · Workspaces |
| `EP-DEV-01` | `POST /api/dev/reset` | `Features/Dev/DevEndpoints.cs` | — | — | all |
| `EP-DEV-02` | `POST /api/dev/load-fixture` | `Features/Dev/DevEndpoints.cs` | `projects.page.ts` | — | all |
| `EP-DEV-03` | `GET /api/dev/personas` | `Features/Dev/DevEndpoints.cs` | `persona.ts` `load()` | — | — (in code) |
| `EP-LKP-01` | `GET /api/lookups` | `Features/Lookups/LookupsEndpoints.cs` | `core/lookups.ts` `ensureLoaded()` | — | Lookups |
| `EP-CNT-01` | `GET /api/contracts` | `Features/Contracts/ContractsEndpoints.cs` | `contracts.api.ts` `list()` | BR-09 | Contracts · ContractAmendments · Projects |
| `EP-ENT-01` | `GET /api/entities` | `Features/Entities/EntitiesEndpoints.cs` | `entities.api.ts` `list()` | BR-00 · BR-09 | Workspaces · Projects · Contracts · ContractAmendments |
| `EP-PRT-01` | `GET /api/portfolio` | `Features/Portfolio/PortfolioEndpoints.cs` | `portfolio.api.ts` `get()` | BR-00 · BR-09 | Projects · Contracts · ContractAmendments · Workspaces |
| `EP-DOCS-01` | `GET /api/docs/rules` | `Features/Docs/DocsEndpoints.cs` | — (Phase 7 `/docs` route) | BR-01…BR-14 | — (pure) |
| `EP-ALR-01` | `GET /api/alerts` | `Features/Alerts/AlertsEndpoints.cs` | `alerts.api.ts` `list()` | — | Alerts · Projects |
| `EP-ALR-02` | `POST /api/alerts/{id}/ack` | `Features/Alerts/AlertsEndpoints.cs` | `alerts.api.ts` `acknowledge()` | — | Alerts |

## Business rules

`02-BUSINESS-RULES.md` §n → exactly one file in `api/Epm.Api/Domain/`.

| ID | Rule | Spec | File | Tests | Status |
|---|---|---|---|---|---|
| BR-00 | Project value = Σ contract values | 01 §3 | `Domain/ProjectValue.cs` | `ProjectValueTests` | ✅ **now receives EFFECTIVE values** (Phase 2.1) |
| BR-01 | BOQ weight, largest-remainder to 100.00% | 02 §1 | `Domain/BoqWeights.cs` | `BoqWeightsTests` | ✅ |
| BR-02 | Schedule weights, absolute + relative | 02 §2 | `Domain/ScheduleWeights.cs` | `ScheduleWeightsTests` | ✅ |
| BR-03 | BOQ↔Activity allocation share | 02 §3 | `Domain/Allocation.cs` | `AllocationTests` | ✅ (see P-15) |
| BR-04 | Progress reflection, schedule → BOQ | 02 §4 | `Domain/ProgressReflection.cs` | `ProgressReflectionTests` | ✅ |
| BR-05 | **The 20% rule** | 02 §5 | `Domain/TierSplit.cs` | `TierSplitTests` | ✅ |
| BR-06 | Two proposals, one approved value | 02 §6 | `Domain/Proposals.cs` | `ProposalsTests` | ✅ |
| BR-07 | Change-order validation gates | 02 §7 | `Domain/ChangeOrderGates.cs` | `ChangeOrderGatesTests` | ✅ |
| BR-08 | Quantity distribution to beneficiaries | 02 §8 | `Domain/Distribution.cs` | `DistributionTests` | ✅ (import checks: Phase 4.2) |
| BR-09 | Contract amendment + effective values | 02 §9 | `Domain/Amendments.cs` | `AmendmentsTests` | ✅ (see P-16) |
| BR-10 | Delay penalty, 0.1%/day capped 10% | 02 §10 | `Domain/Penalty.cs` | `PenaltyTests` | ✅ |
| BR-11 | Earned value | 02 §11 | `Domain/EarnedValue.cs` | `EarnedValueTests` | ✅ |
| BR-12 | Lead time + SLA | 02 §12 | `Domain/SlaLeadTime.cs` | `SlaLeadTimeTests` | ✅ |
| BR-13 | Six-stage workflow machine | 03 §2,5,6 | `Domain/WorkflowMachine.cs` | `WorkflowMachineTests` | ✅ |
| BR-14 | Viewer relation + action gating | 03 §7 | `Domain/ViewerRelation.cs` | `ViewerRelationTests` | ✅ |
| D-07 | Largest-remainder rounding | 02 §1 | `Domain/Rounding.cs` | `RoundingTests` | ✅ |

## Tables registered in `EpmDb`

Only tables a built page reads. `Data/Entities/` holds documented starting points for the rest.

| Table | Registered by | Read by |
|---|---|---|
| `Projects` | PAGE-01 | `EP-PRJ-01` |
| `Contracts` | PAGE-01 | `EP-PRJ-01` |
| `Workspaces` | PAGE-01 | `EP-PRJ-01` |
| `Lookups` | Phase 1.1 | `EP-LKP-01` |
| `ContractAmendments` | PAGE-02 | `EP-CNT-01` · `EP-PRJ-01` |
| `Alerts` | Phase 2.4 | `EP-ALR-01` · `EP-ALR-02` *(the only table a screen writes so far)* |
