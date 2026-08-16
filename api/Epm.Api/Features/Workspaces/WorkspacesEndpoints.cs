using Epm.Api.Data;
using Epm.Api.Domain;
using Epm.Api.Features.Boq;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.Workspaces;

/// <summary>
/// SCR-E8 — the WORKSPACE OVERVIEW, «مساحة العمل › نظرة عامة»
/// (ملحق الشاشات، الشكل 2).
///
/// PORTED from the LIVE prototype's `DWorkspaceOverview`,
/// app/desktop-workspace.jsx:354.
///
/// ── IT IS THE MINISTRY BOARD, SCOPED ─────────────────────────────────────
/// An earlier note here said this screen "shares arithmetic with SCR-E1 and
/// nothing else", and built a four-tile band over a two-column row. The live
/// prototype disagrees in its own comment — *"same model as the ministry
/// board"* — and draws the identical thing: two `.d-dash` rows, the same
/// `DStat` tiles, «المؤشر التنفيذي», the same watchlist, «معالم قادمة». What
/// changes is the SCOPE and two controls: the filter is by BRANCH rather than
/// entity type, and the watchlist carries a code and a branch column.
///
/// So both endpoints load rows and call one rule, `Domain/PortfolioBand`
/// (P-141). Deriving the band twice would eventually make the ministry total
/// stop being the sum of the workspaces underneath it, and the first person to
/// notice would be a director whose university's figure does not appear in the
/// minister's.
///
/// ── THE WATCHLIST IS THE POINT ────────────────────────────────────────────
/// الشكل 2 names it «قائمة المتابعة — مشاريع خارج المسار» and gives it the
/// screen's centre. Membership was the STORED status — delayed or suspended —
/// because when this was written nothing could derive lateness. It is now
/// `Domain/ExecutiveSignal`: status, BR-10's delay as a share of the baseline
/// duration, and BR-11's schedule index. That is derivation rather than entry
/// (§9 «الاشتقاق لا الإدخال») and it is the prototype's own rule.
///
/// ── NO ARITHMETIC OF ITS OWN ──────────────────────────────────────────────
/// BR-09 from Domain/Amendments, BR-00 from Domain/ProjectValue, and everything
/// else from Domain/PortfolioBand. This file filters, joins, sorts and projects.
/// </summary>
public static class WorkspacesEndpoints
{
    /// <summary>
    /// «الحد المقبول 0.95» — the same threshold SCR-E1 and SCR-W1 read their
    /// indices against. `02` defines no acceptable band, so it is a constant
    /// somebody chose and every screen that uses it names it as one.
    /// </summary>
    private const decimal AcceptableIndex = 0.95m;

