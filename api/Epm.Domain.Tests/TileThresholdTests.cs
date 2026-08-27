using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// P-199 — the band on each of الأشكال 25–28's KPI cards.
///
/// The plate's own figures are the first examples: الشكل 25 draws المادي 35%
/// against مخطط 31% and gives that tile a GREEN edge; المالي 38% beside المادي
/// 35% is green too; التأخر 0 يوم is green; SPI 0.92 draws amber. All four are
/// asserted below against those numbers, so a change to a threshold shows up as
/// a plate this build no longer draws.
/// </summary>
public class TileThresholdTests
{
    // ── الإنجاز المادي مقابل المخطط ──────────────────────────────────────

    [Fact]
    public void The_plates_own_physical_tile_is_ahead_of_plan_and_green()
    {
        // الشكل 25: المادي 35%، مخطط 31%.
        Assert.Equal(TileThreshold.Ok, TileThreshold.AgainstPlan(35m, 31m));
    }

    [Fact]
    public void Behind_plan_at_all_is_amber()
    {
        Assert.Equal(TileThreshold.Warn, TileThreshold.AgainstPlan(30m, 31m));
    }

    [Fact]
    public void More_than_five_points_behind_plan_is_red()
    {
        Assert.Equal(TileThreshold.Bad, TileThreshold.AgainstPlan(25m, 31m));
    }

    [Fact]
    public void Exactly_five_points_behind_is_still_amber()
    {
        // The boundary is stated as "more than", and a band that flips a point
        // early is a band nobody can check against the constant.
        Assert.Equal(TileThreshold.Warn, TileThreshold.AgainstPlan(26m, 31m));
    }

    [Fact]
    public void Exactly_on_plan_is_green()
    {
        Assert.Equal(TileThreshold.Ok, TileThreshold.AgainstPlan(31m, 31m));
    }

    // ── الإنجاز المالي مقابل المادي ──────────────────────────────────────

    [Fact]
    public void The_plates_own_financial_tile_is_green()
    {
        // الشكل 25: المالي 38% beside المادي 35% — three points apart.
        Assert.Equal(TileThreshold.Ok, TileThreshold.SpendAgainstDelivery(38m, 35m));
    }

    [Fact]
    public void Money_far_ahead_of_work_is_red()
    {
        // 60% spent against 35% delivered: an over-payment against work not done.
        Assert.Equal(TileThreshold.Bad, TileThreshold.SpendAgainstDelivery(60m, 35m));
    }

    [Fact]
    public void The_band_is_asymmetric_because_the_two_directions_are_not_alike()
    {
        // 25 points AHEAD of delivery is red …
        Assert.Equal(TileThreshold.Bad, TileThreshold.SpendAgainstDelivery(60m, 35m));
        // … while 25 points BEHIND it is only amber. Money lagging work is a
        // payment problem; money leading it is an exposure.
        Assert.Equal(TileThreshold.Warn, TileThreshold.SpendAgainstDelivery(10m, 35m));
    }

    [Fact]
    public void Ten_points_either_way_is_the_amber_boundary()
    {
        Assert.Equal(TileThreshold.Ok, TileThreshold.SpendAgainstDelivery(45m, 35m));    // exactly 10
        Assert.Equal(TileThreshold.Warn, TileThreshold.SpendAgainstDelivery(46m, 35m));  // 11
    }

    // ── التأخر ───────────────────────────────────────────────────────────

    [Fact]
    public void The_plates_own_delay_tile_is_zero_and_green()
    {
        Assert.Equal(TileThreshold.Ok, TileThreshold.Delay(0));
    }

    [Fact]
    public void A_day_late_is_amber_and_a_fortnight_late_is_red()
    {
        Assert.Equal(TileThreshold.Warn, TileThreshold.Delay(1));
        Assert.Equal(TileThreshold.Warn, TileThreshold.Delay(14));
        Assert.Equal(TileThreshold.Bad, TileThreshold.Delay(15));
    }

