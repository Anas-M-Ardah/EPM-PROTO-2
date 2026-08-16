namespace Epm.Api.Domain;

/// <summary>
/// The executive band that SCR-E1 (المحفظة، الشكل ٤٨) and SCR-E8 (مساحة العمل ›
/// نظرة عامة، الشكل ٢) both draw: physical and planned progress, the spend
/// ratio, BR-11's two indices, two monthly curves, and a row per project
/// carrying its own figures and its `ExecutiveSignal`.
///
/// ── WHY THIS IS ONE RULE AND NOT TWO ENDPOINTS ───────────────────────────
/// The live prototype's `DWorkspaceOverview` is `DDashboard` scoped to one
/// workspace — the same two `.d-dash` rows, the same signal panel, the same
/// watchlist — and it says so in its own comment: *"same model as the ministry
/// board"*. If each endpoint derived the band itself, the ministry total would
/// eventually stop being the sum of the workspaces underneath it, and the first
/// person to notice would be a director whose university's number does not
/// appear in the minister's. So the arithmetic is here, once, and both
/// endpoints load rows and call it.
///
/// It also puts the weighted planned roll-up where CLAUDE.md §3.1 requires:
/// an endpoint may filter, join, sort and project, and may not compute a
/// weight. `PortfolioEndpoints` was computing several.
///
/// ── EVERY INPUT IS ALREADY-RECORDED FACT ─────────────────────────────────
/// Nothing here is invented. The bill of quantities gives the weights (BR-04),
/// the activity baselines give the planned line (P-53), the contract log gives
/// the actual line, and the payments give the spend. Where an input is absent
/// the figure is NULL and stays null: "unknown" and "zero" are different claims
/// and this band is read by people who cannot check it themselves (P-09).
/// </summary>
public static class PortfolioBand
{
    /// <param name="Branch">
    /// The workspace's own sub-unit — SCR-E8 filters and columns by it.
    /// Empty on projects that do not record one; never null, so the
    /// register's «كل الفروع» has something to compare against.
    /// </param>
    public record Proj(
        string Id, string NameAr, string NameEn, string Status,
        string WorkspaceCode, string Branch, DateOnly? DataDate);

    /// <param name="Billed">Σ of the bill's line amounts — the denominator of BR-04.</param>
    /// <param name="Executed">Σ of what the recorded progress says is achieved.</param>
    /// <param name="StartingPct">
    /// The progress this contract stood at BEFORE the first logged update, so a
    /// curve that starts mid-project does not start at zero.
    /// </param>
    public record Contr(
        string Id, string ProjectId,
        decimal Original, decimal Effective,
        decimal Billed, decimal Executed,
        DateOnly Start, DateOnly OriginalFinish, DateOnly? ForecastFinish,
        int OriginalDurationDays, decimal StartingPct);

    /// <summary>A PAID payment. Certified-but-unpaid is not spend (P-26).</summary>
    public record Pay(string ContractId, DateOnly? PaidDate, decimal NetAmount);

    /// <summary>One recorded progress update from the contract activity log.</summary>
    public record Update(string ContractId, DateOnly At, decimal Pct);

    /// <summary>A non-milestone activity, for the planned line.</summary>
    public record Act(decimal BudgetedCost, DateOnly? BaselineStart, DateOnly? BaselineFinish);

    public record ProjectRow(
        string Id, string NameAr, string NameEn, string Status,
        string WorkspaceCode, string Branch,
        decimal Value, decimal? Physical, decimal Paid,
        int? DelayDays, decimal? Spi, string Signal,
        DateOnly? ForecastFinish, DateOnly? PlannedFinish);

    public record Period(DateOnly At, decimal PlanCum, decimal? ActCum, decimal PlanPeriod, decimal ActPeriod);

    public record Band(
        DateOnly AsOf,
        decimal? Physical, decimal? Planned, decimal? Financial,
        decimal? Spi, decimal? Cpi,
        decimal EarnedValue, decimal ActualCost,
        decimal ApprovedCost, decimal RevisedCost,
        IReadOnlyList<Period> ProgressCurve,
        IReadOnlyList<Period> CostCurve,
        IReadOnlyList<ProjectRow> Projects,
        IReadOnlyList<Signal> Signals);

