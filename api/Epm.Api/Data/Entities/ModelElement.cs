namespace Epm.Api.Data.Entities;

/// <summary>
/// عنصر النموذج — SCR-W10 · **ملحق الشكل 44**.
///
/// Replaces the `ModelObject` starting point, which carried massing geometry
/// (X/Y/Z, width/depth/height) for a viewer that is explicitly out of Phase 1:
/// `07 §8` — *real BIM/IFC rendering (keep the tab, stub the viewer)*. Those
/// six columns would have existed unread, and CLAUDE.md §4 says to prune a
/// starting point to what the page actually shows. The plate's word for these
/// rows is العنصر, so that is what every layer calls them.
///
/// ── WHAT THIS TABLE IS FOR ───────────────────────────────────────────────
/// الشكل 44's value is not the picture. It is the LINK: «روابط العنصر ST-120 —
/// أعمدة خرسانية و A4 — الهيكل الخرساني تربط النموذج ببنود حساب الكميات
/// وبأنشطة الجدول الزمني». An element names one BOQ line and one activity, and
/// that is what turns a drawing into a place where quantity, schedule and
/// physical status meet.
///
/// ── THE CONTRACT IS PART OF THE LINK ─────────────────────────────────────
/// BOQ codes repeat across contracts — BQ-002 exists on both CNT-0279 and
/// CNT-0279-EM — so <see cref="ContractId"/> travels with the code. A BOQ item
/// and an activity each belong to exactly one contract (CLAUDE.md §5.1); an
/// element that named only «BQ-002» would be naming two different lines.
/// </summary>
public class ModelElement
{
    public int Id { get; set; }

    public string ProjectId { get; set; } = "";

    /// <summary>FND-01 · COL-L1 · … — «رمز العنصر» on the detail panel.</summary>
    public string Code { get; set; } = "";

    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";

    /// <summary>
    /// Lookup `doc-discipline` — the SAME vocabulary the documents register
    /// uses. الشكل 44's tree filters (إنشائي · ميكانيكي · كهربائي) and الشكل
    /// 46's folders are the same disciplines, and two lists of them would drift.
    /// </summary>
    public string Discipline { get; set; } = "";

    /// <summary>
    /// Lookup `activity-status`. الشكل 44's colour key uses three of its values
    /// — مكتمل · قيد التنفيذ · متأخر — and they are the same words the schedule
    /// uses for the same idea, so they are the same lookup.
    /// </summary>
    public string Status { get; set; } = "notstarted";

    /// <summary>
    /// «حرج» on the plate's key. It is NOT a fourth status: criticality is a
    /// ring and the colour channel belongs to status (CLAUDE.md §6), which is
    /// how SCR-W5 already draws it. A critical element can be مكتمل.
    /// </summary>
    public bool IsCritical { get; set; }

    /// <summary>
    /// «مبنى A» / «Building A» — the root of the model tree. A PAIR, like
    /// every other name in this system: the bilingual pass caught this field
    /// rendering Arabic inside an English page, because one string cannot be
    /// two languages (P-125).
    /// </summary>
    public string BuildingAr { get; set; } = "";
    public string BuildingEn { get; set; } = "";

    /// <summary>L00 · L01 · L02 — «الطابق», and the tree's middle level.</summary>
    public string Level { get; set; } = "";

    /// <summary>«المنطقة» — Zone A. A property, not a tree level.</summary>
    public string Zone { get; set; } = "";

    /// <summary>
    /// The element's OWN quantity — 68 columns, 640 m² of slab. It is not the
    /// BOQ line's quantity: one line of 1,900 m³ of concrete covers several
    /// elements, and الشكل 44 prints «68 عمود» beside a link to that line.
    /// </summary>
    public decimal Qty { get; set; }

    public string Unit { get; set; } = "";

    /// <summary>→ Contract.Id. Required to resolve the two codes below.</summary>
    public string ContractId { get; set; } = "";

    /// <summary>→ BoqItem.Code within <see cref="ContractId"/>.</summary>
    public string BoqCode { get; set; } = "";

    /// <summary>→ Activity.ActivityId within <see cref="ContractId"/>.</summary>
    public string ActivityCode { get; set; } = "";

    /// <summary>
    /// «الإنجاز» of THIS element. Not derived from the activity: an activity
    /// spans several elements and finishing one of them does not finish it.
    /// It is an observation, which is why it is stored (CLAUDE.md §3.5).
    /// </summary>
    public decimal ProgressPct { get; set; }

    /// <summary>«الإصدار» — the drawing revision this element reflects.</summary>
    public string Revision { get; set; } = "";
}
