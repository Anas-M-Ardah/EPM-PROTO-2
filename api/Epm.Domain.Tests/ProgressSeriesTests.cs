using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// ملحق الشكل 4's first chart — «الإنجاز المادي 31% مقابل مخطط 39%», drawn over
/// time from what was actually recorded.
///
/// The worked example is this fixture's own PRJ-0279: two contracts, CNT-0279
/// at 250,000,000 and CNT-0279-EM at 100,000,000, with progress logged twice on
/// the first and once on the second.
/// </summary>
public class ProgressSeriesTests
{
    private static readonly DateOnly DataDate = new(2026, 8, 2);

    private static ProgressSeries.Contract[] Contracts() =>
    [
        new("CNT-0279", 250_000_000m, 18m),
        new("CNT-0279-EM", 100_000_000m, 28m),
    ];

    private static ProgressSeries.Update[] Updates() =>
    [
        new("CNT-0279", new DateOnly(2026, 4, 14), 25m),
        new("CNT-0279", new DateOnly(2026, 5, 15), 31m),
        new("CNT-0279-EM", new DateOnly(2026, 5, 15), 35m),
    ];

    [Fact]
    public void The_dates_are_the_recorded_updates_plus_the_data_date()
    {
        var dates = ProgressSeries.Dates(Updates(), DataDate);

        Assert.Equal(
            [new DateOnly(2026, 4, 14), new DateOnly(2026, 5, 15), DataDate],
            dates);
    }

    [Fact]
    public void A_date_appears_once_however_many_contracts_moved_on_it()
    {
        // Both contracts were updated on 2026-05-15 and the chart has one point.
        Assert.Equal(3, ProgressSeries.Dates(Updates(), DataDate).Count);
    }

    [Fact]
    public void An_update_after_the_data_date_is_not_plotted()
    {
        var future = Updates().Append(
            new ProgressSeries.Update("CNT-0279", new DateOnly(2026, 9, 1), 44m)).ToList();

        Assert.DoesNotContain(new DateOnly(2026, 9, 1), ProgressSeries.Dates(future, DataDate));
    }

    [Fact]
    public void A_contract_with_no_update_yet_contributes_where_it_STOOD_not_zero()
    {
        // At 2026-04-14 only CNT-0279 has moved, to 25. CNT-0279-EM has no
        // update at all yet and stood at 28 — not at 0, which would say no work
        // had been done rather than that nothing had been recorded.
        var actual = ProgressSeries.ActualAt(Updates(), Contracts(), new DateOnly(2026, 4, 14));

        // (250m × 25 + 100m × 28) / 350m = 25.857…
        Assert.Equal(25.86m, actual);
    }

    [Fact]
    public void It_is_weighted_by_contract_value_not_averaged()
    {
        // At 2026-05-15: 250m at 31 and 100m at 35.
        // A plain mean would be 33; the weighted answer is 32.14.
        var actual = ProgressSeries.ActualAt(Updates(), Contracts(), new DateOnly(2026, 5, 15));

        Assert.Equal(32.14m, actual);
        Assert.NotEqual(33m, actual);
    }

    [Fact]
    public void The_latest_update_on_or_before_the_date_wins()
    {
        // 2026-05-01 is between the two CNT-0279 updates, so 25 still stands.
        var actual = ProgressSeries.ActualAt(Updates(), Contracts(), new DateOnly(2026, 5, 1));

        Assert.Equal(25.86m, actual);
    }

    [Fact]
    public void The_last_point_is_the_screens_OWN_physical_figure()
    {
        // BR-04's roll-up says 33.7 at the data date. The chart must end there
        // and not on its own re-derivation, or one screen shows two answers to
        // "where is this project".
        var series = ProgressSeries.Build(Updates(), Contracts(), DataDate, _ => 39m, 33.7m);

        Assert.Equal(33.7m, series[^1].Actual);
        Assert.Equal(DataDate, series[^1].At);
    }

