namespace Epm.Api.Domain;

/// <summary>
/// 03 §9 · ملحق الأشكال 30–32 — the arithmetic behind the change-order RECORD.
///
/// The record page prints four figures for the same BOQ line — before ·
/// مقترح المقاول · مقترح دائرة المهندس المقيم · المعتمد — and then asks what
/// each of them would do to the weights. None of that may be computed in a
/// projection or in Angular (CLAUDE.md §3.1), and none of it is new rule:
/// every column below is BR-05's split, BR-01's weights and BR-06's governing
/// proposal, arranged the way الشكل 31 arranges them.
///
/// ── WHY A PROPOSAL IS A FUNCTION, NOT A COLUMN ───────────────────────────
/// The contractor and the RE department each propose a delta quantity and,
/// when a line trips 20%, an excess rate. Their resulting quantity, value and
/// impact are therefore the SAME function of three different inputs — so it is
/// written once and called three times. Storing the results instead would be a
/// derived value in the database (CLAUDE.md §3.5), and the three columns could
/// then disagree with the split that produced them.
///
/// ── THE APPROVED COLUMN IS NOT "THE LATEST" ──────────────────────────────
/// It exists only once لجنة التسعير has ruled, and its excess rate comes only
/// from لجنة تثبيت الأسعار (02 §5–§6). Until then <see cref="For"/> returns
/// null for that party and الشكل 31 prints «لجنة تثبيت الأسعار» in the rate
/// cell — never a computed guess.
/// </summary>
public static class ChangeOrderRecord
{
    /// <param name="ContractedQty">D-01 — the ORIGINAL quantity the 20% is measured against.</param>
    /// <param name="BeforeQty">What the line stood at when the order was raised.</param>
    public record Line(
        string Code,
        string ChangeType,
        decimal ContractedQty,
        decimal BeforeQty,
        decimal BeforeRate,
        decimal BeforeAmount);

    /// <param name="RateForExcess">
    /// The rate this party proposes for the quantity beyond 20%. Null on a line
    /// that does not trip the threshold — and null on the approved column until
    /// لجنة تثبيت الأسعار has fixed one.
    /// </param>
    public record Party(decimal? DeltaQty, decimal? NewRate, decimal? RateForExcess);

    /// <param name="AtRateQty">The part valued at the ORIGINAL rate (≤ 20%).</param>
    /// <param name="ExcessQty">The part that may carry a new rate.</param>
    /// <param name="Impact">AmountAfter − BeforeAmount. Signed.</param>
    public record Column(
        decimal? QtyAfter,
        decimal? RateShown,
        decimal? AmountAfter,
        decimal? Impact,
        decimal Threshold,
        decimal AtRateQty,
        decimal ExcessQty,
        bool TripsThreshold);

    /// <summary>
    /// One party's column for one line. Returns an empty column (nulls) when
    /// that party has not proposed — «بانتظار القرار», not a zero.
    /// </summary>
    public static Column For(Line l, Party p)
    {
        var threshold = l.ContractedQty * TierSplit.Tier;

        if (p.DeltaQty is null && p.NewRate is null)
            return new(null, null, null, null, threshold, 0m, 0m, false);

        switch (l.ChangeType)
        {
            // BR-05 — and ONLY here. A rate change, a cancellation and a
            // redistribution do not measure themselves against 20% (02 §5).
            case "inc":
            case "dec":
            {
                var delta = Math.Abs(p.DeltaQty ?? 0m);
                var split = TierSplit.Split(new TierSplit.Input(
                    l.ChangeType, l.ContractedQty, delta, l.BeforeRate,
                    p.RateForExcess ?? l.BeforeRate, l.BeforeAmount));

                var qtyAfter = l.ChangeType == "dec" ? l.BeforeQty - delta : l.BeforeQty + delta;

                return new(
                    qtyAfter,
                    // الشكل 31's rate column is «سعر الزائد» — the excess rate,
                    // which is the only rate a party may move. On a line inside
                    // the limit there is no such rate, and the cell prints «—».
                    split.TripsThreshold ? p.RateForExcess : null,
                    split.NewAmount,
                    split.NewAmount - l.BeforeAmount,
                    threshold, split.AtRate, split.ExcessQty, split.TripsThreshold);
            }

            // The quantity stands; the rate moves. The whole line re-prices —
            // there is no 20% tier on a rate change.
            case "rate":
            {
                var rate = p.NewRate ?? l.BeforeRate;
                var after = l.BeforeQty * rate;
                return new(l.BeforeQty, rate, after, after - l.BeforeAmount, threshold, 0m, 0m, false);
            }

            // إلغاء بند — what is left goes, and the impact is the whole
            // remaining amount, negative. NOBODY PROPOSES A RATE on a
            // cancellation, so the rate cell stays empty rather than repeating
            // the original rate as if it were a proposal.
            case "del":
                return new(0m, null, 0m, -l.BeforeAmount, threshold, 0m, 0m, false);

            // إعادة توزيع — quantity moves between lines, value does not
            // change. An impact of zero here is a FACT, not a missing figure,
            // which is why الشكل 31's redistribution table shows «الفرق 0».
            case "redist":
            {
                var delta = p.DeltaQty ?? 0m;
                return new(l.BeforeQty + delta, null, l.BeforeAmount, 0m, threshold, 0m, 0m, false);
            }

            default:
                return new(null, null, null, null, threshold, 0m, 0m, false);
        }
    }

