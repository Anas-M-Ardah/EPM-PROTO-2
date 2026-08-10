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

    IReadOnlyList<StatusSlice> StatusDistribution,
    IReadOnlyList<EntityValue> ValueByEntity,

    // ---- honestly absent ----
    IReadOnlyList<Unavailable> Unavailable);
