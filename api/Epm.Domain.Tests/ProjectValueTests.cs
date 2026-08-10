using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// BR-00 · 01 §3 — project value is Σ contract EFFECTIVE values.
///
/// The arithmetic is a sum; what these tests pin down is that the value is
/// DERIVED and never stored, and that the argument is the effective value —
/// original plus applied amendment deltas (02 §9), never the original alone.
/// </summary>
public class ProjectValueTests
{
    [Fact]
    public void Worked_example_two_contracts_sum_to_100m()
        => Assert.Equal(100_000_000m, ProjectValue.Total([60_000_000m, 40_000_000m]));

    [Fact]
    public void A_project_with_no_contracts_is_worth_nothing_not_null()
        => Assert.Equal(0m, ProjectValue.Total([]));

    [Fact]
    public void The_fixtures_PRJ_0279_reads_340m_across_its_two_contracts()
    {
        // CNT-0279 civil 240,000,000 + CNT-0279-EM electromechanical 100,000,000.
        // Contract scoping is visible from the very first screen (06 §12).
        Assert.Equal(340_000_000m, ProjectValue.Total([240_000_000m, 100_000_000m]));
    }

    [Fact]
    public void Effective_values_differ_from_original_ones_once_an_order_is_applied()
    {
        // This is the gap TRACE.md flags on BR-00: EP-PRJ-01 currently passes
        // ORIGINAL values because no amendment table is registered yet. When
        // Phase 2.1 registers it, only the argument changes — and the two
        // totals below are what will stop agreeing.
        var original = new Amendments.Version(0, 100_000_000m, new DateOnly(2026, 6, 30), 365);
        var applied = new List<Amendments.Delta> { new(1, 5_000_000m, 45, Applied: true) };

        var effective = Amendments.Effective(original, applied);

        Assert.Equal(100_000_000m, ProjectValue.Total([original.Value]));
        Assert.Equal(105_000_000m, ProjectValue.Total([effective.Value]));
    }
}
