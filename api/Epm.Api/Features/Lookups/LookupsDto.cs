namespace Epm.Api.Features.Lookups;

/// <summary>
/// Member names here and in web/src/app/core/lookups.ts are IDENTICAL, so
/// `grep -rn "nameAr" api web` crosses the language boundary (CLAUDE.md §2).
/// </summary>
public record LookupItem(string Code, string NameAr, string NameEn);

/// <summary>
/// Grouped by kind because that is how every caller uses it: one fetch, then
/// label(kind, code) for the rest of the session.
/// </summary>
public record LookupsResponse(Dictionary<string, List<LookupItem>> Kinds);
