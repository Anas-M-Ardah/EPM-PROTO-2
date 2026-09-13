# CO-04 — Threshold-Based Pricing Rule

id: CO-04  
title: Implement 20% threshold pricing rule  
anchor: EP-CO-04  
status: DONE

## Workflow
```txt
Workflow({ 
  name: "plan-build-qa", 
  args: { 
    task: "Implement threshold-based CO pricing", 
    context: "Implement pricing engine that applies the documented threshold behavior: within accepted delta boundaries, continue with contract pricing; beyond threshold, route for price fixing and apply committee-approved unit price. Ensure all computations are deterministic and auditable and do not persist computed total deltas as source data. Traceability anchor: EP-CO-04. If threshold boundaries are contradictory, use legacy `emp`."
  } 
})
```
