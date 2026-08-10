namespace Epm.Api.Domain;

/// <summary>
/// BR-00 · Spec 01 §3 — derived-value rules.
///
/// <para><b>rule</b> Project value is the sum of its contracts' effective values.
/// It is NEVER stored on the project. There is no Value column, and adding one
/// would be a defect.</para>
///
/// <para><b>spec</b> Project value = Σ contract effective values.
/// A contract's effective value = original + Σ APPLIED amendment deltas.
/// Approved-but-unapplied orders are a projection and are never folded in
/// (02 §9) — that is why this takes effective values, not original ones.</para>
///
/// <para><b>example</b> contracts [60,000,000 · 40,000,000] → 100,000,000</para>
///
/// Until the Contract page exists, callers pass original values because no
/// amendment table is registered yet; the signature does not change when it is.
/// </summary>
public static class ProjectValue
{
    /// <summary>Σ of the supplied contract effective values.</summary>
    public static decimal Total(IEnumerable<decimal> contractEffectiveValues)
        => contractEffectiveValues.Sum();
}
