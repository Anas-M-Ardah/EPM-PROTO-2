namespace Epm.Api.Data.Entities;

/// <summary>
/// ملحق عقد. Spec 01 §2.9, 02 §9.
///
/// Created ONLY when a change order is APPLIED — never when it is approved.
/// (Handoff non-negotiable #2: Approved ≠ Applied ≠ Closed.)
///
/// The LAST APPLIED amendment is the effective contract. Rows with
/// State = "pending" are approved-but-unapplied and must never be folded
/// into effective figures — they are shown separately as a projection.
/// </summary>
public class ContractAmendment
{
    public int Id { get; set; }

    public string ContractId { get; set; } = "";

    /// <summary>0 = the original contract, then 1..n. Unique per contract.</summary>
    public int No { get; set; }

    /// <summary>The change order this amendment came from. Null for no. 0.</summary>
    public int? SourceChangeOrderId { get; set; }

    // ---- the approved figures of the source order ----
    public decimal DeltaValue { get; set; }
    public int DeltaDays { get; set; }

    // ---- the running contract state AFTER this amendment ----
    public decimal Value { get; set; }
    public DateOnly Finish { get; set; }
    public int DurationDays { get; set; }

    /// <summary>Lookup "amendment-state": original · superseded · effective · pending · partial (06 §8).</summary>
    public string State { get; set; } = "pending";

    /// <summary>
    /// Null until actually applied. ONLY applied rows move the effective figures —
    /// `AppliedAt != null` is the test Domain/Amendments.cs (BR-09) uses.
    /// </summary>
    public DateTime? AppliedAt { get; set; }
}
