namespace Epm.Api.Domain;

/// <summary>
/// The threshold band on each of الأشكال 25–28's KPI cards — `DTile`'s `state`
/// prop, which paints a 2px edge on the card's inline-start and nothing else.
///
/// ── WHY THIS IS NOT IN THE TEMPLATE ──────────────────────────────────────
/// `DModProgress` computes all sixteen of these inline, in the view, because a
/// prototype can. Here they are rules: «more than five points behind plan is
/// bad» is a judgement somebody made about ministry projects, and CLAUDE.md
/// §3.1 leaves Angular nothing but display formatting. `ExecutiveSignal` set
/// this precedent for exactly the same kind of figure and for exactly the same
/// reason (P-136).
///
/// ── THE THRESHOLDS ARE THE PROTOTYPE'S, NOT DERIVED ──────────────────────
/// 5 points, 10 points, 20 points, 14 days, 0.95. `02` defines none of them.
/// They are named constants here so a reader can find every one in a single
/// file and a client can change one without a search across a template — the
/// same treatment `ExecutiveSignal.RedDelayPct` gets.
///
/// ── A STATE IS NEVER THE WHOLE STATEMENT ─────────────────────────────────
/// `04 §5`: status is never colour-only. `<epm-tile>` pairs every state with a
/// screen-reader phrase — «ضمن الحد» · «قرب الحد» · «تجاوز الحد» — and the
/// figure itself keeps `--on-surface`. Colouring the NUMBER by its band is the
/// defect CLAUDE.md §6 names outright, and nothing here does it.
///
/// ── A MAGNITUDE HAS NO BAND ──────────────────────────────────────────────
/// Revised cost, cumulative spend, critical count and levels-complete return
/// <see cref="None"/>. They are magnitudes: there is no value at which a
/// contract's revised cost becomes "bad", and the neutral branch of
/// `bad ? --error : --success` is the whole rule.
/// </summary>
public static class TileThreshold
{
    public const string Ok = "ok";
    public const string Warn = "warn";
    public const string Bad = "bad";

    /// <summary>No band at all — the tile draws no edge (`DTile`'s own default).</summary>
    public const string None = "none";

    /// <summary>Points behind plan past which delivery is red rather than amber.</summary>
    public const decimal BehindPlanBadPts = 5m;

    /// <summary>
    /// Points by which disbursement may lead delivery before it is a finding.
    /// Money ahead of work is the one direction that matters here: it is an
    /// over-payment against work not done, which is why the band is asymmetric.
    /// </summary>
    public const decimal SpendAheadBadPts = 20m;

    /// <summary>Points of divergence EITHER way that make the pair worth a look.</summary>
    public const decimal SpendGapWarnPts = 10m;

    /// <summary>Days of delay past which the slip is red rather than amber.</summary>
    public const int DelayBadDays = 14;

    /// <summary>Below this, the schedule index is worth flagging. The TARGET is 1.00.</summary>
    public const decimal SpiWarnBelow = 0.95m;

    /// <summary>
    /// الإنجاز المادي — behind plan at all is amber, more than
    /// <see cref="BehindPlanBadPts"/> behind is red. Ahead of plan is fine.
    ///
    /// Also الشكل 26's «الإنجاز التجميعي للجدول» and its «الفجوة عن المخطط»:
    /// one rule, so a rollup and the gap it produces can never band differently.
    /// </summary>
    public static string AgainstPlan(decimal actual, decimal planned)
        => actual < planned - BehindPlanBadPts ? Bad
         : actual < planned ? Warn
         : Ok;

    /// <summary>
    /// الإنجاز المالي, banded against the PHYSICAL beside it rather than against
    /// a target of its own. A financial percentage on its own says nothing — 38%
    /// spent is good news at 40% delivered and a finding at 15%.
    /// </summary>
    public static string SpendAgainstDelivery(decimal financial, decimal physical)
        => financial - physical > SpendAheadBadPts ? Bad
         : Math.Abs(financial - physical) > SpendGapWarnPts ? Warn
         : Ok;

    /// <summary>
    /// التأخر. Any delay is amber; past <see cref="DelayBadDays"/> it is red.
    /// A NEGATIVE delay — a programme running early — is <see cref="Ok"/>, not
    /// a fourth state: the tile's own signed figure says it is early.
    /// </summary>
    public static string Delay(int? days)
        => days is null ? None
         : days > DelayBadDays ? Bad
         : days > 0 ? Warn
         : Ok;

    /// <summary>
    /// SPI / CPI in one tile. Amber on the SCHEDULE index alone: a cost index
    /// below one on a project that has barely started is arithmetic, not a
    /// finding, and the tile's own words carry the cost half.
    ///
    /// A missing index is not a bad one — it is <see cref="None"/> (P-09).
    /// </summary>
    public static string Indices(decimal? spi)
        => spi is null ? None : spi < SpiWarnBelow ? Warn : Ok;

    /// <summary>
    /// EAC. Red once the forecast cost passes the cost in force — that is the
    /// whole question الشكل 27 says the tab exists to answer: «هل سنتجاوز
    /// الموازنة؟ وبكم؟».
    /// </summary>
    public static string Eac(decimal? eac, decimal revisedCost)
        => eac is null ? None : eac > revisedCost ? Bad : Ok;

    /// <summary>VAC. Negative is a forecast overrun, which is the plate's own reading.</summary>
    public static string Vac(decimal? vac)
        => vac is null ? None : vac < 0m ? Bad : Ok;

    /// <summary>
    /// أوامر تغييرية معتمدة. The APPROVED figure is a magnitude and bands
    /// nothing; what earns amber is orders sitting UNAPPLIED, because those are
    /// money the revised cost does not yet carry (02 §9).
    /// </summary>
    public static string PendingOrders(decimal pending)
        => pending != 0m ? Warn : None;

    /// <summary>
    /// أثر كلفة التأخر. Any estimated impact at all is amber — the plate calls
    /// it «تقدير غير تعاقدي لا يُطالَب به», so it can never be red: nothing is
    /// owed on it.
    /// </summary>
    public static string DelayCost(decimal impact)
        => impact > 0m ? Warn : Ok;

    /// <summary>
    /// عوم سالب. Red at one, because a single activity that cannot meet its
    /// dates without acceleration is already a decision somebody has to take.
    /// </summary>
    public static string NegativeFloat(int count)
        => count > 0 ? Bad : Ok;

    /// <summary>أنشطة معرّضة للخطر — amber at one, never red: it is a watchlist.</summary>
    public static string AtRisk(int count)
        => count > 0 ? Warn : Ok;
}
