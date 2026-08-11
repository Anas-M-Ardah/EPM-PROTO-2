using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>BR-02 · 02 §2 — activity absolute and relative weight.</summary>
public class ScheduleWeightsTests
{
    [Fact]
    public void Worked_example_A1_absolute_36_relative_60()
    {
        // Project total 100; Zone A (60) contains A1 (36) and A2 (24).
        var a1 = ScheduleWeights.For(36m, 100m, 60m);

        Assert.Equal(36m, a1.Absolute);
        Assert.Equal(60m, a1.Relative);
    }

    [Fact]
    public void Worked_example_A2_absolute_24_relative_40()
    {
        var a2 = ScheduleWeights.For(24m, 100m, 60m);

        Assert.Equal(24m, a2.Absolute);
        Assert.Equal(40m, a2.Relative);
    }

    [Fact]
    public void Worked_example_Zone_A_node_is_60_of_the_root()
    {
        // A root node's parent is the whole schedule.
        var zoneA = ScheduleWeights.For(60m, 100m, 100m);

        Assert.Equal(60m, zoneA.Absolute);
        Assert.Equal(60m, zoneA.Relative);
    }

    [Fact]
    public void Milestone_with_zero_basis_gets_zero_weight()
    {
        var m = ScheduleWeights.For(0m, 100m, 60m);

        Assert.Equal(0m, m.Absolute);
        Assert.Equal(0m, m.Relative);
    }

    [Fact]
    public void Empty_schedule_does_not_divide_by_zero()
    {
        var w = ScheduleWeights.For(10m, 0m, 0m);

        Assert.Equal(0m, w.Absolute);
        Assert.Equal(0m, w.Relative);
    }

    [Fact]
    public void Relative_and_absolute_are_the_same_number_only_at_the_root()
    {
        // The failure this guards against is real and was measured on SCR-W5:
        // passing the node's OWN divisor to its children makes every activity's
        // relative weight equal its absolute one, and `02 §2`'s whole example
        // collapses. Zone A's children must divide by 60, not by 100.
        var childOfZoneA = ScheduleWeights.For(36m, 100m, 60m);
        var zoneAItself = ScheduleWeights.For(60m, 100m, 100m);

        Assert.NotEqual(childOfZoneA.Absolute, childOfZoneA.Relative);
        Assert.Equal(zoneAItself.Absolute, zoneAItself.Relative);
    }

    [Fact]
    public void The_fixture_schedule_reproduces_the_same_shape()
    {
        // CNT-0279 node "1" holds A1 12,000,000 · A2 18,000,000 · A3 33,600,000
        // = 63,600,000 of the contract's 240,000,000.
        var node = ScheduleWeights.For(63_600_000m, 240_000_000m, 240_000_000m);
        var a1 = ScheduleWeights.For(12_000_000m, 240_000_000m, 63_600_000m);

        Assert.Equal(26.50m, Math.Round(node.Absolute, 2));
        Assert.Equal(5.00m, Math.Round(a1.Absolute, 2));
        Assert.Equal(18.87m, Math.Round(a1.Relative, 2));
    }
}
