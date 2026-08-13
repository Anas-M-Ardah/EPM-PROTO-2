using Epm.Api.Data;
using Epm.Api.Domain;
using Epm.Api.Features.Dev;
using Epm.Api.Features.Projects;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Information;

/// <summary>
/// SCR-W2 — الشكل 5 «معلومات المشروع — التفاصيل».
///
/// «بطاقة تعريف المشروع الكاملة، وهي المصدر الوحيد لبياناته التعريفية والمكانية
/// والتمويلية وجهته المستفيدة.»
///
/// ── ONE READ FOR THE WHOLE SCREEN ────────────────────────────────────────
/// الشكل 5 is «تبويبان: التفاصيل · سجل النشاط», a «زر تعديل» and six collapsible
/// sections. All four come back from THIS call: the groups, the activity rows,
/// and what the current persona may do. Splitting the log into its own endpoint
/// would mean the tab count could not be shown until the tab was opened.
///
/// ── THE GROUPS ARE SEMANTIC, NOT AN ARBITRARY SLICE ──────────────────────
/// The reference assigned fields to groups with a regular expression over their
/// ENGLISH labels, which meant the grouping silently did nothing in Arabic.
/// Here the grouping is by COLUMN, decided once, below — renaming a label cannot
/// move a field.
///
/// ── THE FIELD SET IS الشكل 5's SIXTEEN, EXACTLY ──────────────────────────
/// الشكل 5 names sixteen values across six sections and this card shows those
/// sixteen and no others. `Projects` carries more, because the same row feeds
/// الشكل 3 and الشكل 4 too. THE EXTRA COLUMNS ARE NOT DELETED and are still
/// written by the create form — they are simply not part of THIS card, and each
/// is shown by the screen that owns it:
///
///   id · status pill             → the Z2 identity bar above this module
///   updatedAt                    → الشكل 3's «آخر تحديث» column
///   dataDate · branch · executor → الشكل 4's meta row
///   workspaceCode                → the breadcrumb's first crumb
///   nameEn                       → the Z2 title in English
///   plannedCost · designerParty  → the create form only. BUSINESS DECISION:
///                                  neither appears in الشكل 5, and no other
///                                  screen displays them either.
///
/// ── NO ARITHMETIC, AND NOTHING DERIVED ───────────────────────────────────
/// Every value on this screen is a stored column of `Projects`. The only
/// resolution done here is code → name (beneficiaries), which is a join, not a
/// rule.
///
/// ── IT STILL WRITES NOTHING ──────────────────────────────────────────────
/// «تحرير البيانات» is `EP-PRJ-03`, reached from this screen's Edit button.
/// There is exactly one project update endpoint and this is not it.
/// </summary>
public static class InformationEndpoints
{
    public static void MapInformationEndpoints(this WebApplication app)
    {
        // [EP-INF-01] GET /api/projects/{projectId}/information
        // web: information.api.ts get() → information.page.ts
        // spec: الشكل 5 · 04 §3 | rules: BR-15, ProjectDefinition.RequiredFields
        // tables: Projects · Workspaces · Beneficiaries · ProjectActivityEvents
        app.MapGet("/api/projects/{projectId}/information", async (EpmDb db, HttpContext http, string projectId) =>
        {
            var p = await db.Projects.AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == projectId);

            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });

            if (WorkspaceScope.Deny(http, p.WorkspaceCode) is { } denied) return denied;

            var ws = await db.Workspaces.AsNoTracking()
                .FirstOrDefaultAsync(w => w.Code == p.WorkspaceCode);

            // ── الجهة المستفيدة — «جامعة بغداد», not «BEN-UOB» ───────────
            // الشكل 5 prints the beneficiary's NAME. The column is a CSV of
            // Beneficiary.Code (01 §2.1), so the codes are resolved here — the
            // same flat join BoqEndpoints does, and no new concept.
            // A code with no matching row falls back to the code itself rather
            // than vanishing: an unknown reference is a fact worth seeing.
            var codes = p.BeneficiaryCodes
                .Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                .ToList();

            var bens = codes.Count == 0
                ? []
                : await db.Beneficiaries.AsNoTracking()
                    .Where(b => codes.Contains(b.Code))
                    .ToListAsync();

            var beneficiaryNames = string.Join("، ", codes.Select(c =>
                bens.FirstOrDefault(b => b.Code == c)?.NameAr is { Length: > 0 } n ? n : c));

