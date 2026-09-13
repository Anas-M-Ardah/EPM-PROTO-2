# MDL-03 — 3D stub scene and production text

id: MDL-03  
title: Implement 3D stub scene behavior, criticality markers, and locale text  
anchor: EP-MDL-01  
status: DONE

## Workflow
```txt
Workflow({ 
  name: "plan-build-qa", 
  args: { 
    task: "Deliver 3D tab usability for stubbed viewer state", 
    context: "Implement the viewer placeholder block in the 3D page as a deliberately explicit stub (text that says it is a placeholder as required by 07 §8 / P-120), with matching Arabic/English labels in `core/lang.ts` and no impression that real BIM exists. Add status/discipline chips and criticality marks through existing shared styling tokens and add `epm-model-mark` behavior that uses ring and color channel only for criticality/status semantics. Update `Features/Dev/Fixture.cs` model seed data (ModelElements + ModelVersions) so the section has meaningful sample values and tree depth for manual QA."
  } 
})
```
