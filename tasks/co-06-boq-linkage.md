# CO-06 — BOQ Lineage and Variance Tracking

id: CO-06  
title: Add BOQ linkage and variance tracking  
anchor: EP-CO-06  
status: DONE

## Workflow
```txt
Workflow({ 
  name: "plan-build-qa", 
  args: { 
    task: "Add BOQ linkage and variance tracking", 
    context: "Enable Change Order items to reference parent BOQ items and persist relationship metadata. Track original baseline, contractor proposed, engineer proposed, approved, and applied values per BOQ line with pending vs approved variance. Ensure no derived values are stored as authoritative totals. Traceability anchor: EP-CO-06. If BOQ relationship semantics are ambiguous, use legacy `emp`."
  } 
})
```
