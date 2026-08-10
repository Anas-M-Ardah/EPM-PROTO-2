namespace Epm.Api.Features.Contracts;

/// <summary>
/// Member names are IDENTICAL to web/src/app/features/contracts/contracts.types.ts,
/// so one grep crosses both stacks (CLAUDE.md §2).
///
/// Column set ported from DContractsAll — the v1.1 branch,
/// docs/spec/reference/app/enterprise-areas.jsx:299.
/// </summary>
/// <param name="EffectiveValue">
/// DERIVED (BR-09): original + Σ APPLIED amendment deltas. Never stored.
/// </param>
/// <param name="ProjectedValue">
/// DERIVED: effective + approved-but-UNAPPLIED deltas. A projection (02 §9) —
/// the UI must label it and must never present it as the contract's value.
/// Equal to EffectiveValue when nothing is pending.
/// </param>
/// <param name="AmendmentCount">Applied amendments only — the version number.</param>
/// <param name="PendingCount">Approved and awaiting application.</param>
public record ContractRow(
    string Id,
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string NameAr,
    string NameEn,
    string Contractor,
    string Status,
    string? Start,
    string? OriginalFinish,
    string? EffectiveFinish,
    decimal OriginalValue,
    decimal EffectiveValue,
    decimal ProjectedValue,
    int AmendmentCount,
    int PendingCount,
    decimal? FinancialPct);

public record ContractsResponse(
    IReadOnlyList<ContractRow> Rows,
    int Total,
    Dictionary<string, int> CountByStatus);
