namespace Epm.Api.Data.Entities;

/// <summary>
/// سجل مخاطر المشروع — SCR-W9 · **ملحق الشكل 43**.
///
/// ── THE PLATE IS THE ONLY SPECIFICATION HERE ─────────────────────────────
/// `01-DOMAIN-MODEL.md` and `06-DATA-DICTIONARY.md` do not mention risk at all;
/// this entity started as one of the speculative stubs CLAUDE.md §4 describes,
/// with a 5×5 grid nobody asked for. الشكل 43 draws the register that exists,
/// so the columns are pruned to what it shows — and its own three levels
/// (منخفض · متوسط · عالي), not five.
///
/// ── SEVERITY IS DERIVED, AND THE SCREEN PRINTS THE RULE ─────────────────
/// الشكل 43's heading carries it: «الخطورة = الاحتمالية × التأثير». So severity
/// is NEVER stored — Domain/RiskSeverity computes it, and the seven rows on the
/// plate are the worked examples that pin the thresholds.
/// </summary>
public class Risk
{
    public int Id { get; set; }

    public string ProjectId { get; set; } = "";

    /// <summary>RSK-01 … — unique within the project.</summary>
    public string Code { get; set; } = "";

    public string TitleAr { get; set; } = "";
    public string TitleEn { get; set; } = "";

    /// <summary>
    /// Lookup `risk-category` — الشكل 43's seven: زمني · مالي · تشغيلي · قانوني ·
    /// فني · جودة · سلامة.
    /// </summary>
    public string Category { get; set; } = "";

    /// <summary>1 منخفض · 2 متوسط · 3 عالي.</summary>
    public int Probability { get; set; }

    /// <summary>1 منخفض · 2 متوسط · 3 عالي.</summary>
    public int Impact { get; set; }

    /// <summary>
    /// The performance index this risk is measured against — الشكل 43's «المؤشر»
    /// column: SPI · CPI · EAC · VAC. It is what ties the register to the
    /// earned-value figures (BR-11) instead of leaving severity as an opinion.
    /// </summary>
    public string Indicator { get; set; } = "";

    /// <summary>The party that owns the mitigation — «الجهة المسؤولة».</summary>
    public string Owner { get; set; } = "";

    /// <summary>Lookup `risk-status`: open مفتوح · mitigating تحت المعالجة · suspended معلق.</summary>
    public string Status { get; set; } = "open";

    public DateOnly? RaisedDate { get; set; }
}
