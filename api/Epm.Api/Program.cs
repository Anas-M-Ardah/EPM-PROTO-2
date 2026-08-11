using Epm.Api.Data;
using Epm.Api.Features.Alerts;
using Epm.Api.Features.ContractTab;
using Epm.Api.Features.Contracts;
using Epm.Api.Features.Dev;
using Epm.Api.Features.Docs;
using Epm.Api.Features.Entities;
using Epm.Api.Features.Information;
using Epm.Api.Features.Overview;
using Epm.Api.Features.Portfolio;
using Epm.Api.Features.Lookups;
using Epm.Api.Features.Projects;
using Epm.Api.Features.Reports;
using Epm.Api.Features.ScheduleControl;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddDbContext<EpmDb>(o =>
    o.UseSqlServer(builder.Configuration.GetConnectionString("Epm")));

// The Angular dev server runs on :4200 and proxies /api, but allow direct
// cross-origin calls too so the API can be poked from a browser or REST client.
builder.Services.AddCors(o => o.AddDefaultPolicy(p => p
    .WithOrigins("http://localhost:4200")
    .AllowAnyHeader()
    .AllowAnyMethod()));

var app = builder.Build();

app.UseCors();

// ── Persona, not authentication ──────────────────────────────────────────
// There is no login. The current user is whatever X-Epm-User says, defaulting
// to the resident engineer. Endpoints read it from HttpContext.Items["user"].
// The permission MODEL (03 §7) is real and resolved server-side; the identity
// is not, and the header is trivially spoofable. See DECISIONS.md.
app.Use(async (ctx, next) =>
{
    var id = ctx.Request.Headers["X-Epm-User"].FirstOrDefault();
    ctx.Items["user"] = Personas.Resolve(id);
    await next();
});

// ── Schema ───────────────────────────────────────────────────────────────
// Creates the database if it is absent; does nothing if it exists. Never wipes.
// To apply a schema change: POST /api/dev/reset. There are no migrations.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<EpmDb>();
    db.Database.EnsureCreated();
}

// ── Feature endpoints. APPEND ONE LINE PER PAGE. ─────────────────────────
app.MapDevEndpoints();
app.MapProjectsEndpoints();
app.MapContractsEndpoints();
app.MapEntitiesEndpoints();
app.MapPortfolioEndpoints();
app.MapAlertsEndpoints();
app.MapScheduleControlEndpoints();
app.MapReportsEndpoints();
app.MapOverviewEndpoints();
app.MapInformationEndpoints();
app.MapContractEndpoints();
app.MapLookupsEndpoints();
app.MapDocsEndpoints();

app.Run();
