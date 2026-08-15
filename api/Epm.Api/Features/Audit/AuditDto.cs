namespace Epm.Api.Features.Audit;

/// <summary>
/// Member names are IDENTICAL to web/src/app/features/audit/audit.types.ts
/// (CLAUDE.md §2).
///
/// SCR-W15 — سجل التدقيق.
/// </summary>

/// <param name="Source">
/// project · contract · changeorder — WHICH TRAIL this row came out of. It is
/// not a category somebody assigned: it is the table the row is stored in.
/// </param>
/// <param name="SourceRef">
/// PRJ-0279 · CNT-0279 · VO-03 — the record the event happened to, so a reader
/// can go and look at it.
/// </param>
/// <param name="IsSystem">
/// «النظام · حدث آلي». A row the system wrote is told apart from a row a person
/// wrote — الشكل 11 draws the two differently, and P-83 is the same call.
/// </param>
/// <param name="ActorName">
/// As RECORDED at the moment of the edit, not joined now: a persona list can
/// change and the record may not. Null when <paramref name="IsSystem"/>.
/// </param>
/// <param name="Field">
/// The member that moved. Null on a non-edit — a submission or an approval
/// changes a lifecycle, not a field.
/// </param>
public record AuditRow(
    string Source,
    string SourceRef,
    string Action,
    string At,
    bool IsSystem,
    string? ActorName,
    string? ActorRole,
    string? ActorParty,
    string? Field,
    string? Before,
    string? After,
    string? Note);

/// <param name="Code">`all`, or a source code.</param>
public record AuditChip(string Code, int Count);

public record AuditResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string? DataDate,
    int Total,
    int SystemCount,
    IReadOnlyList<AuditChip> Sources,
    IReadOnlyList<AuditRow> Rows);
