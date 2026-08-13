using Epm.Api.Features.Projects;

namespace Epm.Api.Features.Information;

/// <summary>
/// Member names are IDENTICAL to
/// web/src/app/features/information/information.types.ts (CLAUDE.md §2).
///
/// SCR-W2 — الشكل 5 «معلومات المشروع — التفاصيل».
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
///
/// ── THE ACTIVITY LOG AND THE PERMISSION ARE REUSED, NOT REDECLARED ───────
/// <see cref="ProjectEvent"/> and <see cref="ProjectPermissions"/> come from
/// `Features/Projects/ProjectsDto.cs`. الشكل 5's «سجل النشاط» tab and
/// `EP-PRJ-04` show the SAME rows of the SAME table; a second record type here
/// would be a second shape for one fact and would drift the first time only one
/// was updated.
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
/// <param name="Kind">
/// text · date · money · coords — how to format and isolate it (05 §5.2).
/// `coords` is الشكل 5's «إحداثيات الموقع»: ONE stored "lat,lon" column,
/// rendered as `33.33°N, 44.33°E`. A display format, not a second column.
/// </param>
/// <param name="Proposed">
/// الشكل 5 — «وسم مقترح على القيم التي يقترحها النظام». True for a value
/// المسار 1 step 4 derived rather than one the specialist typed, so the card
/// «تفصل بين ما هو مُدخَل معتمد وما هو مقترح من النظام». The shared field-grid
/// already renders the tag; this is what turns it on.
/// </param>
/// <param name="Required">
/// الشكل 5 — «نجمة على الحقول الإلزامية». Sourced from
/// <see cref="Epm.Api.Domain.ProjectDefinition.RequiredFields"/>, which is the
/// set `Validate` enforces — so the star and the 422 cannot disagree.
/// </param>
public record InfoField(
    string Key,
    string? Value,
    string? LookupKind,
    string Kind,
    bool Proposed = false,
    bool Required = false);

/// <param name="Id">
/// identity · location · funding · description · entity · consultant — الشكل 5's
/// six, in its order. The client labels the group from `inf_group_<id>` and its
/// caption from `inf_group_<id>_sub`; the server decides which fields are in it,
/// because the grouping is semantic and belongs with the data.
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

/// <param name="Events">
/// سجل النشاط — الشكل 5's second tab, newest first. The SAME `ProjectActivityEvents`
/// rows `EP-PRJ-04` returns and `EP-PRJ-02/03` write.
/// </param>
/// <param name="Can">
/// Resolved server-side from the persona. الشكل 5's «زر تعديل» renders from this
/// and never decides for itself, so the button and `EP-PRJ-03` cannot disagree.
/// </param>
public record InformationResponse(
    InfoProject Project,
    IReadOnlyList<InfoGroup> Groups,
    IReadOnlyList<ProjectEvent> Events,
    ProjectPermissions Can);
