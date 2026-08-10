namespace Epm.Api.Data.Entities;

/// <summary>
/// Issue register — a risk that has materialised, or a problem raised directly.
/// Shown alongside the risk register on SCR-W9.
/// </summary>
public class Issue
{
    public int Id { get; set; }

    public string ProjectId { get; set; } = "";

    public string Code { get; set; } = "";
    public string TitleAr { get; set; } = "";
    public string TitleEn { get; set; } = "";

    /// <summary>low · medium · high · critical</summary>
    public string Severity { get; set; } = "medium";

    /// <summary>open · inprogress · resolved · closed</summary>
    public string Status { get; set; } = "open";

    public string Owner { get; set; } = "";
    public DateOnly? RaisedDate { get; set; }
    public DateOnly? DueDate { get; set; }
    public DateOnly? ResolvedDate { get; set; }

    /// <summary>Set when this issue is a realised risk.</summary>
    public int? SourceRiskId { get; set; }
}
