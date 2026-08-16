namespace Epm.Api.Domain;

/// <summary>
/// الشكل 4's first chart — «الإنجاز المادي 31% مقابل مخطط 39%» drawn over time
/// rather than as two numbers.
///
/// ── THE ACTUAL SERIES IS RECORDED, NOT INVENTED ──────────────────────────
/// Every point on the actual line is a progress update somebody wrote down:
/// `ContractActivityEvents` with `Action = "progress"` carries the percentage
/// before and after, on a date. There is no interpolation between them and no
/// smoothing — a curve with more points than the system recorded would be a
/// drawing of data that does not exist.
///
/// The plate's own screen has few updates and so does this one. A sparse line
/// is the honest picture of a project whose progress was logged twice.
///
/// ── ROLLING UP TO THE PROJECT ────────────────────────────────────────────
/// An update is recorded against a CONTRACT and الشكل 4 is a project screen, so
/// the contracts are combined the way every other project figure is: weighted
/// by effective contract value (BR-00 over BR-09). A contract with no update at
/// or before a date contributes its earliest known percentage — the value it
/// stood at before anybody moved it — never zero, which would read as "no work
/// had been done" rather than "nothing was recorded yet".
///
/// ── THE PLANNED SERIES IS DERIVED, AT THE SAME DATES ─────────────────────
/// Planned percentage at a date is `PlannedProgress.PlannedPct` over the
/// activities' own baselines (P-53), evaluated at each date the actual series
/// has a point for. Two series read at the same instants, which is the only
/// way «مقابل» means anything.
/// </summary>
public static class ProgressSeries
{
    /// <summary>Percentages are shown to two places; the series rounds once, here.</summary>
    private static decimal Two(decimal v) => Math.Round(v, 2, MidpointRounding.AwayFromZero);

    /// <param name="At">The date the update was recorded.</param>
    /// <param name="Pct">The percentage it moved TO.</param>
    public record Update(string ContractId, DateOnly At, decimal Pct);

    /// <param name="Weight">
    /// The contract's effective value. Zero-value contracts drop out of the
    /// weighting rather than dividing by nothing.
    /// </param>
    public record Contract(string Id, decimal Weight, decimal StartingPct);

    public record Point(DateOnly At, decimal? Planned, decimal Actual);

    /// <summary>
    /// The dates the chart has points at: every recorded update, plus the data
    /// date so the line ends where the rest of the screen is reading.
    /// </summary>
    public static IReadOnlyList<DateOnly> Dates(
        IReadOnlyList<Update> updates, DateOnly dataDate)
        => updates.Select(u => u.At)
            .Append(dataDate)
            .Where(d => d <= dataDate)
            .Distinct()
            .OrderBy(d => d)
            .ToList();

    /// <summary>
    /// The project's actual percentage at <paramref name="at"/> — each
    /// contract's latest recorded value on or before that date, weighted by
    /// contract value.
    /// </summary>
    public static decimal ActualAt(
        IReadOnlyList<Update> updates, IReadOnlyList<Contract> contracts, DateOnly at)
    {
        var basis = contracts.Sum(c => c.Weight);
        if (basis <= 0m) return 0m;

        var weighted = 0m;
        foreach (var c in contracts)
        {
            var latest = updates
                .Where(u => u.ContractId == c.Id && u.At <= at)
                .OrderByDescending(u => u.At)
                .Select(u => (decimal?)u.Pct)
                .FirstOrDefault();

            weighted += c.Weight * (latest ?? c.StartingPct);
        }

        return Two(weighted / basis);
    }

    /// <param name="Label">«ش1» · «M1» — the period's own tick.</param>
    /// <param name="PlanCum">Cumulative planned %, always known: it is derived.</param>
    /// <param name="ActCum">
    /// Cumulative actual %. **Null before the first recorded update** — the
    /// line starts where the log does rather than at a zero nobody wrote.
    /// </param>
    /// <param name="PlanPeriod">This period's planned increment.</param>
    /// <param name="ActPeriod">This period's actual increment, 0 where unknown.</param>
    public record Period(
        string Label, DateOnly At,
        decimal PlanCum, decimal? ActCum,
        decimal PlanPeriod, decimal ActPeriod);

