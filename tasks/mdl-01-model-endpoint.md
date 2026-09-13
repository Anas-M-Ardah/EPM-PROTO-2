# MDL-01 — 3D model endpoint contract

id: MDL-01  
title: Implement 3D model data contract on backend  
anchor: EP-MDL-01  
status: DONE

## Workflow
```txt
Workflow({ 
  name: "plan-build-qa", 
  args: { 
    task: "Implement 3D model backend contract", 
    context: "Implement `GET /api/projects/{projectId}/model` for `EP-MDL-01` in `api/Epm.Api/Features/Model/ModelEndpoints.cs` and `ModelDto.cs`. Return the project model payload exactly as documented: project-scoped `ModelVersions` (`ordered desc`, with current marker), lookup chips for `doc-discipline` and `activity-status`, and model elements grouped for the tree as Building -> Level -> Discipline -> Code (P-121). Resolve BOQ and activity links only within the same ContractId. Include model element fields needed by UI with names that will match `model.types.ts` verbatim (`IsCritical`, `BoqCode`, `ActivityCode`, etc.). Keep endpoint read-only and keep behavior aligned with the stub rule: no geometry persistence, no status writes, no uploads, no re-issue workflow."
  } 
})
```
