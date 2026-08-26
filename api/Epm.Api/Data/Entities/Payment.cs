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

    /// <summary>
    /// «الموعد القانوني للصرف» — الشكل 17's warning box.
    ///
    /// RECORDED, not derived. It is set by the instruction that governs the
    /// certificate, and deriving it from the stage caps would be inventing a
    /// rule: the plate's own due date is not the sum of its two caps, and a
    /// date the ministry can be held to must not move because someone edited
    /// a cap. Null when none has been set.
    /// </summary>
    public DateOnly? LegalDueDate { get; set; }

    /// <summary>interim · advance · final · retention-release</summary>
    public string Kind { get; set; } = "interim";

    public decimal GrossAmount { get; set; }
    public decimal RetentionAmount { get; set; }
    public decimal AdvanceRecovery { get; set; }
    public decimal NetAmount { get; set; }

    // ── تفصيل الدفعة لهذا العقد — الشكل 9's side panel ───────────────────
    // «تفاصيل PAY-100: الإحالة 32,926,402، الاحتياط 10,348,298، الإشراف
    // والمراقبة 3,763,017» — the panel splits ONE payment across the contract's
    // three cost items, and the register's «البنود» column counts how many of
    // them the payment touched.
    //
    // These come off the funding letter, so they are recorded, not computed:
    // nothing else in the model says how a certificate was apportioned.
    //
    // THEY SUM TO <see cref="NetAmount"/>, not to <see cref="GrossAmount"/>.
    // The contract's own «المصروف من الإحالة …» (الشكل 7 · الشكل 8) is the sum
    // of each portion over the PAID payments, and the contract's total spend is
    // already Σ net — so netting them here keeps one spend figure on every
    // screen instead of a gross-based split sitting beside a net-based total.
    // Retention and advance recovery are withheld from the whole certificate,
    // not from one cost item, which is why they are deducted before the split.
    public decimal AwardPortion { get; set; }
    public decimal ReservePortion { get; set; }
    public decimal SupervisionPortion { get; set; }

    public DateOnly? CertifiedDate { get; set; }
    public DateOnly? PaidDate { get; set; }

    /// <summary>certified · paid · pending</summary>
    public string Status { get; set; } = "pending";

    // ── سجّلتها — الشكل 16's own attribution ─────────────────────────────
    // «سجّلتها محللة موازنة في قسم الحسابات». §7 asks that every record name
    // «منفّذها وصفته وجهته», and until `EP-FIN-02` wrote these the payment
    // panel printed a "not recorded" note and الشكل 19's payment events carried
    // three empty strings.
    //
    // COPIED, not joined, exactly as ProjectActivityEvent does it: a persona
    // list can change and the record may not.
    public string RecordedByName { get; set; } = "";
    public string RecordedByRole { get; set; } = "";
    public string RecordedByParty { get; set; } = "";

    public string Note { get; set; } = "";
}
