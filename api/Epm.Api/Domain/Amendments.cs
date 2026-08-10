namespace Epm.Api.Domain;

/// <summary>
/// BR-09 · 02 §9 — contract amendment and effective values.
///
/// rule: an APPROVED change order does not change the contract. APPLYING it
///       does (non-negotiable #2, D-09).
/// spec: on apply — no = last.no + 1; value = previous.value + approvedValue;
///       finish = previous.finish + approvedDays;
///       duration = previous.duration + approvedDays.
/// example: previous (no 0, 100,000,000, 2026-06-30, 365) + 5,000,000 / 45 days
///          → no 1, value 105,000,000, finish 2026-08-14.
///
/// Effective = original + APPLIED deltas only. What the contract would become
/// if every approved-unapplied order were applied is a PROJECTION, shown
/// separately and labelled — never folded in.
/// </summary>
public static class Amendments
{
    public record Version(int No, decimal Value, DateOnly Finish, int Duration);

    public record Delta(int No, decimal DeltaValue, int DeltaDays, bool Applied);

    /// <summary>The amendment that applying one approved order creates.</summary>
    public static Version Apply(Version previous, decimal approvedValue, int approvedDays) => new(
        previous.No + 1,
        previous.Value + approvedValue,
        previous.Finish.AddDays(approvedDays),
        previous.Duration + approvedDays);

    /// <summary>The contract as it stands now: original + APPLIED deltas only.</summary>
    public static Version Effective(Version original, IReadOnlyList<Delta> amendments)
    {
        var applied = amendments.Where(a => a.Applied).ToList();
        var days = applied.Sum(a => a.DeltaDays);

        return new Version(
            applied.Count == 0 ? original.No : applied.Max(a => a.No),
            original.Value + applied.Sum(a => a.DeltaValue),
            original.Finish.AddDays(days),
            original.Duration + days);
    }

    /// <summary>02 §9 — effective PLUS approved-but-unapplied. Render it labelled.</summary>
    public static Version Projection(Version effective, IReadOnlyList<Delta> amendments)
    {
        var pending = amendments.Where(a => !a.Applied).ToList();
        var days = pending.Sum(a => a.DeltaDays);

        return new Version(
            effective.No + pending.Count,
            effective.Value + pending.Sum(a => a.DeltaValue),
            effective.Finish.AddDays(days),
            effective.Duration + days);
    }

    /// <summary>
    /// 06 §8 state for one version of the chain.
    ///
    /// 02 §9 words it as: original (no. 0) · superseded (an earlier applied one) ·
    /// effective (the last applied) · pending · partial. Version 0 is therefore
    /// ALWAYS `original` — it is the identity of that row, which is what the
    /// amendment chain shows as العقد الأصلي whether or not it is still in force.
    /// `superseded` then means an earlier applied AMENDMENT (no ≥ 1). Which
    /// version is in force is answered by Effective(), not by this label (P-16).
    /// </summary>
    public static string VersionState(int no, int lastAppliedNo, bool applied, bool applying)
    {
        if (applying) return "partial";
        if (!applied) return "pending";
        if (no == 0) return "original";
        return no == lastAppliedNo ? "effective" : "superseded";
    }
}
