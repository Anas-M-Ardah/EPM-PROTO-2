namespace Epm.Api.Domain;

/// <summary>
/// المسار 3 · الشكل 13 — رفع حساب الكميات ومراجعته.
///
/// «البداية: توفّر حساب الكميات التعاقدي · النهاية: إصدار معتمد من حساب الكميات
/// مرتبط بالعقد». This is steps 4 and 5 of that track — «تحليل الملف والتحقق ثم
/// مقارنته بالإصدار القائم» and «تحقق: صحة الكميات والأسعار ومجموع الأوزان
/// 100.00%» — and nothing else: reading the file is the client's job, writing
/// the version is the endpoint's.
///
/// ── THE IMPORT NEVER REPLACES ANYTHING ───────────────────────────────────
/// المسار 3 step 6 is «تقديم النسخة للاعتماد — لا استبدال للإصدار السابق», and
/// الشكل 13 prints it inside the dialog: «يُقدَّم للاعتماد ولا يُستبدل الجدول
/// السابق — يُحفَظ كإصدار». So nothing here mutates: <see cref="Validate"/>
/// reports and <see cref="Compare"/> describes. What the caller does with a
/// clean result is a separate, deliberate write.
///
/// ── WHAT IS CHECKED, AND WHY EACH ────────────────────────────────────────
/// المسار 3 names four: «مطابقة الأعمدة · صحة القيم · مجموع الأوزان 100.00% ·
/// انتماء البنود إلى العقد المختار حصرًا».
///
///   مطابقة الأعمدة   a required cell that arrived empty — the mapping picked
///                    the wrong column, or the file has a gap.
///   صحة القيم        quantity and rate must be positive numbers. A zero rate
///                    is the «بنود غير مسعّرة» alert المسار 3 itself raises.
///   الأوزان 100.00%  NOT a check on the file: BR-01 derives weights from the
///                    amounts and largest-remainder makes them sum to exactly
///                    100.00 (D-07). What can fail is the INPUT to that — a
///                    bill whose amounts total zero has no weights to give, so
///                    that is what is refused, and a test pins the 100.00.
///   انتماء البنود    enforced by the ENDPOINT, which knows the contract. A
///                    duplicate code inside the file is checked here, because
///                    two rows claiming one code is a file defect either way.
/// </summary>
public static class BoqImport
{
    /// <summary>
    /// One row as the wizard parsed it — the six fields المسار 3 asks for:
    /// «الرمز والوصف والقسم والوحدة والكمية وسعر الوحدة».
    /// </summary>
    /// <param name="Row">1-based row number IN THE FILE, so a violation can be pointed at.</param>
    public record Candidate(
        int Row,
        string Code,
        string Description,
        string Division,
        string Unit,
        decimal Qty,
        decimal Rate)
    {
        /// <summary>Never stored on the candidate: qty × rate, derived once, here.</summary>
        public decimal Amount => Qty * Rate;
    }

    /// <param name="Row">0 for a whole-file finding, e.g. an empty bill.</param>
    /// <param name="Field">The candidate member at fault, or "" for the file.</param>
    public record Violation(int Row, string Field, string MessageAr, string MessageEn);

