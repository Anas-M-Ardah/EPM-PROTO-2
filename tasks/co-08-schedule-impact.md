# CO-08 — Schedule Impact and Delay Propagation

id: CO-08  
title: Compute and apply schedule impact  
anchor: EP-CO-08  
status: DONE

## Workflow
```txt
Workflow({ 
  name: "plan-build-qa", 
  args: { 
    task: "Compute CO schedule impact", 
    context: "Model schedule impact for Change Order lines: activity delay, milestone shift, and project-level delay propagation. Keep schedule calculations dynamic, and avoid writing derived schedule totals as source-of-truth. Include validation for critical-path and overlapping-item conflicts. Traceability anchor: EP-CO-08. If schedule propagation rules are missing, use legacy `emp`."
  } 
})
```
