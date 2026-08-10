using Epm.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Dev;

/// <summary>
/// Prototype plumbing: schema reset, the opt-in fixture, and the persona list.
/// None of this belongs in a production system; it is here so the prototype is
/// easy to drive. Every endpoint is a no-op outside Development.
/// </summary>
public static class DevEndpoints
{
    public static void MapDevEndpoints(this WebApplication app)
    {
        // [EP-DEV-01] POST /api/dev/reset
        // web: dev.api.ts reset() | Drops and recreates the schema, EMPTY.
        // This is how a schema change is applied — there are no migrations.
        app.MapPost("/api/dev/reset", async (EpmDb db, IWebHostEnvironment env) =>
        {
            if (!env.IsDevelopment()) return Results.NotFound();
            await db.Database.EnsureDeletedAsync();
            await db.Database.EnsureCreatedAsync();
            return Results.Ok(new { ok = true, message = "Schema recreated. Database is empty." });
        });

        // [EP-DEV-02] POST /api/dev/load-fixture
        // web: dev.api.ts loadFixture() | Loads the 06 §12 scenario ON DEMAND.
        // NEVER runs on boot. The figures are illustrative, not ministry data —
        // see the warning at the top of Fixture.cs.
        app.MapPost("/api/dev/load-fixture", async (EpmDb db, IWebHostEnvironment env, bool force = false) =>
        {
            if (!env.IsDevelopment()) return Results.NotFound();

            var alreadyHasData = await db.Projects.AnyAsync();
            if (alreadyHasData && !force)
                return Results.Conflict(new
                {
                    ok = false,
                    message = "Database already contains data. Call with ?force=true to reset and reload."
                });

            if (alreadyHasData)
            {
                await db.Database.EnsureDeletedAsync();
                await db.Database.EnsureCreatedAsync();
            }

            Fixture.Load(db);
            return Results.Ok(new { ok = true, projects = await db.Projects.CountAsync() });
        });

        // [EP-DEV-03] GET /api/dev/personas
        // web: persona.ts load() | The switcher in the command bar.
        // There is no authentication: the API trusts the X-Epm-User header.
        // The permission MODEL (03 §7) is real and resolved server-side; the
        // identity is not. See DECISIONS.md.
        app.MapGet("/api/dev/personas", () => Results.Ok(Personas.All));
    }
}
