namespace Epm.Api.Data.Entities;

/// <summary>
/// Project risk register + the 5×5 severity grid. Workspace tab SCR-W9.
/// Severity is derived: Probability × Impact (both 1..5). Never store it.
/// </summary>
public class Risk
{
    public int Id { get; set; }

    public string ProjectId { get; set; } = "";

    public string Code { get; set; } = "";
    public string TitleAr { get; set; } = "";
    public string TitleEn { get; set; } = "";

    /// <summary>technical · financial · schedule · contractual · external · hse</summary>
    public string Category { get; set; } = "";

    /// <summary>1..5</summary>
    public int Probability { get; set; }
    /// <summary>1..5</summary>
    public int Impact { get; set; }

    /// <summary>open · mitigating · closed · realised</summary>
    public string Status { get; set; } = "open";

    public string MitigationAr { get; set; } = "";
    public string MitigationEn { get; set; } = "";

    public string Owner { get; set; } = "";
    public DateOnly? RaisedDate { get; set; }
    public DateOnly? ReviewDate { get; set; }
}
