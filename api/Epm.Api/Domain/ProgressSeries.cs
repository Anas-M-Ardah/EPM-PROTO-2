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
