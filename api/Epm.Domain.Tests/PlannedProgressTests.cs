using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// P-53 — the planned-progress assumption BR-11 needs as an input.
///
/// The figures below are the fixture's own activities at its data date
/// (2026-08-02), so a wrong assumption shows up as a wrong SPI on screen
/// rather than only in a test.
/// </summary>
public class PlannedProgressTests
{
    private static readonly DateOnly AsOf = new(2026, 8, 2);

    [Fact]
    public void An_activity_whose_baseline_has_passed_is_fully_planned()
    {
        // A1: 2025-03-01 → 2025-04-14, long finished by the data date.
        var pct = PlannedProgress.PlannedPct(new DateOnly(2025, 3, 1), new DateOnly(2025, 4, 14), AsOf);

        Assert.Equal(100m, pct);
    }

    [Fact]
    public void An_activity_whose_baseline_has_not_started_demands_nothing()
    {
        var pct = PlannedProgress.PlannedPct(new DateOnly(2026, 9, 1), new DateOnly(2026, 12, 1), AsOf);

        Assert.Equal(0m, pct);
    }

    [Fact]
    public void Halfway_through_the_baseline_span_is_fifty_percent()
    {
        // 100 days, read at day 50.
        var start = new DateOnly(2026, 1, 1);
        var pct = PlannedProgress.PlannedPct(start, start.AddDays(100), start.AddDays(50));

        Assert.Equal(50m, pct);
    }

    [Fact]
    public void A_milestone_is_all_or_nothing()
    {
        var due = new DateOnly(2026, 6, 15);

        Assert.Equal(0m, PlannedProgress.PlannedPct(due, due, due.AddDays(-1)));
        // On the day itself it is due — `now >= finish`.
        Assert.Equal(100m, PlannedProgress.PlannedPct(due, due, due));
        Assert.Equal(100m, PlannedProgress.PlannedPct(due, due, due.AddDays(1)));
    }

    [Fact]
    public void An_activity_with_no_baseline_demands_nothing_rather_than_being_late()
    {
        Assert.Equal(0m, PlannedProgress.PlannedPct(null, null, AsOf));
        Assert.Equal(0m, PlannedProgress.PlannedPct(new DateOnly(2026, 1, 1), null, AsOf));
        Assert.Equal(0m, PlannedProgress.PlannedPct(null, new DateOnly(2026, 1, 1), AsOf));
    }

    [Fact]
    public void A10_is_fully_planned_though_nothing_has_been_done()
    {
        // The fixture's A10: baseline 2026-05-01 → 2026-06-30, progress 0%.
        // The baseline required it finished a month before the data date, which
        // is exactly the gap SPI exists to report.
        var pct = PlannedProgress.PlannedPct(new DateOnly(2026, 5, 1), new DateOnly(2026, 6, 30), AsOf);

        Assert.Equal(100m, pct);
    }

    // ── remaining duration ───────────────────────────────────────────────

    [Fact]
    public void Remaining_duration_follows_the_percentage()
    {
        Assert.Equal(150, PlannedProgress.RemainingDuration(150, 0m, false));
        Assert.Equal(27, PlannedProgress.RemainingDuration(150, 82m, false));
        Assert.Equal(0, PlannedProgress.RemainingDuration(150, 100m, false));
    }

    [Fact]
    public void A_completed_activity_has_nothing_remaining_and_a_milestone_never_did()
    {
        Assert.Equal(0, PlannedProgress.RemainingDuration(0, 0m, true));
        Assert.Equal(0, PlannedProgress.RemainingDuration(60, 100m, false));
    }

    [Fact]
    public void Progress_outside_the_range_cannot_produce_a_negative_remainder()
    {
        Assert.Equal(0, PlannedProgress.RemainingDuration(60, 140m, false));
        Assert.Equal(60, PlannedProgress.RemainingDuration(60, -20m, false));
    }
}
