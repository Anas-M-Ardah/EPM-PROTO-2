# MDL-02 — 3D page behavior and shell integration

id: MDL-02  
title: Implement 3D Model page structure and navigation  
anchor: EP-MDL-01  
status: DONE

## Workflow
```txt
Workflow({ 
  name: "plan-build-qa", 
  args: { 
    task: "Build 3D page UI and navigation behavior", 
    context: "Create/update the project feature page in `web/src/app/features/model/` so `/projects/{projectId}/model` is a real section with load/error/empty/db states, always-selected element, tree + details layout, and filter controls for discipline and status. Keep `model.api.ts` and `model.types.ts` aligned with backend payloads, and wire BOQ/activity deep links using `contractId` so clicking linked entities routes without losing contract scope. Preserve existing design-system tokens and component primitives (no component-scoped CSS), and keep all computation in display formatting only."
  } 
})
```
