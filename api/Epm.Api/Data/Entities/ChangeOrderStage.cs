namespace Epm.Api.Data.Entities;

/// <summary>
/// One of the SIX system-owned stages. Spec 03 §2.
///
/// | # | Stage (AR)                  | Owner                  | Condition                    |
/// | 1 | دراسة الطلب                  | دائرة المهندس المقيم    | always                       |
/// | 2 | لجنة أوامر الغيار             | لجنة أوامر الغيار       | always                       |
/// | 3 | تثبيت الأسعار                | لجنة تثبيت الأسعار      | ONLY if a line exceeds 20%   |
/// | 4 | المصادقة والتخصيص            | لجنة أوامر الغيار       | if endorsement/funding needed|
/// | 5 | الأمر الوزاري وملحق العقد     | لجنة أوامر الغيار       | always                       |
/// | 6 | التنفيذ                      | دائرة المهندس المقيم    | always                       |
///
/// SKIPPED STAGES ARE LISTED EXPLICITLY with the reason ("no line exceeded 20%")
/// — never silently omitted (03 §2).
///
/// A stage with pending external parties CANNOT be completed; its counter reads n/m (03 §3).
/// </summary>
public class ChangeOrderStage
{
    public int Id { get; set; }

    public int ChangeOrderId { get; set; }

    /// <summary>1..6 per the table above.</summary>
    public int StageNo { get; set; }

    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";

    /// <summary>Matches AppUser.Party — this is how BR-14 resolves the `awaiting` relation.</summary>
    public string OwnerParty { get; set; } = "";

    /// <summary>False when the stage does not apply to this order. Reason must then be set.</summary>
    public bool Applicable { get; set; } = true;

    /// <summary>Why the stage was skipped, e.g. "لم يتجاوز أي بند نسبة 20%". Required when Applicable is false.</summary>
    public string? SkipReason { get; set; }

    /// <summary>pending · active · done · returned · skipped</summary>
    public string Status { get; set; } = "pending";

    public DateOnly? SentAt { get; set; }
    public DateOnly? ActionedAt { get; set; }

    /// <summary>Lookup "decision": approve · reject · return · cancel (06 §7). Null until decided.</summary>
    public string? Decision { get; set; }
    public string? DecisionNote { get; set; }
    public string? DecidedByUserId { get; set; }

    /// <summary>Per-stage SLA in days. Defaults from AppConfiguration.SlaDaysPerStage (D-03).</summary>
    public int SlaDays { get; set; } = 5;
}
