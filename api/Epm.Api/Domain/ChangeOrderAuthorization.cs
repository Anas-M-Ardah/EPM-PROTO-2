namespace Epm.Api.Domain;

/// <summary>Server-side lifecycle and edit guards for Change Orders.</summary>
public static class ChangeOrderAuthorization
{
    public static bool IsTerminal(string lifecycle) =>
        lifecycle is "approved" or "applied_partial" or "closed" or "rejected" or "cancelled";

    public static bool MayEdit(string lifecycle, string creatorId, string actorId) =>
        creatorId == actorId && lifecycle is ("draft" or "returned");

    public static bool IsCoreField(string field) => field is
        "ContractId" or "No" or "Type" or "CreatedByUserId" or "CreatedAt" or
        "BeforeQty" or "BeforeRate" or "BeforeAmount" or "ContractedQty" or "ExecutedQty";

    public static bool IsProposalField(string field) => field is
        "ContractorDeltaQty" or "ContractorNewRate" or "ContractorExcessRate" or
        "ReDeptDeltaQty" or "ReDeptNewRate" or "ReDeptExcessRate" or
        "RequestedDeltaDays" or "RequestedStart" or "RequestedFinish";

    public static string? DenialReason(string lifecycle, string creatorId, string actorId) =>
        lifecycle is not ("draft" or "returned") ? "لا يمكن تعديل الأمر بعد إرساله" :
        creatorId != actorId ? "التعديل متاح لمنشئ الأمر فقط" : null;
}
