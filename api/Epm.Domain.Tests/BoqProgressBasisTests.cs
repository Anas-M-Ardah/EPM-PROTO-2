using Epm.Api.Domain;

namespace Epm.Domain.Tests;

public class BoqProgressBasisTests
{
    [Fact]
    public void Activity_rollup_matches_bill_reflection_with_different_imported_weights()
    {
        var basis = BoqProgressBasis.For([
            new("A", 900m, 100m), new("A", 100m, 20m), new("B", 100m, 80m)]);
        var billDone = ProgressReflection.For([new(100m, 40m)], 900m, 1m).AchievedAmount
            + ProgressReflection.For([new(20m, 40m), new(80m, 0m)], 100m, 1m).AchievedAmount;
        Assert.Equal(36.8m, ProgressReflection.Rollup(1000m, billDone));
        Assert.Equal(billDone, basis["A"] * .4m + basis["B"] * 0m);
    }

    [Fact]
    public void Unassigned_value_stays_in_the_full_scope_denominator()
    {
        var basis = BoqProgressBasis.For([new("A", 1000m, 50m)]);
        Assert.Equal(1000m, BoqProgressBasis.ScopeTotal(basis, ["A"], ["A"], 1000m));
        Assert.Equal(50m, ProgressReflection.Rollup(1000m, basis["A"]));
    }

    [Fact]
    public void Subtree_uses_only_its_contribution_and_empty_scope_is_safe()
    {
        var basis = BoqProgressBasis.For([new("A", 1000m, 30m), new("B", 1000m, 70m)]);
        Assert.Equal(300m, BoqProgressBasis.ScopeTotal(basis, ["A"], ["A", "B"], 1000m));
        Assert.Equal(0m, BoqProgressBasis.ScopeTotal(basis, [], ["A", "B"], 1000m));
    }
}
