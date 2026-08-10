namespace Epm.Api.Data.Entities;

/// <summary>Meetings &amp; actions tab (SCR-W11). محاضر الاجتماعات.</summary>
public class Meeting
{
    public int Id { get; set; }

    public string ProjectId { get; set; } = "";

    public string TitleAr { get; set; } = "";
    public string TitleEn { get; set; } = "";

    public DateOnly? HeldOn { get; set; }
    public string Location { get; set; } = "";

    /// <summary>Comma-separated attendee names. Prototype-grade; not a relation table.</summary>
    public string Attendees { get; set; } = "";

    public string MinutesRef { get; set; } = "";
}
