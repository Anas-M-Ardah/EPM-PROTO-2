using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// المسار 9's wizard — `03 §8` · ملحق الأشكال 37–42.
///
/// The wizard writes no rule of its own: every figure it shows is BR-05's
/// split, BR-07's gates and BR-13's plan, arranged the way الشكل 39 and
/// الشكل 42 arrange them. What is tested here is that arrangement — that the
/// two proposals stay apart, that the gates refuse rather than warn, and that
/// the expected path is built from the ACTUAL conditions.
///
/// الشكل 39's own worked example is the anchor: BQ-005, original 212 نقطة at
/// 18,834, the contractor proposing +120 with an excess rate of 19,000 and the
/// RE department +110 at 18,000.
/// </summary>
public class ChangeOrderWizardTests
{
    private static readonly ChangeOrderRecord.Line Bq005 =
        new("BQ-005", "inc", 212m, 212m, 18_834m, 212m * 18_834m);

    [Fact]
    public void Fig39_the_two_proposals_split_at_the_SAME_threshold_and_differ_only_beyond_it()
    {
        // The plate prints «حد 20% = 42.4 نقطة» once, above both cards: the
        // threshold belongs to the LINE (D-01), not to whoever is proposing.
        var con = ChangeOrderRecord.For(Bq005, new(120m, null, 19_000m));
        var re = ChangeOrderRecord.For(Bq005, new(110m, null, 18_000m));

        Assert.Equal(42.4m, con.Threshold);
        Assert.Equal(42.4m, re.Threshold);
        Assert.Equal(42.4m, con.AtRateQty);
        Assert.Equal(42.4m, re.AtRateQty);

        // …and only the excess differs: 77.6 against 67.6.
        Assert.Equal(77.6m, con.ExcessQty);
        Assert.Equal(67.6m, re.ExcessQty);

        // الشكل 39's «ضمن 20%: 42.4 × 18,834 = +798,562» — identical on both
        // cards, because that half never moves.
        Assert.Equal(798_561.6m, con.AtRateQty * Bq005.BeforeRate);
        Assert.Equal(798_561.6m, re.AtRateQty * Bq005.BeforeRate);

        // «فوق 20%: 77.6 × 19,000 = +1,474,400» and «67.6 × 18,000 = +1,216,800».
        Assert.Equal(1_474_400m, con.ExcessQty * 19_000m);
        Assert.Equal(1_216_800m, re.ExcessQty * 18_000m);

        // Revised quantities 332 and 322, exactly as the plate prints them.
        Assert.Equal(332m, con.QtyAfter);
        Assert.Equal(322m, re.QtyAfter);
    }

    [Fact]
    public void A_party_who_has_typed_nothing_yet_produces_no_figure_at_all()
    {
        // الشكل 38 prints «لم يُدخل» in both proposal columns before anything is
        // typed. A zero there would read as "proposed no change", which is a
        // different statement from "has not proposed".
        var empty = ChangeOrderRecord.For(Bq005, new(null, null, null));

        Assert.Null(empty.QtyAfter);
        Assert.Null(empty.Impact);
        Assert.Null(ChangeOrderRecord.Net([empty]));
    }

    [Fact]
    public void The_excess_rate_is_a_PROPOSAL_and_the_split_still_stands_without_one()
    {
        // `02 §5` — the binding rate is fixed by لجنة تثبيت الأسعار and is never
        // entered in the wizard. Until a party proposes one, the excess is
        // valued at the ORIGINAL rate so the reader sees a floor rather than a
        // blank, and the line still reports that it trips the threshold.
        var noRate = ChangeOrderRecord.For(Bq005, new(120m, null, null));

        Assert.True(noRate.TripsThreshold);
        Assert.Equal(77.6m, noRate.ExcessQty);
        Assert.Equal(212m * 18_834m + 120m * 18_834m, noRate.AmountAfter);
    }

    [Fact]
    public void Submission_is_REFUSED_not_warned_when_a_decrease_exceeds_what_is_left()
    {
        // `02 §7`, and each proposal is judged separately: the RE department's
        // decrease is valid here and the contractor's is not.
        var order = new ChangeOrderGates.Order("CNT-0279",
        [
            new("BQ-001", "CNT-0279", "dec",
                ContractedQty: 100m, ExecutedQty: 70m,
                ContractorDeltaQty: 40m, ReDeptDeltaQty: 25m),
        ], []);

        var issues = ChangeOrderGates.Validate(order);

        Assert.Single(issues);
        Assert.Equal("decrease-exceeds", issues[0].Gate);
        Assert.Equal("BQ-001", issues[0].Ref);
        Assert.False(ChangeOrderGates.CanSubmit(order));
    }

    [Fact]
    public void An_empty_order_cannot_be_submitted_even_though_every_line_is_valid()
    {
        // There are no lines to be invalid. BR-07 names this gate on its own,
        // which is what stops "no blocking issue" from meaning "submittable".
        var order = new ChangeOrderGates.Order("CNT-0279", [], []);

        Assert.Contains(ChangeOrderGates.Validate(order), i => i.Gate == "empty");
    }

    [Fact]
    public void Fig42_the_expected_path_is_built_from_the_ACTUAL_conditions()
    {
        // A line beyond 20% puts تثبيت الأسعار in the path; a financial impact
        // puts المصادقة والتخصيص in it. `03 §8` step 5 requires exactly this —
        // the path is rendered from the order, not printed as a fixed list.
        var full = WorkflowMachine.Plan(tripsThreshold: true, needsEndorsement: true);
        Assert.All(full, s => Assert.True(s.Active));
        Assert.Equal(6, full.Count);

        // Neither condition holds → the same six rows, two of them SKIPPED and
        // each carrying its reason (`03 §2`). They are never dropped.
        var bare = WorkflowMachine.Plan(tripsThreshold: false, needsEndorsement: false);
        Assert.Equal(6, bare.Count);
        Assert.Equal(4, bare.Count(s => s.Active));
        Assert.All(bare.Where(s => !s.Active), s => Assert.False(string.IsNullOrWhiteSpace(s.SkipAr)));

        // The two conditional ones are 3 and 4, and no other.
        Assert.Equal([3, 4], bare.Where(s => !s.Active).Select(s => s.Def.No));
    }

    [Fact]
    public void A_submitted_order_enters_at_the_first_APPLICABLE_stage()
    {
        // Stage 1 is unconditional, so it is always the entry point — but the
        // wizard reads it off the plan rather than assuming, because a skipped
        // stage owns nothing and may not hold an order.
        var plan = WorkflowMachine.Plan(tripsThreshold: false, needsEndorsement: false);

        Assert.Equal(1, plan.First(s => s.Active).Def.No);
        Assert.Equal("دائرة المهندس المقيم", plan.First(s => s.Active).Def.Owner);
    }

    [Fact]
    public void An_extension_past_a_quarter_of_the_contract_duration_needs_endorsement()
    {
        // `03 §3` — the endorsement review committee answers only then. On a
        // 486-day contract that is 121 days, and 120 is not it.
        Assert.True(WorkflowMachine.ExceedsQuarterDuration(122, 486));
        Assert.False(WorkflowMachine.ExceedsQuarterDuration(120, 486));
    }
}
