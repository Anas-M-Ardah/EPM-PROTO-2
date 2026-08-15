using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// الشكل 43 — «الخطورة = الاحتمالية × التأثير».
///
/// The plate's own seven rows ARE the specification: nothing in `01`–`06`
/// defines a risk model, so these are the only worked examples in existence and
/// they are what fix the bands.
/// </summary>
public class RiskSeverityTests
{
    // probability × impact, exactly as الشكل 43 prints them
    private static readonly (string Code, int P, int I, string Expected)[] Plate =
    [
        ("RSK-01", RiskSeverity.Medium, RiskSeverity.High,   "high"),
        ("RSK-02", RiskSeverity.Low,    RiskSeverity.Low,    "low"),
        ("RSK-03", RiskSeverity.Medium, RiskSeverity.Low,    "low"),
        ("RSK-04", RiskSeverity.Low,    RiskSeverity.Low,    "low"),
        ("RSK-05", RiskSeverity.Low,    RiskSeverity.High,   "medium"),
        ("RSK-06", RiskSeverity.High,   RiskSeverity.Low,    "medium"),
        ("RSK-07", RiskSeverity.Low,    RiskSeverity.Medium, "low"),
    ];

    [Fact]
    public void Every_row_on_the_plate_lands_on_the_band_the_plate_prints()
    {
        foreach (var (code, p, i, expected) in Plate)
            Assert.Equal(expected, RiskSeverity.For(p, i));
    }

    [Fact]
    public void The_bands_are_fixed_by_two_rows_that_score_the_same_and_one_that_does_not()
    {
        // RSK-05 (1×3) and RSK-06 (3×1) both score 3 and both read متوسط, while
        // RSK-03 scores 2 and reads منخفض. That pins the lower boundary between
        // 2 and 3 — no other banding satisfies all three.
        Assert.Equal(3, RiskSeverity.Score(RiskSeverity.Low, RiskSeverity.High));
        Assert.Equal(3, RiskSeverity.Score(RiskSeverity.High, RiskSeverity.Low));
        Assert.Equal("medium", RiskSeverity.For(RiskSeverity.Low, RiskSeverity.High));
        Assert.Equal("medium", RiskSeverity.For(RiskSeverity.High, RiskSeverity.Low));
        Assert.Equal("low", RiskSeverity.For(RiskSeverity.Medium, RiskSeverity.Low));
    }

    [Fact]
    public void Severity_is_symmetric_because_it_is_a_product()
    {
        for (var p = 1; p <= 3; p++)
            for (var i = 1; i <= 3; i++)
                Assert.Equal(RiskSeverity.For(p, i), RiskSeverity.For(i, p));
    }

    [Fact]
    public void The_worst_pair_is_high_and_the_best_is_low()
    {
        Assert.Equal("high", RiskSeverity.For(RiskSeverity.High, RiskSeverity.High));
        Assert.Equal("high", RiskSeverity.For(RiskSeverity.Medium, RiskSeverity.High));
        Assert.Equal("low", RiskSeverity.For(RiskSeverity.Low, RiskSeverity.Low));
    }

    [Fact]
    public void The_plate_counts_its_own_tabs_the_same_way()
    {
        // «الكل 7 · عالي 1 · متوسط 2 · منخفض 4».
        var bands = RiskSeverity.Bands(Plate.Select(x => (x.P, x.I)).ToList());

        Assert.Equal(("high", 1), bands[0]);
        Assert.Equal(("medium", 2), bands[1]);
        Assert.Equal(("low", 4), bands[2]);
        Assert.Equal(7, bands.Sum(b => b.Count));
    }

    [Fact]
    public void A_band_with_nothing_in_it_is_still_a_band()
    {
        // A tab that vanishes when empty makes the set of bands look like it
        // changed — and «عالي 0» is a fact worth showing.
        var bands = RiskSeverity.Bands([(RiskSeverity.Low, RiskSeverity.Low)]);

        Assert.Equal(3, bands.Count);
        Assert.Equal(0, bands.Single(b => b.Band == "high").Count);
    }
}
