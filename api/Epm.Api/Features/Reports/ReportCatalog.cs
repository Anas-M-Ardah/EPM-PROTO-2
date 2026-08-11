namespace Epm.Api.Features.Reports;

/// <summary>
/// The twelve reports this system defines, as code.
///
/// ── WHY THIS IS A FILE AND NOT A TABLE ────────────────────────────────────
/// P-11 put the `06 §1–§11` value lists in `LookupCatalog.cs` because every
/// stored code in the system comes from one of them. A report definition is the
/// opposite kind of thing: NO table stores `RPT-01` or `fin`. A report is a
/// CAPABILITY OF THE SYSTEM — its title, its description, the formats it can
/// produce and the tables it reads are one definition, and the code that would
/// render it is the same code that declares it. Splitting the labels into
/// Lookups and the sources into a file would put one definition behind two
/// mechanisms and no single grep would find it.
///
/// So the catalog owns its own labels, in both languages, including the
/// category, scope and frequency vocabularies at the bottom of this file. The
/// endpoint sends those as code/NameAr/NameEn triples — the same shape
/// `EP-LKP-01` sends — so the page resolves a label exactly one way.
///
/// ── EVERY ROW DECLARES WHAT IT READS ──────────────────────────────────────
/// `Reads` names the tables a report needs. The endpoint compares that against
/// the tables actually registered in `EpmDb` and reports, per row, whether the
/// report can be produced at all today. Three of the twelve can; the other nine
/// name the table they are waiting for and the phase that builds it. See the
/// endpoint's remarks and P-38.
///
/// AR is the primary label. The wording is verbatim from the v1.1 reference
/// (`../epm@design/system-revamp` `app/desktop-reports.jsx:73`) — it is the
/// client's own, and re-translating it would lose that.
///
/// The ID is what a future ReportRuns row would store. Never renumber one.
/// </summary>
public static class ReportCatalog
{
    /// <param name="Reads">
    /// The tables this report reads, by the name they carry (or will carry) in
    /// `EpmDb`. Compared against the registered model, never against a
    /// hand-maintained list — see `ReportsEndpoints`.
    /// </param>
    public record Definition(
        string Id,
        string Category,
        string Scope,
        string Frequency,
        string TitleAr,
        string TitleEn,
        string DescriptionAr,
        string DescriptionEn,
        string[] Formats,
        string[] Reads);

