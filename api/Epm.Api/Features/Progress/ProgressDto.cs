namespace Epm.Api.Features.Progress;

/// <summary>
/// Member names are IDENTICAL to web/src/app/features/progress/progress.types.ts
/// (CLAUDE.md §2).
///
/// SCR-W6, ported from the v1.1 progress module — ../epm@design/system-revamp
/// app/project-modules.jsx `DModProgress` :1391.
///
/// ── THE SCREEN 02 §4 IS ABOUT ────────────────────────────────────────────
/// Every other tab shows progress; this one is where it MOVES. An activity's
/// percentage is edited here and BR-04 reflects it straight onto the BOQ lines
/// the activity is linked to — which is why the reflection table sits directly
/// under the editor rather than on another screen (P-55).
/// </summary>

// ── the headline ─────────────────────────────────────────────────────────

/// <param name="Physical">
/// The project's physical %, weight-rolled from the BOQ lines (02 §4's
/// "contract executed value ÷ contract value", then across contracts).
/// </param>
/// <param name="Financial">
/// Disbursed ÷ effective value. Counts PAID only, never merely certified —
/// P-26's rule, and the gap between the two is where a delayed project's money
/// sits.
/// </param>
/// <param name="Planned">
/// What the baseline requires at the data date, from the same cost weights
/// physical % uses. An ASSUMPTION, not a numbered rule — see P-53.
/// </param>
/// <param name="DelayDays">
/// BR-10's own figure, so this screen and SCR-E5 can never disagree about how
/// late the project is. Null when no forecast has been recorded.
/// </param>
public record ProgressHeadline(
    decimal Physical,
    decimal Financial,
    decimal Planned,
    int? DelayDays,
    string? BaselineFinish,
    string? ForecastFinish);

/// <summary>
/// BR-11, as DIAGNOSTICS. `02 §11` and `05 §7.9`: 13px, `--on-surface-variant`,
/// and NEVER coloured by threshold — `cpi &lt; 1 ? error : success` is a defect.
/// Every member is nullable because P-09 forbids rendering a 0 that asserts a
/// failure the data cannot support.
/// </summary>
public record ProgressEvm(
    decimal Budget,
    decimal Pv,
    decimal Ev,
    decimal Ac,
    decimal? Cpi,
    decimal? Spi,
    decimal? Eac,
    decimal? Vac);

// ── the editor, and what it moves ────────────────────────────────────────

/// <param name="BoqCodes">
/// The BOQ lines this activity feeds, so a person can see what a drag is about
/// to move BEFORE moving it. Empty means the activity is linked to no line —
/// its progress is real work that earns nothing, which the screen says out loud.
/// </param>
/// <param name="PlannedPct">
/// This activity's own planned figure (P-53), so the row explains its share of
/// the project-level gap rather than only contributing to it.
/// </param>
public record ProgressActivityDto(
    string ActivityId,
    string NameAr,
    string NameEn,
    string ContractId,
    string WbsPath,
    string Status,
    decimal ProgressPct,
    decimal PlannedPct,
    decimal AbsoluteWeight,
    int OriginalDuration,
    int RemainingDuration,
    bool IsMilestone,
    bool IsCritical,
    string? BaselineStart,
    string? BaselineFinish,
    IReadOnlyList<string> BoqCodes);

/// <param name="Progress">BR-04 — the allocation-weighted mean of the linked activities.</param>
/// <param name="AchievedAmount">`02 §4`: amount × progress ÷ 100.</param>
/// <param name="AchievedQty">Effective quantity × progress ÷ 100.</param>
/// <param name="Contributors">
/// Which activity contributes what to this line's percentage — share × its
/// progress. It is the arithmetic printed rather than asserted, because this is
/// the one table whose figure a person is about to change by hand.
/// </param>
public record ProgressBoqDto(
    string Code,
    string DescriptionAr,
    string DescriptionEn,
    string ContractId,
    string Unit,
    decimal EffectiveQty,
    decimal Amount,
    decimal Progress,
    decimal AchievedQty,
    decimal AchievedAmount,
    decimal RemainingValue,
    string Coverage,
    IReadOnlyList<ProgressContributorDto> Contributors);

public record ProgressContributorDto(
    string ActivityId,
    string NameAr,
    string NameEn,
    decimal SharePct,
    decimal ProgressPct);

/// <param name="Executed">Σ achieved amount over the contract's BOQ lines (02 §4's rollup).</param>
public record ProgressContractDto(
    string Id,
    string NameAr,
    string NameEn,
    string Status,
    decimal EffectiveValue,
    decimal Executed,
    decimal Physical,
    decimal Planned,
    int Activities,
    int BoqLines);

public record ProgressResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string? DataDate,
    ProgressHeadline Headline,
    ProgressEvm Evm,
    IReadOnlyList<ProgressContractDto> Contracts,
    IReadOnlyList<ProgressActivityDto> Activities,
    IReadOnlyList<ProgressBoqDto> BoqLines);

/// <param name="ProgressPct">0…100. Anything outside it is refused, not clamped (04 §9).</param>
public record UpdateProgressRequest(decimal ProgressPct);
