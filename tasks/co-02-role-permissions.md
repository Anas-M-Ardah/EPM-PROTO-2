# CO-02 — Role-Based Transition Permissions

id: CO-02  
title: Enforce role-based Change Order permissions  
anchor: EP-CO-02  
status: DONE

## Workflow
```txt
Workflow({ 
  name: "plan-build-qa", 
  args: { 
    task: "Enforce role-based Change Order permissions", 
    context: "Define role matrix for each transition and edit action in Change Order lifecycle (creator, resident engineer, committee member, pricing specialist, approver, execution owner). Validate permissions on create, draft edits, submit, review, approve/reject, apply, and close. Persist audit metadata for denied transitions and blocked edits. Traceability anchor: EP-CO-02. If role definitions are underspecified, use legacy `emp`."
  } 
})
```
