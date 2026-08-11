namespace Epm.Api.Domain;

/// <summary>
/// BR-02 · 02 §2 — activity absolute and relative weight.
///
/// rule: basis is budgeted cost or man-hours, chosen at import; the UI keeps a
///       toggle and this function does not care which — the caller passes the
///       chosen basis value.
/// spec: absolute = value / Σ(all activities) × 100;
///       relative = value / Σ(parent WBS node) × 100.
/// example: value 36, all 100, parent 60 → absolute 36, relative 60.
///
/// Milestones have zero basis → both weights 0, and they are excluded from
/// allocation. Absolute is the one that drives BOQ allocation (BR-03) and
/// earned value (BR-11), so it is returned EXACT — rounding here would push
/// error into every derived figure (P-14).
/// </summary>
/// <remarks>
/// <para><b>Two scopes, and both are asked about.</b></para>
///
/// <para>ABSOLUTE's denominator is every activity in the CONTRACT. `02 §2` says
/// "ALL activities" without saying all of what, and `02 §3` settles it: A5 is
/// 13,920,000 of `CNT-0279`'s 240,000,000 and the spec calls that <b>5.8%</b>.
/// Against the project's 340,000,000 it would be 4.09%. The client's own lite
/// prototype reads it the other way — see P-50 — but it does not change any
/// allocation, because BR-03 divides one absolute weight by a sum of absolute
/// weights and the scale cancels.</para>
///
/// <para>RELATIVE's denominator is the activity's PARENT WBS NODE, which is
/// what `02 §2`'s worked example measures: A1 is 36 of Zone A's 60, so its
/// relative weight is 60% while its absolute weight is 36%. Two different
/// questions — "how much of this zone is this activity" and "how much of the
/// contract is it" — and the WBS tree shows both.</para>
/// </remarks>
public static class ScheduleWeights
{
    public record Weight(decimal Absolute, decimal Relative);

    /// <param name="allTotal">Σ basis over the CONTRACT's activities.</param>
    /// <param name="parentTotal">
    /// Σ basis over the activity's parent WBS node. Pass <paramref name="allTotal"/>
    /// for a root-level node — `02 §2`: "root: ÷ total".
    /// </param>
    public static Weight For(decimal value, decimal allTotal, decimal parentTotal) => new(
        allTotal > 0m ? value / allTotal * 100m : 0m,
        parentTotal > 0m ? value / parentTotal * 100m : 0m);
}
