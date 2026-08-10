using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>BR-09 · 02 §9 — contract amendment and effective values.</summary>
public class AmendmentsTests
{
    private static readonly Amendments.Version Original =
        new(0, 100_000_000m, new DateOnly(2026, 6, 30), 365);

    [Fact]
    public void Worked_example_applying_gives_no_1_value_105m_finish_2026_08_14()
    {
        var v = Amendments.Apply(Original, 5_000_000m, 45);

        Assert.Equal(1, v.No);
        Assert.Equal(105_000_000m, v.Value);
        Assert.Equal(new DateOnly(2026, 8, 14), v.Finish);
        Assert.Equal(410, v.Duration);
    }

    [Fact]
    public void Approving_changes_nothing_only_applying_does()
    {
        // The rule this whole system turns on (non-negotiable #2, D-09).
        var approvedNotApplied = new List<Amendments.Delta> { new(1, 5_000_000m, 45, Applied: false) };

        var effective = Amendments.Effective(Original, approvedNotApplied);

        Assert.Equal(100_000_000m, effective.Value);
        Assert.Equal(new DateOnly(2026, 6, 30), effective.Finish);
        Assert.Equal(0, effective.No);
    }

    [Fact]
    public void Effective_counts_applied_deltas_only()
    {
        var chain = new List<Amendments.Delta>
        {
            new(1, 5_000_000m, 45, Applied: true),
            new(2, 3_000_000m, 10, Applied: false),   // approved, not applied
        };

        var effective = Amendments.Effective(Original, chain);

        Assert.Equal(105_000_000m, effective.Value);
        Assert.Equal(1, effective.No);
        Assert.Equal(new DateOnly(2026, 8, 14), effective.Finish);
    }

    [Fact]
    public void The_projection_adds_approved_unapplied_and_is_reported_separately()
    {
        var chain = new List<Amendments.Delta>
        {
            new(1, 5_000_000m, 45, Applied: true),
            new(2, 3_000_000m, 10, Applied: false),
        };

        var effective = Amendments.Effective(Original, chain);
        var projected = Amendments.Projection(effective, chain);

        Assert.Equal(105_000_000m, effective.Value);   // what the contract IS
        Assert.Equal(108_000_000m, projected.Value);   // what it WOULD become
        Assert.NotEqual(effective.Value, projected.Value);
    }

    [Fact]
    public void An_unamended_contract_is_its_original()
    {
        var effective = Amendments.Effective(Original, []);

        Assert.Equal(100_000_000m, effective.Value);
        Assert.Equal(0, effective.No);
    }

    // 02 §9 lists `original` as "(no. 0)" — the identity of that row, which the
    // amendment chain always shows as العقد الأصلي. `superseded` is therefore an
    // earlier applied AMENDMENT (no >= 1), not the original contract. Which
    // version is in force is answered by Effective(), not by this label (P-16).
    [Theory]
    [InlineData(0, 0, true, false, "original")]    // no amendments yet
    [InlineData(0, 1, true, false, "original")]    // still the original row
    [InlineData(1, 1, true, false, "effective")]   // the last applied
    [InlineData(1, 2, true, false, "superseded")]  // an earlier applied amendment
    [InlineData(2, 1, false, false, "pending")]    // approved, NOT applied
    [InlineData(2, 1, false, true, "partial")]     // mid-application
    public void Version_state_follows_06_8(int no, int lastApplied, bool applied, bool applying, string expected)
        => Assert.Equal(expected, Amendments.VersionState(no, lastApplied, applied, applying));
}
