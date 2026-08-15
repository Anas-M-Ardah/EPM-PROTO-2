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
| SCR-E4 Workspaces register | 04 §2 · ملحق الشكل 1 | `DSpaces` desktop-views.jsx:375 *(v1.1)* | `features/entities/entities.page.ts` | `EP-ENT-01` | ✅ built — the row ENTERS the workspace (الشكل 1 → الشكل 2); rows are the personaʼs assignments only (BR-15) |
| SCR-E8 Workspace overview | ملحق الشكل 2 | `DWorkspaceOverview` desktop-workspace.jsx:284 *(v1.1)* | `features/workspaces/workspaces.page.ts` | `EP-WSP-01` | ✅ built — where entering a workspace lands; watchlist · status · recently updated, each row opening a project |
| SCR-E5 Schedule Control | 04 §2 | `DScheduleControl` enterprise-areas.jsx:8 *(v1.1)* | `features/schedule-control/schedule-control.page.ts` | `EP-SCT-01` | ✅ built — critical-activities tile and column became **real** in Phase 4.3; they fall back to "unavailable + reason" only when no project has a schedule |
| SCR-E6 Alerts Center | 04 §2 | `DAlertsCenter` enterprise-areas.jsx:106 *(v1.1)* | `features/alerts/alerts.page.ts` | `EP-ALR-01` · `EP-ALR-02` | ✅ built — the first screen that writes; ack persists with the persona |
| SCR-E7 Reports | 04 §2 | `DReports` desktop-reports.jsx:58 *(v1.1)* | `features/reports/reports.page.ts` | `EP-RPT-01` | ✅ built — a report catalog, not a chart board (P-37); 3 of 12 runnable, the other 9 name their missing source |
| SCR-W1 Overview | 04 §3 | `DModOverview` project-modules.jsx:2512 *(v1.1)* | `features/overview/overview.page.ts` | `EP-OVW-01` | ✅ built — value is Σ effective (BR-00 over BR-09); the projection sits beside it, never in it. **Physical, financial, SPI and CPI became real in Phase 4.4** and fall back to "unavailable" only per project |
| SCR-W2 Information | 04 §3 · **ملحق الشكل 5** | `DModInformation` project-modules.jsx:280 *(v1.1 — and the LIVE prototype, which is newer; see P-69)* | `features/information/information.page.ts` | `EP-INF-01` · `EP-PRJ-03` · `EP-PRJ-04` | ✅ built — الشكل 5's sixteen fields in six collapsible cards, two tabs, and «تعديل» editing IN PLACE through the one project update endpoint. Stars come from `ProjectDefinition.RequiredFields`, «مقترح» from `ProjectsEndpoints.SuggestedFields` |
| المسار 1 Project definition | ملحق الشكل 5 · المسار 1 | `DModInformation` (edit mode) | `features/projects/project-form.page.ts` | `EP-PRJ-02` | ✅ built — **create only**; editing an existing project is SCR-W2's own edit mode, not a route (P-70). No draft/review track: removed at the client's instruction |
| SCR-W3 Contract | 04 §7 · **ملحق الأشكال 6–11** | الشكل 6 · الشكل 7 plates *(binding — they replace `DModContractNew` project-modules.jsx:363 for the register and the overview tab)* · `DContractAmendments` contract-amendments.jsx:301 *(v1.1)* | `features/contract-tab/contract.page.ts` | `EP-CON-01` · `EP-CON-02` | ✅ built — the amendment chain, and the approved-but-unapplied kept out of every total. **نظرة عامة is الشكل 7** (header strip · «22 % من كلفة العقد الكلية» with الإنجاز المادي ticked at المالي · collapsible تفصيل كلفة العقد); its denominator is كلفة العقد الكلية, closing `financial-pct` (P-76). The projection notice moved to الملاحق, which is الشكل 10's subject. **التفاصيل matches الشكل 8** field for field, star for star — verified, unchanged. **الدفعات is الشكل 9**: five columns, a صف إجمالي, and the Z8 payment panel (تفصيل الدفعة · المرفقات · تصدير الدفعة) that the tab never had; the status pill stays under the number because الإجمالي ≠ المصروف (P-78). **الملاحق والتعديلات is الشكل 10**: five collapsible sections (العقد النافذ · سجل التعديلات التعاقدية · أثر التعديلات على الغرامات · الكميات النافذة · الأنشطة النافذة), one chain table carrying the pending rows subdued (P-80), and the penalty as قبل/بعد/الفرق. **The client documents' penalty formula is not BR-10's — P-81, CONFIRM**. **سجل النشاط is الشكل 11**: one row per CHANGED FIELD with «القيمة السابقة مشطوبة ← الجديدة», and system events told apart from users’ (P-82 · P-83) |
| المسار 2 Contract definition | ملحق الشكل 8 · المسار 2 | `DModContractNew` (edit mode) | `features/contract-tab/contract-form.page.ts` | `EP-CON-03` · `EP-CON-04` · `EP-CON-05` | ✅ built — same shape as المسار 1. **Not yet reshaped to الشكل 8** the way SCR-W2 was to الشكل 5: five collapsible sections, stars and a «سجل النشاط» tab are the outstanding pass |
| SCR-W4 BOQ | 04 §4 · **ملحق الشكل 12** | `DBoqRegister` boq-register.jsx:435 · `DBoqAssign` boq-assign.jsx:11 *(v1.1)* | `features/boq/boq.page.ts` | `EP-BOQ-01` … `EP-BOQ-08` | ✅ built — weights sum to exactly 100.00; the first screen that writes four different things. **بطاقة البند is الشكل 12** (P-84): six tabs off the register row, the Σ basis note under the table, and the plate's three Z6 actions as stubs (P-85). السجل tab is named-not-drawn: no BOQ item event table exists |
| المسار 3 BOQ import | ملحق الشكل 13 · المسار 3 | — *(no reference component; the plate is the screen)* | `features/boq/boq-import.wizard.ts` | `EP-BOQ-09` · `EP-BOQ-10` · `EP-BOQ-11` | ✅ built — five steps, real column mapping, validation and comparison server-side. **Writes a VERSION and never the bill** (P-87). CSV/TSV parsed natively; `.xlsx` refused with the fix (P-86). Approval (المسار 3 steps 7–8) has no figure yet |
| SCR-W5 Schedule | 04 §5 | `DGantt` schedule-module.jsx:80 · `DSchedTable` :257 · `DModSchedule` :437 *(v1.1)* | `features/schedule/schedule.page.ts` | `EP-SCD-01` · `EP-SCD-02` | ✅ built — the WBS is a path string and the tree is built in the endpoint; criticality is a ring, never a colour |
| SCR-W6 Progress | 04 §3 · 02 §4 | `DModProgress` project-modules.jsx:1391 *(v1.1)* | `features/progress/progress.page.ts` | `EP-PRG-01` · `EP-PRG-02` | ✅ built — the only screen that MOVES progress; the reference calls its own a read-only dashboard (P-55) |
| SCR-W7 Financials | 04 §3 · **ملحق الشكل 14** | `DModFinancialNew` project-modules.jsx:907 *(v1.1)* | `features/financials/financials.page.ts` | `EP-FIN-01` | ✅ built — four figures per certificate, and paid ≠ certified everywhere (P-26). **جدول الكلف is الشكل 14**: one tree (contract → its three expense items, which partition it now — P-89), the plate's three column groups الموازنة/الفعلي/التنبؤ, a year filter, and the «أساسا القياس» box (P-91). **التخصيص السنوي is الشكل 15** (P-92): `ProjectAllocations` recorded, the spend derived per year, and the «أين تُحرَّر هذه القيم» rule stated on screen. **الدفعات is الشكل 16**: one row per FUNDING LETTER — a payment covering two contracts is one row with «عقدان» — and a Z8 panel splitting it contract → the three expense items (P-94 · P-95). **مهل التدقيق is الشكل 17** (P-97 · P-98 · P-99): `PaymentAuditStages` records the route, BR-12 times it against the data date, and the legal date is recorded not derived. **`EP-FIN-01` now has no `unavailable` entries.** Six tabs; two are الشكلان 18 · 19 and name what they need |
| SCR-W8 Change Orders | 03 §10 · **ملحق الشكل 29** | `DModVO` **vo-record.jsx:454** *(v1.1 — ROADMAP's project-modules.jsx:1142 is pre-v1.1)* | `features/change-orders/change-orders.page.ts` | `EP-CHG-01` | ✅ built — the first screen whose CONTENT depends on who is looking (BR-14). **The row now OPENS the record**; the stage column prints `03 §2`'s own six names since the fixture chain was corrected (P-100) |
| SCR-W8 CO record | 03 §9 · **ملحق الأشكال 30–34** | `DModVO` record half **vo-record.jsx:960** + `voRecord` :129 *(v1.1 — byte-identical to the LIVE prototype at infinite-azaiton.github.io/epm, verified)* | `features/change-orders/change-order.page.ts` | `EP-CHG-02` | ✅ built — six tabs on ONE read. **الملخص is الشكل 30** (معلومات الأمر · المدخلات السابقة · ملخص الأثر · أثر الأمر على العقد · ملخص القرار · تسع خطوات تطبيق — P-101). **الكميات والكلفة is الشكل 31**: one item row and THREE party rows per line, the 20% split spelled out per party, and BR-01 re-run for each column. **الأثر الزمني is الشكل 32** — requested · analysis · approved kept apart (P-102). **المسار is الشكل 33**: six stages with their own ceilings, external parties as statuses inside the owning stage, and «معدل دوران المعاملة» beside the age. **المرفقات is الشكل 34** with versions accumulating. **السجل** is `03 §9` tab 6, one row per CHANGED FIELD. Decisions and apply are 5.4 |
| SCR-W8 CO wizard | 03 §8 · **ملحق الأشكال 37–42** | `DVOCreateWizard` vo-wizard.jsx:6 | `features/change-orders/change-order.wizard.ts` | `EP-WIZ-01` · `EP-WIZ-02` · `EP-WIZ-03` | ✅ built — five steps over the register. **The contract is chosen first and scopes every list** (non-negotiable #1); step 2 carries BOTH proposals per line with the 20% split printed as الشكل 39's equation; step 5 renders the expected path from the ACTUAL conditions. **It computes nothing** — every figure comes from EP-WIZ-02 through the same domain code the record reads (P-106). Supply redistribution between beneficiaries (الشكل 58) needs الفقرات التجهيزية and is not built (P-110) |
| SCR-W8 CO workflow | 03 §2–6 | `DVOStageTimeline` project-modules.jsx:1120 | — | `EP-WFL-01` | ⬜ |
| SCR-W9 Risk | 04 §3 | `DModRisk` project-modules.jsx:1693 | — | `EP-RSK-01` | ⬜ |
| SCR-W10 3D Model | 07 §8 | `model-module.jsx` | — | `EP-MDL-01` | ⬜ stub |
| SCR-W11 Meetings | 04 §3 | `DModMeetings` project-modules.jsx:1365 | — | `EP-MTG-01` | ⬜ |
| SCR-W12 Documents | 04 §3 | `DModDrawings` project-modules.jsx:1396 | — | `EP-DOC-01` | ⬜ |
| SCR-W13 Alerts | 04 §3 | `DModAlerts` alerts-module.jsx:20 | — | `EP-PAL-01` | ⬜ |
| SCR-W14 Reports | 04 §3 | `DModReports` project-modules.jsx:1579 | — | `EP-PRP-01` | ⬜ |
| SCR-W15 Audit | 04 §3 | `DModAudit` project-modules.jsx:1727 | — | `EP-AUD-01` | ⬜ |

## Workspace access (BR-15)

`Domain/WorkspaceAccess` is the rule; `Features/Workspaces/WorkspaceScope` is how an
endpoint asks it; `Features/Dev/Personas` is the data it reads.
`grep -rn "BR-15" api web` returns every touchpoint.

| Layer | Where |
|---|---|
| The rule | `api/Epm.Api/Domain/WorkspaceAccess.cs` — `Visible` and `Allowed`, pure |
| Its tests | `api/Epm.Domain.Tests/WorkspaceAccessTests.cs` — 12 cases |
| The assignments | `api/Epm.Api/Features/Dev/Personas.cs` — `Workspaces` / `MinistryWide` |
| The guard | `api/Epm.Api/Features/Workspaces/WorkspaceScope.cs` — `Deny` · `Visible` · `Effective` |
| Guarded on `?workspace=` | `EP-PRJ-01` `EP-CNT-01` `EP-ALR-01` `EP-PRT-01` `EP-SCT-01` `EP-RPT-01` `EP-WSP-01` |
| Guarded on the project's workspace | `EP-OVW-01` `EP-INF-01` `EP-PRJ-03/04` `EP-CON-01/02` `EP-BOQ-01`…`08` `EP-SCD-01/02` `EP-PRG-01/02` `EP-FIN-01` `EP-CHG-01` `EP-CHG-02` `EP-WIZ-01` `EP-WIZ-02` `EP-WIZ-03` |
| Guarded on the workspace being CREATED in | `EP-PRJ-02` — a specialist may not plant a project in another university's register |
| Filtered, not guarded | `EP-ENT-01` — it IS the list of what you may open |
| The client | `core/workspaces.ts` `has()` + `ShellComponent.guardScope()` — corrects a bad `?ws=` before six requests each 403. Convenience, never the enforcement |

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
| `EP-WSP-01` | `GET /api/workspaces/{code}/overview` | `Features/Workspaces/WorkspacesEndpoints.cs` | `workspaces.api.ts` `overview()` | BR-00 · BR-09 · BR-15 | Workspaces · Projects · Contracts · ContractAmendments · Alerts || `EP-PRT-01` | `GET /api/portfolio` | `Features/Portfolio/PortfolioEndpoints.cs` | `portfolio.api.ts` `get()` | BR-00 · BR-09 | Projects · Contracts · ContractAmendments · Workspaces |
| `EP-DOCS-01` | `GET /api/docs/rules` | `Features/Docs/DocsEndpoints.cs` | — (Phase 7 `/docs` route) | BR-01…BR-14 | — (pure) |
| `EP-ALR-01` | `GET /api/alerts` | `Features/Alerts/AlertsEndpoints.cs` | `alerts.api.ts` `list()` | — | Alerts · Projects |
| `EP-ALR-02` | `POST /api/alerts/{id}/ack` | `Features/Alerts/AlertsEndpoints.cs` | `alerts.api.ts` `acknowledge()` | — | Alerts |
| `EP-SCT-01` | `GET /api/schedule-control` | `Features/ScheduleControl/ScheduleControlEndpoints.cs` | `schedule-control.api.ts` `list()` | BR-09 · BR-10 | Projects · Contracts · ContractAmendments · Workspaces |
| `EP-RPT-01` | `GET /api/reports` | `Features/Reports/ReportsEndpoints.cs` | `reports.api.ts` `list()` | — | Projects *(+ the `EpmDb` model itself, read as data — see P-38)* |
| `EP-OVW-01` | `GET /api/projects/{id}/overview` | `Features/Overview/OverviewEndpoints.cs` | `overview.api.ts` `get()` | BR-00 · BR-04 · BR-09 · BR-10 · BR-11 · P-53 | Projects · Contracts · ContractAmendments · Workspaces · Beneficiaries · Alerts · BoqItems · Activities · Payments |
| `EP-INF-01` | `GET /api/projects/{id}/information` | `Features/Information/InformationEndpoints.cs` | `information.api.ts` `get()` | BR-15 · `ProjectDefinition.RequiredFields` | Projects · Workspaces · Beneficiaries · ProjectActivityEvents |
| `EP-PRJ-02` | `POST /api/projects` | `Features/Projects/ProjectsEndpoints.cs` | `projects.api.ts` `create()` → `project-form.page.ts` | BR-15 · المسار 1 step 3 | Projects · ProjectActivityEvents *(**written**)* |
| `EP-PRJ-03` | `PUT /api/projects/{id}` | `Features/Projects/ProjectsEndpoints.cs` | `information.api.ts` `save()` → `information.page.ts` | BR-15 · المسار 1 step 3 | Projects · ProjectActivityEvents *(**written**)* |
| `EP-PRJ-04` | `GET /api/projects/{id}/definition` | `Features/Projects/ProjectsEndpoints.cs` | `information.api.ts` `definition()` → `information.page.ts` | BR-15 | Projects · Workspaces · ProjectActivityEvents |
| `EP-CON-01` | `GET /api/projects/{id}/contracts` | `Features/ContractTab/ContractEndpoints.cs` | `contract.api.ts` `register()` | BR-00 · BR-09 | Projects · Contracts · ContractAmendments · Payments |
| `EP-CON-02` | `GET /api/projects/{id}/contracts/{contractId}` | `Features/ContractTab/ContractEndpoints.cs` | `contract.api.ts` `detail()` | BR-04 · BR-09 · BR-10 · P-76 | Projects · Contracts · ContractAmendments · Payments · BoqItems · BoqRateBands · BoqActivityLinks · Activities |
| `EP-CON-03` | `POST /api/projects/{id}/contracts` | `Features/ContractTab/ContractEndpoints.cs` | `contract.api.ts` `create()` → `contract-form.page.ts` | BR-15 · المسار 2 | Contracts *(**written**)* |
| `EP-CON-04` | `PUT /api/projects/{id}/contracts/{contractId}` | `Features/ContractTab/ContractEndpoints.cs` | `contract.api.ts` `save()` → `contract-form.page.ts` | BR-15 · المسار 2 | Contracts *(**written**)* |
| `EP-CON-05` | `GET …/contracts/{contractId}/definition` | `Features/ContractTab/ContractEndpoints.cs` | `contract.api.ts` `definition()` → `contract-form.page.ts` | BR-15 | Projects · Contracts |
| `EP-BOQ-01` | `GET /api/projects/{id}/boq` | `Features/Boq/BoqEndpoints.cs` | `boq.api.ts` `gate()` | — | Projects · Contracts · BoqItems |
| `EP-BOQ-02` | `GET /api/projects/{id}/boq/{contractId}` | `Features/Boq/BoqEndpoints.cs` | `boq.api.ts` `register()` | BR-00 · BR-01 · BR-03 · BR-04 · BR-05 · BR-08 | Projects · Contracts · BoqItems · BoqRateBands · BoqActivityLinks · BoqDistributions · Activities |
| `EP-BOQ-03` | `PUT …/boq/{contractId}/items/{code}` | `Features/Boq/BoqEndpoints.cs` | `boq.api.ts` `saveItem()` | BR-05 · BR-08 | BoqItems · BoqRateBands · BoqDistributions |
| `EP-BOQ-04` | `DELETE …/boq/{contractId}/items/{code}` | `Features/Boq/BoqEndpoints.cs` | `boq.api.ts` `deleteItem()` | BR-01 | BoqItems · BoqDistributions · BoqActivityLinks · BoqRateBands |
| `EP-BOQ-05` | `GET …/items/{code}/distribution` | `Features/Boq/BoqEndpoints.cs` | `boq.api.ts` `distribution()` | BR-08 | Projects · BoqItems · BoqDistributions · Beneficiaries |
| `EP-BOQ-06` | `PUT …/items/{code}/distribution` | `Features/Boq/BoqEndpoints.cs` | `boq.api.ts` `saveDistribution()` | BR-08 | Projects · BoqItems · BoqDistributions · Beneficiaries |
| `EP-BOQ-07` | `GET …/boq/{contractId}/assignment` | `Features/Boq/BoqEndpoints.cs` | `boq.api.ts` `assignment()` | BR-02 · BR-03 | Contracts · BoqItems · BoqRateBands · BoqActivityLinks · Activities |
| `EP-BOQ-08` | `PUT …/items/{code}/allocation` | `Features/Boq/BoqEndpoints.cs` | `boq.api.ts` `saveAllocation()` | BR-03 | BoqItems · BoqActivityLinks · Activities |
| `EP-BOQ-09` | `POST …/boq/{contractId}/import/preview` | `Features/Boq/BoqImportEndpoints.cs` | `boq-import.api.ts` `preview()` | BR-01 · `Domain/BoqImport` | Projects · Contracts · BoqItems *(read only)* |
| `EP-BOQ-10` | `POST …/boq/{contractId}/import/submit` | `Features/Boq/BoqImportEndpoints.cs` | `boq-import.api.ts` `submit()` | `Domain/BoqImport` · المسار 3 step 6 | BoqImportVersions · BoqImportVersionItems *(**written**)* · BoqItems *(read)* |
| `EP-BOQ-11` | `GET …/boq/{contractId}/import/versions` | `Features/Boq/BoqImportEndpoints.cs` | `boq-import.api.ts` `versions()` → `boq.page.ts` | — | BoqImportVersions |
| `EP-SCD-01` | `GET /api/projects/{id}/schedule` | `Features/Schedule/ScheduleEndpoints.cs` | `schedule.api.ts` `gate()` | — | Projects · Contracts · Activities |
| `EP-SCD-02` | `GET /api/projects/{id}/schedule/{contractId}` | `Features/Schedule/ScheduleEndpoints.cs` | `schedule.api.ts` `get()` | BR-02 · BR-04 | Projects · Contracts · Activities |
| `EP-PRG-01` | `GET /api/projects/{id}/progress` | `Features/Progress/ProgressEndpoints.cs` | `progress.api.ts` `get()` | BR-00 · BR-04 · BR-09 · BR-10 · BR-11 · P-53 | Projects · Contracts · ContractAmendments · Activities · BoqItems · BoqRateBands · BoqActivityLinks · Payments |
| `EP-PRG-02` | `PUT …/progress/activities/{activityId}` | `Features/Progress/ProgressEndpoints.cs` | `progress.api.ts` `saveProgress()` | BR-04 · P-53 | Activities *(**written**)* |
| `EP-CHG-01` | `GET /api/projects/{id}/change-orders` | `Features/ChangeOrders/ChangeOrdersEndpoints.cs` | `change-orders.api.ts` `list()` | BR-12 · BR-14 | Projects · Contracts · ChangeOrders · ChangeOrderStages · ChangeOrderAttachments |
| `EP-WIZ-01` | `GET /api/projects/{id}/change-orders/new` | `Features/ChangeOrders/ChangeOrderWizardEndpoints.cs` | `change-orders.api.ts` `wizardSource()` → `change-order.wizard.ts` | BR-01 · BR-04 · BR-09 | Projects · Contracts · ContractAmendments · BoqItems · BoqRateBands · BoqActivityLinks · BoqDistributions · Activities |
| `EP-WIZ-02` | `POST /api/projects/{id}/change-orders/preview` | `Features/ChangeOrders/ChangeOrderWizardEndpoints.cs` | `change-orders.api.ts` `preview()` → `change-order.wizard.ts` | BR-01 · BR-05 · BR-06 · BR-07 · BR-13 | *(reads only)* Contracts · ContractAmendments · BoqItems · Activities |
| `EP-WIZ-03` | `POST /api/projects/{id}/change-orders?kind=draft|submit` | `Features/ChangeOrders/ChangeOrderWizardEndpoints.cs` | `change-orders.api.ts` `create()` → `change-order.wizard.ts` | BR-07 · BR-13 | **writes** ChangeOrders · ChangeOrderLines · ChangeOrderActivities · ChangeOrderStages · ChangeOrderAttachments · ChangeOrderAuditEntries |
| `EP-CHG-02` | `GET /api/projects/{id}/change-orders/{no}` | `Features/ChangeOrders/ChangeOrdersEndpoints.cs` | `change-orders.api.ts` `record()` → `change-order.page.ts` | BR-01 · BR-05 · BR-06 · BR-09 · BR-10 · BR-12 · BR-13 · BR-14 | Projects · Contracts · ContractAmendments · ChangeOrders · ChangeOrderLines · ChangeOrderActivities · ChangeOrderStages · ChangeOrderExternalParties · ChangeOrderApplySteps · ChangeOrderAttachments · ChangeOrderAuditEntries · BoqItems · Activities |
| `EP-FIN-01` | `GET /api/projects/{id}/financials` | `Features/Financials/FinancialsEndpoints.cs` | `financials.api.ts` `get()` | BR-00 · BR-04 · BR-09 · BR-11 · P-53 | Projects · Contracts · ContractAmendments · Payments · BoqItems · Activities |

## Business rules

`02-BUSINESS-RULES.md` §n → exactly one file in `api/Epm.Api/Domain/`.

| ID | Rule | Spec | File | Tests | Status |
|---|---|---|---|---|---|
| BR-00 | Project value = Σ contract values | 01 §3 | `Domain/ProjectValue.cs` | `ProjectValueTests` | ✅ **now receives EFFECTIVE values** (Phase 2.1) |
| BR-01 | BOQ weight, largest-remainder to 100.00% | 02 §1 | `Domain/BoqWeights.cs` | `BoqWeightsTests` | ✅ **on screen** (Phase 4.2) — SCR-W4's weight column |
| BR-02 | Schedule weights, absolute + relative | 02 §2 | `Domain/ScheduleWeights.cs` | `ScheduleWeightsTests` | ✅ **on screen** (Phase 4.2) — the cost / man-hours basis · **both weights on screen** (Phase 4.3): SCR-W5's WBS tree is the first place `Relative` has a parent that is not the contract |
| BR-03 | BOQ↔Activity allocation share | 02 §3 | `Domain/Allocation.cs` | `AllocationTests` | ✅ (see P-15) · **`AbsoluteWeight()` added** (Phase 4.2) |
| BR-04 | Progress reflection, schedule → BOQ | 02 §4 | `Domain/ProgressReflection.cs` | `ProgressReflectionTests` | ✅ **`Rollup()` added** (Phase 4.2) — the contract/division total · **rolls up the WBS tree** (Phase 4.3), by weight and not by duration (P-51) |
| BR-05 | **The 20% rule** | 02 §5 | `Domain/TierSplit.cs` | `TierSplitTests` | ✅ **`Effective()` added** (Phase 4.2) — what a banded line IS · **split THREE TIMES per line** (Phase 5.2) — الشكل 31 prints the contractor's, the RE department's and the approved column from the same function, and only the excess carries a proposed rate |
| BR-06 | Two proposals, one approved value | 02 §6 | `Domain/Proposals.cs` | `ProposalsTests` | ✅ |
| BR-07 | Change-order validation gates | 02 §7 | `Domain/ChangeOrderGates.cs` | `ChangeOrderGatesTests` | ✅ |
| BR-08 | Quantity distribution to beneficiaries | 02 §8 | `Domain/Distribution.cs` | `DistributionTests` | ✅ **on screen** (Phase 4.2) — the drawer caps every input; gates 2 and 4 checked in `EP-BOQ-06` |
| BR-09 | Contract amendment + effective values | 02 §9 | `Domain/Amendments.cs` | `AmendmentsTests` | ✅ (see P-16) |
| BR-10 | Delay penalty, 0.1%/day capped 10% | 02 §10 | `Domain/Penalty.cs` | `PenaltyTests` | ✅ **`DelayDays()` exposed** (Phase 2.5) — SCR-E5 shows the same days the penalty is charged on · **`Result.PerDay` reaches a screen** (الشكل 10) — ⚠️ **the client documents state a DIFFERENT formula (value ÷ duration × 10%); see P-81, unresolved** |
| المسار 3 | BOQ import: validate + compare | المسار 3 · الشكل 13 | `Domain/BoqImport.cs` | `BoqImportTests` (12) | ✅ **added** (الشكل 13) — the four checks المسار 3 names, and the added/removed/changed diff the wizard shows before submission |
| BR-11 | Earned value | 02 §11 | `Domain/EarnedValue.cs` | `EarnedValueTests` | ✅ **on screen** (Phase 4.4) — SCR-W6, SCR-W7 and SCR-W1, all from ONE call so no two can disagree |
| BR-12 | Lead time + SLA | 02 §12 | `Domain/SlaLeadTime.cs` | `SlaLeadTimeTests` | ✅ **on screen** (Phase 5.1) — the register's overdue chip, SLA chip and average-cycle indicator |
| BR-13 | Six-stage workflow machine | 03 §2,5,6 | `Domain/WorkflowMachine.cs` | `WorkflowMachineTests` | ✅ **on screen** (Phase 5.2) — الشكل 33's trail reads `Stages` for its names, owners and notes, and the FIXTURE seeds from the same table (P-100). `ApplyChecklist` became الشكل 30's nine (P-101) |
| BR-14 | Viewer relation + action gating | 03 §7 | `Domain/ViewerRelation.cs` | `ViewerRelationTests` | ✅ **on screen** (Phase 5.1) — every row carries its relation and `CanAct`, resolved SERVER-side from the persona |
| D-07 | Largest-remainder rounding | 02 §1 | `Domain/Rounding.cs` | `RoundingTests` | ✅ |
| P-101 | **The record's four columns** — الشكل 31's per-party split, BR-01 re-run per column, الشكل 32's finish dates and الشكل 30's decision difference | 03 §9 · ملحق 30–32 *(arrangement of BR-01 · BR-05 · BR-06)* | `Domain/ChangeOrderRecord.cs` | `ChangeOrderRecordTests` | ✅ **added** (Phase 5.2) — 14 cases, the worked figures read off الشكل 31 itself |
| P-53 | **Planned progress** — the input BR-11 needs and `02` never defines | — *(assumption)* | `Domain/PlannedProgress.cs` | `PlannedProgressTests` | ✅ **added** (Phase 4.4) — linear across each activity's own baseline; also owns the remaining-duration formula |

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
| `Beneficiaries` | Phase 3 | `EP-OVW-01` — resolves the `Projects.BeneficiaryCodes` CSV (01 §2.1) |
| `Payments` | Phase 4.1 | `EP-CON-01` · `EP-CON-02` · `EP-FIN-01` · `EP-PRG-01` · `EP-OVW-01` — the first table that can say what was actually paid |
| `BoqItems` | Phase 4.2 | `EP-BOQ-01` … `EP-BOQ-08` — **written** by `EP-BOQ-03` / `EP-BOQ-04` |
| `BoqRateBands` | Phase 4.2 | `EP-BOQ-02` · `EP-BOQ-03` · `EP-BOQ-05` — read only; Phase 5.4 writes a band |
| `BoqDistributions` | Phase 4.2 | `EP-BOQ-02` · `EP-BOQ-05` — **written** by `EP-BOQ-06` |
| `BoqActivityLinks` | Phase 4.2 | `EP-BOQ-02` · `EP-BOQ-07` — **written** by `EP-BOQ-08` |
| `BoqImportVersions` | الشكل 13 | `EP-BOQ-11` — **written** by `EP-BOQ-10`. A submitted bill lives here and NOWHERE in `BoqItems` (P-87) |
| `BoqImportVersionItems` | الشكل 13 | — **written** by `EP-BOQ-10`; read when approval is built (المسار 3 steps 7–8) |
| `PaymentAuditStages` | الشكل 17 | `EP-FIN-01` — one row per desk a certificate passes. Written by المسار 8 when the payment workflow is built; seeded by `Fixture.AuditStages` until then |
| `ProjectAllocations` | الشكل 15 | `EP-FIN-01` — the yearly release. Written by الشكل 18 when that tab is built; seeded by `Fixture.Allocations` until then |
| `ChangeOrders` | Phase 5.1 | **written** by `EP-WIZ-03` · `EP-CHG-01` · `EP-CHG-02` — gained `AnalysisDays` (P-102) and the two preceding letters (P-103) in 5.2 |
| `ChangeOrderLines` | Phase 5.1 | **written** by `EP-WIZ-03` · `EP-CHG-02` — the four column sets الشكل 31 compares |
| `ChangeOrderActivities` | Phase 5.1 | **written** by `EP-WIZ-03` · `EP-CHG-02` — الشكل 32's affected activities |
| `ChangeOrderStages` | Phase 5.1 | **written** by `EP-WIZ-03` (BR-13 plans all six on submit; a draft gets none — P-109) · `EP-CHG-01` · `EP-CHG-02` — BR-14 resolves the relation off this chain; names and owners come from `WorkflowMachine.Stages` (P-100) |
| `ChangeOrderAttachments` | Phase 5.1 | `EP-CHG-01` (count) · `EP-CHG-02` (الشكل 34 — versions accumulate, files are never replaced) |
| `ChangeOrderApplySteps` | Phase 5.2 | `EP-CHG-02` — what each of الشكل 30's nine steps DID. The list itself is `WorkflowMachine.ApplyChecklist` (P-101) |
| `ChangeOrderExternalParties` | Phase 5.2 | `EP-CHG-02` — statuses INSIDE the owning stage (`03 §3`), never stages |
| `ChangeOrderAuditEntries` | Phase 5.2 | **written** by `EP-WIZ-03` (create · submit) · `EP-CHG-02` — one row per CHANGED FIELD, previous → new |
| `ContractActivityEvents` | المسار 2 | `EP-CON-02` · `EP-CON-05` — **written** by `EP-CON-03` / `EP-CON-04`, one row per CHANGED FIELD since الشكل 11 (P-82). Seeded by `Fixture.ContractActivity` so the tab has a history before anyone edits anything |
| `Activities` | Phase 4.2 | **written** by `EP-PRG-02` (progress + remaining duration) · `EP-BOQ-02` · `EP-BOQ-07` · `EP-SCD-01` · `EP-SCD-02` · `EP-SCT-01` — registered in 4.2 because BR-03 and BR-04 both read it; **4.3 restored the columns 4.2 pruned** (baseline / actual / forecast dates, durations, float, `IsCritical`, calendar, predecessors) |
