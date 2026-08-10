namespace Epm.Api.Data.Entities;

/// <summary>
/// Spec 01 §2.1. Generic master list — do NOT hard-code a "university" field;
/// the same model will later carry ministries, directorates and sites.
/// Self-referencing tree via ParentCode.
/// </summary>
public class Beneficiary
{
    /// <summary>Natural key, e.g. "BEN-UOB", "BEN-UOB-ENG".</summary>
    public string Code { get; set; } = "";

    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";

    /// <summary>Lookup kind "beneficiary-type": university · department · campus · site · facility · other (06 §6).</summary>
    public string Type { get; set; } = "other";

    /// <summary>Self-referencing tree. Null at the root.</summary>
    public string? ParentCode { get; set; }

    /// <summary>Spec 01 §2.1 — inactive beneficiaries cannot receive new quantity.</summary>
    public bool Active { get; set; } = true;
}
