namespace Epm.Api.Features.Entities;

/// <summary>
/// Member names are IDENTICAL to web/src/app/features/entities/entities.types.ts.
///
/// Column set ported from DSpaces (v1.1),
/// docs/spec/reference/app/desktop-views.jsx:375 — code · name · type ·
/// active · projects · completion.
/// </summary>
/// <param name="ProjectCount">Every project in this entity.</param>
/// <param name="ActiveCount">Projects still running — `ongoing` or `delayed` (06 §1).</param>
/// <param name="CompletionPct">
/// null until BOQ progress exists (BR-04). An entity's completion is the
/// weight-rolled progress of its projects; a 0 would assert nothing has been
/// built, which is a different and unverified claim (P-09).
/// </param>
public record EntityRow(
    string Code,
    string NameAr,
    string NameEn,
    string Kind,
    bool Active,
    int ProjectCount,
    int ActiveCount,
    decimal Value,
    decimal? CompletionPct);

public record EntitiesResponse(
    IReadOnlyList<EntityRow> Rows,
    int Total,
    Dictionary<string, int> CountByKind);
