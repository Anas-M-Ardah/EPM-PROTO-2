# Handoff: EPM — Enterprise Project Management (Phase 1) POC

**Client:** Ministry of Higher Education & Scientific Research (Iraq) — Reconstruction & Projects Department
**Purpose of this bundle:** everything Claude Code needs to build a POC that doubles as the **running documentation** of the system.

---

## 1. What this is

`reference/EPM Prototype.html` is a working, high-fidelity, bilingual (Arabic-RTL primary / English-LTR) prototype. It is the **agreed specification of business behaviour** for Phase 1 — it encodes the ministry's real change-order process, the 20% pricing rule, contract amendment versioning, BOQ↔activity weight allocation, and the delegated-authority model, all validated with the client over many review rounds.

**The HTML is a design and behaviour reference, not production code.** Do not lift it into the product. The task is to re-implement it in a real stack (see `07-POC-BUILD-PLAN.md`) with a real data layer, while preserving every rule in `02-BUSINESS-RULES.md` and every state transition in `03-CHANGE-ORDER-PROCESS.md`.

## 2. Fidelity

**High-fidelity.** Colours, type scale, spacing, density, component anatomy and interaction states are final and have been through a formal accessibility and consistency audit (see `05-DESIGN-SYSTEM.md` §7 — the audit rules are binding, not advisory). Recreate the UI faithfully using the target stack's component library, mapping the tokens in §1 of that document.

What is **simulated** in the prototype and must become real in the POC:

| Simulated today | Required in the POC |
|---|---|
| Primavera P6 XER/XML parsing | Real parse → WBS + activities + budgeted cost/man-hours |
| BOQ / distribution Excel import | Real parse + the documented validation gates |
| Workflow persistence | Real state machine, persisted, with audit rows |
| Auth, roles, delegation | Real identity + the permission model in `03` §7 |
| Email / SMS escalation | Real notification dispatch |
| 3D/BIM viewer | Deferred — keep the tab, stub the viewer |

## 3. The "running documentation" requirement

The client's ask: *the POC is the reference for the final build.* So the POC is not a throwaway demo. Build it so that **the specification and the running system cannot drift apart**:

1. **Rules live in one place.** Every formula in `02-BUSINESS-RULES.md` becomes exactly one pure, exported function in a `domain/` layer — no rule duplicated in a component, a query, or a report.
2. **Each rule function carries its spec.** Docstring = the rule statement + the worked example from this bundle. Those examples become the unit tests. A rule change that breaks the documented example fails CI.
3. **A `/docs` route inside the running app** renders the domain documentation from the same source: the rule text, its inputs, and a live worked example computed by the real function. Reviewers read the spec and see the system execute it on the same page.
4. **Seed data is a fixture, not a demo hack.** The scenario in `06-DATA-DICTIONARY.md` §8 exercises every state — six change orders spanning draft/pending/returned/approved/applying/closed, one order that trips the 20% rule, one that exceeds a quarter of the contract duration, one failed application. Keep it as the demo dataset *and* the integration-test fixture.
5. **Decisions are recorded.** `DECISIONS.md` in the new repo, one entry per business-rule question resolved, so the final build inherits the reasoning and not just the code.

## 4. Read in this order

| File | Contents |
|---|---|
| `01-DOMAIN-MODEL.md` | Entity hierarchy, every entity's fields, relationships, invariants |
| `02-BUSINESS-RULES.md` | Every calculation, with formula + worked example + edge cases |
| `03-CHANGE-ORDER-PROCESS.md` | The A–Z process: wizard → 6 stages → external parties → decisions → apply → amendment |
| `04-SCREENS.md` | Screen inventory, layout, component anatomy, empty/error states |
| `05-DESIGN-SYSTEM.md` | Tokens, type scale, components, RTL rules, accessibility contract |
| `06-DATA-DICTIONARY.md` | Enumerations and value lists, bilingual, with codes |
| `07-POC-BUILD-PLAN.md` | Stack, milestones, acceptance criteria, test strategy |
| `screenshots/` | 22 captures of the real screens, indexed and cross-referenced to the specs |
| `CLAUDE.md` | Drop into the new repo root — standing instructions for Claude Code |

## 5. Non-negotiables

These came from client review and are the ones most likely to be "simplified" by mistake:

1. **Contract is the working context.** A BOQ item and an activity each belong to exactly one contract. The project is derived from the contract and never asked for again. One change order may never span two contracts.
2. **Approved ≠ Applied ≠ Closed.** Approving a change order changes nothing. Applying it creates a contract amendment and moves quantities, dates and the penalty baseline. Closing it verifies the application.
3. **The 20% rule is per BOQ line, not per order.** Up to 20% of the *original* quantity moves at the original rate; only the excess may be re-priced.
4. **Two proposals, one decision.** Contractor and RE department each propose; the RE department's figure governs the display; the *approved* value comes only from the pricing committee's decision, entered during financial review.
5. **External parties are statuses, not stages.** The contractor, consultant, minister, finance directorate and contracts section are not system users. Their outcome is recorded inside the owning stage by a delegated system user, against an official letter number and date.
6. **Never overwrite original values.** Original, before-change, requested, approved and applied values all persist.
7. **Bilingual RTL-first.** Arabic is the primary language, not a translation layer. Every number, date, ID and currency string needs bidi isolation.

## 6. Files in this bundle

```
design_handoff_epm_poc/
├── README.md                     ← you are here
├── CLAUDE.md                     ← copy to the new repo root
├── 01-DOMAIN-MODEL.md
├── 02-BUSINESS-RULES.md
├── 03-CHANGE-ORDER-PROCESS.md
├── 04-SCREENS.md
├── 05-DESIGN-SYSTEM.md
├── 06-DATA-DICTIONARY.md
├── 07-POC-BUILD-PLAN.md
├── screenshots/
│   ├── README.md                 ← index, each shot mapped to its spec section
│   └── 01…22-*.png               ← Arabic RTL captures of every key screen
└── reference/
    ├── EPM Prototype.html        ← open this in a browser to explore
    ├── app/                      ← behaviour reference (React via in-browser Babel)
    └── styles/                   ← tokens + layered CSS
```

Open `reference/EPM Prototype.html` in a browser first and click through the change-order module — the process documents will read much faster afterwards. `screenshots/README.md` maps every capture to the spec section that describes it.
