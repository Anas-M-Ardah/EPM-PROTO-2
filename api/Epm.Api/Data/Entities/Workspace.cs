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

    /// <summary>university · institute · directorate · other</summary>
    public string Kind { get; set; } = "university";

    public bool Active { get; set; } = true;
}
