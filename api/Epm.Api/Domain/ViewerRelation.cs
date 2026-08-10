namespace Epm.Api.Domain;

/// <summary>
/// BR-14 · 03 §7 — viewer relation and action gating.
///
/// rule: for any order and any viewer, resolve EXACTLY ONE relation and drive
///       the whole action UI from it.
/// spec: awaiting (owns the current stage) · recorder (delegate, external party
///       pending) · acted · upcoming · none.
/// example: the rate-fixing committee viewing an order sitting at stage 2 with
///          stage 3 applicable → upcoming, read-only.
///
/// Approve / reject / return / cancel / resubmit / apply / advance render ONLY
/// for `awaiting` or `recorder`. Otherwise show the explicit locked note —
/// لا إجراءات متاحة لهذه الصفة — never a bare disabled button.
///
/// This is the whole authorisation model for a change order. The identity is
/// fake (persona header, P-05); the model resolved here is real and server-side.
/// </summary>
public static class ViewerRelation
{
    /// <param name="lifecycle">06 §7 co-lifecycle.</param>
    /// <param name="currentStageOwner">null when the order has left the chain.</param>
    /// <param name="executionStageOwner">Owner of the last applicable stage — runs the application.</param>
    public static string For(
        string viewerParty,
        bool viewerIsDelegate,
        string lifecycle,
        string? currentStageOwner,
        string? executionStageOwner,
        IReadOnlyList<string> doneStageOwners,
        IReadOnlyList<string> todoStageOwners,
        bool externalPartyPending)
    {
        // Terminal orders are read-only for everyone.
        if (lifecycle is "closed" or "rejected" or "cancelled") return "none";

        // approved / applying have no current stage — the execution-stage owner
        // is the one awaiting, because applying is their job (03 §6).
        if (lifecycle is "approved" or "applied_partial"
            && executionStageOwner is not null && viewerParty == executionStageOwner)
            return "awaiting";

        if (currentStageOwner is not null)
        {
            if (viewerParty == currentStageOwner) return "awaiting";

            // The rapporteur recording an external party's decision against an
            // official letter (03 §4) — a real action, not a weaker `awaiting`.
            if (viewerIsDelegate && externalPartyPending) return "recorder";
        }

        if (doneStageOwners.Contains(viewerParty)) return "acted";
        if (todoStageOwners.Contains(viewerParty)) return "upcoming";

        return "none";
    }

    /// <summary>03 §7 gating rule.</summary>
    public static bool CanAct(string relation) => relation is "awaiting" or "recorder";

    /// <summary>03 §10 — the register's بانتظار إجرائي filter.</summary>
    public static bool AwaitingMyAction(string relation) => relation == "awaiting";
}
