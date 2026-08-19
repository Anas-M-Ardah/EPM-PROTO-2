namespace Epm.Api.Data.Entities;

/// <summary>
/// Spec 01 §2.2.
///
/// FLAT. No navigation properties anywhere in this model — just ID columns.
/// To get a project's contracts: db.Contracts.Where(c => c.ProjectId == id).
/// That query is the relationship, and you can read it.
///
/// DERIVED — never stored, never add a column for these (01 §3):
///   Value        = Σ contract effective values
///   PhysicalPct  = rolls up by weight from BOQ progress (BR-04)
///   FinancialPct = from payments
/// Compute them in the endpoint via the Domain layer at projection time.
/// </summary>
public class Project
{
    /// <summary>Natural key, e.g. "PRJ-0137". الرمز, the register's first column (الشكل 3).</summary>
    public string Id { get; set; } = "";

    /// <summary>
    /// رمز المشروع — الشكل 5's SECOND identifier, e.g. "PC-0170", and NOT the
    /// same thing as <see cref="Id"/>: الشكل 3 lists the record as PRJ-0137
    /// while الشكل 5 lists its code as PC-0170. المسار 1 step 4 has the system
    /// derive it («اشتقاق الرمز»), and الشكل 5 renders it tagged «مقترح» —
    /// SUGGESTED, not locked. Stored because the user confirms it at submit;
    /// after that it is entered data, not a derived value (01 §3 untouched).
    /// </summary>
    public string Code { get; set; } = "";

    /// <summary>→ Workspace.Code — «انتماء المشروع إلى تشكيل واحد» (المسار 1).</summary>
    public string WorkspaceCode { get; set; } = "";

    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";

    /// <summary>الوصف — الشكل 5's fourth section.</summary>
    public string Description { get; set; } = "";

    /// <summary>
    /// الحالة — EXECUTION status. Lookup "project-status": ongoing · completed ·
    /// delayed · suspended · cancelled (06 §1).
    ///
    /// This is the project's ONLY state. المسار 1's approval track — مسودة →
    /// قيد المراجعة → معتمد / مُعاد بملاحظات — was built and then removed at the
    /// client's instruction: a project is saved directly and is live as soon as
    /// it is saved. Recorded in DECISIONS so the divergence from the documents
    /// is not mistaken for an oversight.
    /// </summary>
    public string Status { get; set; } = "ongoing";

    /// <summary>Lookup "project-type" — one of 3 (06 §3): construction · equipment · design-studies.</summary>
    public string Type { get; set; } = "";

    /// <summary>Lookup "execution-stage" — one of 12 (06 §2).</summary>
    public string ExecutionStage { get; set; } = "";

    /// <summary>Lookup "funding-type" — one of 10 (06 §5).</summary>
    public string FundingType { get; set; } = "";

    /// <summary>
    /// المنطقة الجغرافية — الشكل 5 renders this tagged «مقترح» too, derived by
    /// المسار 1 step 4 from the owning entity. Same rule as <see cref="Code"/>:
    /// suggested, shown as suggested, confirmed by the user.
    /// </summary>
    public string Region { get; set; } = "";

    /// <summary>الأولوية (الشكل 5).</summary>
    public string Priority { get; set; } = "";
    public string Branch { get; set; } = "";
    public string Executor { get; set; } = "";

    /// <summary>
    /// سنة الإدراج (الشكل 5). المسار 1 validates «صحة سنة الإدراج» — the rule
    /// the endpoint checks, not the schema (CLAUDE.md §3.4).
    /// </summary>
    public int? RegistrationYear { get; set; }

    /// <summary>
    /// الكلفة المقررة — the PLANNED cost entered at definition. NOT the
    /// project's value: that stays derived from contracts (01 §3), and الشكل 4
    /// keeps them visibly apart as «المقررة 1,374 م» vs «المعدلة 1,500 م».
    /// المسار 1 validates it is greater than zero. Money is decimal (D-11).
    /// </summary>
    public decimal? PlannedCost { get; set; }

    /// <summary>الفئة الإنفاقية — the third value المسار 1 step 4 derives, e.g. "صيانة".</summary>
    public string ExpenditureCategory { get; set; } = "";

    /// <summary>رقم اعتماد الموازنة (الشكل 5), e.g. "BA-2709".</summary>
    public string BudgetApprovalNumber { get; set; } = "";

    /// <summary>إحداثيات الموقع, "lat,lon" — الشكل 5 feeds these to the GIS module.</summary>
    public string Coordinates { get; set; } = "";

    /// <summary>التشكيل (الشكل 5), e.g. "وزارة التعليم العالي والبحث العلمي".</summary>
    public string Formation { get; set; } = "";

    /// <summary>الهيكل التنظيمي (الشكل 5), e.g. "دائرة الإعمار والمشاريع › القسم الهندسي › الأبنية".</summary>
    public string OrgStructure { get; set; } = "";

    public string DesignerParty { get; set; } = "";
    public string ConsultantParty { get; set; } = "";

    /// <summary>
    /// Spec 01 §2.2 — the beneficiaries assigned to this project, as a
    /// comma-separated list of Workspace.Code (P-174). ONLY these may receive quantity.
    /// A CSV column instead of a join table: it is a list of codes and nothing more.
    /// Split on ',' when you need them.
    /// </summary>
    public string BeneficiaryCodes { get; set; } = "";

    /// <summary>
    /// The project's own data date. 06 §12 — "now" for everything in this project.
    /// Falls back to AppConfiguration.DataDate when null. Never DateTime.Now. (D-06)
    /// </summary>
    public DateOnly? DataDate { get; set; }

    /// <summary>Last edit. The register's آخر تحديث / Updated column.</summary>
    public DateOnly? UpdatedAt { get; set; }
}
