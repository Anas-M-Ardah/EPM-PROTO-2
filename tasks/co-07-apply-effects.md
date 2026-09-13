# CO-07 — Execution Apply Effects

id: CO-07  
title: Implement change order application effects  
anchor: EP-CO-07  
status: DONE

## Workflow
```txt
Workflow({ 
  name: "plan-build-qa", 
  args: { 
    task: "Implement Change Order apply effects", 
    context: "Implement deterministic apply workflow that updates contract value, BOQ quantities, prices, and weight records only when execution/Applied transition succeeds. Keep Approved as financial validation only, not auto-mutating contracts, and enforce idempotent application with rollback-safe guards. Traceability anchor: EP-CO-07. If apply semantics are unclear, use legacy `emp`."
  } 
})
```
