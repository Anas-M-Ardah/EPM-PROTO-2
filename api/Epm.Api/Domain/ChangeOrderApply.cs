namespace Epm.Api.Domain;

/// <summary>
/// BR-09 · `03 §6` · non-negotiable #2 — **APPLYING a change order.**
///
/// Approving changes nothing. Applying is the act that moves money, quantity
/// and time onto the contract, and it is the only one that does. This file
/// computes WHAT WOULD MOVE; the endpoint writes it and records each step.
///
/// ── IT IS A PLAN, NOT A MUTATION ─────────────────────────────────────────
/// <see cref="Plan"/> returns every change as a value — the new contract
/// version, the new rate bands per line, the new activity finishes, the
/// recomputed weights and the penalty baseline. That makes the whole operation
/// inspectable before anything is written, and it is what lets step 5 FAIL
/// without leaving half a contract behind.
///
/// ── THE WEIGHT STEP IS GENUINELY FAILABLE (`03 §6`) ──────────────────────
/// BR-01 must total 100.00% after the move. <see cref="Plan"/> recomputes and
/// reports it; a plan whose weights do not verify is not applied, the order
/// stays in `applied_partial`, and the register raises فشل التطبيق. A step that
/// cannot fail is a step nobody needs to run.
///
/// ── ORIGINAL VALUES ARE NEVER OVERWRITTEN (non-negotiable #6) ────────────
/// A quantity change becomes a RATE BAND on the line — `02 §5` says a line
/// legitimately carries more than one rate after application — and the line's
/// own `OriginalQty` and `UnitRate` stay exactly as they were, because D-01
/// measures the next order's 20% against them.
/// </summary>
public static class ChangeOrderApply
{
    /// <param name="ApprovedDeltaQty">Null ⇒ this line is not moved by the order.</param>
    /// <param name="ApprovedExcessRate">The rate لجنة تثبيت الأسعار fixed, if any.</param>
    public record LineInput(
        string Code,
        string ChangeType,
        decimal OriginalQty,
        decimal OriginalRate,
        IReadOnlyList<TierSplit.Band> ExistingBands,
        decimal? ApprovedDeltaQty,
        decimal? ApprovedRate,
        decimal? ApprovedExcessRate);

    /// <param name="Bands">
    /// What the line carries AFTER the move: the quantity that stays at the
    /// original rate, and — when the order crossed 20% — a second band at the
    /// fixed excess rate. A line the order does not touch keeps its bands.
    /// </param>
    public record LineChange(
        string Code,
        decimal QtyBefore,
        decimal QtyAfter,
        decimal AmountBefore,
        decimal AmountAfter,
        IReadOnlyList<TierSplit.Band> Bands);

    public record ActivityChange(
        string ActivityId,
        DateOnly? FinishBefore,
        DateOnly? FinishAfter,
        int RemainingBefore,
        int RemainingAfter,
        int DeltaDays);

    /// <param name="Valid">
    /// `03 §6`'s failable check: BR-01 must still total 100.00% after the move.
    /// </param>
    public record WeightCheck(decimal SumBefore, decimal SumAfter, bool Valid);

    /// <param name="Amendment">BR-09's new version — the row that MAKES the change effective.</param>
    /// <param name="PenaltyMoves">
    /// BR-10 charges the delay penalty against the CONTRACTUAL finish, so an
    /// order that adds days moves the baseline it is measured from. False when
    /// the order grants none — and then the penalty step is `na`, not "passed".
    /// </param>
    public record Result(
        Amendments.Version Amendment,
        IReadOnlyList<LineChange> Lines,
        IReadOnlyList<ActivityChange> Activities,
        WeightCheck Weights,
        bool PenaltyMoves,
        bool AnyRateChanged);

