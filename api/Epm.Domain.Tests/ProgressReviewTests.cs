using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// المسار 6 step 4 — «تحقق: النسبة ضمن 0–100 ولا تقل عن القراءة السابقة»,
/// and «ما يتحقق منه النظام: حدود النسبة · عدم التراجع عن القراءة السابقة».
/// </summary>
public class ProgressReviewTests
{
    [Fact]
    public void A_reading_above_the_one_in_force_is_admitted()
    {
        Assert.Null(ProgressReview.Refuse(72m, 60m, isMilestone: false));
    }

    [Fact]
    public void A_reading_below_the_one_in_force_is_refused()
    {
        var refusal = ProgressReview.Refuse(55m, 60m, isMilestone: false);

        Assert.NotNull(refusal);
        // The message NAMES both figures: a refusal that says only "invalid"
        // leaves the person unable to see which of the two numbers is wrong.
        Assert.Contains("55", refusal!.Value.Ar);
        Assert.Contains("60", refusal.Value.Ar);
    }

    [Fact]
    public void A_reading_equal_to_the_one_in_force_is_refused_as_nothing_to_decide()
    {
        Assert.NotNull(ProgressReview.Refuse(60m, 60m, isMilestone: false));
    }

    // REFUSED, NOT CLAMPED (04 §9) — turning 140 into 100 would record a
    // number nobody typed against a person's name.
    [Theory]
    [InlineData(-1)]
    [InlineData(101)]
    [InlineData(140)]
    public void A_reading_outside_zero_to_a_hundred_is_refused(decimal proposed)
    {
        Assert.NotNull(ProgressReview.Refuse(proposed, 0m, isMilestone: false));
    }

    // 02 §2 — a milestone has zero basis and is excluded from every
    // denominator, so 45% on one is a number that earns nothing.
    [Fact]
    public void A_milestone_takes_only_zero_or_one_hundred()
    {
        Assert.Null(ProgressReview.Refuse(100m, 0m, isMilestone: true));
        Assert.NotNull(ProgressReview.Refuse(45m, 0m, isMilestone: true));
    }

    // The range check runs BEFORE the floor check, so a percentage that is
    // both out of range and below the reading in force is reported as the
    // former — which is the fault the person can actually act on.
    [Fact]
    public void An_out_of_range_reading_is_reported_as_out_of_range_not_as_a_regression()
    {
        var refusal = ProgressReview.Refuse(-5m, 60m, isMilestone: false);

        Assert.NotNull(refusal);
        Assert.Contains("بين صفر ومئة", refusal!.Value.Ar);
    }

    [Fact]
    public void Only_a_submitted_reading_is_still_awaiting_a_decision()
    {
        Assert.True(ProgressReview.IsPending(ProgressReview.Submitted));
        Assert.False(ProgressReview.IsPending(ProgressReview.Approved));
        Assert.False(ProgressReview.IsPending(ProgressReview.Returned));
        Assert.False(ProgressReview.IsPending(ProgressReview.Lapsed));
    }
}
