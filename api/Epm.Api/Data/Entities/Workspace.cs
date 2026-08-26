namespace Epm.Api.Data.Entities;

/// <summary>
/// A workspace is a university or ministry unit. Tier 2 of the three-tier model:
/// Enterprise (Ministry) → Workspaces → Projects.
/// </summary>
public class Workspace
{
    /// <summary>Natural key, e.g. "ub" (University of Baghdad).</summary>
    public string Code { get; set; } = "";

    /// <summary>
    /// The emblem text — "UOB", "MU", "SPD". SEPARATE from <see cref="Code"/>
    /// on purpose: the reference prototype carries both (`id` and `code` in
    /// data.jsx), because the key that appears in a URL and the two-to-four
    /// letters a person recognises on a coloured chip are different things.
    /// Collapsing them is what made every emblem read as a lowercase slug.
    /// </summary>
    public string DisplayCode { get; set; } = "";

    /// <summary>
    /// The emblem's background, e.g. "#0e6b47". An IDENTITY colour, not a
    /// status one — it says *which* workspace, never how it is doing, so it
    /// never enters the status namespace (05 §1). Stored rather than derived
    /// because the ministry assigns it; a hash of the name would reshuffle
    /// every emblem the day a workspace is renamed.
    /// </summary>
    public string Color { get; set; } = "#1d3c6e";

    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";

    /// <summary>
    /// Lookup "workspace-kind" — one of the four the register filters by
    /// (ملحق الشاشات، الشكل 1): state-university · technical-university ·
    /// central-unit · supply-directorate.
    ///
    /// This is the ONLY kind vocabulary. `beneficiary-type` was deleted with
    /// the `Beneficiaries` table (P-174): a workspace OWNS projects, and the
    /// same workspace is a «جهة مستفيدة» on any project that distributes
    /// quantity to it (01 §2.1). One row, two roles, one list.
    /// </summary>
    public string Kind { get; set; } = "state-university";

    public bool Active { get; set; } = true;
}
