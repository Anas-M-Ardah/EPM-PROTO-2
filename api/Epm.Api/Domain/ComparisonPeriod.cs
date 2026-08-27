namespace Epm.Api.Domain;

/// <summary>
/// «مرجع المقارنة» — the control الأشكال 25–28 name in all four of their
/// function lists, and again in all four «الإجراءات المتاحة للمستخدم» as
/// «تغيير مرجع المقارنة».
///
/// ── WHAT IT ACTUALLY SELECTS ─────────────────────────────────────────────
/// Not a baseline. `DModProgress` :1416 says it in its own comment: "one
/// global period selector in Z6 governs every tile. It picks which earlier
/// READING each tile compares against, which is what makes the 'prior period'
/// half of the tile contract real rather than decorative."
///
/// So the vocabulary is the recorded progress history — القراءة السابقة ·
/// الربع الماضي · بداية المشروع — and a period resolves to one earlier
/// reading date. This build read that control as a baseline picker and left it
/// out on the grounds that there is only one baseline; the omission was of the
/// wrong control (P-198).
///
/// ── BOTH ENDS OF A SUBTRACTION COME FROM ONE SERIES ──────────────────────
/// The reference could not do this. Its two series are generated
/// independently, so subtracting a history reading from the financial
/// module's own figure produced "+53 points in a month", and :1432 patches it
/// by SCALING the financial delta onto the figure the tile shows.
///
/// Here there is nothing to patch, because nothing is fabricated:
///
/// * financial at a date is Σ NET of certificates PAID on or before it ÷ the
///   revised cost — the identical derivation `ProgressEndpoints` uses for the
///   headline (P-26 · §23-1), evaluated at two dates instead of one;
/// * physical at a date is `ProgressSeries.ActualAt` over the recorded
///   updates — the identical derivation SCR-W1's actual curve is drawn from.
///
/// A delta is therefore always <c>series(now) − series(then)</c>, never one
/// series minus another. See <see cref="Reading"/>.
///
/// ── A PERIOD WITH NO READING IS OFFERED AND REFUSED ──────────────────────
/// A project logged twice has no "last quarter" to compare against. The option
/// still appears, <see cref="Span.Available"/> false and carrying its reason,
/// because CLAUDE.md §6 asks that a cap be explained rather than the control
/// be hidden — the same call SCR-W5 makes about the weight basis. Hiding it
/// would make the vocabulary depend on the data and leave a reader wondering
/// which comparisons the system can make.
/// </summary>
public static class ComparisonPeriod
{
    /// <summary>
    /// One recorded reading of the whole project, both figures taken at the
    /// same instant so a tile can subtract either without crossing bases.
    /// </summary>
    /// <param name="At">The date the reading was recorded.</param>
    /// <param name="Physical">`ProgressSeries.ActualAt` at that date.</param>
    /// <param name="Financial">Σ paid ÷ revised cost at that date.</param>
    public record Reading(DateOnly At, decimal Physical, decimal Financial);

    /// <param name="Id">previous · quarter · start — the ids the client sends back.</param>
    /// <param name="Back">
    /// How many readings back from the newest one. بداية المشروع is not a
    /// count: it is <see cref="FromStart"/>, and compares against zero rather
    /// than against a reading, because a project at 17% has to read +17 and
    /// not +10 (`DModProgress` :1425).
    /// </param>
    public record Span(string Id, int Back, bool FromStart, bool Available, string? WhyAr, string? WhyEn);

    /// <param name="PriorAt">
    /// The reading the deltas were measured from. NAMED on the tile: "compared
    /// with the previous reading" is only checkable if the reader can see
    /// which reading that was.
    /// </param>
    /// <param name="PhysicalDelta">Points, signed. Positive is progress made since.</param>
    public record Result(
        string Id,
        bool Available,
        string? PriorAt,
        decimal PriorPhysical,
        decimal PriorFinancial,
        decimal PhysicalDelta,
        decimal FinancialDelta);

    /// <summary>The three الشكل 25 offers, in its own order.</summary>
    public const string Previous = "previous";
    public const string Quarter = "quarter";
    public const string Start = "start";

