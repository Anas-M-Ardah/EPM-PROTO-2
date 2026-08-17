namespace Epm.Api.Domain;

/// <summary>
/// Which SHAPE of bill a contract's BOQ takes — the base/sub-type split.
///
/// rule: the kind follows the PROJECT's type (06 §3), not the contract's.
/// spec: construction → works · equipment → supply · design-studies → none.
/// example: a project typed `equipment` gives every one of its contracts a
///          supply bill, whatever the contract is called.
///
/// ── THIS IS A CLIENT DECISION, AND IT HAS A KNOWN COST (D-14) ────────────
/// A BOQ belongs to a CONTRACT, and a contract's own nature does not have to
/// match its project's. The fixture's own `CNT-0279-EM` — الأعمال
/// الكهروميكانيكية, carrying a `supply`-type change order — sits inside
/// `PRJ-0279`, which is typed `construction`; الشكل 12 shows the same pairing
/// (`CNT-0170` الأعمال المدنية beside `CNT-0170-EM`). Under this rule that
/// contract gets a WORKS bill: activity links and schedule-derived progress,
/// not receipts. Keying off a contract-level kind was offered and declined;
/// recorded so the consequence is not later read as an oversight.
///
/// ── WHY A MAP AND NOT AN `if` IN THE ENDPOINT ────────────────────────────
/// Three endpoints and the register all need the same answer. One function
/// means a fourth project type is one line here plus its columns, and
/// `grep -rn "BoqKind" api` finds every place the shape is decided.
/// </summary>
public static class BoqKind
{
    /// <summary>A priced bill of works lines, progressed from schedule activities.</summary>
    public const string Works = "works";

    /// <summary>فقرات تجهيزية — devices, progressed from receipts (الأشكال 50–52).</summary>
    public const string Supply = "supply";

    /// <summary>This project type has no bill of quantities modelled yet.</summary>
    public const string None = "none";

    /// <summary>
    /// The bill shape for a project type. An UNKNOWN type returns `none` rather
    /// than defaulting to works: a bill built on a guessed shape is worse than
    /// a screen that says the shape is not defined yet.
    /// </summary>
    public static string ForProjectType(string projectType) => projectType switch
    {
        "construction"   => Works,
        "equipment"      => Supply,
        "design-studies" => None,
        _                => None,
    };

    /// <summary>Whether a bill may be created against this project type at all.</summary>
    public static bool Accepts(string projectType) => ForProjectType(projectType) != None;

    /// <summary>
    /// Why a bill cannot be created, for the endpoint's refusal and the screen's
    /// empty state. Bilingual because every refusal on this system is (05 §5).
    /// </summary>
    public static (string Ar, string En) Unsupported(string projectType) => projectType switch
    {
        "design-studies" => (
            "مشاريع التصنيف (التصاميم والدراسات الفنية) لا تملك حساب كميات في هذه المرحلة.",
            "Design & technical studies projects have no bill of quantities at this stage."),
        _ => (
            "نوع المشروع غير معرَّف، ولا يمكن تحديد شكل حساب الكميات.",
            "The project type is not recognised, so the bill's shape cannot be determined."),
    };
}
