namespace Epm.Api.Domain;

/// <summary>BR-04: attribute billed value to its contributing activities without
/// renormalising incomplete allocations. Imported BR-02 weights remain separate.</summary>
public static class BoqProgressBasis
{
    public record Contribution(string ActivityId, decimal Amount, decimal SharePct);

    public static IReadOnlyDictionary<string, decimal> For(IEnumerable<Contribution> contributions)
        => contributions.GroupBy(x => x.ActivityId).ToDictionary(
            g => g.Key, g => g.Sum(x => x.Amount * x.SharePct / 100m));

    public static decimal ScopeTotal(IReadOnlyDictionary<string, decimal> basis,
        IReadOnlyCollection<string> scope, IReadOnlyCollection<string> all, decimal billed)
        => scope.Count == all.Count && scope.ToHashSet().SetEquals(all)
            ? billed : scope.Sum(id => basis.GetValueOrDefault(id));
}
