# CO-05 — Impact Calculator Without Derived Persistence

id: CO-05  
title: Build CO impact calculator service  
anchor: EP-CO-05  
status: DONE

## Workflow
```txt
Workflow({ 
  name: "plan-build-qa", 
  args: { 
    task: "Build CO impact calculator service", 
    context: "Develop a domain service to compute unit-rate delta, quantity delta, line total delta, cost impact, and schedule impact from immutable source fields at runtime. Prohibit persistence of derived totals and totals-by-aggregation fields. Add validation for negative, zero, and rollback-safe recalculation scenarios. Traceability anchor: EP-CO-05. If deterministic formulas are not found in docs, use legacy `emp`."
  } 
})
```
