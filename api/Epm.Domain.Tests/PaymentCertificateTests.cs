using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// المستخلص — the four figures per certificate, the paid-only aggregates, and
/// §15-2's two spend ceilings.
///
/// The rows below are `PRJ-0279`'s certificates as `06 §12` fixes them, stated
/// inline: a test that read the fixture could be made to pass by a wrong
/// fixture (CLAUDE.md §4).
/// </summary>
public class PaymentCertificateTests
{
    private static PaymentCertificate.Line L(
        string kind, string status, decimal net, decimal retention = 0m,
        decimal recovery = 0m, int? paidYear = null)
        => new(kind, status, net, retention, recovery, paidYear);

    /// <summary>`PRJ-0279` — both contracts, exactly as the fixture seeds them.</summary>
    private static readonly PaymentCertificate.Line[] Prj0279 =
    [
        // CNT-0279 — advance 24,000,000 paid; interim 52,700,000 paid holding
        // 3,100,000 and recovering 6,200,000; interim 41,225,000 CERTIFIED only.
        L("advance", "paid", 24_000_000m, 0m, 0m, 2025),
        L("interim", "paid", 52_700_000m, 3_100_000m, 6_200_000m, 2026),
        L("interim", "certified", 41_225_000m, 2_425_000m, 4_850_000m),
        // CNT-0279-EM — advance 10,000,000 paid; interim 12,002,000 CERTIFIED.
        L("advance", "paid", 10_000_000m, 0m, 0m, 2025),
        L("interim", "certified", 12_002_000m, 706_000m, 1_412_000m),
    ];

    // ── the four figures ────────────────────────────────────────────────────

    [Fact]
    public void Net_is_gross_less_retention_less_advance_recovery()
        => Assert.Equal(52_700_000m, PaymentCertificate.Net(62_000_000m, 3_100_000m, 6_200_000m));

    [Fact]
    public void An_advance_deducts_nothing_so_its_net_is_its_gross()
        => Assert.Equal(24_000_000m, PaymentCertificate.Net(24_000_000m, 0m, 0m));

    // ── the split partitions the NET, not the gross ─────────────────────────

    [Fact]
    public void The_three_expense_items_sum_to_the_net()
    {
        // ملحق الشكل 16 — the civil share of the plate's PAY-102:
        // 82,008,646 + 25,774,146 + 9,372,416 = 117,155,208.
        Assert.True(PaymentCertificate.SplitMatches(
            117_155_208m, 82_008_646m, 25_774_146m, 9_372_416m));
    }

    [Fact]
    public void A_split_that_sums_to_the_GROSS_is_refused()
    {
        // The invariant `Payment.cs` states in as many words: retention and
        // advance recovery are withheld from the whole certificate, not from
        // one cost item, so they are deducted BEFORE the split. Splitting the
        // gross of the fixture's second certificate leaves 9,300,000 over.
        Assert.False(PaymentCertificate.SplitMatches(
            52_700_000m, 49_000_000m + 9_300_000m, 2_500_000m, 1_200_000m));
    }

    [Fact]
    public void One_fils_of_rounding_does_not_refuse_a_correct_split()
        => Assert.True(PaymentCertificate.SplitMatches(100m, 33.33m, 33.33m, 33.35m));

    [Fact]
    public void Two_fils_does()
        => Assert.False(PaymentCertificate.SplitMatches(100m, 33.33m, 33.33m, 33.36m));

    // ── paid is not certified, anywhere (P-26) ──────────────────────────────

    [Fact]
    public void Disbursed_counts_paid_certificates_only()
    {
        // 24,000,000 + 52,700,000 + 10,000,000. The two certified-and-unpaid
        // rows are 53,227,000 of money owed and none of it has moved.
        Assert.Equal(86_700_000m, PaymentCertificate.Disbursed(Prj0279));
        Assert.Equal(53_227_000m, PaymentCertificate.CertifiedUnpaid(Prj0279));
    }

    [Fact]
    public void Retention_held_counts_paid_certificates_only()
    {
        // 3,100,000 — NOT 6,231,000. Counting the certified rows would report
        // retention the ministry is not yet holding, because nothing has been
        // withheld from a payment that has not been made.
        Assert.Equal(3_100_000m, PaymentCertificate.RetentionHeld(Prj0279));
    }