    /// <param name="Share">Whole percent of the projects in scope.</param>
    public record Signal(string Code, int Count, int Share);

    public static Band Derive(
        IReadOnlyList<Proj> projects,
        IReadOnlyList<Contr> contracts,
        IReadOnlyList<Pay> payments,
        IReadOnlyList<Update> updates,
        IReadOnlyList<Act> activities)
    {
        // D-06 — "now" is the DATA DATE, never DateTime.Now. Projects can carry
        // different ones, so a band over several reads the LATEST: using the
        // earliest would report every project as of the least current one.
        var asOf = projects.Where(p => p.DataDate is not null).Select(p => p.DataDate!.Value)
            .DefaultIfEmpty(DateOnly.FromDateTime(DateTime.UtcNow))
            .Max();

        var basis = activities.Sum(a => a.BudgetedCost);
        var hasBaseline = activities.Count > 0 && basis > 0m;

        // P-53 — what the baselines say should be complete by a date, weighted
        // by each activity's budgeted cost. Null when there is no baseline: a
        // planned figure of 0% is a claim that nothing was ever scheduled.
        decimal? PlannedAt(DateOnly at)
        {
            if (!hasBaseline) return null;
            var w = activities.Sum(a => a.BudgetedCost
                * PlannedProgress.PlannedPct(a.BaselineStart, a.BaselineFinish, at) / 100m);
            return ProgressReflection.Rollup(basis, w);
        }

        var paidByContract = payments.GroupBy(p => p.ContractId)
            .ToDictionary(g => g.Key, g => g.Sum(p => p.NetAmount));

        var plannedNow = PlannedAt(asOf);

        // ── per project, so the watchlist and the signal have a subject ─────
        var rows = projects.Select(p =>
        {
            var mine = contracts.Where(c => c.ProjectId == p.Id).ToList();
            var value = ProjectValue.Total(mine.Select(c => c.Effective));
            var billed = mine.Sum(c => c.Billed);
            var executed = mine.Sum(c => c.Executed);
            var paid = mine.Sum(c => paidByContract.TryGetValue(c.Id, out var v) ? v : 0m);

            // BR-04 — weighted by the bill's own line amounts. No bill, no
            // physical progress; the project is not therefore at 0%.
            decimal? physical = billed > 0m ? ProgressReflection.Rollup(billed, executed) : null;

            // BR-10's own figure, taken at the WORST contract: a project is as
            // late as its latest-finishing contract, not as its average.
            var forecast = mine.Where(c => c.ForecastFinish is not null)
                .Select(c => c.ForecastFinish!.Value)
                .ToList();
            int? delay = forecast.Count == 0
                ? null
                : mine.Where(c => c.ForecastFinish is not null)
                      .Select(c => Penalty.DelayDays(c.OriginalFinish, c.ForecastFinish!.Value))
                      .Max();

            decimal? spi = physical is not null && plannedNow is > 0m
                ? EarnedValue.For(value, plannedNow.Value / 100m, physical.Value / 100m, paid).Spi
                : null;

            return new ProjectRow(
                p.Id, p.NameAr, p.NameEn, p.Status, p.WorkspaceCode, p.Branch,
                value, physical, paid, delay, spi,
                ExecutiveSignal.For(p.Status, delay,
                    mine.Count == 0 ? null : mine.Max(c => c.OriginalDurationDays), spi),
                forecast.Count == 0 ? null : forecast.Max(),
                mine.Count == 0 ? null : mine.Max(c => c.OriginalFinish));
        }).ToList();

        // ── the band itself, weighted across the whole scope ────────────────
        //
        // These are derived from the CONTRACT totals, not averaged from the
        // rows above. A mean of percentages would give a 30-million project the
        // same say as a 300-million one.
        var billedTotal = contracts.Sum(c => c.Billed);
        var executedTotal = contracts.Sum(c => c.Executed);
        var effectiveTotal = ProjectValue.Total(contracts.Select(c => c.Effective));
        var paidTotal = payments.Sum(p => p.NetAmount);

        decimal? physicalPct = billedTotal > 0m ? ProgressReflection.Rollup(billedTotal, executedTotal) : null;
        decimal? financialPct = effectiveTotal > 0m ? ProgressReflection.Rollup(effectiveTotal, paidTotal) : null;

        decimal? spiTotal = null, cpiTotal = null;
        decimal earned = 0m;
        if (physicalPct is not null && plannedNow is > 0m)
        {
            var evm = EarnedValue.For(effectiveTotal, plannedNow.Value / 100m, physicalPct.Value / 100m, paidTotal);
            // BR-11 returns each index as nullable — a zero denominator gives
            // NO index rather than a zero one. Rounding a missing index into
            // 0.00 is the lie this band exists to avoid.
            spiTotal = evm.Spi is null ? null : Round2(evm.Spi.Value);
            cpiTotal = evm.Cpi is null ? null : Round2(evm.Cpi.Value);
            earned = evm.Ev;
        }

        // ── the two curves, over the same month ends ────────────────────────
        var from = activities.Any(a => a.BaselineStart is not null)
            ? activities.Where(a => a.BaselineStart is not null).Min(a => a.BaselineStart!.Value)
            : contracts.Count > 0 ? contracts.Min(c => c.Start) : asOf;

        var months = ProgressSeries.Monthly(
            updates.Select(u => new ProgressSeries.Update(u.ContractId, u.At, u.Pct)).ToList(),
            contracts.Select(c => new ProgressSeries.Contract(c.Id, c.Effective, c.StartingPct)).ToList(),
            from, asOf, PlannedAt, physicalPct, _ => string.Empty);

        // A curve needs SOMETHING recorded to be a curve. With no baseline and
        // no updates, `Monthly` still returns a row per month — all zeros — and
        // a flat line along the axis reads as "nothing has happened" when the
        // truth is "nothing has been recorded" (P-140).
        var progressCurve = hasBaseline || updates.Count > 0
            ? months.Select(m => new Period(m.At, m.PlanCum, m.ActCum, m.PlanPeriod, m.ActPeriod)).ToList()
            : [];

        var firstPaid = payments.Where(p => p.PaidDate is not null)
            .Select(p => (DateOnly?)p.PaidDate!.Value)
            .DefaultIfEmpty(null)
            .Min();

        var costCurve = new List<Period>(months.Count);
        if (hasBaseline || firstPaid is not null)
        {
            decimal prevPlan = 0m, prevAct = 0m;
            foreach (var m in months)
            {
                // The actual side is spend to date as a share of the effective
                // value — the same ratio the financial tile shows, read at each
                // month end. Null before the first payment, so the line starts
                // where the money did.
                decimal? act = null;
                if (firstPaid is not null && m.At >= firstPaid && effectiveTotal > 0m)
                {
                    var upto = payments.Where(p => p.PaidDate is not null && p.PaidDate <= m.At).Sum(p => p.NetAmount);
                    act = Round2(upto / effectiveTotal * 100m);
                }

                costCurve.Add(new Period(
                    m.At, m.PlanCum, act,
                    Round2(m.PlanCum - prevPlan),
                    act is null ? 0m : Round2(Math.Max(0m, act.Value - prevAct))));

                prevPlan = m.PlanCum;
                if (act is not null) prevAct = act.Value;
            }
        }

        var signals = ExecutiveSignal.Counts(rows.Select(r => r.Signal))
            .Select(c => new Signal(c.Signal, c.Count,
                rows.Count == 0 ? 0 : (int)Math.Round(c.Count / (decimal)rows.Count * 100m)))
            .ToList();

        return new Band(
            asOf,
            physicalPct is null ? null : Round2(physicalPct.Value),
            plannedNow is null ? null : Round2(plannedNow.Value),
            financialPct is null ? null : Round2(financialPct.Value),
            spiTotal, cpiTotal,
            earned, paidTotal,
            ProjectValue.Total(contracts.Select(c => c.Original)),
            effectiveTotal,
            progressCurve, costCurve, rows, signals);
    }

    /// <summary>
    /// Physical minus planned, in points. Null when either side is missing —
    /// an unknown variance is not a zero one, and the pill that renders it
    /// would otherwise read «متقدّم 0 نقطة» on a project nobody has measured.
    /// </summary>
    public static decimal? Variance(decimal? physical, decimal? planned)
        => physical is null || planned is null
            ? null
            : Math.Round(physical.Value - planned.Value, 1, MidpointRounding.AwayFromZero);

    private static decimal Round2(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);
}
