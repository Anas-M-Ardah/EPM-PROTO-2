namespace Epm.Api.Domain;

/// <summary>
/// **الشكل 43** — «الخطورة = الاحتمالية × التأثير».
///
/// rule: severity is the PRODUCT of probability and impact, each on the plate's
///       three levels (1 منخفض · 2 متوسط · 3 عالي), banded back onto the same
///       three: 1–2 منخفض · 3–4 متوسط · 6+ عالي.
/// spec: ملحق الشكل 43, which prints the rule beside the screen title and then
///       proves it on seven rows.
/// example: احتمالية متوسط (2) × تأثير عالي (3) = 6 → عالي — RSK-01 on the plate.
///
/// ── THE PLATE'S OWN SEVEN ARE THE TEST ───────────────────────────────────
/// Nothing in `01`–`06` defines a risk model, so the screen is the entire
/// specification and its rows are the only worked examples that exist:
///
///   RSK-01  متوسط × عالي   = 6 → عالي
///   RSK-02  منخفض × منخفض  = 1 → منخفض
///   RSK-03  متوسط × منخفض  = 2 → منخفض
///   RSK-04  منخفض × منخفض  = 1 → منخفض
///   RSK-05  منخفض × عالي   = 3 → متوسط
///   RSK-06  عالي  × منخفض  = 3 → متوسط
///   RSK-07  منخفض × متوسط  = 2 → منخفض
///
/// which is what fixes the bands at 2 and 4 rather than at, say, 3 and 6: RSK-05
/// and RSK-06 both score 3 and both read متوسط, and RSK-03 scores 2 and reads
/// منخفض. Any other banding contradicts a row the client signed off.
///
/// ── SEVERITY IS NEVER STORED (`01 §3`) ───────────────────────────────────
/// A stored severity is one that can disagree with the two numbers beside it.
/// </summary>
public static class RiskSeverity
{
    /// <summary>1 منخفض · 2 متوسط · 3 عالي — the plate's three, on both axes.</summary>
    public const int Low = 1;
    public const int Medium = 2;
    public const int High = 3;

    /// <summary>The product, 1..9. It is shown nowhere — the BAND is what the register prints.</summary>
    public static int Score(int probability, int impact) => probability * impact;

    /// <summary>`low` · `medium` · `high` — الشكل 43's «الخطورة» column.</summary>
    public static string For(int probability, int impact)
    {
        var score = Score(probability, impact);
        return score <= 2 ? "low" : score <= 4 ? "medium" : "high";
    }

    /// <summary>
    /// The register's severity tabs, counted — «الكل 7 · عالي 1 · متوسط 2 ·
    /// منخفض 4». Every band is returned even at zero, because a tab that
    /// disappears when empty makes the set of bands look like it changed.
    /// </summary>
    public static IReadOnlyList<(string Band, int Count)> Bands(
        IReadOnlyList<(int Probability, int Impact)> risks)
    {
        var byBand = risks.Select(r => For(r.Probability, r.Impact)).ToList();
        return
        [
            ("high", byBand.Count(b => b == "high")),
            ("medium", byBand.Count(b => b == "medium")),
            ("low", byBand.Count(b => b == "low")),
        ];
    }
}
