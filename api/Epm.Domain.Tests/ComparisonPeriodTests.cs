using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// P-198 — «مرجع المقارنة», the control الأشكال 25–28 all four name.
///
/// The first two examples are الشكل 25's OWN figures, read off the plate: its
/// four readings are 2026-02-12 (14% / 7%), 2026-03-13 (21% / 12%), 2026-04-14
/// (28% / 19%) and 2026-05-15 (35% / 29%), and the tiles above them read
/// «الإنجاز المادي 35% (+7 نقاط)» and «الإنجاز المالي 38% (+13 نقطة)» against
/// «المقارنة مع القراءة السابقة».
///
/// The +13 is the one worth keeping: the plate's own financial delta is
/// 38 − 29 = 9 by its own history, and it prints 13. That is the reference's
/// scaling hack (`DModProgress` :1432) showing through into the client's
/// document — it computes the delta INSIDE the history series and then rescales
/// it onto the financial module's figure. This build subtracts one series from
/// itself and gets 9. The test states both so the difference is a decision on
/// the record rather than a drift somebody finds later.
/// </summary>
public class ComparisonPeriodTests
{
    /// <summary>الشكل 25's own four readings.</summary>
    private static IReadOnlyList<ComparisonPeriod.Reading> Plate() =>
    [
        new(new DateOnly(2026, 2, 12), 14m, 7m),
        new(new DateOnly(2026, 3, 13), 21m, 12m),
        new(new DateOnly(2026, 4, 14), 28m, 19m),
        new(new DateOnly(2026, 5, 15), 35m, 29m),
    ];

    private static ComparisonPeriod.Result Pick(
        IReadOnlyList<ComparisonPeriod.Reading> readings, string id,
        decimal physicalNow = 35m, decimal financialNow = 38m)
        => ComparisonPeriod.Resolve(readings, physicalNow, financialNow).Single(r => r.Id == id);

    [Fact]
    public void The_previous_reading_is_one_back_from_the_newest_not_the_newest()
    {
        // Four readings on file; the newest (2026-05-15) is where the tiles
        // already are, so «القراءة السابقة» is 2026-04-14.
        var r = Pick(Plate(), ComparisonPeriod.Previous);

        Assert.True(r.Available);
        Assert.Equal("2026-04-14", r.PriorAt);
        Assert.Equal(28m, r.PriorPhysical);
    }

    [Fact]
    public void The_plates_own_physical_delta_is_seven_points()
    {
        // «الإنجاز المادي 35% (+7 نقاط)» — 35 − 28.
        var r = Pick(Plate(), ComparisonPeriod.Previous);

        Assert.Equal(7m, r.PhysicalDelta);
    }

    [Fact]
    public void The_financial_delta_stays_inside_its_own_series()
    {
        // The plate prints +13. Its own history says 38 − 19 = 19 against the
        // reading this span selects, and 38 − 29 = 9 against the newest. The
        // reference reaches 13 only by scaling. Nothing here scales, so the
        // answer is the subtraction: 38 − 19.
        var r = Pick(Plate(), ComparisonPeriod.Previous);

        Assert.Equal(19m, r.PriorFinancial);
        Assert.Equal(19m, r.FinancialDelta);
    }

    [Fact]
    public void Last_quarter_is_three_readings_back()
    {
        var r = Pick(Plate(), ComparisonPeriod.Quarter);

        Assert.True(r.Available);
        Assert.Equal("2026-02-12", r.PriorAt);
        Assert.Equal(21m, r.PhysicalDelta);   // 35 − 14
        Assert.Equal(31m, r.FinancialDelta);  // 38 − 7
    }

    [Fact]
    public void Since_project_start_the_whole_figure_is_the_movement()
    {
        // `DModProgress` :1425 — "since start for a project at 17% has to read
        // +17, not +10". It compares against zero, not against a reading.
        var r = Pick(Plate(), ComparisonPeriod.Start, physicalNow: 17m, financialNow: 22m);

        Assert.True(r.Available);
        Assert.Null(r.PriorAt);
        Assert.Equal(0m, r.PriorPhysical);
        Assert.Equal(17m, r.PhysicalDelta);
        Assert.Equal(22m, r.FinancialDelta);
    }

    [Fact]
    public void One_reading_leaves_nothing_to_compare_the_previous_one_against()
    {
        // A project logged once: the only reading IS where the tiles are.
        var r = Pick([new(new DateOnly(2026, 5, 15), 35m, 29m)], ComparisonPeriod.Previous);

        Assert.False(r.Available);
        Assert.Equal(0m, r.PhysicalDelta);
    }

