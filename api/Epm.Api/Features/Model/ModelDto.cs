namespace Epm.Api.Features.Model;

/// <summary>
/// Member names are IDENTICAL to web/src/app/features/model/model.types.ts
/// (CLAUDE.md §2).
///
/// SCR-W10 — النموذج ثلاثي الأبعاد · **ملحق الشكل 44**.
/// </summary>

/// <param name="BoqDescriptionAr">
/// Resolved HERE, not in the client: the plate prints «ST-120 — أعمدة خرسانية»
/// as one link, and a client that had only the code would either show a bare
/// code or fetch the bill to decorate it.
/// </param>
/// <param name="ActivityNameAr">Same, for «A4 — الهيكل الخرساني».</param>
/// <param name="IsCritical">
/// A RING, never the row's colour — the colour channel belongs to status
/// (CLAUDE.md §6).
/// </param>
public record ModelElementRow(
    string Code,
    string NameAr,
    string NameEn,
    string Discipline,
    string Status,
    bool IsCritical,
    string BuildingAr,
    string BuildingEn,
    string Level,
    string Zone,
    decimal Qty,
    string Unit,
    decimal ProgressPct,
    string Revision,
    string ContractId,
    string BoqCode,
    string? BoqDescriptionAr,
    string? BoqDescriptionEn,
    string ActivityCode,
    string? ActivityNameAr,
    string? ActivityNameEn);

/// <summary>One floor of the tree, with the elements standing on it.</summary>
public record ModelLevel(string Level, IReadOnlyList<ModelElementRow> Elements);

/// <summary>«مبنى A» / «Building A» — the tree's root, and everything under it.</summary>
public record ModelBuilding(
    string BuildingAr, string BuildingEn, int ElementCount, IReadOnlyList<ModelLevel> Levels);

public record ModelVersionRow(
    string Code,
    string LabelAr,
    string LabelEn,
    string? IssuedOn,
    string By,
    bool IsCurrent);

/// <param name="Code">`all`, or a discipline code, or a status code.</param>
public record ModelChip(string Code, int Count);

/// <param name="CriticalCount">
/// The fourth entry on الشكل 44's colour key. It counts across the three
/// statuses rather than beside them — a critical element still has one.
/// </param>
public record ModelResponse(
    string ProjectId,
    string ProjectNameAr,
    string ProjectNameEn,
    string? DataDate,
    int ElementCount,
    int CriticalCount,
    IReadOnlyList<ModelVersionRow> Versions,
    IReadOnlyList<ModelChip> Disciplines,
    IReadOnlyList<ModelChip> Statuses,
    IReadOnlyList<ModelBuilding> Tree,
    IReadOnlyList<ModelElementRow> Elements);
