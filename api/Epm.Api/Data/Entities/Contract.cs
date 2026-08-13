namespace Epm.Api.Data.Entities;

/// <summary>
/// Spec 01 §2.3.
///
/// THE WORKING CONTEXT. A BOQ item and an activity each belong to exactly one
/// contract; the project is DERIVED from the contract and never asked for again.
/// A change order may never span two contracts. (Handoff non-negotiable #1)
///
/// FLAT — no navigation properties. Its BOQ:
///   db.BoqItems.Where(b => b.ContractId == id)
///
/// DERIVED — never stored (01 §3, 02 §9):
///   EffectiveValue  = OriginalValue  + Σ APPLIED amendment delta values
///   EffectiveFinish = OriginalFinish + Σ APPLIED amendment delta days
/// Approved-but-unapplied orders are a projection, NEVER folded in (02 §9).
/// Compute via Domain/Amendments.cs (BR-09).
/// </summary>
public class Contract
{
    /// <summary>Natural key, e.g. "CNT-0279", "CNT-0279-EM".</summary>
    public string Id { get; set; } = "";

    /// <summary>→ Project.Id</summary>
    public string ProjectId { get; set; } = "";

    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";

    /// <summary>The awarded value. NEVER overwritten. (Handoff non-negotiable #6)</summary>
    public decimal OriginalValue { get; set; }

    /// <summary>Lookup "contract-status" — the 5-state set plus 4 extended values (06 §4).</summary>
    public string Status { get; set; } = "ongoing";

    public DateOnly Start { get; set; }

    /// <summary>The contractual finish. NEVER overwritten — amendments layer on top.</summary>
    public DateOnly OriginalFinish { get; set; }

    /// <summary>Original duration in days. NEVER overwritten.</summary>
    public int OriginalDurationDays { get; set; }

    /// <summary>
    /// Current forecast finish from the schedule. Drives the delay penalty (BR-10).
    /// Not contractual — this is where the project is actually heading.
    /// </summary>
    public DateOnly? ForecastFinish { get; set; }

    // ---- the expense items ----
    //
    // ── THREE OR FOUR? THE DOCUMENTS DISAGREE ────────────────────────────
    // `01 §2.3` lists «the three expense items» — award · reserve ·
    // supervision — and both الشكل 7 and المسار 2's own «ما يظهر للمستخدم» say
    // «تفصيل الكلفة على بنودها الثلاثة».
    //
    // But المسار 2's «ما يدخله المستخدم» asks for FOUR: «مبالغ الإحالة
    // والاحتياط والإشراف والمراقبة».
    //
    // MonitoringAmount exists because the track asks the specialist to enter
    // it, and a field the process collects has to land somewhere. Which three
    // the cost breakdown then shows is NOT resolved here — it is a business
    // question, reported rather than answered.
    public decimal AwardAmount { get; set; }
    public decimal ReserveAmount { get; set; }
    public decimal SupervisionAmount { get; set; }

    /// <summary>المراقبة — المسار 2 step 3's fourth amount. See the note above.</summary>
    public decimal MonitoringAmount { get; set; }

    // ── المصروف مقابل كل بند — NOT STORED HERE ───────────────────────────
    // الشكل 8's fourth section prints «المصروف من الإحالة · من الاحتياط · من
    // الإشراف والمراقبة», and الشكل 7 draws a bar per cost item from the same
    // three figures. They are NOT columns of this table: each is the sum of the
    // matching portion over the contract's PAID payments —
    // `Payment.AwardPortion` and its two siblings — so storing them would be a
    // derived value with a second place to be wrong (01 §3).
    //
    // That also settles what was previously reported as unavailable. The
    // breakdown used to print «المصروف مسجَّل على العقد لا على بنوده الثلاثة»
    // because a payment carried no apportionment. It carries one now, because
    // الشكل 9 shows it — so the split is a sum, not an allocation anyone had to
    // invent.
    //
    // كلفة العقد الكلي — the total الشكل 8 prints beneath them — is the sum of
    // the three, and is likewise computed at projection time.

    /// <summary>
    /// المكوّن — which component of the works this contract covers, e.g.
    /// «المكوّن الميكانيكي» / «المكوّن الكهربائي» (الشكل 6). It is what makes two
    /// contracts on one project readable as two halves of the same job rather
    /// than as a duplicate.
    /// </summary>
    public string Component { get; set; } = "";

    // ---- the official letter that created the contract ----
    public string IncomingNo { get; set; } = "";
    public DateOnly? IncomingDate { get; set; }

    public string Contractor { get; set; } = "";
    public string Consultant { get; set; } = "";

    /// <summary>الجهة المنفذة (المسار 2 step 4) — distinct from the contractor.</summary>
    public string ExecutingParty { get; set; } = "";

    /// <summary>بيانات التواصل (المسار 2 step 4) — the contractor's contact line.</summary>
    public string ContactInfo { get; set; } = "";
}
