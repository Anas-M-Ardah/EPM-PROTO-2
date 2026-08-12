using Epm.Api.Data;
using Epm.Api.Domain;
using Epm.Api.Features.Dev;
using Epm.Api.Features.Workspaces;
using Amendments = Epm.Api.Domain.Amendments;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Projects;

/// <summary>
/// SCR-E2 — Projects, the cross-portfolio list (04 §2).
/// Every query behind that screen is in this one file.
/// </summary>
public static class ProjectsEndpoints
{
    public static void MapProjectsEndpoints(this WebApplication app)
    {
        // [EP-PRJ-01] GET /api/projects?q=&status=&workspace=
        // web: projects.api.ts list() → projects.page.ts | spec: 04 §2 | rules: BR-00 (01 §3 derived value), BR-15
        // tables: Projects, Contracts, Workspaces
        app.MapGet("/api/projects", async (
            EpmDb db,
            HttpContext ctx,
            string? q,
            string? status,
            string? workspace) =>
        {
            // BR-15 — a workspace the caller is not assigned to is refused, not
            // silently emptied. Without this, `?workspace=` is a value the CALLER
            // chooses and the register is readable across the whole ministry.
            if (WorkspaceScope.Deny(ctx, workspace) is { } denied) return denied;

            var workspaces = await db.Workspaces.AsNoTracking().ToListAsync();

            // With no explicit workspace this is the enterprise view — which for
            // a non-ministry user is still bounded by their own assignments
            // (§7: «ولا يرى بيانات خارج تشكيله»), not the whole portfolio.
            var scope = WorkspaceScope.Effective(ctx, workspaces.Select(w => w.Code), workspace).ToList();

            // Two flat queries and an in-memory join. No Include(), no navigation
            // properties — the relationship is the ProjectId comparison below.
            var projectQuery = db.Projects.AsNoTracking()
                .Where(p => scope.Contains(p.WorkspaceCode));

            if (!string.IsNullOrWhiteSpace(status))
                projectQuery = projectQuery.Where(p => p.Status == status);

            if (!string.IsNullOrWhiteSpace(q))
                projectQuery = projectQuery.Where(p =>
                    p.Id.Contains(q) || p.NameAr.Contains(q) || p.NameEn.Contains(q));

            var projects = await projectQuery.OrderBy(p => p.Id).ToListAsync();

            var ids = projects.Select(p => p.Id).ToList();
            var contracts = await db.Contracts.AsNoTracking()
                .Where(c => ids.Contains(c.ProjectId))
                .Select(c => new { c.Id, c.ProjectId, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays })
                .ToListAsync();

            // PAGE-02 closed the BR-00 gap: project value is Σ contract
            // EFFECTIVE values (01 §3), not Σ original ones. Amendments are
            // registered now, so the real figure is derivable.
            var contractIds = contracts.Select(c => c.Id).ToList();
            var amendments = await db.ContractAmendments.AsNoTracking()
                .Where(a => contractIds.Contains(a.ContractId))
                .ToListAsync();

            var rows = projects.Select(p =>
            {
                var mine = contracts.Where(c => c.ProjectId == p.Id).ToList();
                var ws = workspaces.FirstOrDefault(w => w.Code == p.WorkspaceCode);

                // DERIVED — 01 §3. Computed here via the Domain layer, never stored.
                // Each contract's EFFECTIVE value (BR-09) = original + Σ APPLIED
                // amendment deltas. Approved-but-unapplied orders stay out: they
                // are a projection and folding them in would overstate what the
                // ministry is committed to (02 §9, non-negotiable #2).
                var cost = ProjectValue.Total(mine.Select(c =>
                {
                    var deltas = amendments
                        .Where(a => a.ContractId == c.Id)
                        .OrderBy(a => a.No)
                        .Select(a => new Amendments.Delta(a.No, a.DeltaValue, a.DeltaDays, a.AppliedAt != null))
                        .ToList();

                    var original = new Amendments.Version(0, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays);
                    return Amendments.Effective(original, deltas).Value;
                }));

                return new ProjectRow(
                    p.Id, p.NameAr, p.NameEn,
                    p.WorkspaceCode, ws?.NameAr ?? p.WorkspaceCode, ws?.NameEn ?? p.WorkspaceCode,
                    p.Branch, p.Status,
                    // PhysicalPct stays null until the BOQ page can derive it (BR-04).
                    // Storing or guessing it would violate 01 §3.
                    null,
                    cost,
                    p.UpdatedAt?.ToString("yyyy-MM-dd"));
            }).ToList();

            // Status counts come from the unfiltered-by-status set so the chips
            // keep their numbers when a status filter is active.
            var countBase = db.Projects.AsNoTracking()
                .Where(p => scope.Contains(p.WorkspaceCode));

            var countByStatus = await countBase
                .GroupBy(p => p.Status)
                .Select(g => new { Status = g.Key, N = g.Count() })
                .ToDictionaryAsync(x => x.Status, x => x.N);

            return Results.Ok(new ProjectsResponse(rows, rows.Count, countByStatus));
        });

        // ─────────────────────────────────────────────────────────────────
        // المسار 1 — تعريف المشروع وربطه بالجامعة
        //
        // Two writes and one read: create → edit → read the card back.
        //
        // ── NO APPROVAL TRACK ────────────────────────────────────────────
        // المسار 1's steps 5–8 (حفظ كمسودة · الإرسال للمراجعة · إعادة بملاحظات ·
        // اعتماد المشروع) were built and then REMOVED at the client's
        // instruction. A project is saved and is live the moment it is saved.
        // This is a deliberate divergence from the technical proposal, recorded
        // in DECISIONS so it is not read as an omission.
        //
        // What remains of the track: step 3's validation, which now runs at
        // SAVE because there is no later gate, and step 4's suggested values.
        //
        // Both writes check the persona's capacity before anything else — a
        // rule enforced only in the UI is not enforced.
        // ─────────────────────────────────────────────────────────────────

        // [EP-PRJ-02] POST /api/projects
        // web: projects.api.ts create() → project-form.page.ts | spec: المسار 1 steps 1–4
        // rules: BR-15, المسار 1 step 3 | tables: Projects, ProjectActivityEvents (WRITTEN)
        app.MapPost("/api/projects", async (EpmDb db, HttpContext ctx, CreateProjectRequest input) =>
        {
            var user = WorkspaceScope.User(ctx);
            if (!user.CanDefineProjects())
                return Results.Json(new
                {
                    messageAr = "تعريف المشاريع من صلاحيات المستخدم المختص في الجهة.",
                    messageEn = "Defining a project is a university specialist permission.",
                }, statusCode: StatusCodes.Status403Forbidden);

            var wsCode = (input.WorkspaceCode ?? "").Trim();
            if (string.IsNullOrWhiteSpace(wsCode))
                return Results.BadRequest(new { message = "يجب أن ينتمي المشروع إلى تشكيل واحد." });

            // BR-15 — a project may only be created in a workspace the persona
            // is actually assigned to. Without this the workspace is a value
            // the CALLER chooses and a specialist could plant a project in
            // another university's register.
            if (WorkspaceScope.Deny(ctx, wsCode) is { } denied) return denied;

            var ws = await db.Workspaces.AsNoTracking().FirstOrDefaultAsync(w => w.Code == wsCode);
            if (ws is null) return Results.BadRequest(new { message = $"مساحة العمل «{wsCode}» غير معرّفة." });

            // ── المسار 1 step 4 — الرمز ──────────────────────────────────
            // The next number in one sequence, ministry-wide. Read-then-write
            // with no lock: this is a prototype with one writer, and a real
            // sequence is a production concern (reported, not solved here).
            var nextNo = await NextProjectNumber(db);
            var id = $"PRJ-{nextNo:D4}";

            var p = new Data.Entities.Project
            {
                Id = id,
                WorkspaceCode = wsCode,
            };

            Apply(p, input.Definition);
            Suggest(p, ws, nextNo);

            // ── المسار 1 step 3 — THE ONLY GATE ──────────────────────────
            // With the review step gone this is the last check the definition
            // ever gets, so it runs at save. A saved project is immediately in
            // the register and the portfolio, which is exactly why it may not
            // be saved incomplete.
            var violations = ProjectDefinition.Validate(Candidate(p), Today(p).Year);
            if (violations.Count > 0)
                return Results.UnprocessableEntity(new
                {
                    messageAr = "لا يمكن حفظ المشروع قبل استكمال التحقق.",
                    messageEn = "The project cannot be saved until validation passes.",
                    violations = violations
                        .Select(x => new ProjectViolation(x.Field, x.MessageAr, x.MessageEn))
                        .ToList(),
                });

            p.UpdatedAt = Today(p);

            db.Projects.Add(p);
            db.ProjectActivityEvents.Add(Event(p.Id, "created", user, Today(p)));
            await db.SaveChangesAsync();

            return Results.Created($"/api/projects/{p.Id}/definition", new { p.Id });
        });

        // [EP-PRJ-03] PUT /api/projects/{id}
        // web: projects.api.ts save() → project-form.page.ts | spec: المسار 1 step 2
        // rules: BR-15, المسار 1 step 3 | tables: Projects, ProjectActivityEvents (WRITTEN)
        app.MapPut("/api/projects/{id}", async (
            EpmDb db, HttpContext ctx, string id, ProjectDefinitionInput input) =>
        {
            var user = WorkspaceScope.User(ctx);
            if (!user.CanDefineProjects())
                return Results.Json(new
                {
                    messageAr = "تعديل تعريف المشروع من صلاحيات المستخدم المختص في الجهة.",
                    messageEn = "Editing a project definition is a university specialist permission.",
                }, statusCode: StatusCodes.Status403Forbidden);

            var p = await db.Projects.FirstOrDefaultAsync(x => x.Id == id);
            if (p is null) return Results.NotFound(new { message = $"المشروع «{id}» غير موجود." });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            Apply(p, input);

            // Same gate as create. An edit that empties a mandatory field is
            // the same defect as a create that never filled it.
            var violations = ProjectDefinition.Validate(Candidate(p), Today(p).Year);
            if (violations.Count > 0)
                return Results.UnprocessableEntity(new
                {
                    messageAr = "لا يمكن حفظ التعديل قبل استكمال التحقق.",
                    messageEn = "The change cannot be saved until validation passes.",
                    violations = violations
                        .Select(x => new ProjectViolation(x.Field, x.MessageAr, x.MessageEn))
                        .ToList(),
                });

            p.UpdatedAt = Today(p);
            db.ProjectActivityEvents.Add(Event(p.Id, "updated", user, Today(p)));
            await db.SaveChangesAsync();

            return Results.Ok(new { p.Id });
        });

        // [EP-PRJ-04] GET /api/projects/{id}/definition
        // web: projects.api.ts definition() → project-form.page.ts / project-review.page.ts
        // spec: الشكل 5 | rules: BR-15 | tables: Projects, Workspaces, ProjectActivityEvents
        app.MapGet("/api/projects/{id}/definition", async (EpmDb db, HttpContext ctx, string id) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == id);
            if (p is null) return Results.NotFound(new { message = $"المشروع «{id}» غير موجود." });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            var user = WorkspaceScope.User(ctx);

            var ws = await db.Workspaces.AsNoTracking().FirstOrDefaultAsync(w => w.Code == p.WorkspaceCode);

            var events = await db.ProjectActivityEvents.AsNoTracking()
                .Where(e => e.ProjectId == id)
                .OrderByDescending(e => e.Id)
                .Select(e => new ProjectEvent(
                    e.Id, e.Action, e.ActorName, e.ActorRole, e.ActorParty,
                    e.At.ToString("yyyy-MM-dd")))
                .ToListAsync();

            return Results.Ok(new ProjectDefinitionResponse(
                p.Id, p.WorkspaceCode,
                ws?.NameAr ?? p.WorkspaceCode, ws?.NameEn ?? p.WorkspaceCode,
                Read(p),
                SuggestionsOf(p),
                events,
                // Resolved here, once. The UI renders its Edit affordance from
                // this and never decides for itself, so the button and the
                // endpoint cannot disagree about who may edit.
                new ProjectPermissions(Edit: user.CanDefineProjects())));
        });
    }

    // ── helpers ──────────────────────────────────────────────────────────
    // Private to this file, like every other feature's projection helpers.

    /// <summary>
    /// «now» — the project's own data date, never the wall clock (D-06). Same
    /// fallback the other six feature files use.
    /// </summary>
    private static DateOnly Today(Data.Entities.Project p) =>
        p.DataDate ?? DateOnly.FromDateTime(DateTime.UtcNow);

    /// <summary>
    /// The next number in the PRJ sequence. Ids are `PRJ-0148`, so the number
    /// is what follows the dash — parsed rather than counted, because counting
    /// rows would reuse a number after any deletion.
    /// </summary>
    private static async Task<int> NextProjectNumber(EpmDb db)
    {
        var ids = await db.Projects.AsNoTracking().Select(p => p.Id).ToListAsync();
        var max = ids
            .Select(x => int.TryParse(x.Split('-').LastOrDefault(), out var n) ? n : 0)
            .DefaultIfEmpty(0)
            .Max();
        return max + 1;
    }

    /// <summary>Copy the editable definition onto the entity. Trims, and never touches workflow columns.</summary>
    private static void Apply(Data.Entities.Project p, ProjectDefinitionInput d)
    {
        string S(string? v) => (v ?? "").Trim();

        p.NameAr = S(d.NameAr);
        p.NameEn = S(d.NameEn);
        p.Type = S(d.Type);
        p.RegistrationYear = d.RegistrationYear;
        p.ExecutionStage = S(d.ExecutionStage);
        if (!string.IsNullOrWhiteSpace(d.Status)) p.Status = S(d.Status);
        p.Coordinates = S(d.Coordinates);
        p.FundingType = S(d.FundingType);
        p.Priority = S(d.Priority);
        p.BudgetApprovalNumber = S(d.BudgetApprovalNumber);
        p.PlannedCost = d.PlannedCost;
        p.Description = S(d.Description);
        p.Formation = S(d.Formation);
        p.BeneficiaryCodes = S(d.BeneficiaryCodes);
        p.OrgStructure = S(d.OrgStructure);
        p.Branch = S(d.Branch);
        p.ConsultantParty = S(d.ConsultantParty);
        p.DesignerParty = S(d.DesignerParty);
        p.Executor = S(d.Executor);

        // The three suggested values are overwritable BY the user — الشكل 5
        // tags them «مقترح», it does not lock them. An empty incoming value
        // means "leave the suggestion alone" rather than "clear it".
        if (!string.IsNullOrWhiteSpace(d.Code)) p.Code = S(d.Code);
        if (!string.IsNullOrWhiteSpace(d.Region)) p.Region = S(d.Region);
        if (!string.IsNullOrWhiteSpace(d.ExpenditureCategory)) p.ExpenditureCategory = S(d.ExpenditureCategory);
    }

    /// <summary>
    /// المسار 1 step 4 — «اشتقاق الرمز والمنطقة والفئة الإنفاقية تلقائيًا»,
    /// «من التصنيف والجهة» (الشكل 5). Only fills what the user left blank.
    ///
    /// ── HOW MUCH OF THIS IS DOCUMENTED ───────────────────────────────────
    /// THE CODE'S SHAPE IS: الشكل 5's project PRJ-0170 carries code PC-0170 —
    /// same number, different prefix — so that is what is generated.
    /// THE OTHER TWO RULES ARE OURS. The documents say the values are derived
    /// from classification and entity and never say by what mapping, so the
    /// expenditure map below and the region-from-entity lookup are INFERRED and
    /// reported as such. Both are one method to replace.
    /// </summary>
    private static void Suggest(Data.Entities.Project p, Data.Entities.Workspace ws, int number)
    {
        if (string.IsNullOrWhiteSpace(p.Code))
            p.Code = $"PC-{number:D4}";

        if (string.IsNullOrWhiteSpace(p.ExpenditureCategory))
            p.ExpenditureCategory = p.Type switch
            {
                "maintenance" or "rehabilitation" => "maintenance",
                "equipment-supply" => "equipment",
                "studies-design" or "consultancy" => "studies",
                "new-build" or "extension" or "infrastructure" => "construction",
                _ => "",
            };

        // «من الجهة» — the entity's own region. The Workspace table carries no
        // region column, so there is nothing to read it from; the field is left
        // for the user rather than guessed. Reported as a gap.
        _ = ws;
    }

    /// <summary>Project → the wire shape the form binds to.</summary>
    private static ProjectDefinitionInput Read(Data.Entities.Project p) => new(
        p.NameAr, p.NameEn, p.Code, p.Type, p.RegistrationYear, p.ExecutionStage, p.Status,
        p.Coordinates, p.Region,
        p.FundingType, p.Priority, p.ExpenditureCategory, p.BudgetApprovalNumber, p.PlannedCost,
        p.Description,
        p.Formation, p.BeneficiaryCodes, p.OrgStructure, p.Branch,
        p.ConsultantParty, p.DesignerParty, p.Executor);

    /// <summary>Which values on this record the SYSTEM put there — الشكل 5's «مقترح» tags.</summary>
    private static IReadOnlyList<ProjectSuggestion> SuggestionsOf(Data.Entities.Project p)
    {
        var list = new List<ProjectSuggestion>();
        if (!string.IsNullOrWhiteSpace(p.Code)) list.Add(new("code", p.Code));
        if (!string.IsNullOrWhiteSpace(p.ExpenditureCategory))
            list.Add(new("expenditureCategory", p.ExpenditureCategory));
        return list;
    }

    /// <summary>The entity, as Domain/ProjectDefinition wants to see it.</summary>
    private static ProjectDefinition.Candidate Candidate(Data.Entities.Project p) => new(
        p.NameAr, p.Type, p.RegistrationYear, p.ExecutionStage,
        p.FundingType, p.WorkspaceCode, p.PlannedCost, p.BeneficiaryCodes);

    /// <summary>
    /// One log row, carrying §7's four attribution facts — «باسم منفّذها وصفته
    /// وجهته وتاريخها». Copied onto the row rather than joined at read time so
    /// the record still reads correctly if the persona list changes.
    /// </summary>
    private static Data.Entities.ProjectActivityEvent Event(
        string projectId, string action, Persona user, DateOnly at) => new()
    {
        ProjectId = projectId,
        Action = action,
        ActorId = user.Id,
        ActorName = user.NameAr,
        ActorRole = user.RoleAr,
        ActorParty = user.Party,
        At = at,
    };
}
