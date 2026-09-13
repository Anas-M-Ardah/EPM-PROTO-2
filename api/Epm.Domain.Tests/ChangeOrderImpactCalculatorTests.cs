using Epm.Api.Domain;

namespace Epm.Domain.Tests;

public class ChangeOrderImpactCalculatorTests
{
    private static ChangeOrderRecord.Line Line(string type = "inc")
        => new("BQ-001", type, 100m, 100m, 10m, 1_000m);

    [Fact]
    public void Zero_delta_is_a_real_zero_impact_and_does_not_trip_the_threshold()
    {
        var result = ChangeOrderImpactCalculator.Line(Line(), new(0m, null, null));

        Assert.Equal(0m, result.ValueImpact);
        Assert.False(result.Column.TripsThreshold);
    }

    [Fact]
    public void Negative_delta_is_normalized_for_decrease_and_remains_rollback_safe()
    {
        var result = ChangeOrderImpactCalculator.Line(Line("dec"), new(-10m, null, null));

        Assert.Equal(900m, result.Column.AmountAfter);
        Assert.Equal(-100m, result.ValueImpact);
        Assert.Equal(10m, result.Column.AtRateQty);
    }

    [Fact]
    public void Recalculation_does_not_persist_or_mutate_the_source_line()
    {
        var source = Line();
        var before = source;
        _ = ChangeOrderImpactCalculator.Line(source, new(25m, null, 12m));

        Assert.Equal(before, source);
    }

    [Fact]
    public void Contract_calculation_keeps_requested_analysis_and_approved_days_separate()
    {
        var result = ChangeOrderImpactCalculator.Contract(
            [new("A", 50m, 60m), new("B", 50m, 50m)],
            new HashSet<string> { "A" }, 30, 21, 14, new DateOnly(2026, 1, 1));

        Assert.Equal(30, result.RequestedDays);
        Assert.Equal(21, result.Time!.AnalysisDays);
        Assert.Equal(14, result.Time.ApprovedDays);
        Assert.Equal(new DateOnly(2026, 1, 15), result.Time.FinishApproved);
    }
}
