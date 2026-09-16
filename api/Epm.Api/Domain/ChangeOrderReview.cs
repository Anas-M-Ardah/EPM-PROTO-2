using Epm.Api.Data.Entities;

namespace Epm.Api.Domain;

public static class ChangeOrderReview
{
    public static bool ValidApproval(ChangeOrderLine line, decimal? qty, decimal? rate, decimal? excess)
    {
        if (line.ChangeType is "inc" or "dec")
            return qty is not null &&
                (Math.Abs(qty.Value) <= line.ContractedQty * TierSplit.Tier || excess is > 0);
        if (line.ChangeType == "rate") return rate is > 0;
        return line.ChangeType is "del" or "redist";
    }

    // Prior decisions remain in the append-only audit; these rows describe the new review cycle.
    public static void Restart(ChangeOrder order, IReadOnlyList<ChangeOrderStage> stages,
        IReadOnlyList<ChangeOrderLine> lines, DateOnly date)
    {
        foreach (var stage in stages.Where(s => s.Applicable))
        {
            stage.Status = "pending";
            stage.SentAt = null;
            stage.ActionedAt = null;
            stage.Decision = null;
            stage.DecisionNote = null;
            stage.DecidedByUserId = null;
        }
        var first = stages.Where(s => s.Applicable).MinBy(s => s.StageNo)!;
        first.Status = "active";
        first.SentAt = date;
        foreach (var line in lines)
        {
            line.ApprovedDeltaQty = null;
            line.ApprovedRate = null;
            line.ApprovedExcessRate = null;
        }
        order.ApprovedValue = null;
        order.ApprovedDays = null;
        order.DecisionDate = null;
        order.ApprovingAuthority = null;
        order.Lifecycle = "pending";
    }
}
