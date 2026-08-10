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
public static class ScheduleWeights
{
    public record Weight(decimal Absolute, decimal Relative);

    public static Weight For(decimal value, decimal allTotal, decimal parentTotal) => new(
        allTotal > 0m ? value / allTotal * 100m : 0m,
        parentTotal > 0m ? value / parentTotal * 100m : 0m);
}
