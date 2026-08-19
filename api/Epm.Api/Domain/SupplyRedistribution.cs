namespace Epm.Api.Domain;

/// <summary>
/// الشكل 58 · المسار 9 في مشاريع التجهيز — إعادة توزيع كميات الفقرة بين الجهات.
///
/// rule: تحويلات من جهة مصدر إلى جهة هدف داخل الفقرة الواحدة. لا يتجاوز مجموع
///       ما يُسحب من جهة ما هو مخصص لها، وأثر ذلك على قيمة العقد صفر.
/// spec: الشكل 58 «تحويلات إعادة التوزيع من عدة مصادر إلى عدة جهات لنفس
///       الفقرة … مع مؤشر المتاح لكل مصدر»، and its own stated benefit:
///       «تفصل إعادة توزيع الكميات بين الجامعات عن أي تعديل في القيمة
///       التعاقدية … بأثر مالي صفري».
/// example: ITM-002 — البصرة 40 · الموصل 71. Move 12 from البصرة and 10 from
///          الموصل to تلعفر → البصرة −12 · الموصل −10 · تلعفر +22, and the
///          contract value does not move.
///
/// ── WHY THIS IS NOT `ChangeOrderLine.ChangeType = "redist"` ──────────────
/// That one already exists and moves quantity BOQ-LINE to BOQ-LINE
/// (`TargetBoqItemId`) — one فقرة gives up devices and another gains them.
/// الشكل 58 does something different: the فقرة keeps every device it had, and
/// only the LIST OF WHO GETS THEM changes. The line's quantity, rate, amount
/// and weight are all untouched, which is why الشكل 59's summary row reads
/// «الحالي 111 · المقترح 111 · الأثر 0».
///
/// ── THE ZERO IS A FACT, NOT A MISSING FIGURE ─────────────────────────────
/// الشكل 59 prints «قيمة العقد الحالية 416,160,000 مقابل 0 و416,160,000 و0
/// و416,160,000», and الشكل 60 repeats it. A redistribution that moved money
/// would be a quantity change wearing the wrong name, so <see cref="Impact"/>
/// returns zero and the screens print it rather than leaving the cell empty.
///
/// ── WHAT IS CHECKED ──────────────────────────────────────────────────────
///   المتاح          Σ drawn from one source ≤ what that source holds. الشكل 58
///                   prints «المتاح» beside each transfer for exactly this.
///   من ≠ إلى        a transfer to its own source moves nothing and hides a
///                   typo behind a no-op.
///   كمية موجبة      a negative transfer is the opposite transfer, entered
///                   backwards; the wizard has a من/إلى pair for that.
/// The TARGET is deliberately NOT capped: a beneficiary may receive any amount,
/// and `02 §8`'s ceiling is on the ITEM's total distribution, which a
/// redistribution leaves unchanged by construction.
/// </summary>
public static class SupplyRedistribution
{
    /// <param name="From">The beneficiary giving devices up.</param>
    /// <param name="To">The beneficiary receiving them.</param>
    public record Transfer(string From, string To, decimal Qty);

    /// <param name="Code">Beneficiary code.</param>
    /// <param name="Before">What it holds now — its `BoqDistributions` row.</param>
    /// <param name="Delta">Signed. الشكل 58's «صافي التغيير في التوزيع بعد التطبيق».</param>
    public record Net(string Code, decimal Before, decimal Delta, decimal After);

    public record Refusal(string MessageAr, string MessageEn);

    /// <summary>
    /// What one source still has available to give — its allocation minus what
    /// earlier transfers in this same order already draw from it. الشكل 58
    /// prints this beside the transfer row being edited.
    /// </summary>
    public static decimal Available(
        string source, IReadOnlyDictionary<string, decimal> allocation,
        IEnumerable<Transfer> transfers)
    {
        var held = allocation.GetValueOrDefault(source);
        var drawn = transfers.Where(t => Same(t.From, source)).Sum(t => t.Qty);
        return Math.Max(0m, held - drawn);
    }

    /// <summary>
    /// الشكل 58's own chip strip — one entry per beneficiary the order touches,
    /// with what it holds now and what it would hold after.
    ///
    /// A beneficiary the transfers only GIVE to appears with `Before` zero,
    /// which is جامعة تلعفر's case in the plate: it holds nothing and the whole
    /// point of the order is that it should.
    /// </summary>
    public static IReadOnlyList<Net> Nets(
        IReadOnlyDictionary<string, decimal> allocation, IReadOnlyList<Transfer> transfers)
    {
        var codes = allocation.Keys
            .Concat(transfers.Select(t => t.From))
            .Concat(transfers.Select(t => t.To))
            .Where(c => !string.IsNullOrWhiteSpace(c))
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        return codes
            .Select(c =>
            {
                var before = allocation.GetValueOrDefault(c);
                var delta = transfers.Where(t => Same(t.To, c)).Sum(t => t.Qty)
                          - transfers.Where(t => Same(t.From, c)).Sum(t => t.Qty);
                return new Net(c, before, delta, before + delta);
            })
            // The ones that MOVED first — a strip where the unchanged rows come
            // first buries the three that are the point of the order.
            .OrderByDescending(n => Math.Abs(n.Delta))
            .ThenBy(n => n.Code, StringComparer.Ordinal)
            .ToList();
    }

    /// <summary>
    /// أثر إعادة التوزيع على قيمة العقد. ZERO, always, and it is returned
    /// rather than assumed so the caller prints a figure it was given.
    /// </summary>
    public static decimal Impact(IReadOnlyList<Transfer> transfers) => 0m;

    /// <summary>
    /// May this set of transfers be applied? Null means yes. Checks the SET,
    /// not one transfer: two rows drawing from the same source can each be
    /// under its allocation and together over it.
    /// </summary>
    public static Refusal? Check(
        IReadOnlyDictionary<string, decimal> allocation, IReadOnlyList<Transfer> transfers)
    {
        if (transfers.Count == 0)
            return new("لا تحويلات في إعادة التوزيع.", "The redistribution has no transfers.");

        foreach (var t in transfers)
        {
            if (string.IsNullOrWhiteSpace(t.From) || string.IsNullOrWhiteSpace(t.To))
                return new("كل تحويل يحتاج جهة مصدر وجهة هدف.",
                           "Every transfer needs a source and a target beneficiary.");

            if (Same(t.From, t.To))
                return new("لا يُحوَّل من جهة إلى نفسها.",
                           "A transfer cannot have the same source and target.");

            if (t.Qty <= 0m)
                return new("الكمية المنقولة يجب أن تكون أكبر من صفر.",
                           "The transferred quantity must be greater than zero.");
        }

        // THE SET, not the row. Two transfers of 30 each from a source holding
        // 40 are individually fine and together impossible.
        foreach (var g in transfers.GroupBy(t => t.From, StringComparer.OrdinalIgnoreCase))
        {
            var held = allocation.GetValueOrDefault(g.Key);
            var drawn = g.Sum(t => t.Qty);
            if (drawn > held)
                return new(
                    $"مجموع المسحوب من الجهة ({drawn:0.##}) يتجاوز المتاح لديها ({held:0.##}).",
                    $"The total drawn from a beneficiary ({drawn:0.##}) exceeds what it holds ({held:0.##}).");
        }

        return null;
    }

    private static bool Same(string? a, string? b) =>
        string.Equals(a, b, StringComparison.OrdinalIgnoreCase);
}