    [Fact]
    public void Advance_outstanding_is_advances_paid_less_what_paid_certificates_recovered()
    {
        // (24,000,000 + 10,000,000) − 6,200,000 = 27,800,000. The certified
        // rows' 6,262,000 of recovery has not happened: a recovery happens when
        // money moves.
        Assert.Equal(27_800_000m, PaymentCertificate.AdvanceOutstanding(Prj0279));
    }

    [Fact]
    public void Advance_outstanding_never_goes_below_zero()
    {
        // Over-recovery is a correction to be found, not a debt the ministry
        // owes the contractor.
        PaymentCertificate.Line[] over =
        [
            L("advance", "paid", 10_000_000m),
            L("interim", "paid", 40_000_000m, 0m, 12_000_000m),
        ];
        Assert.Equal(0m, PaymentCertificate.AdvanceOutstanding(over));
    }

    [Fact]
    public void Spend_in_a_year_is_by_the_date_the_money_moved()
    {
        // P-92 — the year's spend is Σ payments by PaidDate, never a stored
        // figure. 2025 took the two advances; 2026 has taken one interim.
        Assert.Equal(34_000_000m, PaymentCertificate.SpentIn(Prj0279, 2025));
        Assert.Equal(52_700_000m, PaymentCertificate.SpentIn(Prj0279, 2026));
        Assert.Equal(0m, PaymentCertificate.SpentIn(Prj0279, 2024));
    }

    // ── §15-2's two ceilings ────────────────────────────────────────────────

    [Fact]
    public void An_amount_inside_both_ceilings_clears()
        => Assert.Null(PaymentCertificate.Ceilings(
            10_000_000m,
            spentThisYear: 52_700_000m, annualAllocation: 90_000_000m,
            spentToDate: 86_700_000m, revisedCost: 350_000_000m));

    [Fact]
    public void The_annual_allocation_is_the_first_ceiling()
    {
        // «الصرف السنوي لا يتجاوز التخصيص السنوي». 52,700,000 spent of a
        // 90,000,000 release; a 40,000,000 certificate would make it 92,700,000.
        var breach = PaymentCertificate.Ceilings(
            40_000_000m,
            spentThisYear: 52_700_000m, annualAllocation: 90_000_000m,
            spentToDate: 86_700_000m, revisedCost: 350_000_000m);

        Assert.NotNull(breach);
        Assert.Equal("allocation", breach.Key);
        Assert.Equal(90_000_000m, breach.Ceiling);
        Assert.Equal(92_700_000m, breach.Would);
        Assert.Equal(2_700_000m, breach.Excess);
    }

    [Fact]
    public void The_revised_cost_is_the_second()
    {
        // «المصروف التراكمي لا يتجاوز الكلفة المعدلة». 86,700,000 of 350,000,000
        // spent; a 300,000,000 certificate would carry it to 386,700,000.
        var breach = PaymentCertificate.Ceilings(
            300_000_000m,
            spentThisYear: 0m, annualAllocation: null,
            spentToDate: 86_700_000m, revisedCost: 350_000_000m);

        Assert.NotNull(breach);
        Assert.Equal("revised-cost", breach.Key);
        Assert.Equal(36_700_000m, breach.Excess);
    }

    [Fact]
    public void The_allocation_is_reported_first_when_both_are_breached()
    {
        // مسار 8 step 4 states them in that order, and one message naming the
        // nearer ceiling is more use than two.
        var breach = PaymentCertificate.Ceilings(
            300_000_000m,
            spentThisYear: 52_700_000m, annualAllocation: 90_000_000m,
            spentToDate: 86_700_000m, revisedCost: 350_000_000m);

        Assert.Equal("allocation", breach!.Key);
    }

    [Fact]
    public void Exactly_the_ceiling_is_allowed()
    {
        // «لا يتجاوز» — spending the allocation to the fils is what an
        // allocation is for. Only passing it is refused.
        Assert.Null(PaymentCertificate.Ceilings(
            37_300_000m,
            spentThisYear: 52_700_000m, annualAllocation: 90_000_000m,
            spentToDate: 0m, revisedCost: null));
    }

    [Fact]
    public void An_absent_ceiling_is_not_a_ceiling_of_zero()
    {
        // P-09. A project the finance directorate has not reached yet records
        // no allocation and no revised cost; refusing every certificate on it
        // would block the work rather than protect the budget.
        Assert.Null(PaymentCertificate.Ceilings(
            999_000_000m,
            spentThisYear: 0m, annualAllocation: null,
            spentToDate: 0m, revisedCost: null));
    }
}
