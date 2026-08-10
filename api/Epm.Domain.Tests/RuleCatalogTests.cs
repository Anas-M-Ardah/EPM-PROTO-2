using Epm.Api.Domain;

namespace Epm.Domain.Tests;

/// <summary>
/// The catalog behind EP-DOCS-01. These tests guard the /docs route itself:
/// every rule must be listed, and every worked example must actually RUN.
/// A catalog entry that throws would take the whole page down.
/// </summary>
public class RuleCatalogTests
{
    [Fact]
    public void Every_business_rule_BR_01_to_BR_14_is_catalogued()
    {
        var covered = RuleCatalog.All.Select(r => r.Br).ToHashSet();

        // BR-00 is the trivial Σ in ProjectValue.cs and has no worked example.
        for (var n = 1; n <= 14; n++)
            Assert.Contains($"BR-{n:00}", covered);
    }

    [Fact]
    public void Rule_ids_are_unique()
    {
        var ids = RuleCatalog.All.Select(r => r.Id).ToList();
        Assert.Equal(ids.Count, ids.Distinct().Count());
    }

    [Fact]
    public void Every_example_executes_without_throwing()
    {
        foreach (var rule in RuleCatalog.All)
        {
            var result = Record.Exception(() => rule.Run());
            Assert.True(result is null, $"{rule.Id} ({rule.Br}) threw: {result?.Message}");
        }
    }

    [Fact]
    public void Every_rule_carries_its_spec_text_and_expectation()
    {
        foreach (var rule in RuleCatalog.All)
        {
            Assert.False(string.IsNullOrWhiteSpace(rule.Spec), $"{rule.Id} has no spec text");
            Assert.False(string.IsNullOrWhiteSpace(rule.Expect), $"{rule.Id} has no expectation");
            Assert.False(string.IsNullOrWhiteSpace(rule.Section), $"{rule.Id} has no spec section");
            Assert.NotNull(rule.Run());
        }
    }
}
