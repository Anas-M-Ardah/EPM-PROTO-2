using Epm.Api.Data;
using Epm.Api.Domain;
using Epm.Api.Features.Reports;
using Epm.Api.Features.Workspaces;
using Microsoft.EntityFrameworkCore;

namespace Epm.Api.Features.ProjectReports;

/// <summary>
/// SCR-W14 — التقارير والتحليلات, the project tab · `04 §3`.
///
/// ── ONE CATALOGUE, TWO QUESTIONS ─────────────────────────────────────────
/// This screen and SCR-E7 read the SAME `ReportCatalog`. A report definition is
/// a capability of the system and there is exactly one list of them; a second
/// list for the project tab would be two answers to «ما التقارير التي ينتجها
/// النظام». What differs is the question each screen asks of a row:
///
///   SCR-E7  — can this report be produced AT ALL? (is the table registered)
///   SCR-W14 — can it be produced FOR THIS PROJECT? (does the project have rows)
///
/// The second is the sharper question, and it has a different answer: RPT-09
/// «الأوامر التغييرية» is available ministry-wide the moment the table exists,
/// but on a project with no change order there is nothing to print.
///
/// ── ONLY `project` SCOPE APPEARS HERE ────────────────────────────────────
/// A `portfolio` report is ministry-wide by definition. Listing it inside one
/// project's tab would invite it to be read as being about that project.
///
/// ── COUNTS, NOT CAPABILITIES ─────────────────────────────────────────────
/// Every source is counted with a real query against this project. Nothing is
/// assumed from a table's existence, which is exactly the assumption that made
/// SCR-E7's own answer too coarse for this screen.
///
/// ── NO ARITHMETIC ────────────────────────────────────────────────────────
/// Filters a static catalogue and counts rows. Report RENDERING — the PDF, the
/// XLSX — is in no phase of this build; the button says «تجريبي» in the
/// reference's own wording rather than doing nothing quietly.
/// </summary>
public static class ProjectReportsEndpoints
{
    /// <summary>
    /// Arabic and English names for the sources a project-scoped report can
    /// declare. A table with no entry still counts — it just prints its own
    /// name, which is a worse message but never a wrong one.
    /// </summary>
    private static readonly Dictionary<string, (string Ar, string En)> SourceNames = new()
    {
        ["Projects"] = ("المشروع", "the project"),
        ["Contracts"] = ("العقود", "contracts"),
        ["ContractAmendments"] = ("ملاحق العقود", "contract amendments"),
        ["Payments"] = ("الدفعات والمستخلصات", "payments and certificates"),
        ["BoqItems"] = ("جدول الكميات", "the BOQ"),
        ["Activities"] = ("الأنشطة", "activities"),
        ["ChangeOrders"] = ("الأوامر التغييرية", "change orders"),
        ["Alerts"] = ("التنبيهات", "alerts"),
        ["ProjectActivityEvents"] = ("سجل نشاط المشروع", "the project activity log"),
        ["ContractActivityEvents"] = ("سجل نشاط العقود", "the contract activity log"),
        ["ChangeOrderAuditEntries"] = ("سجل الأوامر التغييرية", "the change-order log"),
        ["SupplyItems"] = ("الفقرات التجهيزية — غير مُنمذَجة بعد", "supply items — not modelled yet"),
    };

