using Epm.Api.Data;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Information;

/// <summary>
/// SCR-W2 — the project workspace Information module (`04 §3`).
/// PORTED from DModInformation (v1.1), ../epm@design/system-revamp
/// app/project-modules.jsx:280.
///
/// ── THE GROUPS ARE SEMANTIC, NOT AN ARBITRARY SLICE ──────────────────────
/// The reference says so in as many words, and assigns fields to groups with a
/// regular expression over their English labels:
///
///     re: /project name|project code|project type|award year|execution stage/i
///
/// That is label-matching, and it breaks the moment a label is reworded — in
/// Arabic it never worked at all, because the regex only ever tested `label.en`.
/// Here the grouping is by COLUMN, decided once, below. Same four groups, same
/// order, and renaming a label cannot move a field.
///
/// ── NO ARITHMETIC, AND NOTHING DERIVED ───────────────────────────────────
/// Every value on this screen is a stored column of `Projects`. That is what
/// makes it the right second screen to build: it is the only module in the
/// workspace whose content needs no rule at all.
///
/// ── WHAT IS NOT HERE ─────────────────────────────────────────────────────
/// The reference's Information module also carries a free-text description, an
/// activity log tab and an inline edit mode. There is no description column and
/// no audit table (Phase 6), and nothing in this build writes — so an edit mode
/// would be a form that discards what you type. All three are recorded as gaps
/// in docs/uml/workspace-shell.md rather than faked.
/// </summary>
public static class InformationEndpoints
{
    public static void MapInformationEndpoints(this WebApplication app)
    {
        // [EP-INF-01] GET /api/projects/{projectId}/information
        // web: information.api.ts get() → information.page.ts
        // spec: 04 §3 | rules: — | tables: Projects · Workspaces
        app.MapGet("/api/projects/{projectId}/information", async (EpmDb db, HttpContext http, string projectId) =>
        {
            var p = await db.Projects.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == projectId);

            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });

            if (WorkspaceScope.Deny(http, p.WorkspaceCode) is { } denied) return denied;

            var ws = await db.Workspaces.AsNoTracking()
                .FirstOrDefaultAsync(w => w.Code == p.WorkspaceCode);

            // A field with no stored value is sent as null, not as "". The
            // client renders an em dash — "not recorded" is an answer, and a
            // blank cell is indistinguishable from a rendering bug.
            static string? V(string s) => string.IsNullOrWhiteSpace(s) ? null : s;

            var groups = new List<InfoGroup>
            {
                // The registration data, in the order 06 §12 lists it.
                new("identity",
                [
                    new InfoField("id", p.Id, null, "text"),
                    new InfoField("nameAr", V(p.NameAr), null, "text"),
                    new InfoField("nameEn", V(p.NameEn), null, "text"),
                    new InfoField("type", V(p.Type), "project-type", "text"),
                    new InfoField("status", V(p.Status), "project-status", "text"),
                    new InfoField("executionStage", V(p.ExecutionStage), "execution-stage", "text"),
                    new InfoField("updatedAt", p.UpdatedAt?.ToString("yyyy-MM-dd"), null, "date"),
                ]),

                new("location",
                [
                    new InfoField("workspaceCode", V(p.WorkspaceCode), null, "text"),
                    new InfoField("region", V(p.Region), null, "text"),
                    new InfoField("branch", V(p.Branch), null, "text"),
                ]),

                new("funding",
                [
                    new InfoField("fundingType", V(p.FundingType), "funding-type", "text"),
                    new InfoField("priority", V(p.Priority), null, "text"),
                    // The project's own "now" (D-06). It belongs on this screen
                    // because every date the system shows for this project is
                    // measured against it, and nowhere else states what it is.
                    new InfoField("dataDate", p.DataDate?.ToString("yyyy-MM-dd"), null, "date"),
                ]),

                // The three parties on the project itself. The CONTRACTOR is
                // deliberately absent: a contractor belongs to a contract, not
                // to a project, and one project may run several (01 §2.3,
                // non-negotiable #1). SCR-W1 shows it per contract.
                new("parties",
                [
                    new InfoField("executor", V(p.Executor), null, "text"),
                    new InfoField("designerParty", V(p.DesignerParty), null, "text"),
                    new InfoField("consultantParty", V(p.ConsultantParty), null, "text"),
                ]),
            };

            return Results.Ok(new InformationResponse(
                new InfoProject(
                    p.Id, p.NameAr, p.NameEn, p.Status,
                    p.WorkspaceCode, ws?.NameAr ?? p.WorkspaceCode, ws?.NameEn ?? p.WorkspaceCode,
                    p.UpdatedAt?.ToString("yyyy-MM-dd")),
                groups));
        });
    }
}