    public static void MapWorkspacesEndpoints(this WebApplication app)
    {
        // [EP-WSP-02] POST /api/workspaces
        // web: workspaces/workspaces.api.ts create() → entities.page.ts
        // spec: ملحق الشكل 1 «إنشاء مساحة جديدة» | rules: BR-15 | tables: Workspaces (WRITTEN)
        //
        // ── WHO MAY CREATE ONE ───────────────────────────────────────────
        // `§24` puts «مساحات العمل والمشاريع — تعريف الجامعات والجهات» in the
        // ADMIN plane, and §7 gives only المركز a ministry-wide scope. So a
        // ministry-wide persona may define a workspace and an assigned one may
        // not: creating an entity you could not then enter is not a thing the
        // documents describe anyone doing.
        app.MapPost("/api/workspaces", async (EpmDb db, HttpContext http, CreateWorkspaceRequest input) =>
        {
            var user = WorkspaceScope.User(http);
            if (!user.MinistryWide)
                return Results.Json(new
                {
                    messageAr = "تعريف مساحات العمل من صلاحيات المركز الوزاري.",
                    messageEn = "Defining a workspace is a ministry-centre permission.",
                }, statusCode: StatusCodes.Status403Forbidden);

            // Invariants checked HERE, where they can be read next to the
            // message they produce (P-01) — not in schema configuration.
            var code = (input.Code ?? "").Trim().ToLowerInvariant();
            var displayCode = (input.DisplayCode ?? "").Trim().ToUpperInvariant();
            var nameAr = (input.NameAr ?? "").Trim();

            if (code.Length is < 2 or > 12 || !code.All(c => char.IsAsciiLetterOrDigit(c) || c == '-'))
                return Results.BadRequest(new { message = "الرمز مطلوب: من حرفين إلى ١٢، أحرف لاتينية وأرقام فقط." });

            if (displayCode.Length is < 2 or > 5)
                return Results.BadRequest(new { message = "رمز الشارة مطلوب: من حرفين إلى خمسة." });

            if (string.IsNullOrWhiteSpace(nameAr))
                return Results.BadRequest(new { message = "اسم مساحة العمل مطلوب." });

            if (await db.Workspaces.AnyAsync(w => w.Code == code))
                return Results.Conflict(new { message = $"الرمز «{code}» مستخدم بالفعل." });

            var kinds = await db.Lookups.AsNoTracking()
                .Where(l => l.Kind == "workspace-kind").Select(l => l.Code).ToListAsync();
            if (!kinds.Contains(input.Kind))
                return Results.BadRequest(new { message = "نوع مساحة العمل غير معروف." });

            var ws = new Data.Entities.Workspace
            {
                Code = code,
                DisplayCode = displayCode,
                NameAr = nameAr,
                NameEn = string.IsNullOrWhiteSpace(input.NameEn) ? nameAr : input.NameEn.Trim(),
                Kind = input.Kind,
                // A colour is required for the emblem to be legible at all, so
                // an omitted one falls back to the brand navy rather than to
                // transparent — which is what "no colour" would actually mean.
                Color = string.IsNullOrWhiteSpace(input.Color) ? "#1d3c6e" : input.Color.Trim(),
                Active = true,
            };

            db.Workspaces.Add(ws);
            await db.SaveChangesAsync();

            return Results.Created($"/api/workspaces/{ws.Code}/overview", new
            {
                ws.Code, ws.DisplayCode, ws.Color, ws.NameAr, ws.NameEn, ws.Kind, ws.Active,
            });
        });

        // [EP-WSP-01] GET /api/workspaces/{code}/overview?status=&branch=
        // web: workspaces/workspaces.api.ts overview() → workspaces.page.ts
        // spec: ملحق الشكل 2 | rules: BR-00, BR-04, BR-09, BR-10, BR-11, BR-15
        // tables: Workspaces · Projects · Contracts · ContractAmendments · Alerts
        //         · BoqItems · Activities · Payments · ContractActivityEvents
        app.MapGet("/api/workspaces/{code}/overview", async (
            EpmDb db, HttpContext http, string code, string? status, string? branch) =>
        {
            // BR-15 FIRST. A workspace this persona is not assigned to is
            // refused before it is even looked up — the 403 must not depend on
            // whether the code happens to exist.
            if (WorkspaceScope.Deny(http, code) is { } denied) return denied;

            var ws = await db.Workspaces.AsNoTracking().FirstOrDefaultAsync(w => w.Code == code);
            if (ws is null) return Results.NotFound(new { message = $"workspace {code} not found" });

            var everyProject = await db.Projects.AsNoTracking()
                .Where(p => p.WorkspaceCode == code)
                .OrderBy(p => p.Id)
                .ToListAsync();

            // The branch list is taken before ANY filter, so choosing a branch
            // never empties the control that chose it.
            //
            // The chip counts respect the BRANCH but not the status: a chip has
            // to keep counting its own subject or selecting it would zero it,
            // but «مستمر 2» over a branch holding one project is a count of a
            // scope nobody is looking at.
            var statusCounts = everyProject
                .Where(p => string.IsNullOrEmpty(branch) || p.Branch == branch)
                .GroupBy(p => p.Status)
                .Select(g => new WorkspaceStatusSlice(g.Key, g.Count()))
                .OrderByDescending(x => x.Count)
                .ToList();

            var branches = everyProject.Select(p => p.Branch)
                .Where(b => !string.IsNullOrWhiteSpace(b))
                .Distinct()
                .OrderBy(b => b)
                .ToList();

            // The two toolbar filters narrow the SCOPE, not the presentation:
            // every figure below is re-derived over what survives them, which
            // is why they are query parameters and not a client-side filter.
            var projects = everyProject
                .Where(p => string.IsNullOrEmpty(status) || p.Status == status)
                .Where(p => string.IsNullOrEmpty(branch) || p.Branch == branch)
                .ToList();

            var ids = projects.Select(p => p.Id).ToList();

            var contracts = await db.Contracts.AsNoTracking()
                .Where(c => ids.Contains(c.ProjectId))
                .ToListAsync();

            var contractIds = contracts.Select(c => c.Id).ToList();
            var amendments = await db.ContractAmendments.AsNoTracking()
                .Where(a => contractIds.Contains(a.ContractId))
                .ToListAsync();

            var alerts = await db.Alerts.AsNoTracking()
                .Where(a => a.ProjectId != null && ids.Contains(a.ProjectId))
                .Select(a => new { a.Severity, a.Acknowledged })
                .ToListAsync();

            // BR-09 per contract, once. Effective is what the contract IS;
            // projected is what it WOULD be once approved orders are applied.
            var perContract = contracts.Select(c =>
            {
                var deltas = amendments
                    .Where(a => a.ContractId == c.Id)
                    .OrderBy(a => a.No)
                    .Select(a => new Amendments.Delta(a.No, a.DeltaValue, a.DeltaDays, a.AppliedAt != null))
                    .ToList();

                var original = new Amendments.Version(0, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays);
                var effective = Amendments.Effective(original, deltas);

                return new
                {
                    ContractId = c.Id,
                    c.ProjectId,
                    Effective = effective.Value,
                    Projected = Amendments.Projection(effective, deltas).Value,
                };
            }).ToList();

            var effectiveValue = ProjectValue.Total(perContract.Select(x => x.Effective));
            var projectedValue = ProjectValue.Total(perContract.Select(x => x.Projected));

            // ══ THE BAND — the same rule SCR-E1 calls (P-141) ══════════════
            var activities = await db.Activities.AsNoTracking()
                .Where(a => contractIds.Contains(a.ContractId) && !a.IsMilestone)
                .Select(a => new PortfolioBand.Act(a.BudgetedCost, a.BaselineStart, a.BaselineFinish))
                .ToListAsync();

            var payments = await db.Payments.AsNoTracking()
                .Where(x => contractIds.Contains(x.ContractId) && x.Status == "paid")
                .Select(x => new PortfolioBand.Pay(x.ContractId, x.PaidDate, x.NetAmount))
                .ToListAsync();

            var progressLog = await db.ContractActivityEvents.AsNoTracking()
                .Where(e => contractIds.Contains(e.ContractId) && e.Action == "progress" && e.After != null)
                .OrderBy(e => e.At)
                .Select(e => new { e.ContractId, e.At, e.Before, e.After })
                .ToListAsync();

            var updates = progressLog
                .Where(e => decimal.TryParse(e.After, out _))
                .Select(e => new PortfolioBand.Update(e.ContractId, e.At, decimal.Parse(e.After!)))
                .ToList();

            var effByContract = perContract.ToDictionary(x => x.ContractId, x => x.Effective);

            var bandContracts = new List<PortfolioBand.Contr>(contracts.Count);
            foreach (var c in contracts)
            {
                var derived = await BoqEndpoints.Derive(db, c.Id, "cost");
                var startingPct = progressLog
                    .Where(e => e.ContractId == c.Id && decimal.TryParse(e.Before, out _))
                    .Select(e => (decimal?)decimal.Parse(e.Before!))
                    .FirstOrDefault();

                bandContracts.Add(new PortfolioBand.Contr(
                    c.Id, c.ProjectId,
                    c.OriginalValue,
                    effByContract.TryGetValue(c.Id, out var eff) ? eff : 0m,
                    derived.Sum(x => x.Line.Amount),
                    derived.Sum(x => x.Progress.AchievedAmount),
                    c.Start, c.OriginalFinish, c.ForecastFinish,
                    c.OriginalDurationDays, startingPct ?? 0m));
            }

            var band = PortfolioBand.Derive(
                projects.Select(x => new PortfolioBand.Proj(
                    x.Id, x.NameAr, x.NameEn, x.Status, x.WorkspaceCode, x.Branch, x.DataDate)).ToList(),
                bandContracts, payments, updates, activities);

            var byId = band.Projects.ToDictionary(x => x.Id);

            WorkspaceProjectRow Row(Data.Entities.Project p, string? reason) => new(
                p.Id, p.NameAr, p.NameEn, p.Branch, p.Status,
                byId.TryGetValue(p.Id, out var b) ? b.Value : 0m,
                p.UpdatedAt?.ToString("yyyy-MM-dd"),
                reason);

            // Off the plan by `ExecutiveSignal`, worst value first. Filtering
            // and sorting is what an endpoint is for; the signal that decides
            // membership is the rule's.
            var watchlist = band.Projects
                .Where(x => x.Signal != ExecutiveSignal.Green)
                .OrderByDescending(x => x.Value)
                .Take(6)
                .Select(x => new WorkspaceWatchRow(
                    x.Id, x.NameAr, x.NameEn, x.Branch, x.Status, x.Signal,
                    x.Physical,
                    PortfolioBand.Variance(x.Physical, band.Planned),
                    x.Value,
                    x.ForecastFinish?.ToString("yyyy-MM-dd")))
                .ToList();

            // «معالم قادمة» — nearest planned finishes STILL AHEAD of the data
            // date. One already behind us is not upcoming; it is a delay, and
            // the watchlist above is where that belongs.
            var milestones = band.Projects
                .Where(x => x.PlannedFinish is not null && x.PlannedFinish >= band.AsOf && x.Status != "completed")
                .OrderBy(x => x.PlannedFinish)
                .Take(4)
                .Select(x => new WorkspaceMilestone(
                    x.Id, x.NameAr, x.NameEn, x.Branch, x.Status,
                    x.Physical, x.PlannedFinish!.Value.ToString("yyyy-MM-dd")))
                .ToList();

            // الشكل 2 shows six. Most recently touched first, so a stale record
            // is visible by its absence from the top of the list.
            var recent = projects
                .OrderByDescending(p => p.UpdatedAt ?? DateOnly.MinValue)
                .ThenBy(p => p.Id)
                .Take(6)
                .Select(p => Row(p, null))
                .ToList();

            var statusDistribution = projects
                .GroupBy(p => p.Status)
                .Select(g => new WorkspaceStatusSlice(g.Key, g.Count()))
                .OrderByDescending(s => s.Count)
                .ToList();

            // Only what genuinely has no input. A figure that CAN be derived
            // and is reported absent teaches a reader to stop looking (P-136).
            var unavailable = new List<WorkspaceUnavailable>();
            if (band.Physical is null)
                unavailable.Add(new("physical",
                    "لا يوجد جدول كميات على أي عقد ضمن النطاق — الإنجاز المادي مرجّح بأوزان بنوده (BR-04).",
                    "No contract in scope has a bill of quantities — physical progress is weighted by its item weights (BR-04)."));
            if (band.Financial is null)
                unavailable.Add(new("financial",
                    "لا قيمة نافذة لأي عقد ضمن النطاق، فلا مقام لنسبة الصرف.",
                    "No contract in scope has an effective value, so the spend ratio has no denominator."));
            if (band.Spi is null)
                unavailable.Add(new("spi",
                    "يتطلب الإنجاز المادي والمخطط معاً (BR-11)؛ أحدهما غير متوفر.",
                    "Needs physical and planned progress together (BR-11); one of them is missing."));
            if (band.Cpi is null)
                unavailable.Add(new("cpi",
                    "يتطلب القيمة المكتسبة والكلفة الفعلية معاً (BR-11).",
                    "Needs earned value and actual cost together (BR-11)."));

            return Results.Ok(new WorkspaceOverviewResponse(
                ws.Code, ws.DisplayCode, ws.Color, ws.NameAr, ws.NameEn, ws.Kind, ws.Active,
                projects.Count,
                projects.Count(p => p.Status is "ongoing" or "delayed"),
                projects.Count(p => p.Status == "delayed"),
                contracts.Count,
                effectiveValue,
                projectedValue - effectiveValue,
                amendments.Count(a => a.AppliedAt == null),
                alerts.Count(a => !a.Acknowledged),
                alerts.Count(a => !a.Acknowledged && a.Severity == "critical"),
                band.Physical,

                band.AsOf.ToString("yyyy-MM-dd"),
                branches,
                statusCounts,

                band.Planned, band.Financial, band.Spi, band.Cpi, AcceptableIndex,
                band.EarnedValue, band.ActualCost,

                band.ProgressCurve.Select(m => new WorkspaceCurvePeriod(
                    m.At.ToString("yyyy-MM-dd"), m.PlanCum, m.ActCum, m.PlanPeriod, m.ActPeriod)).ToList(),
                band.CostCurve.Select(m => new WorkspaceCurvePeriod(
                    m.At.ToString("yyyy-MM-dd"), m.PlanCum, m.ActCum, m.PlanPeriod, m.ActPeriod)).ToList(),
                band.Signals.Select(b => new WorkspaceSignalBand(b.Code, b.Count, b.Share)).ToList(),
                watchlist,
                new WorkspaceCost(band.ApprovedCost, band.RevisedCost, band.ActualCost),
                milestones,

                statusDistribution,
                recent,
                unavailable));
        });
    }
}
