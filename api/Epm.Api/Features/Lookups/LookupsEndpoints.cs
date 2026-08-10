using Epm.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Lookups;

/// <summary>
/// Every enum label in the application (06 §1–§11), served once.
///
/// Business people maintain these rows, which is why they live in a table and
/// not in web/src/app/core/lang.ts — that file is UI chrome only.
/// </summary>
public static class LookupsEndpoints
{
    public static void MapLookupsEndpoints(this WebApplication app)
    {
        // [EP-LKP-01] GET /api/lookups
        // web: lookups.ts load() → every page | spec: 06 §1–§11 | rules: — | tables: Lookups
        // The whole set in one call: it is small, it never changes during a
        // session, and one round trip beats a request per kind.
        app.MapGet("/api/lookups", async (EpmDb db) =>
        {
            var rows = await db.Lookups.AsNoTracking()
                .OrderBy(l => l.Kind).ThenBy(l => l.Sort)
                .ToListAsync();

            // Empty until POST /api/dev/load-fixture runs — the database starts
            // empty by design (P-03). Callers fall back to the raw code, which
            // is honest: there is no label to show yet.
            var kinds = rows
                .GroupBy(l => l.Kind)
                .ToDictionary(
                    g => g.Key,
                    g => g.Select(l => new LookupItem(l.Code, l.NameAr, l.NameEn)).ToList());

            return Results.Ok(new LookupsResponse(kinds));
        });
    }
}
