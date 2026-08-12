namespace Epm.Api.Features.Information;

/// <summary>
/// Member names are IDENTICAL to
/// web/src/app/features/information/information.types.ts (CLAUDE.md §2).
///
/// SCR-W2, ported from DModInformation — the v1.1 branch,
/// ../epm@design/system-revamp app/project-modules.jsx:280.
///
/// ── WHY A KEYED LIST AND NOT FIFTEEN TYPED MEMBERS ───────────────────────
/// This screen is a field grid: an ordered list of label/value pairs in
/// semantic groups. Fifteen named DTO members would have to be re-listed in the
/// component in the same order, and adding a field would mean editing four
/// files instead of one.
///
/// Traceability is kept by the KEY: `Key` is the entity's own property name in
/// camelCase, so `grep -rn "fundingType" api web` still returns the column, the
/// row that projects it and the label that names it. That is the same guarantee
/// a typed member gives, on a list.
///
/// The LABEL is not here. Field labels are UI chrome and live in
/// web/src/app/core/lang.ts as `inf_*` — the same rule that keeps every other
/// label out of the API. What the server sends is the key, the value, and which
/// lookup (if any) turns the value into a label.
/// </summary>
/// <param name="Key">The entity property name in camelCase — the grep anchor.</param>
/// <param name="Value">
/// The raw stored value, or null. Null renders as an em dash and never as an
/// empty string: "not recorded" is an answer and a blank cell is not.
/// </param>
/// <param name="LookupKind">
/// The `06` value list this code belongs to, for `EP-LKP-01` to label — or null
/// when the value is free text and already readable.
/// </param>
/// <param name="Kind">text · date · money — how to format and isolate it (05 §5.2).</param>
/// <param name="Proposed">
/// الشكل 5 — «وسم مقترح على القيم التي يقترحها النظام». True for a value
/// المسار 1 step 4 derived rather than one the specialist typed, so the card
/// «تفصل بين ما هو مُدخَل معتمد وما هو مقترح من النظام». The shared field-grid
/// already renders the tag; this is what turns it on.
/// </param>
public record InfoField(
    string Key, string? Value, string? LookupKind, string Kind, bool Proposed = false);

/// <param name="Id">
/// identity · location · funding · parties. The client labels the group from
/// `inf_group_<id>`; the server decides which fields are in it, because the
/// grouping is semantic and belongs with the data.
/// </param>
public record InfoGroup(string Id, IReadOnlyList<InfoField> Fields);

/// <summary>
/// The Z2 identity bar's own values. Duplicated from the overview's project
/// record ON PURPOSE: a module must be openable directly by URL without first
/// calling another module's endpoint.
/// </summary>
public record InfoProject(
    string Id,
    string NameAr,
    string NameEn,
    string Status,
    string WorkspaceCode,
    string WorkspaceNameAr,
    string WorkspaceNameEn,
    string? UpdatedAt);

public record InformationResponse(
    InfoProject Project,
    IReadOnlyList<InfoGroup> Groups);
