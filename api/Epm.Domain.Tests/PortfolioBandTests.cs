using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// The band SCR-E1 and SCR-E8 both draw. These tests are about the two things
/// that make it a rule rather than a projection: it WEIGHTS, and it refuses to
/// turn a missing input into a zero.
/// </summary>
public class PortfolioBandTests
{
    private static readonly DateOnly DataDate = new(2026, 8, 2);

    private static PortfolioBand.Proj Project(string id, string status = "ongoing", string branch = "")
        => new(id, "مشروع " + id, "Project " + id, status, "ub", branch, DataDate);

    private static PortfolioBand.Contr Contract(
        string id, string projectId, decimal effective,
        decimal billed = 0m, decimal executed = 0m,
        DateOnly? forecastFinish = null, int duration = 365)
        => new(id, projectId, effective, effective, billed, executed,
            new DateOnly(2025, 1, 1), new DateOnly(2026, 1, 1), forecastFinish, duration, 0m);

    [Fact]
    public void Physical_progress_is_weighted_by_the_BILL_not_averaged_across_projects()
    {
        // A 300m project at 10% and a 30m project at 100%. The mean of the two
        // percentages is 55%; the weighted answer is 18.18%. A dashboard that
        // reported 55% would be giving the small project ten times its say.
        var band = PortfolioBand.Derive(
            [Project("P1"), Project("P2")],
            [
                Contract("C1", "P1", 300_000_000m, billed: 300_000_000m, executed: 30_000_000m),
                Contract("C2", "P2", 30_000_000m, billed: 30_000_000m, executed: 30_000_000m),
            ],
            [], [], []);

        Assert.Equal(18.18m, band.Physical);
    }

    [Fact]
    public void A_contract_with_no_bill_of_quantities_leaves_physical_NULL_not_zero()
    {
        var band = PortfolioBand.Derive(
            [Project("P1")], [Contract("C1", "P1", 100_000_000m)], [], [], []);

        // Nothing is billed, so BR-04 has no weights and no denominator.
        // "Not measured" is not "not started" (P-09).
        Assert.Null(band.Physical);
        Assert.Null(band.Projects.Single().Physical);
    }

    [Fact]
    public void With_no_baseline_there_is_no_planned_figure_and_therefore_no_SPI()
    {
        var band = PortfolioBand.Derive(
            [Project("P1")],
            [Contract("C1", "P1", 100_000_000m, billed: 100_000_000m, executed: 40_000_000m)],
            [], [], []);   // no activities

        Assert.Equal(40m, band.Physical);
        Assert.Null(band.Planned);
        Assert.Null(band.Spi);
    }

    [Fact]
    public void The_spend_ratio_counts_PAID_money_against_the_EFFECTIVE_value()
    {
        var band = PortfolioBand.Derive(
            [Project("P1")],
            [Contract("C1", "P1", 200_000_000m)],
            [new("C1", new DateOnly(2026, 3, 1), 50_000_000m)],
            [], []);

        Assert.Equal(25m, band.Financial);
        Assert.Equal(50_000_000m, band.ActualCost);
    }

    [Fact]
    public void A_project_is_as_late_as_its_LATEST_finishing_contract()
    {
        // Two contracts, one 10 days late and one 100. The project is 100 days
        // late — an average would report 55 and describe neither contract.
        var band = PortfolioBand.Derive(
            [Project("P1")],
            [
                Contract("C1", "P1", 50_000_000m, forecastFinish: new DateOnly(2026, 1, 11)),
                Contract("C2", "P1", 50_000_000m, forecastFinish: new DateOnly(2026, 4, 11)),
            ],
            [], [], []);

        Assert.Equal(100, band.Projects.Single().DelayDays);
    }

    [Fact]
    public void A_project_with_no_forecast_has_a_NULL_delay_rather_than_zero()
    {
        var band = PortfolioBand.Derive(
            [Project("P1")], [Contract("C1", "P1", 50_000_000m)], [], [], []);

        // Null delay means "no forecast is recorded", which is a different
        // claim from "finishing on time" — and ExecutiveSignal treats it so.
        Assert.Null(band.Projects.Single().DelayDays);
        Assert.Equal(ExecutiveSignal.Green, band.Projects.Single().Signal);
    }