    [Fact]
    public void A_programme_running_early_is_green_not_a_fourth_state()
    {
        // The tile's own signed figure says «−9 يوم»; the band says fine.
        Assert.Equal(TileThreshold.Ok, TileThreshold.Delay(-9));
    }

    [Fact]
    public void No_recorded_forecast_bands_nothing()
    {
        // P-09 — unknown and on-time are different claims.
        Assert.Equal(TileThreshold.None, TileThreshold.Delay(null));
    }

    // ── SPI / CPI ────────────────────────────────────────────────────────

    [Fact]
    public void The_plates_own_index_tile_is_amber()
    {
        // الشكل 25: SPI 0.92 against a target of 1.00.
        Assert.Equal(TileThreshold.Warn, TileThreshold.Indices(0.92m));
    }

    [Fact]
    public void The_band_is_the_schedule_index_alone()
    {
        Assert.Equal(TileThreshold.Ok, TileThreshold.Indices(0.95m));
        Assert.Equal(TileThreshold.Ok, TileThreshold.Indices(1.00m));
        Assert.Equal(TileThreshold.Warn, TileThreshold.Indices(0.94m));
    }

    [Fact]
    public void A_missing_index_is_not_a_bad_one()
    {
        Assert.Equal(TileThreshold.None, TileThreshold.Indices(null));
    }

    // ── الأثر والكلفة ────────────────────────────────────────────────────

    [Fact]
    public void The_plates_own_eac_passes_the_revised_cost_and_is_red()
    {
        // الشكل 27: EAC 1,630,434,783 against الكلفة المعدلة 1,500,000,000.
        Assert.Equal(TileThreshold.Bad, TileThreshold.Eac(1_630_434_783m, 1_500_000_000m));
    }

    [Fact]
    public void An_eac_inside_the_revised_cost_is_green()
    {
        Assert.Equal(TileThreshold.Ok, TileThreshold.Eac(1_400_000_000m, 1_500_000_000m));
        Assert.Equal(TileThreshold.Ok, TileThreshold.Eac(1_500_000_000m, 1_500_000_000m));
    }

    [Fact]
    public void The_plates_own_vac_is_negative_and_red()
    {
        // الشكل 27: VAC −130,434,783 — «تجاوز متوقع للموازنة».
        Assert.Equal(TileThreshold.Bad, TileThreshold.Vac(-130_434_783m));
        Assert.Equal(TileThreshold.Ok, TileThreshold.Vac(0m));
    }

    [Fact]
    public void Orders_waiting_to_be_applied_are_what_earn_the_amber()
    {
        // الشكل 27: «+124,375,972 معتمدة» with «64,515,300 قيد الاعتماد».
        Assert.Equal(TileThreshold.Warn, TileThreshold.PendingOrders(64_515_300m));
        // Nothing pending: the approved figure alone is a magnitude.
        Assert.Equal(TileThreshold.None, TileThreshold.PendingOrders(0m));
    }

    [Fact]
    public void The_delay_cost_estimate_can_never_be_red()
    {
        // «تقدير غير تعاقدي لا يُطالَب به» — nothing is owed on it.
        Assert.Equal(TileThreshold.Warn, TileThreshold.DelayCost(5_000_000m));
        Assert.Equal(TileThreshold.Ok, TileThreshold.DelayCost(0m));
        Assert.NotEqual(TileThreshold.Bad, TileThreshold.DelayCost(999_999_999m));
    }

    // ── مخاطر الجدول ─────────────────────────────────────────────────────

    [Fact]
    public void One_activity_with_negative_float_is_already_red()
    {
        Assert.Equal(TileThreshold.Bad, TileThreshold.NegativeFloat(1));
        Assert.Equal(TileThreshold.Ok, TileThreshold.NegativeFloat(0));
    }

    [Fact]
    public void The_at_risk_list_is_a_watchlist_and_stays_amber()
    {
        Assert.Equal(TileThreshold.Warn, TileThreshold.AtRisk(1));
        Assert.Equal(TileThreshold.Warn, TileThreshold.AtRisk(40));
        Assert.Equal(TileThreshold.Ok, TileThreshold.AtRisk(0));
    }
}
