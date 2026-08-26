using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// ملحق الشكل 14 · العرض الفني §15-1 · §23-1 — which figure «الكلفة المعدلة»
/// names, and therefore what الإنجاز المالي is a percentage of (P-44).
/// </summary>
public class BudgetBasisTests
{
    // الشكل 14's own header equation, and the same plate's table footer.
    private const decimal PlateApproved = 1_374_210_115m;
    private const decimal PlateRevised = 1_500_000_000m;
    private const decimal PlateDisbursed = 510_305_195m;
    private const decimal PlateCommitments = 2_156_653_454m;

    [Fact]
    public void The_plates_header_equation()
    {
        // «المقررة 1,374,210,115 + تغييرات معتمدة 125,789,885 = المعدلة
        //  1,500,000,000 − المصروف التراكمي 510,305,195 = المتبقي 989,694,805».
        var b = BudgetBasis.For(PlateApproved, PlateRevised, PlateCommitments);

        Assert.Equal(PlateApproved, b.Approved);
        Assert.Equal(125_789_885m, b.Changes);
        Assert.Equal(PlateRevised, b.Revised);
        Assert.Equal(989_694_805m, BudgetBasis.Balance(b, PlateDisbursed));
    }

    [Fact]
    public void The_plates_spend_percentage_is_34()
    {
        // §23-1 — الإنجاز المالي is «المصروف التراكمي نسبةً إلى الكلفة المعدلة».
        // 510,305,195 / 1,500,000,000 = 34.02%, which the plate prints as 34%.
        var b = BudgetBasis.For(PlateApproved, PlateRevised, PlateCommitments);

        Assert.Equal(34m, Math.Round(BudgetBasis.SpendPct(b, PlateDisbursed)!.Value, 0));
    }

    [Fact]
    public void The_budget_and_the_commitments_are_two_different_questions()
    {
        // This gap IS «أساسا القياس»: −656,653,454 means the contracts have
        // outrun the budget and a cost revision or a مناقلة is due.
        var b = BudgetBasis.For(PlateApproved, PlateRevised, PlateCommitments);

        Assert.Equal(-656_653_454m, BudgetBasis.Gap(b, PlateCommitments));
    }

    [Fact]
    public void The_revised_cost_is_recorded_not_derived_from_the_contracts()
    {
        // The plate's «تغييرات معتمدة» is 125,789,885 while its contracts'
        // applied deltas total 124,375,972. If المعدلة were derived the two
        // would be the same number, and الشكل 19 would not show it being
        // edited 1,477,500,000 → 1,500,000,000.
        var b = BudgetBasis.For(PlateApproved, PlateRevised, commitments: 2_156_653_454m);

        Assert.Equal(BudgetBasis.Recorded, b.Source);
        Assert.NotEqual(124_375_972m, b.Changes);
    }

    // ── the fallback ────────────────────────────────────────────────────────

    [Fact]
    public void With_no_recorded_revised_cost_the_basis_is_commitments()
    {
        // P-09 — a project the finance directorate has not reached yet still
        // has a headline, and the screen says which basis it is on rather than
        // printing an em dash where the figure goes.
        var b = BudgetBasis.For(plannedCost: null, revisedCost: null, commitments: 350_000_000m);

        Assert.Equal(BudgetBasis.Commitments, b.Source);
        Assert.Equal(350_000_000m, b.Approved);
        Assert.Equal(0m, b.Changes);
        Assert.Equal(350_000_000m, b.Revised);
    }

    [Fact]
    public void A_recorded_approved_cost_alone_is_not_a_basis()
    {
        // الشكل 14's equation ENDS on المعدلة and everything downstream divides
        // by it. An approved cost with no revised one is an incomplete record.
        var b = BudgetBasis.For(plannedCost: 1_374_210_115m, revisedCost: null, commitments: 350_000_000m);

        Assert.Equal(BudgetBasis.Commitments, b.Source);
        Assert.Equal(350_000_000m, b.Revised);
    }

    [Fact]
    public void A_revised_cost_alone_opens_the_equation_on_itself()
    {
        // Nothing is invented: with no approved figure the change term is zero
        // rather than a difference against a number nobody recorded.
        var b = BudgetBasis.For(plannedCost: null, revisedCost: 1_500_000_000m, commitments: 350_000_000m);

        Assert.Equal(BudgetBasis.Recorded, b.Source);
        Assert.Equal(1_500_000_000m, b.Approved);
        Assert.Equal(0m, b.Changes);
    }

    [Fact]
    public void On_the_commitments_basis_there_is_no_gap_to_draw()
        => Assert.Null(BudgetBasis.Gap(
            BudgetBasis.For(null, null, 350_000_000m), 350_000_000m));

    [Fact]
    public void The_balance_is_signed_so_an_overrun_shows()
    {
        // A floor of zero would hide exactly the case worth reporting.
        var b = BudgetBasis.For(300_000_000m, 350_000_000m, 350_000_000m);

        Assert.Equal(-20_000_000m, BudgetBasis.Balance(b, 370_000_000m));
    }

    [Fact]
    public void A_zero_basis_has_no_percentage_rather_than_a_zero_one()
    {
        // A zero would assert the project has spent nothing when the truth is
        // that nobody has recorded a budget to spend against.
        var b = BudgetBasis.For(null, null, 0m);

        Assert.Null(BudgetBasis.SpendPct(b, 0m));
    }

    [Fact]
    public void PRJ_0279_reconciles_on_its_recorded_budget()
    {
        // 340,000,000 + 10,000,000 = 350,000,000 − 86,700,000 = 263,300,000.
        var b = BudgetBasis.For(340_000_000m, 350_000_000m, commitments: 350_000_000m);

        Assert.Equal(10_000_000m, b.Changes);
        Assert.Equal(263_300_000m, BudgetBasis.Balance(b, 86_700_000m));
    }
}
