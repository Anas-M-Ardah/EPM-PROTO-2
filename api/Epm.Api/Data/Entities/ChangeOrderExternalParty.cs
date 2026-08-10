namespace Epm.Api.Data.Entities;

/// <summary>
/// EXTERNAL PARTIES ARE STATUSES, NOT STAGES. Spec 03 §3–§4. (Non-negotiable #5)
///
/// Parties that are not system users have their outcome recorded INSIDE the
/// owning stage by a delegated system user, against an official letter.
///
/// | Stage | External party            | Recorded outcome                        | Can cancel |
/// | 4     | لجنة المراجعة المصادقة      | approval of added duration —            | yes        |
/// |       |                           | ONLY when the extension exceeds a       |            |
/// |       |                           | quarter of the contract duration        |            |
/// | 4     | الدائرة الإدارية والمالية    | securing the financial allocation        | yes        |
/// | 5     | الوزير / المفوَّض           | endorsement + ministerial order          | —          |
/// | 5     | قسم العقود الحكومية         | issuance of the contract addendum        | —          |
///
/// ATTRIBUTION RULE (client decision, 03 §4): the decision is attributed to THE
/// DECIDING PARTY; the delegate appears as THE RECORDER. Render as:
///   "لجنة المراجعة المصادقة — سُجِّل بواسطة مقرّر لجنة أوامر الغيار"
/// </summary>
public class ChangeOrderExternalParty
{
    public int Id { get; set; }

    public int ChangeOrderStageId { get; set; }

    /// <summary>
    /// → ChangeOrder.Id. Denormalised on purpose: it lets the record page load
    /// every external party of an order in one query instead of joining through
    /// stages. Keep it in step with the stage's ChangeOrderId when inserting.
    /// </summary>
    public int ChangeOrderId { get; set; }

    public string PartyAr { get; set; } = "";
    public string PartyEn { get; set; } = "";

    /// <summary>Lookup "external-party-state": wait · in · back · na (06 §7).</summary>
    public string State { get; set; } = "wait";

    /// <summary>Spec 03 §3 — only two parties may cancel the order (D-04).</summary>
    public bool CanCancel { get; set; }

    // ---- every delegated record REQUIRES an official letter (03 §4) ----
    public string? LetterNo { get; set; }
    public DateOnly? LetterDate { get; set; }

    /// <summary>The delegate who recorded this — the RECORDER, not the decider (03 §4).</summary>
    public string? RecordedByUserId { get; set; }
    public DateTime? RecordedAt { get; set; }

    public string? Note { get; set; }
}