    /// <summary>D-11 — money is decimal and rounds to fils away from zero, never float.</summary>
    private static decimal Money(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);

    /// <summary>Σ of one party's impacts — الشكل 31's «صافي أثر مقترح …» footer row.</summary>
    public static decimal? Net(IEnumerable<Column> columns)
    {
        var vals = columns.Select(c => c.Impact).Where(i => i is not null).Select(i => i!.Value).ToList();
        return vals.Count == 0 ? null : Money(vals.Sum());
    }

    // ── الشكل 31 · أثر الأوزان ────────────────────────────────────────────

    /// <param name="Before">The line's amount now.</param>
    /// <param name="After">
    /// Its amount if this column were applied. UNTOUCHED LINES BELONG IN THIS
    /// LIST TOO, with After == Before: a weight is a share of the contract
    /// (BR-01), so leaving them out would make every share wrong and the sum
    /// meaningless.
    /// </param>
    public record Amount(string Code, decimal Before, decimal After);

    public record WeightRow(string Code, decimal Before, decimal After, decimal Delta);

    /// <param name="Valid">
    /// الشكل 31's «التحقق من 100%: مطابق». BR-01 distributes the rounding
    /// remainder, so this is a genuine check of the recomputation rather than
    /// of the rounding.
    /// </param>
    public record WeightImpact(
        decimal SumBefore,
        decimal SumAfter,
        bool Valid,
        IReadOnlyList<WeightRow> Rows);

    /// <summary>
    /// BR-01 applied twice — once to the contract as it stands, once to the
    /// contract as this column would leave it. `affected` selects the rows the
    /// plate prints; the denominator is always every line.
    /// </summary>
    public static WeightImpact Weights(IReadOnlyList<Amount> contractLines, ISet<string> affected)
    {
        var before = BoqWeights.ForContract(contractLines.Select(a => a.Before).ToList());
        var after = BoqWeights.ForContract(contractLines.Select(a => a.After).ToList());

        var rows = contractLines
            .Select((a, i) => (a.Code, B: before[i], A: after[i]))
            .Where(x => affected.Contains(x.Code))
            .Select(x => new WeightRow(x.Code, x.B, x.A, Math.Round(x.A - x.B, 2, MidpointRounding.AwayFromZero)))
            .ToList();

        var sumAfter = after.Sum();

        return new(before.Sum(), sumAfter, Math.Abs(sumAfter - 100m) < 0.005m, rows);
    }

    // ── الشكل 32 · ملخص الأثر الزمني ──────────────────────────────────────

    /// <param name="AnalysisDays">
    /// What the schedule-impact analysis concluded, which is NOT what was
    /// requested and NOT what was approved. الشكل 32 prints all three side by
    /// side precisely so a longer request cannot pass as an entitlement.
    /// </param>
    /// <param name="AffectsFinish">
    /// Whether the APPROVED days move the contractual finish. An activity
    /// extension absorbed by float moves nothing — الشكل 32's standing note.
    /// </param>
    public record TimeImpact(
        int RequestedDays,
        int? AnalysisDays,
        int? ApprovedDays,
        DateOnly? FinishBefore,
        DateOnly? FinishForecast,
        DateOnly? FinishApproved,
        bool AffectsFinish);

    public static TimeImpact Time(
        int requestedDays, int? analysisDays, int? approvedDays, DateOnly? finishBefore)
        => new(
            requestedDays,
            analysisDays,
            approvedDays,
            finishBefore,
            finishBefore?.AddDays(requestedDays),
            approvedDays is null ? null : finishBefore?.AddDays(approvedDays.Value),
            (approvedDays ?? 0) > 0);

    // ── الشكل 30 · ملخص القرار ────────────────────────────────────────────

    /// <param name="ValueDelta">Approved − the RE department's proposal (02 §6).</param>
    public record Difference(decimal? ValueDelta, int? DaysDelta);

    /// <summary>
    /// The «الفرق عن مقترح دائرة المهندس المقيم» line. Measured against the RE
    /// department's figure, never the contractor's: `02 §6` makes the RE
    /// department's the one that governs display, so it is the one an approval
    /// departs from.
    /// </summary>
    public static Difference Decision(
        decimal? reDeptValue, int? reDeptDays, decimal? approvedValue, int? approvedDays)
        => new(
            approvedValue is null || reDeptValue is null ? null : Money(approvedValue.Value - reDeptValue.Value),
            approvedDays is null || reDeptDays is null ? null : approvedDays - reDeptDays);
}