    public static void MapProjectReportsEndpoints(this WebApplication app)
    {
        // [EP-PRP-01] GET /api/projects/{projectId}/reports
        // web: project-reports/project-reports.api.ts list() → project-reports.page.ts
        // spec: 04 §3 | rules: —
        // tables: Projects · Contracts · ContractAmendments · Payments · BoqItems
        //       · Activities · ChangeOrders · Alerts · the three activity logs
        app.MapGet("/api/projects/{projectId}/reports",
            async (EpmDb db, HttpContext ctx, string projectId) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            // The contract is the working context and everything below it is
            // reached THROUGH it (CLAUDE.md §5.1) — a BOQ item belongs to a
            // contract, and the contract belongs to the project.
            var contractIds = await db.Contracts.AsNoTracking()
                .Where(c => c.ProjectId == projectId)
                .Select(c => c.Id)
                .ToListAsync();

            // Through the contracts again — a change order belongs to one
            // contract and never spans two (CLAUDE.md §5.1).
            var orderIds = await db.ChangeOrders.AsNoTracking()
                .Where(o => contractIds.Contains(o.ContractId))
                .Select(o => o.Id)
                .ToListAsync();

            var counts = new Dictionary<string, int>(StringComparer.Ordinal)
            {
                ["Projects"] = 1,
                ["Contracts"] = contractIds.Count,
                ["ContractAmendments"] = await db.ContractAmendments.AsNoTracking()
                    .CountAsync(a => contractIds.Contains(a.ContractId)),
                ["Payments"] = await db.Payments.AsNoTracking()
                    .CountAsync(x => contractIds.Contains(x.ContractId)),
                ["BoqItems"] = await db.BoqItems.AsNoTracking()
                    .CountAsync(i => contractIds.Contains(i.ContractId)),
                ["Activities"] = await db.Activities.AsNoTracking()
                    .CountAsync(a => contractIds.Contains(a.ContractId)),
                ["ChangeOrders"] = orderIds.Count,
                ["Alerts"] = await db.Alerts.AsNoTracking()
                    .CountAsync(a => a.ProjectId == projectId),
                ["ProjectActivityEvents"] = await db.ProjectActivityEvents.AsNoTracking()
                    .CountAsync(e => e.ProjectId == projectId),
                ["ContractActivityEvents"] = await db.ContractActivityEvents.AsNoTracking()
                    .CountAsync(e => contractIds.Contains(e.ContractId)),
                ["ChangeOrderAuditEntries"] = await db.ChangeOrderAuditEntries.AsNoTracking()
                    .CountAsync(a => orderIds.Contains(a.ChangeOrderId)),
                // No table, so no count. It reads 0 and blocks its report,
                // which is the truthful answer (`07 §9`).
                ["SupplyItems"] = 0,
            };

            var rows = ReportCatalog.All
                .Where(d => d.Scope == "project")
                .Select(d =>
                {
                    var sources = d.Reads.Select(t =>
                    {
                        var named = SourceNames.TryGetValue(t, out var n) ? n : (t, t);
                        return new ReportSource(t, named.Item1, named.Item2,
                            counts.TryGetValue(t, out var c) ? c : 0);
                    }).ToList();

                    var empty = sources.Where(s => s.Rows == 0).ToList();

                    return new ProjectReportRow(
                        d.Id, d.Category, d.Frequency,
                        d.TitleAr, d.TitleEn, d.DescriptionAr, d.DescriptionEn,
                        d.Formats, sources,
                        empty.Count == 0,
                        empty.Count == 0 ? null : string.Join(" · ", empty.Select(s => s.NameAr)),
                        empty.Count == 0 ? null : string.Join(" · ", empty.Select(s => s.NameEn)));
                })
                .ToList();

            // The chips: الكل first, then the categories in the catalogue's own
            // order — a category with no project report on it is not offered,
            // because there is nothing behind the chip to show.
            var chips = new List<ReportChip> { new("all", rows.Count) };
            chips.AddRange(ReportCatalog.Categories
                .Select(c => new ReportChip(c.Code, rows.Count(r => r.Category == c.Code)))
                .Where(c => c.Count > 0));

            return Results.Ok(new ProjectReportsResponse(
                p.Id, p.NameAr, p.NameEn, p.DataDate?.ToString("yyyy-MM-dd"),
                rows.Count,
                rows.Count(r => r.Available),
                ReportCatalog.Categories
                    .Select(c => new ReportCategory(c.Code, c.NameAr, c.NameEn)).ToList(),
                chips, rows));
        });

