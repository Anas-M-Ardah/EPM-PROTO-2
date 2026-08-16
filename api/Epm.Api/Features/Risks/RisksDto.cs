namespace Epm.Api.Features.Risks;

/// <summary>
/// Member names are IDENTICAL to
/// web/src/app/features/risks/risks.types.ts (CLAUDE.md §2).
///
/// SCR-W9 — سجل المخاطر · **ملحق الشكل 43**.
/// </summary>

/// <param name="Severity">
/// `low` · `medium` · `high` — DERIVED from probability × impact by
/// Domain/RiskSeverity, never stored (`01 §3`). The screen prints the rule
/// beside its own title, so a stored value could contradict the two numbers on
/// the same row.
/// </param>
/// <param name="Indicator">SPI · CPI · EAC · VAC — what this risk is measured against.</param>
public record RiskRow(
    string Code,
    string TitleAr,
    string TitleEn,
    string Category,
    int Probability,
    int Impact,
    string Severity,
    string Owner,
    string Indicator,
    string Status,
    string? RaisedDate);

/// <param name="Band">`high` · `medium` · `low`.</param>
public record RiskBand(string Band, int Count);

public record RisksResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string? DataDate,
    /// <summary>الشكل 43's severity tabs, every band present even at zero.</summary>
    IReadOnlyList<RiskBand> Bands,
    IReadOnlyList<RiskRow> Rows);
