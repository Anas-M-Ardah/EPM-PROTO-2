using Epm.Api.Data;
using Epm.Api.Features.Lookups;
using Epm.Api.Features.Workspaces;
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

            // The VOCABULARY comes back with the schema. It is code-defined
            // reference data, not the `06 §12` scenario — without it every
            // lookup-backed select is empty and the app cannot be typed into,
            // so «empty database» would mean «unusable» rather than «no data».
            await LookupCatalog.EnsureSeededAsync(db);

            return Results.Ok(new
            {
                ok = true,
                message = "Schema recreated. Database is empty; lookup vocabulary seeded.",
            });
        });

        // [EP-DEV-02] POST /api/dev/load-fixture
        // web: dev.api.ts loadFixture() | Loads the 06 §12 scenario ON DEMAND.
        // NEVER runs on boot. The figures are illustrative, not ministry data —
        // see the warning at the top of Fixture.cs.
        app.MapPost("/api/dev/load-fixture", async (
            EpmDb db,
            IWebHostEnvironment env,
            IConfiguration configuration,
            bool force = false) =>
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

            // The vocabulary, exactly once, on EVERY path into here.
            //
            // `Fixture.Load` used to add it itself, from a time when nothing was
            // seeded on boot. Once `EnsureSeededAsync` was added to boot and to
            // `[EP-DEV-01]`, the ordinary demo sequence — reset, then load —
            // produced TWO copies of every lookup row, and every filter chip on
            // every register rendered twice (P-228). The guarded seeder is the
            // one place that decides, and it is idempotent.
            await LookupCatalog.EnsureSeededAsync(db);

            Fixture.Load(db);
            return Results.Ok(new
            {
                ok = true,
                projects = await db.Projects.CountAsync(),
                modelConfigured = !string.IsNullOrWhiteSpace(configuration["Aps:FixtureModelUrn"])
            });
        });

        // [EP-DEV-04] POST /api/dev/projects/{projectId}/document-prerequisites
        // operator: FULL-FLOW-RECORDING.md | tables: Documents · DocumentRevisions
        // Explicit sample preparation, not a production document-registration action.
        app.MapPost("/api/dev/projects/{projectId}/document-prerequisites",
            async (EpmDb db, IWebHostEnvironment env, HttpContext ctx, string projectId) =>
            {
                if (!env.IsDevelopment()) return Results.NotFound();
                if (!WorkspaceScope.User(ctx).MinistryWide)
                    return Results.StatusCode(StatusCodes.Status403Forbidden);
                if (!await db.Projects.AnyAsync(p => p.Id == projectId))
                    return Results.NotFound(new { message = "Target project does not exist." });
                var added = await DemoDocuments.AddMissingAsync(db, projectId);
                return Results.Ok(new
                {
                    projectId, added,
                    message = "Illustrative document prerequisites prepared. Existing records preserved; no file bytes stored."
                });
            });

        // [EP-DEV-03] GET /api/dev/personas
        // web: persona.ts load() | The switcher in the command bar.
        // There is no authentication: the API trusts the X-Epm-User header.
        // The permission MODEL (03 §7) is real and resolved server-side; the
        // identity is not. See DECISIONS.md.
        app.MapGet("/api/dev/personas", () => Results.Ok(Personas.All));
    }
}
