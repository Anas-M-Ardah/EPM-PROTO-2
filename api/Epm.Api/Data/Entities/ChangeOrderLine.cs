namespace Epm.Api.Data.Entities;

/// <summary>
/// One affected BOQ line inside a change order. Spec 03 §8 step 2, 02 §5–§7.
///
/// TWO PROPOSALS, ONE DECISION (02 §6):
///   - Contractor proposes  (Contractor* fields)
///   - RE department proposes (ReDept* fields) — THIS GOVERNS ALL DISPLAY
///   - Neither is the approved value; that comes only from the pricing committee.
///
/// THE 20% RULE IS PER LINE (02 §5), measured against the ORIGINAL quantity
/// (D-01). Up to 20% moves at the original rate; only the excess may be
/// re-priced, and the binding excess rate is fixed by لجنة تثبيت الأسعار —
/// it is NEVER entered in the wizard. Both parties merely PROPOSE an excess rate.
///
/// Compute the split via Domain/TierSplit.cs (BR-05). Never inline the arithmetic.
/// </summary>
public class ChangeOrderLine
{
    public int Id { get; set; }

    public int ChangeOrderId { get; set; }

    public int BoqItemId { get; set; }

    /// <summary>Lookup "boq-change-type": inc · dec · rate · del · redist (06 §7).
    /// NOTE: "add new BOQ item" deliberately does NOT exist — new items come from BOQ Management.</summary>
    public string ChangeType { get; set; } = "inc";

    // ---- BEFORE: the state this line was in when the order was raised. Never overwritten. ----
    public decimal BeforeQty { get; set; }
    public decimal BeforeRate { get; set; }
    public decimal BeforeAmount { get; set; }

    /// <summary>The ORIGINAL contracted quantity — the 20% threshold basis (D-01).</summary>
    public decimal ContractedQty { get; set; }
    /// <summary>Feeds the decrease-exceeds-remaining gate (02 §7).</summary>
    public decimal ExecutedQty { get; set; }

    // ---- proposal A: المقاول (the contractor) ----
    public decimal? ContractorDeltaQty { get; set; }
    public decimal? ContractorNewRate { get; set; }
    /// <summary>سعر الزائد — proposed rate for quantity beyond the 20% threshold.</summary>
    public decimal? ContractorExcessRate { get; set; }

    // ---- proposal B: د.م.م (the RE department) — GOVERNS DISPLAY (02 §6) ----
    public decimal? ReDeptDeltaQty { get; set; }
    public decimal? ReDeptNewRate { get; set; }
    public decimal? ReDeptExcessRate { get; set; }

    // ---- APPROVED: from the pricing committee only. ----
    public decimal? ApprovedDeltaQty { get; set; }
    public decimal? ApprovedRate { get; set; }
    /// <summary>The binding excess rate fixed by لجنة تثبيت الأسعار (02 §5).</summary>
    public decimal? ApprovedExcessRate { get; set; }

    // ---- APPLIED: written when the order is applied. ----
    public decimal? AppliedDeltaQty { get; set; }
    public decimal? AppliedAmount { get; set; }

    // ---- redistribution (ChangeType = "redist") ----
    public int? TargetBoqItemId { get; set; }
    public decimal? DrawnQty { get; set; }
    public decimal? DistributedQty { get; set; }

    /// <summary>Lookup "apply-step-status": na · todo · wip · done · fail — per-line application status (03 §9 tab 2).</summary>
    public string ApplyStatus { get; set; } = "todo";
}