    /// <summary>
    /// What الشكل 25 draws selected: «المقارنة مع القراءة السابقة». It is the
    /// only one of the three about the reporting cycle the screen sits in
    /// rather than about the project's whole life.
    /// </summary>
    public const string Default = Previous;

    /// <summary>
    /// The plate's span where the record supports it, and otherwise the first
    /// that does — which is always <see cref="Start"/>, because a project
    /// always has a start.
    ///
    /// Landing on a REFUSED span would open the screen with every tile saying
    /// «لا قراءة سابقة تصلح للمقارنة» while a perfectly good comparison sat one
    /// click away, unoffered. `04 §9` wants an empty state to be a result; this
    /// one would be a default nobody chose.
    /// </summary>
    public static string DefaultFor(int readingCount)
    {
        var spans = All(readingCount);
        return spans.FirstOrDefault(s => s.Id == Default && s.Available)?.Id
            ?? spans.First(s => s.Available).Id;
    }

    /// <summary>
    /// Three readings back. Quarterly reporting against monthly readings is the
    /// span الشكل 25's own history implies — its four rows are one a month —
    /// and it is `DModProgress` :1423's own `back: 3`.
    /// </summary>
    private const int QuarterBack = 3;

    /// <summary>
    /// Resolve every span against a series, newest reading LAST.
    ///
    /// <paramref name="physicalNow"/> and <paramref name="financialNow"/> are
    /// the figures the tiles display. They are passed in rather than read off
    /// the last reading because the tile's value is the LIVE position and its
    /// delta is the movement since a reading — "+7 points since 2026-05-15" is
    /// a statement about the interval, and the interval ends now.
    /// </summary>
    public static IReadOnlyList<Result> Resolve(
        IReadOnlyList<Reading> readings, decimal physicalNow, decimal financialNow)
    {
        var ordered = readings.OrderBy(r => r.At).ToList();
        return All(ordered.Count)
            .Select(s => Apply(s, ordered, physicalNow, financialNow))
            .ToList();
    }

    /// <summary>
    /// The vocabulary, with each span's availability decided by how many
    /// readings exist. بداية المشروع needs none — a project always has a start.
    /// </summary>
    public static IReadOnlyList<Span> All(int readingCount)
    {
        // The newest reading is the one the tiles are already at, so comparing
        // against it is comparing a figure with itself. "One back" therefore
        // needs TWO readings on file, "three back" needs four.
        var previous = readingCount >= 2;
        var quarter = readingCount >= QuarterBack + 1;

        return
        [
            new Span(Previous, 1, false, previous,
                previous ? null : "لم تُسجَّل سوى قراءة واحدة أو لا شيء",
                previous ? null : "only one reading has been recorded, or none"),
            new Span(Quarter, QuarterBack, false, quarter,
                quarter ? null : "لم تُسجَّل قراءات تكفي لربع كامل",
                quarter ? null : "not enough readings have been recorded for a full quarter"),
            new Span(Start, 0, true, true, null, null),
        ];
    }

    private static Result Apply(
        Span s, IReadOnlyList<Reading> ordered, decimal physicalNow, decimal financialNow)
    {
        // بداية المشروع — nothing had been delivered and nothing had been paid,
        // so the whole of both figures is the movement.
        if (s.FromStart)
            return new Result(s.Id, true, null, 0m, 0m, physicalNow, financialNow);

        if (!s.Available) return new Result(s.Id, false, null, 0m, 0m, 0m, 0m);

        // `Back` counts from the newest reading, and the newest is the last.
        // Clamped to the oldest rather than refused: a span that reaches past
        // the first reading lands on it, which is the earliest comparison the
        // record can support and is never a fabricated one.
        var idx = Math.Max(0, ordered.Count - 1 - s.Back);
        var prior = ordered[idx];

        return new Result(
            s.Id, true, prior.At.ToString("yyyy-MM-dd"),
            prior.Physical, prior.Financial,
            physicalNow - prior.Physical,
            financialNow - prior.Financial);
    }
}
