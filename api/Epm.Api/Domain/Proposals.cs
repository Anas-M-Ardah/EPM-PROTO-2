namespace Epm.Api.Domain;

/// <summary>
/// BR-06 · 02 §6 — two proposals, one approved value.
///
/// rule: each line carries مقترح المقاول and مقترح د.م.م. The RE department's
///       figure GOVERNS displayed revised values once entered; before that the
///       contractor's is shown and labelled as such.
/// spec: NEITHER is the approved value — that comes only from the pricing
///       committee at financial review (D-08). Until then approved-value fields
///       read يُحدَّد في التدقيق المالي and the revised contract value is تقديرية.
/// example: contractor 12,000,000 · RE dept 11,400,000 · no approved value
///          → governing 11,400,000 (re-dept), divergence −600,000, indicative.
///
/// The LABEL matters as much as the number: showing the contractor's figure
/// where the RE department's belongs, or an indicative total as settled, is
/// wrong in a way no arithmetic check catches. Source and indicative flag
/// travel with the value.
/// </summary>
public static class Proposals
{
    public record Set(decimal? Contractor, decimal? ReDept, decimal? Approved);

    /// <param name="Source">contractor · re-dept · approved · none.</param>
    /// <param name="Divergence">RE dept − contractor, rendered as `contractor → RE dept (Δ)`.</param>
    /// <param name="IsIndicative">true → label the revised contract value تقديرية.</param>
    public record Governing(decimal? Value, string Source, decimal? Divergence, bool IsIndicative);

    public static Governing Which(Set p)
    {
        var divergence = p.ReDept is not null && p.Contractor is not null
            ? p.ReDept - p.Contractor
            : null;

        if (p.Approved is not null) return new(p.Approved, "approved", divergence, false);
        if (p.ReDept is not null) return new(p.ReDept, "re-dept", divergence, true);
        if (p.Contractor is not null) return new(p.Contractor, "contractor", null, true);

        return new(null, "none", null, true);
    }

    public static bool Diverges(Set p)
        => p.Contractor is not null && p.ReDept is not null && p.Contractor != p.ReDept;

    /// <summary>Drives «يُحدَّد في التدقيق المالي» and the تقديرية label.</summary>
    public static bool AwaitingFinancialReview(Set p) => p.Approved is null;
}
