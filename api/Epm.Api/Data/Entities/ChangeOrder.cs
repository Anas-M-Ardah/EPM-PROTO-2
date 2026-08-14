namespace Epm.Api.Data.Entities;

/// <summary>
/// أمر غيار. Spec 01 §2.8, 03 (the whole document).
///
/// FLAT — no navigation properties. The record page loads its parts explicitly:
///   db.ChangeOrderLines.Where(l => l.ChangeOrderId == id)
///   db.ChangeOrderStages.Where(s => s.ChangeOrderId == id)
///   db.ChangeOrderApplySteps.Where(s => s.ChangeOrderId == id)
///   ... and so on. Seven small queries you can read, not one Include() chain.
///
/// LIFECYCLE (03 §6):  draft → pending → [returned ⇄ pending] → approved
///                                     → approved-applying → closed
///                     → rejected / cancelled
///
/// Approved ≠ Applied ≠ Closed. Approving changes NOTHING. Applying creates a
/// ContractAmendment and moves quantities, dates and the penalty baseline.
/// Closing verifies the application. (Handoff non-negotiable #2)
///
/// THE CONTRACT IS SELECTED FIRST and scopes everything else. A change order may
/// never contain lines or activities from more than one contract — enforced by
/// the `cross-contract` gate in Domain/ChangeOrderGates.cs (BR-07).
/// </summary>
public class ChangeOrder
{
    public int Id { get; set; }

    /// <summary>e.g. "VO-01". Unique within the contract (checked in code, not indexed).</summary>
    public string No { get; set; } = "";

    /// <summary>→ Contract.Id. Selected FIRST; scopes every line and activity (03 §8).</summary>
    public string ContractId { get; set; } = "";

    public string TitleAr { get; set; } = "";
    public string TitleEn { get; set; } = "";

    /// <summary>Lookup "co-type" — ONLY TWO: engineering · supply (06 §7).</summary>
    public string Type { get; set; } = "engineering";

    /// <summary>الأسباب الموجبة — free text entered by the RE department (03 §8 step 1).</summary>
    public string Justification { get; set; } = "";

    // ---- the official letter that precedes entry (03 §1) ----
    public string ResponsibleParty { get; set; } = "";
    public string IncomingNo { get; set; } = "";

    /// <summary>
    /// المدخلات السابقة لإدخال الأمر (`03 §1`) — the contractor's request and the
    /// consultant's opinion, each with its own official number and date.
    ///
    /// They are NOT workflow stages and NOT this order's incoming letter: they
    /// are two letters that arrived BEFORE the RE department entered anything,
    /// and الشكل 30 prints all three numbers separately. Deriving them from
    /// <see cref="IncomingNo"/> would put one letter's number on three
    /// different documents on a legal record.
    /// </summary>
    public string? ContractorLetterNo { get; set; }
    public DateOnly? ContractorLetterDate { get; set; }
    public string? ConsultantLetterNo { get; set; }
    public DateOnly? ConsultantLetterDate { get; set; }
    /// <summary>leadDays = dataDate − this. Never measured from the wall clock (BR-12).</summary>
    public DateOnly? IncomingDate { get; set; }

    /// <summary>Lookup "co-lifecycle": draft · pending · returned · approved · applied_partial · closed · rejected · cancelled (06 §7).</summary>
    public string Lifecycle { get; set; } = "draft";

    // ---- FOUR SEPARATE VALUE SETS. None may overwrite another (non-negotiable #6). ----

    /// <summary>From the governing (RE department) proposal. Spec 02 §6.</summary>
    public decimal? RequestedValue { get; set; }
    public int? RequestedDays { get; set; }

    /// <summary>
    /// What the SCHEDULE-IMPACT ANALYSIS concluded for the ORDER — الشكل 32's
    /// «الأيام الناتجة عن التحليل», the middle of its three day counts.
    ///
    /// It is NOT the sum of the affected activities' days and NOT their
    /// maximum: an activity extension absorbed by float moves the project by
    /// less than itself, and two extensions on one path move it by more than
    /// either. الشكل 32 prints +9 and +6 on the activities and 21 here, which
    /// is neither — so it is stored, not derived (`03 §9` tab 3).
    /// </summary>
    public int? AnalysisDays { get; set; }

    /// <summary>
    /// From the pricing/rate-fixing committee decision ONLY, entered at financial
    /// review. Until then every approved-value field reads "يُحدَّد في التدقيق المالي"
    /// and the revised contract value is labelled "تقديرية". (02 §6)
    /// </summary>
    public decimal? ApprovedValue { get; set; }
    public int? ApprovedDays { get; set; }

    /// <summary>Set when the order is APPLIED. Null while merely approved.</summary>
    public decimal? AppliedValue { get; set; }
    public int? AppliedDays { get; set; }

    public string? DecisionReason { get; set; }
    public DateOnly? DecisionDate { get; set; }
    public string? ApprovingAuthority { get; set; }

    /// <summary>→ ChangeOrderStage.Id. The stage the order sits in. Drives ViewerRelation (BR-14).</summary>
    public int? CurrentStageId { get; set; }

    /// <summary>Lookup "weight-recalc-state": none · review · approved · applied · fail (06, 03 §6).</summary>
    public string WeightRecalcState { get; set; } = "none";

    /// <summary>→ AppUser.Id</summary>
    public string CreatedByUserId { get; set; } = "";
    public DateTime CreatedAt { get; set; }
}
