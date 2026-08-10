namespace Epm.Api.Data.Entities;

/// <summary>
/// One generic table for every value list in 06-DATA-DICTIONARY.md.
/// Deliberately generic instead of 15 small tables: one place to look, one
/// endpoint, one Angular service. Kind is the list name.
///
/// Kinds (06): project-status · execution-stage · project-type · contract-status ·
/// funding-type · beneficiary-type · co-type · boq-change-type · activity-change-type ·
/// co-lifecycle · decision · apply-step-status · weight-recalc-state ·
/// external-party-state · viewer-relation · amendment-state · activity-status ·
/// distribution-state · allocation-coverage · attachment-category
///
/// Every label is bilingual. Arabic is the primary label (06 preamble).
/// </summary>
public class Lookup
{
    public int Id { get; set; }

    /// <summary>Which list this row belongs to, e.g. "boq-change-type".</summary>
    public string Kind { get; set; } = "";

    /// <summary>The stable key used in code and stored on other rows, e.g. "inc".</summary>
    public string Code { get; set; } = "";

    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";

    public int Sort { get; set; }
}
