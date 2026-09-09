namespace Epm.Api.Domain;

/// <summary>
/// BR-07 · 02 §7 — change-order validation gates.
///
/// rule: submission is BLOCKED, not warned, when any gate holds.
/// spec: decrease exceeds remaining (checked per proposal) · redistribution
///       without target · redistribution unbalanced · empty order · cross-contract.
/// example: a `dec` line with contracted 100 / executed 90 and delta 30
///          → 1 blocker, decrease exceeds remaining 10.
///
/// 02 §7 asks for invalid input to be PREVENTED — cap the field, explain the
/// cap — rather than flagged afterwards. These gates are the backstop for what
/// the UI could not prevent (imports, a line invalidated by another edit).
/// </summary>
public static class ChangeOrderGates
{
    public record Line(
        string Code,
        string ContractId,
        string ChangeType,
        decimal ContractedQty,
        decimal ExecutedQty,
        decimal ContractorDeltaQty,
        decimal ReDeptDeltaQty,
        string? TargetCode = null,
        decimal Drawn = 0m,
        decimal Distributed = 0m,
        /// <summary>
        /// How many الشكل 58 transfers this line carries. `redist` names TWO
        /// different movements — BOQ line to BOQ line (`TargetCode`, `Drawn`,
        /// `Distributed`) and beneficiary to beneficiary within one line — and
        /// the gates below have to know which one is in front of them. A line
        /// carrying transfers is checked by Domain/SupplyRedistribution, which
        /// runs where the allocations can be read.
        /// </summary>
        int TransferCount = 0);

    public record Activity(string ActivityId, string ContractId);

    /// <param name="IsSupply">
    /// The order's own type. `02 §5` fixes supply prices to the contract and
    /// the letter of credit, so a supply order has no party with the standing
    /// to move one — `rate` is refused here rather than merely left off the
    /// wizard's own menu, since a menu is the client's word and this is the
    /// server's (`05 §5`).
    /// </param>
    public record Order(
        string ContractId, IReadOnlyList<Line> Lines, IReadOnlyList<Activity> Activities,
        bool IsSupply = false);

    public record Issue(string Gate, string? Ref, string MsgAr, string MsgEn);

    /// <summary>Every reason this order cannot be submitted. Empty = submittable.</summary>
    public static IReadOnlyList<Issue> Validate(Order order)
    {
        var issues = new List<Issue>();

        if (order.Lines.Count == 0 && order.Activities.Count == 0)
            issues.Add(new("empty", null,
                "الأمر فارغ — لا بنود ولا أنشطة",
                "The order is empty — no BOQ lines and no activities"));

        foreach (var l in order.Lines)
        {
            // D-12 — the contract is the working context; one order never spans two.
            if (l.ContractId != order.ContractId)
                issues.Add(new("cross-contract", l.Code,
                    "بند خارج العقد المختار", "Line outside the selected contract"));

            // BR-05 has no tier on a supply contract because there is no rate
            // to fix (`Domain/ChangeOrderRecord`); `rate` goes further and is
            // refused outright — a party proposing a NEW unit rate on a line
            // whose price is fixed by contract and letter of credit is not a
            // smaller version of the works case, it is a request nobody may
            // grant.
            if (l.ChangeType == "rate" && order.IsSupply)
                issues.Add(new("supply-no-rate", l.Code,
                    "أسعار الفقرات التجهيزية مثبَّتة بالعقد وخطاب الاعتماد — لا يجوز تعديل السعر",
                    "Supply-item rates are fixed by the contract and the letter of credit — the rate may not be changed"));

            if (l.ChangeType == "dec")
            {
                var remaining = l.ContractedQty - l.ExecutedQty;

                // Each proposal is checked SEPARATELY (02 §7): the RE department's
                // decrease may be valid where the contractor's is not.
                if (l.ContractorDeltaQty > remaining)
                    issues.Add(new("decrease-exceeds", l.Code,
                        $"مقترح المقاول يتجاوز الكمية المتبقية ({remaining:0.###})",
                        $"The contractor's decrease exceeds the remaining quantity ({remaining:0.###})"));

                if (l.ReDeptDeltaQty > remaining)
                    issues.Add(new("decrease-exceeds", l.Code,
                        $"مقترح د.م.م يتجاوز الكمية المتبقية ({remaining:0.###})",
                        $"The RE department's decrease exceeds the remaining quantity ({remaining:0.###})"));
            }

            // الشكل 58's redistribution has no target ITEM — it has target
            // BENEFICIARIES, and demanding one would refuse the plate's own
            // worked example. Its balance is guaranteed by construction (every
            // transfer takes from one side and gives to the other), so neither
            // gate below applies to it.
            if (l.ChangeType == "redist" && l.TransferCount == 0)
            {
                if (string.IsNullOrWhiteSpace(l.TargetCode))
                    issues.Add(new("redist-no-target", l.Code,
                        "إعادة توزيع دون بند هدف ودون تحويلات بين الجهات",
                        "Redistribution with neither a target item nor beneficiary transfers"));

                if (Math.Abs(l.Drawn - l.Distributed) > 0.001m)
                    issues.Add(new("redist-unbalanced", l.Code,
                        "كمية السحب ≠ كمية التوزيع", "Quantity drawn does not equal quantity distributed"));
            }
        }

        foreach (var a in order.Activities.Where(a => a.ContractId != order.ContractId))
            issues.Add(new("cross-contract", a.ActivityId,
                "نشاط خارج العقد المختار", "Activity outside the selected contract"));

        return issues;
    }

    public static bool CanSubmit(Order order) => Validate(order).Count == 0;
}
