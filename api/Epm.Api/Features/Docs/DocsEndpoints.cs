using Epm.Api.Domain;

namespace Epm.Api.Features.Docs;

/// <summary>
/// The rules reference: every documented rule with its worked example EXECUTED
/// LIVE through the real Domain function.
///
/// This is the documentation-as-code guarantee from the handoff — if a rule
/// changes and its spec text does not, the page shows a result that disagrees
/// with the stated expectation, in public, on every load.
/// </summary>
public static class DocsEndpoints
{
    public static void MapDocsEndpoints(this WebApplication app)
    {
        // [EP-DOCS-01] GET /api/docs/rules
        // web: docs.api.ts list() → docs.page.ts | spec: 02 all · 03 §2,§7
        // rules: BR-01…BR-14 | tables: — (pure functions, no database)
        app.MapGet("/api/docs/rules", () =>
        {
            var rules = RuleCatalog.All.Select(r => new
            {
                r.Id,
                r.Br,
                r.Section,
                r.Title,
                r.Spec,
                r.Example,
                r.Expect,
                // The Domain file below the result, so a reader can open the
                // function that produced it.
                r.Source,
                // Executed on every request, not cached: a stale result would
                // be worse than no page at all.
                Result = r.Run(),
            });

            return Results.Ok(new { rules });
        });
    }
}