    /// <summary>
    /// The twelve definitions in ID order, which is also the order the register
    /// renders them in — the reference's own array order. The category is a
    /// column and a filter, not a grouping, so the rows are not clustered by it.
    /// </summary>
    public static IReadOnlyList<Definition> All { get; } =
    [
        new("RPT-01", "fin", "project", "monthly",
            "الموقف المالي للمشروع", "Project financial position",
            "الكلفة المقررة والمعدلة، المصروف التراكمي، والمتبقي.",
            "Approved vs revised cost, cumulative spend and balance.",
            ["PDF", "XLSX"],
            // Approved vs revised is BR-09 and is derivable today; cumulative
            // spend is not — nothing records a disbursement yet.
            ["Contracts", "ContractAmendments", "Payments"]),

        new("RPT-02", "fin", "portfolio", "monthly",
            "المصروف التراكمي للمحفظة", "Portfolio cumulative spend",
            "منحنى الصرف المخطط مقابل الفعلي عبر المحفظة.",
            "Planned vs actual disbursement curve across the portfolio.",
            ["PDF"],
            ["Projects", "Contracts", "Payments"]),

        new("RPT-03", "fin", "project", "on-demand",
            "المستخلصات والدفعات", "Payment certificates",
            "المستخلصات المقدمة والمصادق عليها والمصروفة.",
            "Submitted, certified and paid certificates.",
            ["PDF", "XLSX"],
            ["Payments"]),

        new("RPT-04", "prog", "project", "weekly",
            "الإنجاز المادي والمالي", "Physical and financial progress",
            "مقارنة نسب الإنجاز مع الخطة المعتمدة.",
            "Progress against the approved plan.",
            ["PDF"],
            // Physical % is weight-rolled BOQ progress (BR-04) — the same
            // figure SCR-E1 renders as unavailable today (P-09).
            ["BoqItems", "Payments"]),

        new("RPT-05", "prog", "project", "on-demand",
            "كشف الكميات المنفذة", "Executed BOQ quantities",
            "الكميات المنفذة مقابل التعاقدية لكل بند.",
            "Executed vs contracted quantity per BOQ item.",
            ["XLSX"],
            ["BoqItems"]),

        new("RPT-06", "sched", "project", "weekly",
            "الانحرافات الزمنية", "Schedule variance",
            "الفروق بين الخط الأساس والإنجاز المتوقع.",
            "Baseline vs forecast finish variance.",
            ["PDF", "XLSX"],
            // Runnable today: this is exactly what EP-SCT-01 already computes,
            // baseline from BR-09 and delay from BR-10.
            ["Contracts", "ContractAmendments"]),

        new("RPT-07", "sched", "project", "on-demand",
            "أنشطة المسار الحرج", "Critical path activities",
            "الأنشطة الحرجة والفائض الزمني.",
            "Critical activities and float.",
            ["PDF"],
            ["Activities"]),

        new("RPT-08", "cont", "portfolio", "monthly",
            "حالة العقود", "Contract status",
            "العقود السارية والمنجزة والمتوقفة وقيمها.",
            "Active, completed and suspended contracts with values.",
            ["PDF", "XLSX"],
            // Runnable today — EP-CNT-01's own read set.
            ["Projects", "Contracts", "ContractAmendments"]),

        new("RPT-09", "cont", "project", "on-demand",
            "الأوامر التغييرية", "Change orders",
            "الأوامر المقترحة والمعتمدة وأثرها على الكلفة.",
            "Proposed and approved orders with cost impact.",
            ["PDF", "XLSX"],
            ["ChangeOrders"]),

        new("RPT-10", "comp", "portfolio", "weekly",
            "التنبيهات والتصعيد", "Alerts and escalation",
            "التنبيهات المفتوحة ومسار التصعيد ومهل الاستجابة.",
            "Open alerts, escalation path and SLAs.",
            ["PDF"],
            // Runnable today — EP-ALR-01's read set. The SLA column would come
            // from BR-12, which is already in Domain/SlaLeadTime.cs.
            ["Alerts", "Projects"]),

        new("RPT-11", "comp", "project", "on-demand",
            "سجل التدقيق", "Audit trail",
            "سجل كامل للتغييرات والاعتمادات مع المستخدم والتاريخ.",
            "Full change and approval log with user and timestamp.",
            ["PDF", "XLSX"],
            ["AuditEvents"]),

        new("RPT-12", "prog", "project", "monthly",
            "التجهيز والاستلامات", "Supply and receipts",
            "الأصناف المجهّزة والمستلمة ولجان الفحص.",
            "Supplied and received items with inspection committees.",
            ["PDF", "XLSX"],
            // The one source with no documented starting point in
            // Data/Entities/ at all — see the endpoint's SourceNeeds.
            ["SupplyItems"]),
    ];

    /// <summary>
    /// The five categories, in the reference's own order. Chips render in this
    /// order, so it is the display order and not an alphabetisation.
    /// </summary>
    public static IReadOnlyList<(string Code, string NameAr, string NameEn)> Categories { get; } =
    [
        ("fin",   "مالي",              "Financial"),
        ("sched", "الجدول الزمني",      "Schedule"),
        ("prog",  "الإنجاز",            "Progress"),
        ("cont",  "العقود",             "Contracts"),
        ("comp",  "الامتثال والتدقيق",  "Compliance"),
    ];

    /// <summary>
    /// What a report runs over. `project` reports need a project chosen; a
    /// `portfolio` report is ministry-wide (or workspace-wide under `?ws=`).
    /// </summary>
    public static IReadOnlyList<(string Code, string NameAr, string NameEn)> Scopes { get; } =
    [
        ("project",   "مشروع", "Project"),
        ("portfolio", "محفظة", "Portfolio"),
    ];

    /// <summary>
    /// How often a report is produced. `on-demand` is a real answer, which is
    /// why it is a code and not a null: "nobody has scheduled this" and "we do
    /// not know" would otherwise be the same value.
    /// </summary>
    public static IReadOnlyList<(string Code, string NameAr, string NameEn)> Frequencies { get; } =
    [
        ("weekly",    "أسبوعي",   "Weekly"),
        ("monthly",   "شهري",     "Monthly"),
        ("on-demand", "عند الطلب", "On demand"),
    ];
}