    [Fact]
    public void Without_a_physical_figure_the_last_point_falls_back_to_the_log()
    {
        var series = ProgressSeries.Build(Updates(), Contracts(), DataDate, _ => 39m, null);

        Assert.Equal(32.14m, series[^1].Actual);
    }

    [Fact]
    public void Planned_is_read_at_the_SAME_dates_as_actual()
    {
        var asked = new List<DateOnly>();
        var series = ProgressSeries.Build(Updates(), Contracts(), DataDate, d => { asked.Add(d); return 39m; }, 33.7m);

        Assert.Equal(series.Select(p => p.At), asked);
        Assert.All(series, p => Assert.Equal(39m, p.Planned));
    }

    [Fact]
    public void A_project_with_no_contract_value_reads_zero_rather_than_dividing_by_it()
    {
        var none = new ProgressSeries.Contract[] { new("CNT-X", 0m, 10m) };

        Assert.Equal(0m, ProgressSeries.ActualAt([], none, DataDate));
    }

    [Fact]
    public void With_no_updates_at_all_the_series_is_one_point_at_the_data_date()
    {
        var series = ProgressSeries.Build([], Contracts(), DataDate, _ => 12m, null);

        Assert.Single(series);
        Assert.Equal(DataDate, series[0].At);
        // Both contracts still contribute where they stood: (250×18 + 100×28)/350
        Assert.Equal(20.86m, series[0].Actual);
    }

    // ── the S-curve the live prototype draws ────────────────────────────

    [Fact]
    public void The_monthly_curve_ends_at_the_data_date()
    {
        var rows = ProgressSeries.Monthly(Updates(), Contracts(),
            new DateOnly(2026, 3, 1), DataDate, _ => 40m, 33.7m, i => "M" + i);

        Assert.Equal(DataDate, rows[^1].At);
        Assert.Equal(33.7m, rows[^1].ActCum);
    }

    [Fact]
    public void Before_the_first_recorded_update_the_actual_line_has_not_started()
    {
        var rows = ProgressSeries.Monthly(Updates(), Contracts(),
            new DateOnly(2026, 1, 1), DataDate, _ => 40m, null, i => "M" + i);

        // January and February end before 2026-04-14, the first update.
        Assert.Null(rows[0].ActCum);
        Assert.Null(rows[1].ActCum);
        Assert.NotNull(rows.First(r => r.At >= new DateOnly(2026, 4, 30)).ActCum);
    }

    [Fact]
    public void A_month_with_no_update_carries_the_log_forward_rather_than_inventing_a_rise()
    {
        var rows = ProgressSeries.Monthly(Updates(), Contracts(),
            new DateOnly(2026, 4, 1), DataDate, _ => 40m, null, i => "M" + i);

        // Nothing was recorded in June or July, so both read May's figure and
        // the period increment is zero — the line goes flat, which is what the
        // log says happened.
        var jun = rows.First(r => r.At.Month == 6);
        var jul = rows.First(r => r.At.Month == 7);
        Assert.Equal(jun.ActCum, jul.ActCum);
        Assert.Equal(0m, jul.ActPeriod);
    }

    [Fact]
    public void The_planned_line_is_always_known_because_it_is_derived()
    {
        var rows = ProgressSeries.Monthly(Updates(), Contracts(),
            new DateOnly(2026, 1, 1), DataDate, d => d.Month * 10m, null, i => "M" + i);

        Assert.All(rows, r => Assert.True(r.PlanCum > 0m));
    }

    [Fact]
    public void Period_increments_are_the_difference_from_the_month_before()
    {
        var rows = ProgressSeries.Monthly([], Contracts(),
            new DateOnly(2026, 5, 1), DataDate, d => d.Month * 10m, null, i => "M" + i);

        // May 50, June 60, July 70, then the data date in August 80.
        Assert.Equal(50m, rows[0].PlanCum);
        Assert.Equal(10m, rows[1].PlanPeriod);
    }
}