            // سجل النشاط — the SAME rows EP-PRJ-04 returns, read the same way.
            // Newest first: an activity log is read from the top.
            var events = await db.ProjectActivityEvents.AsNoTracking()
                .Where(e => e.ProjectId == projectId)
                .OrderByDescending(e => e.Id)
                .Select(e => new ProjectEvent(
                    e.Id, e.Action, e.ActorName, e.ActorRole, e.ActorParty,
                    e.At.ToString("yyyy-MM-dd")))
                .ToListAsync();

            // A field with no stored value is sent as null, not as "". The
            // client renders an em dash — "not recorded" is an answer, and a
            // blank cell is indistinguishable from a rendering bug.
            static string? V(string s) => string.IsNullOrWhiteSpace(s) ? null : s;

            // الشكل 5's «نجمة على الحقول الإلزامية» and «وسم مقترح» — both read
            // off the one list that owns each, so the card cannot mark a field
            // the save would accept empty, nor miss one it would refuse.
            static bool Req(string key) => ProjectDefinition.RequiredFields.Contains(key);
            static bool Sug(string key) => ProjectsEndpoints.SuggestedFields.Contains(key);

            // ── الشكل 5's SIX SECTIONS ───────────────────────────────────
            // «ستة أقسام قابلة للطي (هوية المشروع · الموقع · التمويل والموازنة ·
            // الوصف · الجهة · الاستشاري)» — same six, same order, same fields
            // in the order the document lists them.
            //
            // These are the fields the PROJECT FORM writes
            // (features/projects/project-form.page.html). They are one card seen
            // twice — read here, written there — and letting them diverge is how
            // a field becomes enterable but invisible.
            InfoField F(string key, string? value, string? lookup = null, string kind = "text") =>
                new(key, value, lookup, kind, Proposed: Sug(key), Required: Req(key));

            var groups = new List<InfoGroup>
            {
                // 1. هوية المشروع — البيانات التعريفية الأساسية
                new("identity",
                [
                    F("nameAr", V(p.NameAr)),
                    F("code", V(p.Code)),
                    F("type", V(p.Type), "project-type"),
                    F("registrationYear", p.RegistrationYear?.ToString()),
                    F("executionStage", V(p.ExecutionStage), "execution-stage"),
                    F("status", V(p.Status), "project-status"),
                ]),

                // 2. الموقع — الموقع الجغرافي وحدود العمل
                new("location",
                [
                    F("coordinates", V(p.Coordinates), null, "coords"),
                    F("region", V(p.Region), "region"),
                ]),

                // 3. التمويل والموازنة — مصدر التمويل وتصنيف الصرف
                new("funding",
                [
                    F("fundingType", V(p.FundingType), "funding-type"),
                    F("priority", V(p.Priority), "priority"),
                    F("expenditureCategory", V(p.ExpenditureCategory), "expenditure-category"),
                    F("budgetApprovalNumber", V(p.BudgetApprovalNumber)),
                ]),

                // 4. الوصف — نطاق العمل كما ورد في العقد.
                // `long` is the whole section: الشكل 5 prints the scope as a
                // PARAGRAPH spanning the card, with no field label beside it.
                new("description",
                [
                    F("description", V(p.Description), null, "long"),
                ]),

                // 5. الجهة — الجهة المستفيدة والمالكة
                new("entity",
                [
                    F("formation", V(p.Formation)),
                    F("beneficiaryCodes", V(beneficiaryNames)),
                    F("orgStructure", V(p.OrgStructure)),
                ]),

                // 6. الاستشاري — المكتب الاستشاري المشرف.
                // The CONTRACTOR is deliberately absent: a contractor belongs to
                // a contract, not to a project, and one project may run several
                // (01 §2.3, non-negotiable #1). SCR-W3 shows it per contract.
                new("consultant",
                [
                    F("consultantParty", V(p.ConsultantParty)),
                ]),
            };

            return Results.Ok(new InformationResponse(
                new InfoProject(
                    p.Id, p.NameAr, p.NameEn, p.Status,
                    p.WorkspaceCode, ws?.NameAr ?? p.WorkspaceCode, ws?.NameEn ?? p.WorkspaceCode,
                    p.UpdatedAt?.ToString("yyyy-MM-dd")),
                groups,
                events,
                // The same capacity EP-PRJ-03 checks before it will accept the
                // save. Resolved once, here, so the Edit button cannot offer
                // what the endpoint would refuse.
                new ProjectPermissions(Edit: WorkspaceScope.User(http).CanDefineProjects())));
        });
    }
}
