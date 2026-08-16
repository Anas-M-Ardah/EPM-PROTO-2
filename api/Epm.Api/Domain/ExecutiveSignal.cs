namespace Epm.Api.Domain;

/// <summary>
/// SCR-E1's «المؤشر التنفيذي» — one of three colours per project, and the rule
/// behind the portfolio's watchlist.
///
/// ── THIS ONE IS THE PROTOTYPE'S, AND IT IS A REAL RULE ───────────────────
/// Ported from the live prototype's `EPM.execSignal`:
///
///     if (status === 'completed')            → green
///     if (status === 'stalled' || d > 20%)   → red
///     if (d > 5% || spi &lt; 0.9)                → amber
///     else                                   → green
///
/// where `d` is delay days as a percentage of the BASELINE DURATION. Unlike the
/// prototype's curves and indices — which are a smoothstep and a ratio of two
/// invented figures — every input here is one this system already derives:
/// `Penalty.DelayDays` (BR-10), the contract's own duration, and
/// `EarnedValue.Spi` (BR-11).
///
/// ── WHY A PERCENTAGE OF DURATION AND NOT A DAY COUNT ─────────────────────
/// Thirty days late on a ninety-day contract is a different fact from thirty
/// days late on a five-year one. The threshold has to be relative or it reads
/// as a bias toward short projects.
///
/// ── THE THRESHOLDS ARE THE PROTOTYPE'S, NOT DERIVED ──────────────────────
/// 20%, 5% and 0.9 are numbers somebody chose; `02` defines none of them. They
/// are constants here and named as such, the same way الشكل 4's «الحد المقبول
/// 0.95» is (P-136).
/// </summary>
public static class ExecutiveSignal
{
    public const string Red = "red";
    public const string Amber = "amber";
    public const string Green = "green";

    /// <summary>Past this share of its own duration, a project is red.</summary>
    public const decimal RedDelayPct = 20m;

    /// <summary>Past this share, amber.</summary>
    public const decimal AmberDelayPct = 5m;

    /// <summary>Below this, the schedule index alone makes a project amber.</summary>
    public const decimal AmberSpi = 0.9m;

    /// <summary>The three, in the order SCR-E1's panel lists them.</summary>
    public static IReadOnlyList<string> All { get; } = [Red, Amber, Green];

    /// <param name="status">The project's `project-status` code.</param>
    /// <param name="delayDays">
    /// `Penalty.DelayDays` — the same figure the penalty is charged on. Null
    /// when no forecast is recorded, which is NOT the same as on time: with no
    /// forecast the delay term simply cannot fire, and only the status and the
    /// index can colour the project.
    /// </param>
    /// <param name="plannedDurationDays">
    /// The baseline duration the delay is measured against. Zero or null falls
    /// back to a year, as the prototype does, rather than dividing by nothing.
    /// </param>
    /// <param name="spi">
    /// BR-11's schedule index. Null when the project has no schedule to derive
    /// one from, and a missing index is not a bad one — it is skipped.
    /// </param>
    public static string For(string status, int? delayDays, int? plannedDurationDays, decimal? spi)
    {
        // A finished project cannot be behind: whatever it did on the way, the
        // work is done and a red dot beside it would be a statement about the
        // past rather than about anything anybody can act on.
        if (status == "completed") return Green;

        var duration = plannedDurationDays is > 0 ? plannedDurationDays.Value : 365;
        var delayPct = delayDays is > 0 ? delayDays.Value / (decimal)duration * 100m : 0m;

        if (status == "stalled" || delayPct > RedDelayPct) return Red;
        if (delayPct > AmberDelayPct || spi < AmberSpi) return Amber;
        return Green;
    }

    /// <summary>
    /// The panel's three counts. All three are returned even at zero — a band
    /// that disappears when it empties reads as a changed scale rather than as
    /// a count of none, which is the same rule `RiskSeverity.Bands` follows.
    /// </summary>
    public static IReadOnlyList<(string Signal, int Count)> Counts(IEnumerable<string> signals)
    {
        var list = signals.ToList();
        return All.Select(s => (s, list.Count(x => x == s))).ToList();
    }
}
