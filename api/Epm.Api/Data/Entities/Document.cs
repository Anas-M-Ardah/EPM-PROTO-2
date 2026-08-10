namespace Epm.Api.Data.Entities;

/// <summary>
/// Versioned document / drawing register (SCR-W12). المخططات والمستندات.
/// Versions accumulate — a new revision is a new row, never an overwrite.
/// No real file storage in the prototype.
/// </summary>
public class Document
{
    public int Id { get; set; }

    public string ProjectId { get; set; } = "";

    /// <summary>Scoped to a contract when the document is contractual. Optional.</summary>
    public string? ContractId { get; set; }

    public string Code { get; set; } = "";
    public string TitleAr { get; set; } = "";
    public string TitleEn { get; set; } = "";

    /// <summary>drawing · specification · report · letter · certificate · photo · other</summary>
    public string Kind { get; set; } = "other";

    public string Discipline { get; set; } = "";

    /// <summary>Revision label, e.g. "A", "B", "01".</summary>
    public string Revision { get; set; } = "A";

    /// <summary>draft · submitted · approved · approved-as-noted · rejected · superseded</summary>
    public string Status { get; set; } = "draft";

    public string FileName { get; set; } = "";
    public long SizeBytes { get; set; }

    public string UploadedByUserId { get; set; } = "";
    public DateTime UploadedAt { get; set; }
    public DateOnly? ApprovedDate { get; set; }
}
