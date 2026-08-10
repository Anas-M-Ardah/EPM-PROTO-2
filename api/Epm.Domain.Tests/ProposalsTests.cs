using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>BR-06 · 02 §6 — two proposals, one approved value.</summary>
public class ProposalsTests
{
    [Fact]
    public void The_RE_department_figure_governs_once_entered()
    {
        var g = Proposals.Which(new(12_000_000m, 11_400_000m, null));

        Assert.Equal(11_400_000m, g.Value);
        Assert.Equal("re-dept", g.Source);
        Assert.Equal(-600_000m, g.Divergence);
        Assert.True(g.IsIndicative);      // تقديرية until the committee decides
    }

    [Fact]
    public void Before_the_RE_department_enters_one_the_contractors_is_shown_and_labelled()
    {
        var g = Proposals.Which(new(12_000_000m, null, null));

        Assert.Equal(12_000_000m, g.Value);
        Assert.Equal("contractor", g.Source);
        Assert.True(g.IsIndicative);
    }

    [Fact]
    public void Only_the_pricing_committees_approved_value_is_settled()
    {
        // D-08 — entered at financial review, and only then does the revised
        // contract value stop being تقديرية.
        var g = Proposals.Which(new(12_000_000m, 11_400_000m, 11_000_000m));

        Assert.Equal(11_000_000m, g.Value);
        Assert.Equal("approved", g.Source);
        Assert.False(g.IsIndicative);
    }

    [Fact]
    public void Divergence_is_shown_only_when_the_two_proposals_differ()
    {
        Assert.True(Proposals.Diverges(new(12_000_000m, 11_400_000m, null)));
        Assert.False(Proposals.Diverges(new(12_000_000m, 12_000_000m, null)));
        Assert.False(Proposals.Diverges(new(12_000_000m, null, null)));
    }

    [Fact]
    public void Awaiting_financial_review_until_an_approved_value_exists()
    {
        Assert.True(Proposals.AwaitingFinancialReview(new(12_000_000m, 11_400_000m, null)));
        Assert.False(Proposals.AwaitingFinancialReview(new(12_000_000m, 11_400_000m, 11_000_000m)));
    }

    [Fact]
    public void An_empty_set_governs_nothing()
    {
        var g = Proposals.Which(new(null, null, null));

        Assert.Null(g.Value);
        Assert.Equal("none", g.Source);
    }
}
