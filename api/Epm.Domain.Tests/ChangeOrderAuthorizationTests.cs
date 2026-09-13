using Epm.Api.Domain;

namespace Epm.Domain.Tests;

public class ChangeOrderAuthorizationTests
{
    [Theory]
    [InlineData("draft", true)]
    [InlineData("returned", true)]
    [InlineData("pending", false)]
    [InlineData("approved", false)]
    [InlineData("closed", false)]
    public void Only_the_creator_can_edit_unsubmitted_or_returned_orders(string lifecycle, bool expected)
        => Assert.Equal(expected, ChangeOrderAuthorization.MayEdit(lifecycle, "creator", "creator"));

    [Fact]
    public void A_different_actor_is_denied_even_for_a_draft()
    {
        Assert.False(ChangeOrderAuthorization.MayEdit("draft", "creator", "other"));
        Assert.Contains("منشئ", ChangeOrderAuthorization.DenialReason("draft", "creator", "other"));
    }

    [Fact]
    public void Baseline_and_identity_fields_are_immutable_core_fields()
    {
        Assert.True(ChangeOrderAuthorization.IsCoreField("ContractedQty"));
        Assert.True(ChangeOrderAuthorization.IsCoreField("BeforeAmount"));
        Assert.False(ChangeOrderAuthorization.IsCoreField("ReDeptDeltaQty"));
    }
}
