namespace Epm.Api.Features.Portfolio;

/// <summary>
/// Member names are IDENTICAL to web/src/app/features/portfolio/portfolio.types.ts.
///
/// Ported from DDashboard (v1.1), docs/spec/reference/app/desktop-views.jsx:45.
/// </summary>

/// <param name="Code">Status code (06 §1) — the UI resolves the label from Lookups.</param>
public record StatusSlice(string Code, int Count);

public record EntityValue(string Code, string NameAr, string NameEn, decimal Value, int ProjectCount);

/// <summary>
/// A headline figure the system CANNOT yet derive.
///
/// The design language is explicit: "never render 0/100% for a missing input —
/// show 'unavailable' + reason". Sending the reason from the server keeps the
/// explanation next to the rule that owns it, instead of hard-coded in a
/// component that will drift when the input arrives.
/// </summary>
/// <param name="Key">physical · financial · spi · cpi</param>
/// <param name="NeedsAr">Plain-language statement of what it is waiting for.</param>
public record Unavailable(string Key, string NeedsAr, string NeedsEn);

/// <summary>
/// One period of SCR-E1's two S-curves. Same record as the overview's — the
/// prototype draws both screens' curves with the one `DSCurve`.
/// </summary>
public record PortfolioCurvePeriod(
    string At, decimal PlanCum, decimal? ActCum, decimal PlanPeriod, decimal ActPeriod);

/// <summary>
/// One project on SCR-E1's «قائمة المتابعة — مشاريع خارج المسار»: everything
/// whose `Domain/ExecutiveSignal` is not green, worst value first.
/// </summary>
/// <param name="Variance">
/// Physical minus planned, in points. Negative is behind. Null when either
/// figure is missing — an unknown variance is not a zero one.
/// </param>
public record WatchlistRow(
    string ProjectId,
    string NameAr,
    string NameEn,
    string WorkspaceCode,
    string WorkspaceNameAr,
    string WorkspaceNameEn,
    string Status,
    string Signal,
    decimal? Physical,
    decimal? Variance,
    decimal Value,
    string? ForecastFinish);

/// <param name="Count">Projects carrying this signal.</param>
/// <param name="Share">Its share of the portfolio, whole percent.</param>
public record SignalBand(string Signal, int Count, int Share);

/// <summary>SCR-E1's «الكلفة المقررة · المعدلة · المصروف» comparison.</summary>
public record PortfolioCost(decimal Approved, decimal Revised, decimal Spent);

/// <param name="Year">A calendar year with recorded disbursement.</param>
public record SpendYear(int Year, decimal Value);

/// <summary>
/// SCR-E1's «معالم قادمة» — the nearest planned finishes still ahead of the
/// data date, so the panel names what is about to fall due rather than what
/// already has.
/// </summary>
public record UpcomingMilestone(
    string ProjectId, string NameAr, string NameEn,
    string WorkspaceNameAr, string WorkspaceNameEn,
    decimal? Physical, string PlannedFinish);

/// <summary>
/// SCR-E1's «الجدول الزمني للمشاريع · أعلى 5 مشاريع كلفةً» — DTlMini,
/// docs/spec/reference/app/desktop-charts.jsx:116, fed at desktop-views.jsx:285.
///
/// One row per project: how far it has got, and the two dates that say whether
/// it will land on time. The reference reads the FORECAST finish when it is
/// later than the planned one and the planned finish otherwise, so the row
/// states the date that is actually going to happen — see <paramref
/// name="ForecastFinish"/>.
/// </summary>
/// <param name="Physical">
/// BR-04's weighted progress, and the bar's fill. Null when the project has no
/// bill to weigh — the bar then draws empty rather than claiming 0%.
/// </param>
/// <param name="Start">Earliest contract start. Null before anything is awarded.</param>
/// <param name="PlannedFinish">Latest ORIGINAL contract finish — the contractual date.</param>
/// <param name="ForecastFinish">
/// Latest forecast finish. Null when no contract carries one. The UI compares
/// it with <paramref name="PlannedFinish"/> and marks an overrun; the
/// comparison is a display rule, but both dates it reads are the server's.
/// </param>
public record TimelineRow(
    string ProjectId,
    string NameAr,
    string NameEn,
    string WorkspaceCode,
    string Status,
    decimal? Physical,
    decimal Value,
    string? Start,
    string? PlannedFinish,
    string? ForecastFinish);

public record PortfolioResponse(
    // ---- derivable today ----
    int ProjectCount,
    int ActiveCount,
    int DelayedCount,
    int ContractCount,
    int EntityCount,
    /// <summary>Σ EFFECTIVE contract values across the portfolio (BR-00 → BR-09).</summary>
    decimal EffectiveValue,
    /// <summary>Σ approved-but-UNAPPLIED deltas. A PROJECTION (02 §9) — never added to the above.</summary>
    decimal PendingValue,
    int PendingAmendmentCount,
    int AppliedAmendmentCount,

    /// <summary>
    /// D-06 — the data date every figure on this screen is stated as of. The
    /// identity line prints it, because "45% complete" with no date is not a
    /// fact anybody can check.
    /// </summary>
    string AsOf,

    /// <summary>
    /// The `workspace-kind` codes present in scope, for the toolbar's «كل
    /// الجهات» select. Taken BEFORE the filter is applied, so choosing one
    /// does not empty the control that chose it.
    /// </summary>
    IReadOnlyList<string> EntityKinds,

    // ---- REAL since Phase 4.4 became portfolio-wide (P-137) ----
    /// <summary>Weighted by contract value across the portfolio (BR-04).</summary>
    decimal? Physical,
    /// <summary>What the baselines say should be complete by the data date (P-53).</summary>
    decimal? Planned,
    /// <summary>Paid ÷ effective. PAID, never merely certified (P-26).</summary>
    decimal? Financial,
    decimal? Spi,
    decimal? Cpi,
    /// <summary>الحد المقبول — the line the two indices are read against.</summary>
    decimal AcceptableIndex,
    /// <summary>Earned value and actual cost, so the CPI tile can show its terms.</summary>
    decimal EarnedValue,
    decimal ActualCost,

    IReadOnlyList<PortfolioCurvePeriod> ProgressCurve,
    IReadOnlyList<PortfolioCurvePeriod> CostCurve,
    IReadOnlyList<SignalBand> Signals,
    IReadOnlyList<WatchlistRow> Watchlist,
    PortfolioCost Cost,
    IReadOnlyList<SpendYear> AnnualSpend,
    IReadOnlyList<UpcomingMilestone> Milestones,
    IReadOnlyList<TimelineRow> Timeline,

    IReadOnlyList<StatusSlice> StatusDistribution,
    IReadOnlyList<EntityValue> ValueByEntity,

    // ---- honestly absent ----
    IReadOnlyList<Unavailable> Unavailable);