    /// <summary>
    /// المسار 3 step 5. Every failing cell is reported, not just the first: an
    /// import is fixed in the spreadsheet, and a wizard that surfaces one error
    /// per attempt makes that a dozen round trips.
    /// </summary>
    public static IReadOnlyList<Violation> Validate(IReadOnlyList<Candidate> rows)
    {
        var v = new List<Violation>();

        if (rows.Count == 0)
        {
            v.Add(new(0, "", "لا بنود في الملف بعد مطابقة الأعمدة.",
                "The file carries no items once the columns are mapped."));
            return v;
        }

        foreach (var r in rows)
        {
            if (string.IsNullOrWhiteSpace(r.Code))
                v.Add(new(r.Row, "code", "رمز البند فارغ.", "The item code is empty."));

            if (string.IsNullOrWhiteSpace(r.Description))
                v.Add(new(r.Row, "description", "وصف البند فارغ.", "The item description is empty."));

            if (string.IsNullOrWhiteSpace(r.Unit))
                v.Add(new(r.Row, "unit", "وحدة القياس فارغة.", "The unit of measure is empty."));

            if (r.Qty <= 0m)
                v.Add(new(r.Row, "qty", "الكمية يجب أن تكون أكبر من صفر.",
                    "The quantity must be greater than zero."));

            // «بنود غير مسعّرة» is one of المسار 3's own alerts, and an unpriced
            // line carries no weight — so it would silently dilute every other
            // item's share of the contract.
            if (r.Rate <= 0m)
                v.Add(new(r.Row, "rate", "سعر الوحدة يجب أن يكون أكبر من صفر.",
                    "The unit rate must be greater than zero."));
        }

        // Two rows claiming one code: the register is keyed by code inside a
        // contract, so this is not a warning — the second row would overwrite
        // the first on import.
        foreach (var g in rows
            .Where(r => !string.IsNullOrWhiteSpace(r.Code))
            .GroupBy(r => r.Code.Trim(), StringComparer.OrdinalIgnoreCase)
            .Where(g => g.Count() > 1))
        {
            foreach (var r in g.Skip(1))
                v.Add(new(r.Row, "code",
                    $"الرمز «{g.Key}» مكرر في الملف.",
                    $"The code «{g.Key}» appears more than once in the file."));
        }

        // The weights' input, not the weights: see the class note.
        if (rows.Sum(r => r.Amount) <= 0m)
            v.Add(new(0, "",
                "مجموع قيم البنود صفر — لا يمكن احتساب الأوزان.",
                "The bill totals zero, so no weights can be derived."));

        return v;
    }

    /// <summary>How one code differs between the version in force and the file.</summary>
    public enum Change { Added, Removed, Changed, Unchanged }

    /// <param name="BeforeAmount">0 on an added line.</param>
    /// <param name="AfterAmount">0 on a removed line.</param>
    public record Line(
        string Code,
        string Description,
        Change Change,
        decimal? BeforeQty,
        decimal? BeforeRate,
        decimal BeforeAmount,
        decimal? AfterQty,
        decimal? AfterRate,
        decimal AfterAmount);

    /// <param name="Delta">After − before. Signed: a bill can shrink.</param>
    public record Comparison(
        IReadOnlyList<Line> Lines,
        int Added,
        int Removed,
        int Changed,
        int Unchanged,
        decimal BeforeTotal,
        decimal AfterTotal,
        decimal Delta);

    /// <summary>The current line, as the register holds it.</summary>
    public record Existing(string Code, string Description, decimal Qty, decimal Rate, decimal Amount);

    /// <summary>
    /// المسار 3 step 4 — «مقارنته بالإصدار القائم». «يُعرض أثر الاستيراد بالمقارنة
    /// قبل التقديم، فيقلّ خطر الاستبدال الخاطئ» (الشكل 13).
    ///
    /// A REMOVED line is the whole reason this step exists: an import that
    /// silently drops a priced item takes its quantity, its activity links and
    /// its earned value with it, and the only place that is visible before the
    /// fact is here.
    /// </summary>
    public static Comparison Compare(
        IReadOnlyList<Existing> current, IReadOnlyList<Candidate> incoming)
    {
        var byCode = current.ToDictionary(x => x.Code.Trim(), StringComparer.OrdinalIgnoreCase);
        var seen = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var lines = new List<Line>();

        foreach (var r in incoming)
        {
            var code = r.Code.Trim();
            seen.Add(code);

            if (!byCode.TryGetValue(code, out var was))
            {
                lines.Add(new(code, r.Description, Change.Added,
                    null, null, 0m, r.Qty, r.Rate, r.Amount));
                continue;
            }

            var moved = was.Qty != r.Qty || was.Rate != r.Rate;
            lines.Add(new(code, r.Description,
                moved ? Change.Changed : Change.Unchanged,
                was.Qty, was.Rate, was.Amount,
                r.Qty, r.Rate, r.Amount));
        }

        foreach (var was in current.Where(x => !seen.Contains(x.Code.Trim())))
            lines.Add(new(was.Code, was.Description, Change.Removed,
                was.Qty, was.Rate, was.Amount, null, null, 0m));

        var before = current.Sum(x => x.Amount);
        var after = incoming.Sum(x => x.Amount);

        return new Comparison(
            lines,
            lines.Count(l => l.Change == Change.Added),
            lines.Count(l => l.Change == Change.Removed),
            lines.Count(l => l.Change == Change.Changed),
            lines.Count(l => l.Change == Change.Unchanged),
            before, after, after - before);
    }
}