    [Fact]
    public void An_unavailable_span_is_still_offered_and_carries_its_reason()
    {
        // CLAUDE.md §6 — explain the cap, do not hide the control.
        var spans = ComparisonPeriod.All(readingCount: 1);

        var quarter = spans.Single(s => s.Id == ComparisonPeriod.Quarter);
        Assert.False(quarter.Available);
        Assert.False(string.IsNullOrWhiteSpace(quarter.WhyAr));
        Assert.False(string.IsNullOrWhiteSpace(quarter.WhyEn));

        // And بداية المشروع never needs a reading at all.
        Assert.True(spans.Single(s => s.Id == ComparisonPeriod.Start).Available);
    }

    [Fact]
    public void A_quarter_needs_four_readings_before_it_is_offered()
    {
        Assert.False(ComparisonPeriod.All(3).Single(s => s.Id == ComparisonPeriod.Quarter).Available);
        Assert.True(ComparisonPeriod.All(4).Single(s => s.Id == ComparisonPeriod.Quarter).Available);
    }

    [Fact]
    public void A_span_reaching_past_the_first_reading_lands_on_it()
    {
        // Five readings would be needed for a clean three-back from the newest
        // of four; the fixture has what it has. Clamping to the oldest reading
        // is the earliest comparison the record supports — it never invents one.
        var readings = Plate().Take(2).ToList();   // 2026-02-12, 2026-03-13
        var spans = ComparisonPeriod.All(readings.Count);

        Assert.False(spans.Single(s => s.Id == ComparisonPeriod.Quarter).Available);
        Assert.True(spans.Single(s => s.Id == ComparisonPeriod.Previous).Available);
        Assert.Equal("2026-02-12", Pick(readings, ComparisonPeriod.Previous).PriorAt);
    }

    [Fact]
    public void A_project_with_no_readings_can_still_be_compared_with_its_start()
    {
        var results = ComparisonPeriod.Resolve([], physicalNow: 12m, financialNow: 5m);

        Assert.False(results.Single(r => r.Id == ComparisonPeriod.Previous).Available);
        Assert.False(results.Single(r => r.Id == ComparisonPeriod.Quarter).Available);

        var start = results.Single(r => r.Id == ComparisonPeriod.Start);
        Assert.True(start.Available);
        Assert.Equal(12m, start.PhysicalDelta);
    }

    [Fact]
    public void Progress_that_went_backwards_reads_negative()
    {
        // A re-measurement can lower a percentage. The delta carries the sign
        // rather than being clamped at zero — the movement is what happened.
        var r = Pick(Plate(), ComparisonPeriod.Previous, physicalNow: 25m, financialNow: 19m);

        Assert.Equal(-3m, r.PhysicalDelta);   // 25 − 28
        Assert.Equal(0m, r.FinancialDelta);   // 19 − 19, and flat is not "up"
    }

    [Fact]
    public void Readings_are_ordered_by_date_not_by_the_order_they_arrive_in()
    {
        // `ContractActivityEvents` come back newest-first from the endpoint.
        var reversed = Plate().Reverse().ToList();

        Assert.Equal("2026-04-14", Pick(reversed, ComparisonPeriod.Previous).PriorAt);
    }

    [Fact]
    public void The_default_span_is_the_one_the_plate_draws_selected()
    {
        Assert.Equal(ComparisonPeriod.Previous, ComparisonPeriod.Default);
        Assert.Equal(ComparisonPeriod.Previous, ComparisonPeriod.DefaultFor(readingCount: 4));
    }

    [Fact]
    public void A_project_the_plates_span_does_not_fit_opens_on_one_that_does()
    {
        // PRJ-0148 has one reading. Opening on «القراءة السابقة» would put
        // «لا قراءة سابقة تصلح للمقارنة» on every tile while بداية المشروع sat
        // one click away, unoffered.
        Assert.Equal(ComparisonPeriod.Start, ComparisonPeriod.DefaultFor(readingCount: 1));
        Assert.Equal(ComparisonPeriod.Start, ComparisonPeriod.DefaultFor(readingCount: 0));
    }

    [Fact]
    public void There_is_always_a_valid_default_because_a_project_always_has_a_start()
    {
        for (var n = 0; n <= 6; n++)
        {
            var id = ComparisonPeriod.DefaultFor(n);
            Assert.True(ComparisonPeriod.All(n).Single(s => s.Id == id).Available);
        }
    }
}
