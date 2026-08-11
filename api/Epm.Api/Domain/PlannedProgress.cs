namespace Epm.Api.Domain;

/// <summary>
/// The two pieces of schedule arithmetic `02-BUSINESS-RULES.md` needs but does
/// not number. Both are here rather than in an endpoint because CLAUDE.md §3.1
/// puts ALL business arithmetic in Domain/, numbered rule or not.
///
/// ── WHY THIS FILE HAS TO EXIST (P-53) ────────────────────────────────────
/// BR-11 takes `planned` as an INPUT — `PV = budget × plannedProgress` — and
/// nothing in `02` says where that figure comes from. Without it there is no
/// SPI, and SPI is one of the four diagnostics `04 §3` and ROADMAP 4.4 ask
/// for. So the question has to be answered somewhere, and the honest place is
/// a rule file that says what it assumed.
///
/// **The assumption: an activity earns its weight linearly across its own
/// BASELINE span.** At the data date, an activity whose baseline ran
/// 2025-03-01 → 2025-04-14 and is now long past is 100% planned; one that has
/// not started is 0%; one halfway through its baseline days is 50%.
///
/// It is deliberately the dullest possible curve. The alternatives were worse:
///
///   A CONSTANT OFFSET (planned = actual + 8) makes every project identically
///   behind, which is not a measurement of anything — the reference's own
///   comment says this was tried and abandoned.
///
///   AN S-CURVE over the project span is more realistic in aggregate and
///   unfalsifiable in detail: it would disagree with the delay days BR-10
///   computes from the same baseline dates, and there is no second source to
///   settle which is right.
///
/// Linear-per-activity has the property those two lack: it is computed from
/// the SAME baseline dates and the SAME cost weights that physical % uses, so
/// SPI compares like with like, and a reader who disbelieves the number can
/// re-derive it from two columns already on the Schedule screen.
///
/// **Recorded as an assumption, not a rule.** If the ministry's own progress
/// curve exists, this is one function to replace, and `PlannedPct` is the only
/// caller-visible surface.
/// </summary>
public static class PlannedProgress
{
    /// <summary>
    /// How much of an activity the baseline REQUIRES to be done by
    /// <paramref name="asOf"/>, as a percentage, linear across the baseline
    /// span and clamped to 0…100.
    ///
    /// A milestone (start == finish) is all-or-nothing: it is either due or it
    /// is not, and there is no such thing as a half-reached milestone.
    ///
    /// Null dates return 0 — an activity with no baseline demands nothing,
    /// which is not the same claim as "it is late".
    /// </summary>
    public static decimal PlannedPct(DateOnly? baselineStart, DateOnly? baselineFinish, DateOnly asOf)
    {
        if (baselineStart is null || baselineFinish is null) return 0m;

        var start = baselineStart.Value.DayNumber;
        var finish = baselineFinish.Value.DayNumber;
        var now = asOf.DayNumber;

        // THE FINISH TEST COMES FIRST, and only the zero-length span can tell
        // the difference. A milestone has start == finish, so on the day it
        // falls due both guards match; "the baseline required this by today"
        // is the true reading, and testing `now <= start` first would report a
        // milestone as demanding nothing on the very day it is due.
        // For a normal activity the two are disjoint and the order is moot.
        if (now >= finish) return 100m;
        if (now <= start) return 0m;

        var span = finish - start;
        return (decimal)(now - start) / span * 100m;
    }

    /// <summary>
    /// What is left of an activity's duration, in days.
    ///
    /// P6 exports this column and `Activities.RemainingDuration` stores it as
    /// imported — but a stored figure that contradicts the percentage printed
    /// next to it is worse than no figure, so every write of `ProgressPct`
    /// recomputes it through here.
    ///
    /// A milestone has zero duration and therefore nothing remaining.
    /// </summary>
    public static int RemainingDuration(int originalDuration, decimal progressPct, bool isMilestone)
    {
        if (isMilestone || originalDuration <= 0) return 0;

        var pct = Math.Clamp(progressPct, 0m, 100m);
        return (int)Math.Round(originalDuration * (1m - pct / 100m), MidpointRounding.AwayFromZero);
    }
}
