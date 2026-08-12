namespace Epm.Api.Data.Entities;

/// <summary>
/// A workspace is a university or ministry unit. Tier 2 of the three-tier model:
/// Enterprise (Ministry) → Workspaces → Projects.
/// </summary>
public class Workspace
{
    /// <summary>Natural key, e.g. "ub" (University of Baghdad).</summary>
    public string Code { get; set; } = "";

    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";

    /// <summary>
    /// Lookup "workspace-kind" — one of the four the register filters by
    /// (ملحق الشاشات، الشكل 1): state-university · technical-university ·
    /// central-unit · supply-directorate.
    ///
    /// NOT a `beneficiary-type`. A beneficiary receives distributed quantity
    /// (01 §2.1); a workspace owns projects. See P-24.
    /// </summary>
    public string Kind { get; set; } = "state-university";

    public bool Active { get; set; } = true;
}