    /// <summary>
    /// Everything applying this order would do, computed from the APPROVED
    /// column only. The contractor's and the RE department's proposals are
    /// proposals (`02 §6`) and never reach the contract.
    /// </summary>
    /// <param name="contractLines">
    /// EVERY line of the contract, not only the affected ones: weights are a
    /// share of the contract (BR-01), so the untouched lines are the
    /// denominator that decides whether the check passes.
    /// </param>
    public static Result Plan(
        Amendments.Version effective,
        decimal approvedValue,
        int approvedDays,
        IReadOnlyList<LineInput> contractLines,
        IReadOnlyList<ActivityChange> activities)
    {
        var lines = new List<LineChange>();

        foreach (var l in contractLines)
        {
            var before = TierSplit.Effective(l.OriginalQty, l.OriginalRate, l.ExistingBands);

            // A line the order does not move keeps exactly what it had. It is
            // still in the list because the weight denominator needs it.
            if (l.ApprovedDeltaQty is null && l.ApprovedRate is null)
            {
                lines.Add(new(l.Code, before.Qty, before.Qty, before.Amount, before.Amount, l.ExistingBands));
                continue;
            }

            var bands = BandsFor(l, before);
            var after = TierSplit.Effective(l.OriginalQty, l.OriginalRate, bands);

            lines.Add(new(l.Code, before.Qty, after.Qty, before.Amount, after.Amount, bands));
        }

        // BR-01, run twice over the same list — once as it stands, once as the
        // application would leave it.
        var sumBefore = BoqWeights.ForContract(lines.Select(l => l.AmountBefore).ToList()).Sum();
        var sumAfter = BoqWeights.ForContract(lines.Select(l => l.AmountAfter).ToList()).Sum();

        return new Result(
            Amendments.Apply(effective, approvedValue, approvedDays),
            lines,
            activities,
            new WeightCheck(sumBefore, sumAfter, Math.Abs(sumAfter - 100m) < 0.005m),
            approvedDays > 0,
            contractLines.Any(l => l.ApprovedRate is not null || l.ApprovedExcessRate is not null));
    }

    /// <summary>
    /// `02 §5` — what the line carries after the move. Up to 20% of the
    /// ORIGINAL quantity stays at the original rate; only the excess takes the
    /// rate لجنة تثبيت الأسعار fixed, and it becomes a band of its own so the
    /// line can state both.
    /// </summary>
    private static IReadOnlyList<TierSplit.Band> BandsFor(LineInput l, TierSplit.Line before)
    {
        switch (l.ChangeType)
        {
            case "inc":
            case "dec":
            {
                var delta = Math.Abs(l.ApprovedDeltaQty ?? 0m);
                var split = TierSplit.Split(new TierSplit.Input(
                    l.ChangeType, l.OriginalQty, delta, l.OriginalRate,
                    l.ApprovedExcessRate ?? l.OriginalRate, before.Amount));

                var atOriginal = l.ChangeType == "dec"
                    ? before.Qty - split.AtRate
                    : before.Qty + split.AtRate;

                var bands = new List<TierSplit.Band> { new(atOriginal, l.OriginalRate) };

                if (split.ExcessQty > 0m)
                    bands.Add(new(
                        l.ChangeType == "dec" ? -split.ExcessQty : split.ExcessQty,
                        l.ApprovedExcessRate ?? l.OriginalRate));

                return bands;
            }

            // The quantity stands and the whole line re-prices. One band, and
            // the ORIGINAL rate is still on the line beside it.
            case "rate":
                return [new(before.Qty, l.ApprovedRate ?? l.OriginalRate)];

            // إلغاء بند — what is left goes.
            case "del":
                return [new(0m, l.OriginalRate)];

            // إعادة توزيع — the quantity moves and the rate does not, so the
            // value does not move either.
            case "redist":
                return [new(before.Qty + (l.ApprovedDeltaQty ?? 0m), l.OriginalRate)];

            default:
                return l.ExistingBands;
        }
    }

    /// <summary>
    /// `03 §6` — the status each of the NINE steps ends with, given the plan.
    /// The weight step is the one that can be `fail`; everything after it stays
    /// `todo`, because a run that stopped did not silently finish.
    /// </summary>
    public static IReadOnlyDictionary<int, string> StepOutcomes(Result plan)
    {
        var weightsOk = plan.Weights.Valid;

        return new Dictionary<int, string>
        {
            [1] = "done",                                        // إصدار ملحق العقد
            [2] = "done",                                        // تحديث قيمة العقد النافذة
            [3] = "done",                                        // تحديث كميات البنود
            [4] = plan.AnyRateChanged ? "done" : "na",           // تحديث أسعار الوحدات
            [5] = weightsOk ? "done" : "fail",                   // إعادة احتساب الأوزان
            [6] = !weightsOk ? "todo" : plan.Activities.Count > 0 ? "done" : "na",
            [7] = !weightsOk ? "todo" : plan.Activities.Count > 0 ? "done" : "na",
            [8] = !weightsOk ? "todo" : plan.PenaltyMoves ? "done" : "na",
            [9] = weightsOk ? "done" : "todo",                   // التحقق النهائي
        };
    }
}
