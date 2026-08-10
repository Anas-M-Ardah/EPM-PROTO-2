using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>BR-12 · 02 §12 — transaction lead time and SLA.</summary>
public class SlaLeadTimeTests
{
    private static readonly DateOnly DataDate = new(2026, 8, 2);   // 06 §12

    [Fact]
    public void Worked_example_22_days_is_overdue()
    {
        var r = SlaLeadTime.For(DataDate, new DateOnly(2026, 7, 11));

        Assert.Equal(22, r.LeadDays);
        Assert.True(r.Overdue);
    }

    [Fact]
    public void Inside_the_SLA_is_not_overdue()
    {
        // VO-06 in the fixture: 5 days in, still inside its SLA — which is what
        // proves "pending" and "overdue" are different sets (06 §12).
        var r = SlaLeadTime.For(DataDate, new DateOnly(2026, 7, 28));

        Assert.Equal(5, r.LeadDays);
        Assert.False(r.Overdue);
    }

    [Fact]
    public void Exactly_the_SLA_is_not_yet_overdue()
        => Assert.False(SlaLeadTime.For(DataDate, DataDate.AddDays(-5)).Overdue);

    [Fact]
    public void One_day_past_the_SLA_is_overdue()
        => Assert.True(SlaLeadTime.For(DataDate, DataDate.AddDays(-6)).Overdue);

    [Fact]
    public void Now_is_the_data_date_never_the_wall_clock()
    {
        // D-06. The whole point: measured against 2026-08-02, this letter is
        // 22 days old. Measured against the real clock it would be years out,
        // and every seeded order would look catastrophically late.
        var againstDataDate = SlaLeadTime.For(DataDate, new DateOnly(2026, 7, 11));
        var againstToday = SlaLeadTime.For(DateOnly.FromDateTime(DateTime.Now), new DateOnly(2026, 7, 11));

        Assert.Equal(22, againstDataDate.LeadDays);
        Assert.NotEqual(againstDataDate.LeadDays, againstToday.LeadDays);
    }

    [Fact]
    public void Average_cycle_is_null_when_nothing_has_closed()
        => Assert.Null(SlaLeadTime.AverageCycleDays([]));

    [Fact]
    public void Average_cycle_over_closed_orders()
        => Assert.Equal(20m, SlaLeadTime.AverageCycleDays([18, 22, 20]));
}
