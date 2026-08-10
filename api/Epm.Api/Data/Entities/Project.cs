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
    /// <summary>Natural key, e.g. "PRJ-0137".</summary>
    public string Id { get; set; } = "";

    /// <summary>→ Workspace.Code</summary>
    public string WorkspaceCode { get; set; } = "";

    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";

    /// <summary>Lookup "project-status": ongoing · completed · delayed · suspended · cancelled (06 §1).</summary>
    public string Status { get; set; } = "ongoing";

    /// <summary>Lookup "project-type" — one of 8 (06 §3).</summary>
    public string Type { get; set; } = "";

    /// <summary>Lookup "execution-stage" — one of 12 (06 §2).</summary>
    public string ExecutionStage { get; set; } = "";

    /// <summary>Lookup "funding-type" — one of 10 (06 §5).</summary>
    public string FundingType { get; set; } = "";

    public string Region { get; set; } = "";
    public string Priority { get; set; } = "";
    public string Branch { get; set; } = "";
    public string Executor { get; set; } = "";

    public string DesignerParty { get; set; } = "";
    public string ConsultantParty { get; set; } = "";

    /// <summary>
    /// Spec 01 §2.2 — the beneficiaries assigned to this project, as a
    /// comma-separated list of Beneficiary.Code. ONLY these may receive quantity.
    /// A CSV column instead of a join table: it is a list of codes and nothing more.
    /// Split on ',' when you need them.
    /// </summary>
    public string BeneficiaryCodes { get; set; } = "";

    /// <summary>
    /// The project's own data date. 06 §12 — "now" for everything in this project.
    /// Falls back to AppConfiguration.DataDate when null. Never DateTime.Now. (D-06)
    /// </summary>
    public DateOnly? DataDate { get; set; }
}
