# CO-09 — Audit, Versioning, Traceability

id: CO-09  
title: Add CO audit trail and versioning  
anchor: EP-CO-09  
status: DONE

## Workflow
```txt
Workflow({ 
  name: "plan-build-qa", 
  args: { 
    task: "Add CO audit trail and versioning", 
    context: "Create immutable event log for each state transition, amount recalculation run, BOQ link edit, approval action, and apply action. Store actor, role, timestamp, before/after snapshots, and traceability anchor tags per event. Add versioned change history per Change Order and line. Traceability anchor: EP-CO-09. If versioning expectations are unclear, use legacy `emp`."
  } 
})
```
