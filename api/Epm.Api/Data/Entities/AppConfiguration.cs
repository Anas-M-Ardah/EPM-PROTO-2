namespace Epm.Api.Data.Entities;

/// <summary>
/// Single-row configuration. Spec: 02 §10 (penalty), 02 §12 (SLA), 06 §12 (data date).
/// DECISIONS D-02, D-03, D-06.
///
/// DataDate is "now" for the whole system in demo mode. Never DateTime.Now —
/// a wall-clock reference makes every historical record look years late (D-06).
/// </summary>
public class AppConfiguration
{
    public int Id { get; set; } = 1;

    /// <summary>"Now". 06 §12 — all ages are measured back from this. (D-06)</summary>
    public DateOnly DataDate { get; set; }

    /// <summary>Delay penalty per day, as a fraction of contract value. 0.001 = 0.1%/day. (D-02)</summary>
    public decimal PenaltyPerDayPct { get; set; } = 0.001m;

    /// <summary>Delay penalty cap, as a fraction of contract value. 0.10 = 10%. (D-02)</summary>
    public decimal PenaltyCapPct { get; set; } = 0.10m;

    /// <summary>Per-stage SLA in days. Uniform 5 by default. (D-03)</summary>
    public int SlaDaysPerStage { get; set; } = 5;

    /// <summary>The 20% pricing tier. 0.20. Spec 02 §5. Configurable but never changed lightly.</summary>
    public decimal PricingTierPct { get; set; } = 0.20m;

    /// <summary>
    /// Endorsement review committee is required only when added duration exceeds
    /// this fraction of the contract duration. 0.25 = a quarter. Spec 03 §3.
    /// </summary>
    public decimal EndorsementDurationThresholdPct { get; set; } = 0.25m;
}