    /// <summary>
    /// The S-curve the live prototype draws — period bars under cumulative
    /// planned and actual lines — over MONTH ENDS rather than over the handful
    /// of dates an update happened to land on.
    ///
    /// ── WHY THE ACTUAL LINE IS A STEP AND NOT A CURVE ────────────────────
    /// A month with no recorded update carries the previous month's figure
    /// forward, because that is what the log says the project stood at. The
    /// line goes flat, and flat is the truth: nobody measured, so nothing
    /// changed on the record. The prototype's own curve is
    /// `f => f * f * (3 - 2 * f)` over a made-up twelve months — a shape, not a
    /// measurement — and this build refuses four other fabricated figures on
    /// this same screen for the same reason (P-09).
    ///
    /// Before the first update there is no actual figure at all, so
    /// <see cref="Period.ActCum"/> is null and the line simply has not started.
    /// </summary>
    public static IReadOnlyList<Period> Monthly(
        IReadOnlyList<Update> updates,
        IReadOnlyList<Contract> contracts,
        DateOnly from,
        DateOnly dataDate,
        Func<DateOnly, decimal?> plannedAt,
        decimal? actualNow,
        Func<int, string> label)
    {
        var months = new List<DateOnly>();
        var cursor = new DateOnly(from.Year, from.Month, 1)
            .AddMonths(1).AddDays(-1);               // the first month END

        while (cursor < dataDate && months.Count < 60)
        {
            months.Add(cursor);
            cursor = cursor.AddDays(1).AddMonths(1).AddDays(-1);
        }
        months.Add(dataDate);                        // the curve ends at "now"

        var firstUpdate = updates.Count == 0 ? (DateOnly?)null : updates.Min(u => u.At);

        var rows = new List<Period>(months.Count);
        decimal prevPlan = 0m, prevAct = 0m;

        for (var i = 0; i < months.Count; i++)
        {
            var at = months[i];
            var plan = Two(plannedAt(at) ?? 0m);

            decimal? act = firstUpdate is null || at < firstUpdate
                ? null
                : at == dataDate && actualNow is not null
                    ? Two(actualNow.Value)
                    : ActualAt(updates, contracts, at);

            rows.Add(new Period(
                label(i + 1), at,
                plan, act,
                Two(plan - prevPlan),
                act is null ? 0m : Two(Math.Max(0m, act.Value - prevAct))));

            prevPlan = plan;
            if (act is not null) prevAct = act.Value;
        }

        return rows;
    }

    /// <summary>
    /// The whole series. <paramref name="plannedAt"/> is the caller's way of
    /// asking `PlannedProgress` — it needs the activity baselines, which are a
    /// query and not this function's business.
    ///
    /// <paramref name="actualNow"/> overrides the last point: at the data date
    /// the screen already has a physical percentage derived from the BOQ
    /// (BR-04), and the chart must end on the SAME number the tile above it
    /// shows. Two derivations of "where the project is" disagreeing on one
    /// screen is the defect this parameter exists to prevent.
    /// </summary>
    public static IReadOnlyList<Point> Build(
        IReadOnlyList<Update> updates,
        IReadOnlyList<Contract> contracts,
        DateOnly dataDate,
        Func<DateOnly, decimal?> plannedAt,
        decimal? actualNow)
    {
        var dates = Dates(updates, dataDate);
        var points = new List<Point>(dates.Count);

        foreach (var d in dates)
        {
            var actual = d == dataDate && actualNow is not null
                ? Two(actualNow.Value)
                : ActualAt(updates, contracts, d);

            points.Add(new Point(d, plannedAt(d) is { } pl ? Two(pl) : null, actual));
        }

        return points;
    }
}
