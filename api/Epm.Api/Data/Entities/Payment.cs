namespace Epm.Api.Data.Entities;

/// <summary>
/// Contract payment / سلفة. Spec 04 §7 (contract tab) and the Financials tab.
/// Project financial % is derived from these (01 §2.2).
/// </summary>
public class Payment
{
    public int Id { get; set; }

    public string ContractId { get; set; } = "";

    /// <summary>Sequential certificate number.</summary>
    public int No { get; set; }

    /// <summary>
    /// The official finance letter that released the money, and its date.
    /// The reference's payments table leads with this rather than the internal
    /// certificate number, because it is what the ministry's correspondence
    /// files are indexed by — the same reason Contract carries IncomingNo
    /// (03 §3: things are recorded against an official letter).
    /// </summary>
    public string FinanceLetterNo { get; set; } = "";
    public DateOnly? FinanceLetterDate { get; set; }

    /// <summary>interim · advance · final · retention-release</summary>
    public string Kind { get; set; } = "interim";

    public decimal GrossAmount { get; set; }
    public decimal RetentionAmount { get; set; }
    public decimal AdvanceRecovery { get; set; }
    public decimal NetAmount { get; set; }

    public DateOnly? CertifiedDate { get; set; }
    public DateOnly? PaidDate { get; set; }

    /// <summary>certified · paid · pending</summary>
    public string Status { get; set; } = "pending";

    public string Note { get; set; } = "";
}