    [Fact]
    public void All_three_signal_bands_come_back_even_when_two_are_empty()
    {
        var band = PortfolioBand.Derive(
            [Project("P1"), Project("P2")],
            [Contract("C1", "P1", 1m), Contract("C2", "P2", 1m)],
            [], [], []);

        Assert.Equal(3, band.Signals.Count);
        Assert.Equal(2, band.Signals.Single(s => s.Code == "green").Count);
        Assert.Equal(100, band.Signals.Single(s => s.Code == "green").Share);
        Assert.Equal(0, band.Signals.Single(s => s.Code == "red").Count);
    }

    [Fact]
    public void An_empty_scope_still_returns_three_bands_and_no_division_by_zero()
    {
        var band = PortfolioBand.Derive([], [], [], [], []);

        Assert.Equal(3, band.Signals.Count);
        Assert.All(band.Signals, s => Assert.Equal(0, s.Share));
        Assert.Null(band.Physical);
        Assert.Null(band.Financial);
        Assert.Empty(band.ProgressCurve);
        Assert.Empty(band.CostCurve);
    }

    [Fact]
    public void With_nothing_recorded_the_curves_are_EMPTY_rather_than_flat_at_zero()
    {
        // A row per month, all zeros, draws a line along the axis and reads as
        // "nothing has happened". The truth is "nothing has been recorded" and
        // the screen has a different message for that (P-140).
        var band = PortfolioBand.Derive(
            [Project("P1")], [Contract("C1", "P1", 100_000_000m)], [], [], []);

        Assert.Empty(band.ProgressCurve);
        Assert.Empty(band.CostCurve);
    }

    [Fact]
    public void One_recorded_update_is_enough_to_draw_the_progress_curve()
    {
        var band = PortfolioBand.Derive(
            [Project("P1")],
            [Contract("C1", "P1", 100_000_000m, billed: 100_000_000m, executed: 40_000_000m)],
            [],
            [new("C1", new DateOnly(2025, 6, 15), 20m)],
            []);

        Assert.NotEmpty(band.ProgressCurve);

        // The actual line does not start before the first update — a null
        // breaks the line rather than drawing a zero.
        Assert.Null(band.ProgressCurve[0].ActCum);
    }

    [Fact]
    public void A_payment_alone_draws_the_cost_curve_and_the_line_starts_where_the_money_did()
    {
        var band = PortfolioBand.Derive(
            [Project("P1")],
            [Contract("C1", "P1", 100_000_000m)],
            [new("C1", new DateOnly(2025, 9, 30), 25_000_000m)],
            [], []);

        Assert.NotEmpty(band.CostCurve);
        Assert.Null(band.CostCurve[0].ActCum);
        Assert.Equal(25m, band.CostCurve[^1].ActCum);
    }

    [Fact]
    public void The_data_date_is_the_LATEST_one_in_scope_never_DateTime_Now()
    {
        var band = PortfolioBand.Derive(
            [
                Project("P1") with { DataDate = new DateOnly(2026, 5, 1) },
                Project("P2") with { DataDate = new DateOnly(2026, 8, 2) },
            ],
            [], [], [], []);

        // The earliest would report every project as of the least current one.
        Assert.Equal(new DateOnly(2026, 8, 2), band.AsOf);
    }

    [Fact]
    public void Approved_and_revised_cost_are_reported_separately()
    {
        // The original sum and the effective sum are different facts, and the
        // «مقارنة الكلف» panel exists to show the gap between them.
        var band = PortfolioBand.Derive(
            [Project("P1")],
            [new("C1", "P1", 400_000_000m, 451_200_000m, 0m, 0m,
                new DateOnly(2025, 1, 1), new DateOnly(2026, 1, 1), null, 365, 0m)],
            [], [], []);

        Assert.Equal(400_000_000m, band.ApprovedCost);
        Assert.Equal(451_200_000m, band.RevisedCost);
    }

    [Fact]
    public void Variance_is_null_when_either_side_is_missing()
    {
        Assert.Null(PortfolioBand.Variance(null, 39m));
        Assert.Null(PortfolioBand.Variance(31m, null));

        // Behind is negative, ahead is positive, and it is stated in points.
        Assert.Equal(-8m, PortfolioBand.Variance(31m, 39m));
        Assert.Equal(8m, PortfolioBand.Variance(39m, 31m));
    }
}