        MapReportBody(app);
    }

    /// <summary>
    /// [EP-PRP-02] — ONE report, rendered.
    ///
    /// ── WHY THIS EXISTS ──────────────────────────────────────────────────
    /// `DModReports` project-modules.jsx:2805 does not list reports, it SHOWS
    /// them: a rail of report types beside a view that renders the selected
    /// one. EP-PRP-01 answers «which of these can this project produce»; this
    /// answers «and here it is». Both are needed, and neither replaces the
    /// other — the catalogue's availability answer is carried INTO the body,
    /// so a report that cannot be produced says what is missing instead of
    /// drawing an empty table (P-123 · P-213).
    ///
    /// ── EVERY BODY IS THE SAME THREE THINGS ──────────────────────────────
    /// Figures, an optional labelled comparison, a table — which is what all
    /// six of the reference's bodies are. Typing it that way means a new
    /// report describes itself and the Angular view needs no new branch.
    ///
    /// ── NO ARITHMETIC ────────────────────────────────────────────────────
    /// Effective value and finish come from `Domain/Amendments`, the same
    /// function SCR-W3 and SCR-E5 call, so a figure here cannot disagree with
    /// the one on the contract tab. Everything else is a table read or a Σ
    /// over rows already selected (CLAUDE.md §3.1).
    /// </summary>
    private static void MapReportBody(WebApplication app)
    {
        // [EP-PRP-02] GET /api/projects/{projectId}/reports/{reportId}
        // web: project-reports/project-reports.api.ts body() → project-reports.page.ts
        // spec: 04 §3 | rules: BR-09 via Domain/Amendments
        // tables: Contracts · ContractAmendments · Payments · BoqItems
        //       · Activities · ChangeOrders
        app.MapGet("/api/projects/{projectId}/reports/{reportId}",
            async (EpmDb db, HttpContext ctx, string projectId, string reportId) =>
        {
            var p = await db.Projects.AsNoTracking().FirstOrDefaultAsync(x => x.Id == projectId);
            if (p is null) return Results.NotFound(new { message = $"project {projectId} not found" });
            if (WorkspaceScope.Deny(ctx, p.WorkspaceCode) is { } denied) return denied;

            var def = ReportCatalog.All.FirstOrDefault(d => d.Id == reportId && d.Scope == "project");
            if (def is null) return Results.NotFound(new { message = $"report {reportId} is not a project report" });

            var contracts = await db.Contracts.AsNoTracking()
                .Where(c => c.ProjectId == projectId).OrderBy(c => c.Id).ToListAsync();
            var contractIds = contracts.Select(c => c.Id).ToList();

            var amendments = await db.ContractAmendments.AsNoTracking()
                .Where(a => contractIds.Contains(a.ContractId)).ToListAsync();

            /* The contract as it stands NOW. `Amendments.Effective` counts only
               APPLIED deltas — approved-but-unapplied is a projection and never
               folds into an effective figure (non-negotiable #2). */
            var effective = contracts.ToDictionary(c => c.Id, c => Amendments.Effective(
                new Amendments.Version(0, c.OriginalValue, c.OriginalFinish, c.OriginalDurationDays),
                amendments.Where(a => a.ContractId == c.Id)
                    .Select(a => new Amendments.Delta(a.No, a.DeltaValue, a.DeltaDays, a.AppliedAt != null))
                    .ToList()));

            // Availability is EP-PRP-01's answer, recomputed the same way so the
            // rail and the view can never disagree about a report.
            var counts = await SourceCounts(db, projectId, contractIds);
            var empty = def.Reads.Where(t => !counts.TryGetValue(t, out var n) || n == 0).ToList();
            var available = empty.Count == 0;

            var figures = new List<ReportFigure>();
            var bars = new List<ReportBar>();
            string? chartAr = null, chartEn = null;
            ReportTable? table = null;

            var money = (decimal v) => Math.Round(v, 0).ToString("#,##0");

            if (available) switch (reportId)
            {
                // الموقف المالي — المقررة والمعدلة والمصروف (BR-09)
                case "RPT-01":
                {
                    var original = contracts.Sum(c => c.OriginalValue);
                    var eff = contracts.Sum(c => effective[c.Id].Value);
                    var paid = await db.Payments.AsNoTracking()
                        .Where(x => contractIds.Contains(x.ContractId) && x.Status == "paid")
                        .SumAsync(x => (decimal?)x.NetAmount) ?? 0m;

                    figures.Add(new("القيمة الأصلية", "Original value", money(original), null));
                    figures.Add(new("القيمة النافذة", "Effective value", money(eff), null));
                    figures.Add(new("المصروف التراكمي", "Cumulative spend", money(paid), null));
                    figures.Add(new("المتبقي", "Balance", money(eff - paid), null));

                    chartAr = "الأصلية مقابل النافذة مقابل المصروف";
                    chartEn = "Original vs effective vs spent";
                    bars.Add(new("الأصلية", "Original", original, money(original)));
                    bars.Add(new("النافذة", "Effective", eff, money(eff)));
                    bars.Add(new("المصروف", "Spent", paid, money(paid)));

                    table = new ReportTable(
                        [new("العقد", "Contract", false), new("الأصلية", "Original", true),
                         new("النافذة", "Effective", true), new("الإنجاز التعاقدي", "Finish", true)],
                        contracts.Select(c => (IReadOnlyList<string>)new[] {
                            c.Id, money(c.OriginalValue), money(effective[c.Id].Value),
                            effective[c.Id].Finish.ToString("yyyy-MM-dd") }).ToList());
                    break;
                }

                // المستخلصات والدفعات — الشكل 9's register, one row per payment
                case "RPT-03":
                {
                    var pays = await db.Payments.AsNoTracking()
                        .Where(x => contractIds.Contains(x.ContractId))
                        .OrderBy(x => x.ContractId).ThenBy(x => x.No).ToListAsync();

                    figures.Add(new("عدد المستخلصات", "Certificates", pays.Count.ToString(), null));
                    figures.Add(new("المصادق", "Certified",
                        money(pays.Where(x => x.Status != "pending").Sum(x => x.NetAmount)), null));
                    figures.Add(new("المصروف", "Paid",
                        money(pays.Where(x => x.Status == "paid").Sum(x => x.NetAmount)), null));

                    table = new ReportTable(
                        [new("الدفعة", "Payment", false), new("العقد", "Contract", false),
                         new("كتاب التمويل", "Finance letter", false),
                         new("الصافي", "Net", true), new("الحالة", "Status", false)],
                        pays.Select(x => (IReadOnlyList<string>)new[] {
                            x.No.ToString(), x.ContractId, x.FinanceLetterNo,
                            money(x.NetAmount), x.Status }).ToList());
                    break;
                }

                // كشف الكميات المنفذة — الكمية التعاقدية وقيمتها لكل بند
                case "RPT-05":
                {
                    var items = await db.BoqItems.AsNoTracking()
                        .Where(i => contractIds.Contains(i.ContractId))
                        .OrderBy(i => i.ContractId).ThenBy(i => i.Code).ToListAsync();

                    figures.Add(new("عدد البنود", "Items", items.Count.ToString(), null));
                    figures.Add(new("قيمة البنود", "Billed value",
                        money(items.Sum(i => i.OriginalQty * i.UnitRate)), null));

                    table = new ReportTable(
                        [new("الرمز", "Code", false), new("الوصف", "Description", false),
                         new("الوحدة", "Unit", false), new("الكمية", "Qty", true),
                         new("السعر", "Rate", true), new("القيمة", "Value", true)],
                        items.Select(i => (IReadOnlyList<string>)new[] {
                            i.Code, i.DescriptionAr, i.Unit,
                            i.OriginalQty.ToString("#,##0.##"), money(i.UnitRate),
                            money(i.OriginalQty * i.UnitRate) }).ToList());
                    break;
                }

                // الانحرافات الزمنية — خط الأساس مقابل المتوقع، لكل عقد
                case "RPT-06":
                {
                    var late = contracts
                        .Where(c => c.ForecastFinish is not null
                                 && c.ForecastFinish > effective[c.Id].Finish)
                        .Select(c => (c, slip: c.ForecastFinish!.Value.DayNumber - effective[c.Id].Finish.DayNumber))
                        .ToList();
                    var worst = late.Count == 0 ? 0 : late.Max(x => x.slip);

                    figures.Add(new("العقود", "Contracts", contracts.Count.ToString(), null));
                    figures.Add(new("متأخرة", "Late", late.Count.ToString(), late.Count > 0 ? "bad" : null));
                    figures.Add(new("أقصى انزياح", "Worst slip",
                        worst + " يوم", worst > 0 ? "bad" : null));

                    table = new ReportTable(
                        [new("العقد", "Contract", false), new("خط الأساس", "Baseline", false),
                         new("المتوقع", "Forecast", false), new("الانزياح", "Slip", true)],
                        contracts.Select(c => {
                            var f = effective[c.Id].Finish;
                            var fc = c.ForecastFinish;
                            var slip = fc is null ? 0 : fc.Value.DayNumber - f.DayNumber;
                            return (IReadOnlyList<string>)new[] {
                                c.Id, f.ToString("yyyy-MM-dd"),
                                fc?.ToString("yyyy-MM-dd") ?? "—",
                                slip == 0 ? "—" : (slip > 0 ? "+" : "") + slip };
                        }).ToList());
                    break;
                }

                // أنشطة المسار الحرج — الأنشطة الحرجة والعوم
                case "RPT-07":
                {
                    var acts = await db.Activities.AsNoTracking()
                        .Where(a => contractIds.Contains(a.ContractId))
                        .OrderBy(a => a.TotalFloat).ToListAsync();
                    var crit = acts.Where(a => a.IsCritical).ToList();

                    figures.Add(new("الأنشطة", "Activities", acts.Count.ToString(), null));
                    figures.Add(new("حرجة", "Critical", crit.Count.ToString(), null));
                    figures.Add(new("أدنى عوم كلي", "Min. total float",
                        acts.Count == 0 ? "—" : acts.Min(a => a.TotalFloat).ToString("0.#"),
                        acts.Count > 0 && acts.Min(a => a.TotalFloat) < 0 ? "bad" : null));

                    table = new ReportTable(
                        [new("النشاط", "Activity", false), new("الاسم", "Name", false),
                         new("العوم الكلي", "Total float", true),
                         new("الإنجاز", "Progress", true)],
                        crit.Select(a => (IReadOnlyList<string>)new[] {
                            a.ActivityId, a.NameAr, a.TotalFloat.ToString("0.#"),
                            a.ProgressPct.ToString("0.#") + "%" }).ToList());
                    break;
                }

                // الأوامر التغييرية — السجل، بقيمه الثلاث المنفصلة (#6)
                case "RPT-09":
                {
                    var orders = await db.ChangeOrders.AsNoTracking()
                        .Where(o => contractIds.Contains(o.ContractId))
                        .OrderBy(o => o.No).ToListAsync();

                    figures.Add(new("الأوامر", "Orders", orders.Count.ToString(), null));
                    figures.Add(new("مطبّقة", "Applied",
                        orders.Count(o => o.AppliedValue is not null).ToString(), null));
                    figures.Add(new("صافي المطبَّق", "Net applied",
                        money(orders.Sum(o => o.AppliedValue ?? 0m)), null));

                    /* Requested · approved · applied stay three columns. They are
                       different facts and summing them would be the mistake
                       non-negotiable #6 exists to prevent. */
                    table = new ReportTable(
                        [new("الأمر", "Order", false), new("العقد", "Contract", false),
                         new("المطلوبة", "Requested", true), new("المعتمدة", "Approved", true),
                         new("المطبَّقة", "Applied", true), new("الحالة", "Status", false)],
                        orders.Select(o => (IReadOnlyList<string>)new[] {
                            o.No, o.ContractId,
                            o.RequestedValue is null ? "—" : money(o.RequestedValue.Value),
                            o.ApprovedValue is null ? "—" : money(o.ApprovedValue.Value),
                            o.AppliedValue is null ? "—" : money(o.AppliedValue.Value),
                            o.Lifecycle }).ToList());
                    break;
                }

                // سجل التدقيق — the union of the three logs, which is what
                // SCR-W15 established the trail IS: no audit table, and none
                // wanted (P-122). A row's source is the table it came from, so
                // it cannot be mislabelled.
                case "RPT-11":
                {
                    /* THE THREE LOGS HAVE THREE SHAPES and are normalised here,
                       not in the database: `ChangeOrderAuditEntries` keeps a
                       `DateTime` and a `UserId` where the other two keep a
                       `DateOnly` and an `ActorName`. Flattening to a date
                       STRING keeps the union honest without a fourth table —
                       P-122's whole point. */
                    var prj = (await db.ProjectActivityEvents.AsNoTracking()
                        .Where(e => e.ProjectId == projectId)
                        .Select(e => new { e.At, Who = e.ActorName, e.Action })
                        .ToListAsync())
                        .Select(e => (Date: e.At.ToString("yyyy-MM-dd"), e.Who, e.Action, Src: "المشروع"));
                    var con = (await db.ContractActivityEvents.AsNoTracking()
                        .Where(e => contractIds.Contains(e.ContractId))
                        .Select(e => new { e.At, Who = e.ActorName, e.Action })
                        .ToListAsync())
                        .Select(e => (Date: e.At.ToString("yyyy-MM-dd"), e.Who, e.Action, Src: "العقود"));
                    var orderIds2 = await db.ChangeOrders.AsNoTracking()
                        .Where(o => contractIds.Contains(o.ContractId)).Select(o => o.Id).ToListAsync();
                    var chg = (await db.ChangeOrderAuditEntries.AsNoTracking()
                        .Where(a => orderIds2.Contains(a.ChangeOrderId))
                        .Select(a => new { a.At, Who = a.UserId, a.Action })
                        .ToListAsync())
                        .Select(a => (Date: a.At.ToString("yyyy-MM-dd"), a.Who, a.Action, Src: "الأوامر التغييرية"));

                    var all = prj.Concat(con).Concat(chg)
                        .OrderByDescending(e => e.Date).ToList();

                    figures.Add(new("الأحداث", "Events", all.Count.ToString(), null));
                    figures.Add(new("سجل المشروع", "Project log", prj.Count().ToString(), null));
                    figures.Add(new("سجل العقود", "Contract log", con.Count().ToString(), null));
                    figures.Add(new("سجل الأوامر", "Order log", chg.Count().ToString(), null));

                    table = new ReportTable(
                        [new("التاريخ", "Date", false), new("المصدر", "Source", false),
                         new("الإجراء", "Action", false), new("المستخدم", "By", false)],
                        all.Select(e => (IReadOnlyList<string>)new[] {
                            e.Date, e.Src, e.Action, e.Who }).ToList());
                    break;
                }
            }

            /* Producible, and this build does not draw it inline. RPT-04 wants
               weight-rolled BOQ progress, which lives behind the BOQ↔activity
               links and is SCR-W6's own rollup — projecting it here would be a
               second answer to «ما نسبة الإنجاز» (CLAUDE.md §3.5). Said in
               words rather than shown as an empty pane (`04 §9`). */
            var rendered = !available || figures.Count > 0 || table is not null;

            return Results.Ok(new ProjectReportBody(
                def.Id, def.TitleAr, def.TitleEn, def.DescriptionAr, def.DescriptionEn,
                def.Formats, available,
                available ? null : string.Join(" · ", empty.Select(t =>
                    SourceNames.TryGetValue(t, out var n) ? n.Ar : t)),
                available ? null : string.Join(" · ", empty.Select(t =>
                    SourceNames.TryGetValue(t, out var n) ? n.En : t)),
                rendered, figures, chartAr, chartEn, bars, table));
        });
    }

    /// <summary>
    /// The same counts EP-PRP-01 makes, so availability is one answer asked
    /// twice rather than two answers that can drift apart.
    /// </summary>
    private static async Task<Dictionary<string, int>> SourceCounts(
        EpmDb db, string projectId, List<string> contractIds)
    {
        var orderIds = await db.ChangeOrders.AsNoTracking()
            .Where(o => contractIds.Contains(o.ContractId)).Select(o => o.Id).ToListAsync();

        return new Dictionary<string, int>(StringComparer.Ordinal)
        {
            ["Projects"] = 1,
            ["Contracts"] = contractIds.Count,
            ["ContractAmendments"] = await db.ContractAmendments.AsNoTracking()
                .CountAsync(a => contractIds.Contains(a.ContractId)),
            ["Payments"] = await db.Payments.AsNoTracking()
                .CountAsync(x => contractIds.Contains(x.ContractId)),
            ["BoqItems"] = await db.BoqItems.AsNoTracking()
                .CountAsync(i => contractIds.Contains(i.ContractId)),
            ["Activities"] = await db.Activities.AsNoTracking()
                .CountAsync(a => contractIds.Contains(a.ContractId)),
            ["ChangeOrders"] = orderIds.Count,
            ["Alerts"] = await db.Alerts.AsNoTracking().CountAsync(a => a.ProjectId == projectId),
            ["ProjectActivityEvents"] = await db.ProjectActivityEvents.AsNoTracking()
                .CountAsync(e => e.ProjectId == projectId),
            ["ContractActivityEvents"] = await db.ContractActivityEvents.AsNoTracking()
                .CountAsync(e => contractIds.Contains(e.ContractId)),
            ["ChangeOrderAuditEntries"] = await db.ChangeOrderAuditEntries.AsNoTracking()
                .CountAsync(a => orderIds.Contains(a.ChangeOrderId)),
            ["SupplyItems"] = 0,
        };
    }
}
