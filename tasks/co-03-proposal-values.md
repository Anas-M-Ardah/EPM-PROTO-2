# CO-03 — Dual Proposal Values and Approval Split

id: CO-03  
title: Model dual proposal value inputs  
anchor: EP-CO-03  
status: DONE

## Workflow
```txt
Workflow({ 
  name: "plan-build-qa", 
  args: { 
    task: "Model dual proposal values", 
    context: "Create Change Order line-item schema to hold contractor proposal, engineer proposal, and approved value. Preserve both proposal streams through review gates and expose pending vs approved value for committee and budget stakeholders. Keep approved value as governance output only after workflow review. Traceability anchor: EP-CO-03. If field semantics differ by legacy behavior, use legacy `emp`."
  } 
})
```
