# Screenshots

Captured from `reference/EPM Prototype.html` in **Arabic RTL** (the primary direction) at a desktop viewport. They show the intended look and the real seeded data — use them alongside the written specs, not instead of them.

> The capture re-renders the DOM, so a few gradients and shadows differ slightly from the live prototype. Open the HTML for anything pixel-critical.

## Enterprise level

| File | Screen | Spec |
|---|---|---|
| `01-portfolio.png` | Executive Portfolio — KPI strip, status donut, cost bars | `04` §2 |
| `02-projects.png` | Projects — cross-portfolio list | `04` §2 |
| `03-schedule-control.png` | Schedule Control — portfolio schedule health | `04` §2 |
| `04-alerts-center.png` | Alerts Center — severity KPIs + feed | `04` §2 |

## Project workspace

| File | Screen | Spec |
|---|---|---|
| `05-workspace-overview.png` | Overview tab — 3-pane workspace shell | `04` §3 |
| `06-contract-tab.png` | Contract tab — amendments, penalties | `04` §7 |
| `07-schedule-gantt.png` | Schedule — Gantt, resizable columns, cost/man-hours basis, critical-path ring | `04` §5 |
| `08-progress.png` | Progress — EVM, S-curve | `02` §11 |

## BOQ (contract-scoped)

| File | Screen | Spec |
|---|---|---|
| `09-boq-empty-state.png` | **Empty state before a contract is chosen** — "اختر عقداً للبدء" | `01` §1, `04` §9 |
| `10-boq-register.png` | Register with the contract context header, weights, executed % | `02` §1, `04` §4 |
| `11-boq-activity-assignment.png` | BOQ↔activity allocation driven by absolute weight | `02` §3–§4 |
| `12-boq-distribution.png` | Quantity distribution to beneficiaries | `02` §8 |

## Change order — register and record

| File | Screen | Spec |
|---|---|---|
| `13-vo-register.png` | Register — indicators, workflow-state filters, persona switcher | `03` §10 |
| `14-vo-record-summary.png` | Record → الملخص, with the viewer-relation banner and gated actions | `03` §7, §9 |
| `15-vo-record-quantities-cost.png` | Record → الكميات والكلفة — Before / Requested / Approved / Applied | `03` §9 |
| `16-vo-record-workflow.png` | Record → المسار — six stages, external parties, delegates | `03` §2–§4 |
| `17-vo-record-audit.png` | Record → السجل — audit trail with previous → new values | `03` §9 |

## Change-order wizard (5 steps)

| File | Step | Spec |
|---|---|---|
| `18-wizard-1-type-letter.png` | 1 — type, official letter, **contract selected first** | `03` §8 |
| `19-wizard-2-items-changes.png` | 2 — BOQ items / activities tabs, **20%-rule note** | `03` §8, `02` §5 |
| `20-wizard-3-impact.png` | 3 — impact summary, two proposals, approved value pending | `02` §6 |
| `21-wizard-4-attachments.png` | 4 — attachments | `03` §8 |
| `22-wizard-5-review-submit.png` | 5 — review, expected approval path, حفظ كمسودة / إرسال للمراجعة | `03` §8 |

## Not captured

- **Amendment history drawer** (`DAmdPanel`) — specified in `04` §6; open the prototype, go to BOQ with a contract selected, and click an amendment badge on a code cell.
- **English LTR** — every screen mirrors; the language switch is in the command bar.
- **Focus mode** for the *awaiting me* queue — persona switcher → any party with a pending stage.
