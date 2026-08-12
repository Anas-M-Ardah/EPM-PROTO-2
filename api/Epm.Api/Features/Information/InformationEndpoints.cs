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

            // ── الشكل 5's SIX SECTIONS ───────────────────────────────────
            // «ستة أقسام قابلة للطي (هوية المشروع · الموقع · التمويل والموازنة ·
            // الوصف · الجهة · الاستشاري)».
            //
            // THIS IS THE SAME SIX, IN THE SAME ORDER, OVER THE SAME FIELDS AS
            // THE PROJECT FORM (features/projects/project-form.page.html). They
            // are one card seen twice — read here, written there — and letting
            // them diverge is how a field becomes enterable but invisible. It
            // had already happened once: the form wrote ten columns this screen
            // did not show.
            var groups = new List<InfoGroup>
            {
                new("identity",
                [
                    new InfoField("id", p.Id, null, "text"),
                    new InfoField("nameAr", V(p.NameAr), null, "text"),
                    new InfoField("nameEn", V(p.NameEn), null, "text"),
                    // «مقترح» — المسار 1 step 4 derives it and الشكل 5 tags it,
                    // so the reader can tell a system suggestion from an entry.
                    new InfoField("code", V(p.Code), null, "text", Proposed: !string.IsNullOrWhiteSpace(p.Code)),
                    new InfoField("type", V(p.Type), "project-type", "text"),
                    new InfoField("registrationYear", p.RegistrationYear?.ToString(), null, "text"),
                    new InfoField("status", V(p.Status), "project-status", "text"),
                    new InfoField("executionStage", V(p.ExecutionStage), "execution-stage", "text"),
                    new InfoField("updatedAt", p.UpdatedAt?.ToString("yyyy-MM-dd"), null, "date"),
                ]),

                new("location",
                [
                    new InfoField("coordinates", V(p.Coordinates), null, "text"),
                    new InfoField("region", V(p.Region), null, "text"),
                ]),

                new("funding",
                [
                    new InfoField("fundingType", V(p.FundingType), "funding-type", "text"),
                    new InfoField("plannedCost", p.PlannedCost?.ToString("0.##"), null, "money"),
                    new InfoField("expenditureCategory", V(p.ExpenditureCategory), "expenditure-category", "text",
                        Proposed: !string.IsNullOrWhiteSpace(p.ExpenditureCategory)),
                    new InfoField("budgetApprovalNumber", V(p.BudgetApprovalNumber), null, "text"),
                    new InfoField("priority", V(p.Priority), null, "text"),
                    // The project's own "now" (D-06). It belongs on this screen
                    // because every date the system shows for this project is
                    // measured against it, and nowhere else states what it is.
                    new InfoField("dataDate", p.DataDate?.ToString("yyyy-MM-dd"), null, "date"),
                ]),

                new("description",
                [
                    new InfoField("description", V(p.Description), null, "text"),
                ]),

                new("entity",
                [
                    new InfoField("workspaceCode", V(p.WorkspaceCode), null, "text"),
                    new InfoField("beneficiaryCodes", V(p.BeneficiaryCodes), null, "text"),
                    new InfoField("branch", V(p.Branch), null, "text"),
                    new InfoField("formation", V(p.Formation), null, "text"),
                    new InfoField("orgStructure", V(p.OrgStructure), null, "text"),
                ]),

                // The parties on the project itself. The CONTRACTOR is
                // deliberately absent: a contractor belongs to a contract, not
                // to a project, and one project may run several (01 §2.3,
                // non-negotiable #1). SCR-W1 shows it per contract.
                new("consultant",
                [
                    new InfoField("consultantParty", V(p.ConsultantParty), null, "text"),
                    new InfoField("designerParty", V(p.DesignerParty), null, "text"),
                    new InfoField("executor", V(p.Executor), null, "text"),
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
