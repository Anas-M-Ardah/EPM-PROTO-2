namespace Epm.Api.Data.Entities;

/// <summary>
/// One line of a submitted version — the six fields المسار 3 asks the specialist
/// for: «الرمز والوصف والقسم والوحدة والكمية وسعر الوحدة».
///
/// `Amount` IS stored here, against the rule that derived values are never
/// stored (CLAUDE.md §3.5), and deliberately: this table is a RECORD OF WHAT WAS
/// SUBMITTED, not a live figure. Re-deriving qty × rate later would silently
/// restate a document someone signed off. The register's own amounts stay
/// derived, as they always were.
/// </summary>
public class BoqImportVersionItem
{
    public int Id { get; set; }

    /// <summary>→ BoqImportVersion.Id</summary>
    public int VersionId { get; set; }

    public string Code { get; set; } = "";
    public string Description { get; set; } = "";
    public string Division { get; set; } = "";
    public string Unit { get; set; } = "";

    public decimal Qty { get; set; }
    public decimal Rate { get; set; }
    public decimal Amount { get; set; }
}
