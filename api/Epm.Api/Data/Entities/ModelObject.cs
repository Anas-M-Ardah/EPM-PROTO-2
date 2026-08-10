namespace Epm.Api.Data.Entities;

/// <summary>
/// 3D / BIM tab (SCR-W10). DELIBERATELY A STUB — real IFC/BIM rendering is
/// explicitly out of Phase 1 (07 §8: "keep the tab, stub the viewer").
///
/// These rows back the object list and the massing placeholder only. Do not
/// invest in geometry here; the tab exists so the navigation matches the
/// agreed design.
/// </summary>
public class ModelObject
{
    public int Id { get; set; }

    public string ProjectId { get; set; } = "";

    public string Code { get; set; } = "";
    public string NameAr { get; set; } = "";
    public string NameEn { get; set; } = "";

    /// <summary>structure · architecture · mep · site</summary>
    public string Discipline { get; set; } = "";

    /// <summary>Optional link to the BOQ item this object represents.</summary>
    public int? BoqItemId { get; set; }

    /// <summary>Simple massing placeholder geometry — not real BIM.</summary>
    public decimal X { get; set; }
    public decimal Y { get; set; }
    public decimal Z { get; set; }
    public decimal Width { get; set; }
    public decimal Depth { get; set; }
    public decimal Height { get; set; }
}
