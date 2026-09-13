# CO-01 — Change Order State Machine

id: CO-01  
title: Implement Change Order state machine  
anchor: EP-CO-01  
status: DONE

Implementation note: Persisted `co-lifecycle` values remain compatible with existing orders. Submitted, Under Review, Executed, and Closed are distinct derived workflow phases exposed in the register response; the six-stage transition and permission rules remain server-owned.

## Workflow
```txt
Workflow({ 
  name: "plan-build-qa", 
  args: { 
    task: "Implement Change Order state machine", 
    context: "Build lifecycle states and transitions for Change Orders: Draft, Submitted, Under Review, Approved, Rejected, Executed, Closed. Enforce documented approval sequence (resident engineer study, change committee, pricing fix when threshold applies, authorization/supplement, execution), role-based transition guards, and immutable core fields after non-draft states. Keep Approved, Applied, and Closed distinct with immutable semantics. Traceability anchor: EP-CO-01. If behavior diverges from provided docs, use legacy `emp`."
  } 
})
```
