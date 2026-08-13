using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// الشكل 6 · العرض الفني §11-1 — the register's own two rules.
/// Worked examples are the appendix's own figures, inline, so a wrong fixture
/// cannot make these pass (CLAUDE.md §4).
/// </summary>
public class ContractRollupTests
{
    [Fact]
    public void Worked_example_the_two_contracts_of_figure_6_weight_to_28_percent()
    {
        // الشكل 6: عقد الأعمال المدنية 1,512,077,482 at 31% and عقد الأعمال
        // الكهروميكانيكية 587,673,564 (نافذة) at 21% → «الإنجاز المادي المرجّح 28%».
        var w = ContractRollup.WeightedPhysical([
            new(1_512_077_482m, 31m),
            new(587_673_564m, 21m),
        ]);

        Assert.NotNull(w);
        Assert.Equal(28m, Math.Round(w.Value, 0, MidpointRounding.AwayFromZero));
        Assert.Equal(28.2012m, Math.Round(w.Value, 4, MidpointRounding.AwayFromZero));
    }

    [Fact]
    public void It_weights_by_value_and_is_not_the_mean_of_the_percentages()
    {
        // 900,000,000 at 0% beside 100,000,000 at 100%. The mean is 50%.
        // The project is 10% done.
        var w = ContractRollup.WeightedPhysical([
            new(900_000_000m, 0m),
            new(100_000_000m, 100m),
        ]);

        Assert.Equal(10m, w);
    }

    [Fact]
    public void An_unmeasurable_contract_enters_neither_term()
    {
        // The big contract has no bill imported. Counting it as 0% would report
        // the project at 25% when everything measured is finished (P-09).
        var w = ContractRollup.WeightedPhysical([
            new(300_000_000m, null),
            new(100_000_000m, 100m),
        ]);

        Assert.Equal(100m, w);
    }

    [Fact]
    public void Nothing_measurable_is_null_rather_than_zero()
    {
        var w = ContractRollup.WeightedPhysical([
            new(300_000_000m, null),
            new(100_000_000m, null),
        ]);

        Assert.Null(w);
    }

    [Fact]
    public void No_contracts_is_null_rather_than_dividing()
        => Assert.Null(ContractRollup.WeightedPhysical([]));

    [Fact]
    public void Worked_example_total_contract_cost_is_the_three_expense_items()
    {
        // الشكل 8 — «الإحالة 479,400,000 والاحتياط 25,500,000 والإشراف والمراقبة
        // 15,300,000 وكلفة العقد الكلي 520,200,000».
        Assert.Equal(
            520_200_000m,
            ContractRollup.TotalCost(479_400_000m, 25_500_000m, 15_300_000m));
    }

    [Fact]
    public void Worked_example_the_card_spend_percentage_is_22()
    {
        // الشكل 7 — «المصروف 112,841,143 (22%)» and «22 % من كلفة العقد الكلية».
        // Against the EFFECTIVE value (587,673,564) the same spend is 19%, which
        // is the figure this rule exists to stop the card reporting (P-44).
        var pct = ContractRollup.SpentPct(520_200_000m, 112_841_143m);

        Assert.NotNull(pct);
        Assert.Equal(22m, Math.Round(pct.Value, 0, MidpointRounding.AwayFromZero));
    }

    [Fact]
    public void A_contract_with_no_amounts_yet_has_no_spend_percentage()
        => Assert.Null(ContractRollup.SpentPct(0m, 0m));
}
